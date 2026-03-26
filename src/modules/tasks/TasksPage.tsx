import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Col,
  Select,
  Segmented,
  Space,
  Tag,
  Typography,
  message,
  Grid,
  Tabs,
  Empty,
  Spin,
} from 'antd';
import {
  CheckOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { UserSelect } from '../shared/UserSelect';
import { LocationSelect } from '../shared/LocationSelect';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';

const { Title, Text, Paragraph } = Typography;

type SimpleUser = { id: number; name: string };
type Location = { id: number; name: string };
type Client = { id: number; name: string };

type Task = {
  id: number;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'NEW' | 'ACK' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED';
  dueDate?: string | null;
  ackAt?: string | null;
  completedAt?: string | null;
  assignee?: SimpleUser;
  creator?: SimpleUser;
  location?: Location | null;
  client?: Client | null;
};

type Scope = 'subs' | 'mine' | 'one';
type QuickStatusView = 'ACTIVE' | 'BLOCKED';

const STATUS_COLS: Array<{
  key: Exclude<Task['status'], 'CANCELLED'>;
  title: string;
  color: string;
}> = [
  { key: 'NEW', title: 'Novas', color: 'default' },
  { key: 'ACK', title: 'Confirmadas', color: 'blue' },
  { key: 'IN_PROGRESS', title: 'Em andamento', color: 'gold' },
  { key: 'DONE', title: 'Concluídas', color: 'green' },
  { key: 'BLOCKED', title: 'Bloqueadas', color: 'red' },
];

const PRIORITY_META: Record<
  Task['priority'],
  { label: string; color: string; bg: string; border: string }
> = {
  LOW: {
    label: 'Baixa',
    color: '#475569',
    bg: '#f8fafc',
    border: '#e2e8f0',
  },
  MEDIUM: {
    label: 'Média',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  HIGH: {
    label: 'Alta',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
  },
};

function PriorityPill({ priority }: { priority: Task['priority'] }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 24,
        padding: '0 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : null;
}

function filterTasksByQuickView(tasks: Task[], quickView: QuickStatusView) {
  if (quickView === 'BLOCKED') {
    return tasks.filter((t) => t.status === 'BLOCKED');
  }

  return tasks.filter((t) => t.status !== 'BLOCKED' && t.status !== 'CANCELLED');
}

export default function TasksPage() {
  const qc = useQueryClient();
  const { useBreakpoint } = Grid;
  const bp = useBreakpoint();
  const isMobile = !bp.md;

  const [scope, setScope] = useState<Scope>('subs');
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | undefined>(undefined);
  const [quickView, setQuickView] = useState<QuickStatusView>('ACTIVE');
  const [activeTab, setActiveTab] = useState<Exclude<Task['status'], 'CANCELLED'>>('NEW');

  const [openNew, setOpenNew] = useState(false);
  const [formNew] = Form.useForm();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [openTaskModal, setOpenTaskModal] = useState(false);
  const [taskModalForm] = Form.useForm();

  const queryParams = useMemo(() => {
    if (scope === 'mine') return { mine: true, status: statusFilter };
    if (scope === 'one' && assigneeId) return { assignedToId: assigneeId, status: statusFilter };
    return { status: statusFilter };
  }, [scope, assigneeId, statusFilter]);

  const {
    data: tasks = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<Task[]>({
    queryKey: ['tasks', queryParams],
    queryFn: async () => (await api.get('/tasks', { params: queryParams })).data,
    placeholderData: (prev) => prev,
  });

  const createTask = useMutation({
    mutationFn: async (payload: any) => (await api.post('/tasks', payload)).data,
    onSuccess: () => {
      message.success('Demanda criada');
      setOpenNew(false);
      formNew.resetFields();
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao criar'),
  });

  const ackTask = useMutation({
    mutationFn: async (id: number) => (await api.patch(`/tasks/${id}/ack`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      message.success('Recebimento confirmado');
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao confirmar'),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Task['status'] }) =>
      (await api.patch(`/tasks/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar status'),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) =>
      (await api.put(`/tasks/${id}`, payload)).data,
    onSuccess: () => {
      message.success('Demanda atualizada com sucesso');
      setOpenTaskModal(false);
      setSelectedTask(null);
      taskModalForm.resetFields();
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao atualizar demanda');
    },
  });

  const visibleTasks = useMemo(() => filterTasksByQuickView(tasks, quickView), [tasks, quickView]);

  const grouped = useMemo(() => {
    const g: Record<Task['status'], Task[]> = {
      NEW: [],
      ACK: [],
      IN_PROGRESS: [],
      DONE: [],
      BLOCKED: [],
      CANCELLED: [],
    };
    visibleTasks.forEach((t) => g[t.status].push(t));
    return g;
  }, [visibleTasks]);

  const visibleColumns = useMemo(() => {
    if (quickView === 'BLOCKED') {
      return STATUS_COLS.filter((col) => col.key === 'BLOCKED');
    }
    return STATUS_COLS.filter((col) => col.key !== 'BLOCKED');
  }, [quickView]);

  const countActive = tasks.filter((t) => t.status !== 'BLOCKED' && t.status !== 'CANCELLED').length;
  const countBlocked = tasks.filter((t) => t.status === 'BLOCKED').length;

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    taskModalForm.setFieldsValue({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? dayjs(task.dueDate) : null,
      priority: task.priority,
      status: task.status,
    });
    setOpenTaskModal(true);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const from = source.droppableId as Task['status'];
    const to = destination.droppableId as Task['status'];
    if (from === to) return;

    if (to === 'NEW') {
      message.warning('Não é possível mover para "Novas".');
      return;
    }

    if (to === 'ACK' && from !== 'NEW') {
      message.warning('Só é permitido mover para "Confirmadas" a partir de "Novas".');
      return;
    }

    setStatus.mutate({ id: Number(draggableId), status: to });
  };

  const renderTaskCard = (t: Task, index?: number, draggable = true) => {
    const cardContent = (
      <Card
        size="small"
        hoverable
        onClick={() => openTaskDetails(t)}
        style={{
          borderRadius: 16,
          minWidth: 0,
          cursor: 'pointer',
          border: '1px solid #edf2f7',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          background: '#fff',
          height: '100%',
        }}
        styles={{ body: { padding: isMobile ? 12 : 14 } }}
      >
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text
              strong
              style={{
                display: 'block',
                fontSize: 13,
                lineHeight: 1.35,
                color: '#0f172a',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {t.title}
            </Text>
          </div>

          <div style={{ flexShrink: 0 }}>
            <PriorityPill priority={t.priority} />
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
          {t.dueDate && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              <CalendarOutlined style={{ marginRight: 6 }} />
              Prazo: {formatDate(t.dueDate)}
            </Text>
          )}

          {t.assignee && (
            <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
              <TeamOutlined style={{ marginRight: 6 }} />
              Resp.: {t.assignee.name}
            </Text>
          )}

          {t.location && (
            <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
              <EnvironmentOutlined style={{ marginRight: 6 }} />
              Local: {t.location.name}
            </Text>
          )}

          {t.client && (
            <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
              Cliente: {t.client.name}
            </Text>
          )}
        </div>

        {t.description ? (
          <Paragraph
            style={{
              marginTop: 10,
              marginBottom: 0,
              fontSize: 12,
              color: '#334155',
              overflowWrap: 'anywhere',
            }}
            ellipsis={{ rows: isMobile ? 2 : 3 }}
          >
            {t.description}
          </Paragraph>
        ) : null}

        <div
          style={{ display: 'grid', gap: 8, marginTop: 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          {t.status === 'NEW' && (
            <Button
              icon={<CheckOutlined />}
              size="small"
              onClick={() => ackTask.mutate(t.id)}
              block
              style={{ borderRadius: 10 }}
            >
              Confirmar recebimento
            </Button>
          )}

          {t.status !== 'DONE' && t.status !== 'CANCELLED' && (
            <Select
              size="small"
              value={t.status}
              onChange={(s) => {
                if (s === 'NEW') {
                  message.warning('Não é possível voltar para "Novas".');
                  return;
                }

                if (s === 'ACK' && t.status !== 'NEW') {
                  message.warning('Só é permitido mover para "Confirmadas" a partir de "Novas".');
                  return;
                }

                setStatus.mutate({ id: t.id, status: s as Task['status'] });
              }}
              style={{ width: '100%' }}
              options={[
                { value: 'NEW', label: 'Nova' },
                { value: 'ACK', label: 'Confirmada' },
                { value: 'IN_PROGRESS', label: 'Em andamento' },
                { value: 'DONE', label: 'Concluída' },
                { value: 'BLOCKED', label: 'Bloqueada' },
                { value: 'CANCELLED', label: 'Cancelada' },
              ]}
            />
          )}

          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openTaskDetails(t)}
            block
            style={{ borderRadius: 10 }}
          >
            Ver detalhes
          </Button>
        </div>
      </Card>
    );

    if (!draggable || index === undefined) {
      return cardContent;
    }

    return (
      <Draggable draggableId={String(t.id)} index={index} key={t.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              opacity: snapshot.isDragging ? 0.95 : 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                borderRadius: 16,
                border: snapshot.isDragging ? '1px solid #91caff' : 'none',
                boxShadow: snapshot.isDragging ? '0 10px 30px rgba(22, 119, 255, 0.15)' : 'none',
              }}
            >
              {cardContent}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const renderColumn = (colKey: Exclude<Task['status'], 'CANCELLED'>) => {
    const col = STATUS_COLS.find((c) => c.key === colKey)!;

    return (
      <Card
        title={
          <Space size={8}>
            <Text strong style={{ color: '#0f172a' }}>
              {col.title}
            </Text>
            <Tag color={col.color}>{grouped[col.key]?.length || 0}</Tag>
          </Space>
        }
        loading={isLoading}
        style={{
          minWidth: 0,
          borderRadius: 18,
          border: '1px solid #edf2f7',
          boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)',
        }}
        styles={{ body: { padding: isMobile ? 12 : 14 } }}
      >
        <Droppable droppableId={col.key} isDropDisabled={col.key === 'NEW'}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: 60,
                borderRadius: 14,
                padding: 4,
                background: snapshot.isDraggingOver ? '#f8fbff' : 'transparent',
                transition: 'background 0.2s',
                display: 'grid',
                gap: 10,
                minWidth: 0,
              }}
            >
              {grouped[col.key]?.map((t, idx) => renderTaskCard(t, idx, true))}

              {(grouped[col.key]?.length || 0) === 0 && (
                <div
                  style={{
                    minHeight: 68,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 12,
                    background: '#fafcff',
                    border: '1px dashed #dbe5f0',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Sem itens
                  </Text>
                </div>
              )}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </Card>
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <Card
        style={{
          borderRadius: 20,
          border: '1px solid #e5eef8',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 14,
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
          }}
        >
          <div>
            <Space size={12} align="center">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                <AppstoreOutlined />
              </div>

              <div>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                  Demandas (Planner)
                </Title>
                <Text type="secondary">
                  Organize, distribua e acompanhe as tarefas do time em um quadro visual.
                </Text>
              </div>
            </Space>
          </div>

          <Space direction={isMobile ? 'vertical' : 'horizontal'} size={10} style={{ width: isMobile ? '100%' : 'auto' }}>
            <Button
              icon={<ReloadOutlined />}
              loading={isFetching}
              onClick={() => refetch()}
              block={isMobile}
            >
              Atualizar
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpenNew(true)}
              block={isMobile}
            >
              Nova demanda
            </Button>
          </Space>
        </div>
      </Card>

      <Card
        style={{
          borderRadius: 18,
          border: '1px solid #eaf0f6',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
        }}
        styles={{ body: { padding: isMobile ? 12 : 14 } }}
      >
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: isMobile ? '1fr' : '320px 1fr 220px 220px',
            alignItems: 'center',
          }}
        >
          <Segmented
            size="middle"
            block={isMobile}
            value={scope}
            onChange={(v) => {
              setScope(v as Scope);
              if (v !== 'one') setAssigneeId(undefined);
            }}
            options={[
              { label: 'Subordinados', value: 'subs' },
              { label: 'Minhas', value: 'mine' },
              { label: 'Responsável', value: 'one' },
            ]}
          />

          {scope === 'one' ? (
            <UserSelect
              allowClear
              placeholder="Selecione o responsável"
              onChange={(val) => setAssigneeId(val as number | undefined)}
              style={{ width: '100%' }}
              suffixIcon={<UserOutlined />}
            />
          ) : (
            <div />
          )}

          <Select
            allowClear
            placeholder="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as Task['status'] | undefined)}
            style={{ width: '100%' }}
            options={[
              { value: 'NEW', label: 'Novas' },
              { value: 'ACK', label: 'Confirmadas' },
              { value: 'IN_PROGRESS', label: 'Em andamento' },
              { value: 'DONE', label: 'Concluídas' },
              { value: 'BLOCKED', label: 'Bloqueadas' },
              { value: 'CANCELLED', label: 'Canceladas' },
            ]}
          />

          {isMobile ? (
            <Select
              value={quickView}
              onChange={(v) => {
                setQuickView(v as QuickStatusView);
                setActiveTab(v === 'BLOCKED' ? 'BLOCKED' : 'NEW');
              }}
              style={{ width: '100%' }}
              options={[
                { value: 'ACTIVE', label: `Ativas (${countActive})` },
                { value: 'BLOCKED', label: `Bloqueadas (${countBlocked})` },
              ]}
            />
          ) : (
            <Segmented
              value={quickView}
              onChange={(v) => {
                setQuickView(v as QuickStatusView);
                setActiveTab(v === 'BLOCKED' ? 'BLOCKED' : 'NEW');
              }}
              options={[
                { label: `Ativas ${countActive}`, value: 'ACTIVE' },
                { label: `Bloqueadas ${countBlocked}`, value: 'BLOCKED' },
              ]}
            />
          )}
        </div>

        <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 12 }}>
          {scope === 'subs' && 'Mostrando tarefas dos seus subordinados diretos e indiretos.'}
          {scope === 'mine' && 'Mostrando apenas as suas tarefas.'}
          {scope === 'one' &&
            (assigneeId
              ? 'Mostrando tarefas do responsável selecionado.'
              : 'Selecione um responsável para visualizar as tarefas.')}
        </Text>
      </Card>

      <DragDropContext onDragEnd={onDragEnd}>
        {quickView === 'BLOCKED' ? (
          <Card
            style={{
              borderRadius: 18,
              border: '1px solid #eaf0f6',
              boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)',
            }}
            styles={{ body: { padding: isMobile ? 12 : 14 } }}
          >
            <Space style={{ marginBottom: 14 }}>
              <Text strong style={{ color: '#0f172a', fontSize: 16 }}>
                Demandas bloqueadas
              </Text>
              <Tag color="red">{grouped.BLOCKED.length}</Tag>
            </Space>

            <Row gutter={[16, 16]}>
              {grouped.BLOCKED.map((t, index) => (
                <Col key={t.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  {renderTaskCard(t, index, false)}
                </Col>
              ))}

              {grouped.BLOCKED.length === 0 && (
                <Col span={24}>
                  <Card
                    style={{
                      borderRadius: 14,
                      border: '1px dashed #dbe5f0',
                      background: '#fafcff',
                    }}
                  >
                    <Empty description="Nenhuma demanda bloqueada." />
                  </Card>
                </Col>
              )}
            </Row>
          </Card>
        ) : isMobile ? (
          <Card
            style={{
              borderRadius: 18,
              border: '1px solid #eaf0f6',
              boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)',
            }}
            styles={{ body: { padding: 10 } }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={(k) => setActiveTab(k as Exclude<Task['status'], 'CANCELLED'>)}
              tabBarGutter={8}
              items={visibleColumns.map((c) => ({
                key: c.key,
                label: (
                  <span style={{ fontSize: 12 }}>
                    {c.title}
                    <Tag style={{ marginInlineStart: 6 }} color={c.color}>
                      {grouped[c.key]?.length || 0}
                    </Tag>
                  </span>
                ),
                children: <div style={{ marginTop: 10 }}>{renderColumn(c.key)}</div>,
              }))}
            />
          </Card>
        ) : (
          <Row gutter={[16, 16]} style={{ margin: 0 }}>
            {visibleColumns.map((col) => (
              <Col key={col.key} xs={24} md={12} lg={8} xl={6} style={{ minWidth: 0 }}>
                {renderColumn(col.key)}
              </Col>
            ))}
          </Row>
        )}
      </DragDropContext>

      {isLoading && visibleTasks.length === 0 ? (
        <Card
          style={{
            borderRadius: 18,
            border: '1px solid #eaf0f6',
            boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ minHeight: 160, display: 'grid', placeItems: 'center' }}>
            <Spin />
          </div>
        </Card>
      ) : null}

      {!isLoading && visibleTasks.length === 0 && quickView !== 'BLOCKED' ? (
        <Card
          style={{
            borderRadius: 18,
            border: '1px solid #eaf0f6',
            boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)',
          }}
        >
          <Empty description="Nenhuma demanda encontrada para essa visão." />
        </Card>
      ) : null}

      <Modal
        title="Nova demanda"
        open={openNew}
        onCancel={() => setOpenNew(false)}
        onOk={() => formNew.submit()}
        destroyOnHidden
        confirmLoading={createTask.isPending}
      >
        <Form
          layout="vertical"
          form={formNew}
          onFinish={(v) => {
            createTask.mutate({
              title: v.title,
              description: v.description || null,
              assignedToId: v.assignedToId,
              priority: v.priority,
              dueDate: v.dueDate ? v.dueDate.toDate().toISOString() : null,
              locationId: v.locationId ?? null,
              clientId: v.clientId ?? null,
            });
          }}
        >
          <Form.Item name="title" label="Título" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Descrição">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="assignedToId" label="Responsável (Supervisor)" rules={[{ required: true }]}>
            <UserSelect onlyManagers />
          </Form.Item>

          <Form.Item name="priority" label="Prioridade" initialValue="MEDIUM">
            <Select
              options={[
                { value: 'LOW', label: 'Baixa' },
                { value: 'MEDIUM', label: 'Média' },
                { value: 'HIGH', label: 'Alta' },
              ]}
            />
          </Form.Item>

          <Form.Item name="dueDate" label="Prazo">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="locationId" label="Local">
            <LocationSelect />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Detalhes da demanda"
        open={openTaskModal}
        onCancel={() => {
          setOpenTaskModal(false);
          setSelectedTask(null);
          taskModalForm.resetFields();
        }}
        onOk={() => taskModalForm.submit()}
        destroyOnHidden
        confirmLoading={updateTask.isPending}
        okText="Salvar alterações"
        width={720}
      >
        {selectedTask ? (
          <Form
            layout="vertical"
            form={taskModalForm}
            onFinish={(values) => {
              updateTask.mutate({
                id: selectedTask.id,
                payload: {
                  title: values.title,
                  description: values.description || null,
                  priority: values.priority,
                  dueDate: values.dueDate ? values.dueDate.toDate().toISOString() : null,
                  status: values.status,
                },
              });
            }}
          >
            <Row gutter={12}>
              <Col xs={24} md={16}>
                <Form.Item name="title" label="Título" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="priority" label="Prioridade">
                  <Select
                    options={[
                      { value: 'LOW', label: 'Baixa' },
                      { value: 'MEDIUM', label: 'Média' },
                      { value: 'HIGH', label: 'Alta' },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="status" label="Status">
                  <Select
                    options={[
                      { value: 'NEW', label: 'Nova' },
                      { value: 'ACK', label: 'Confirmada' },
                      { value: 'IN_PROGRESS', label: 'Em andamento' },
                      { value: 'DONE', label: 'Concluída' },
                      { value: 'BLOCKED', label: 'Bloqueada' },
                      { value: 'CANCELLED', label: 'Cancelada' },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="dueDate" label="Prazo">
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item name="description" label="Descrição / Observação">
                  <Input.TextArea rows={5} placeholder="Descreva a demanda ou ajuste a observação..." />
                </Form.Item>
              </Col>
            </Row>

            <Card
              size="small"
              style={{
                borderRadius: 14,
                background: '#fafcff',
                border: '1px solid #edf2f7',
              }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <Text type="secondary">
                  <TeamOutlined style={{ marginRight: 6 }} />
                  Responsável: {selectedTask.assignee?.name || '-'}
                </Text>

                <Text type="secondary">
                  <UserOutlined style={{ marginRight: 6 }} />
                  Criador: {selectedTask.creator?.name || '-'}
                </Text>

                <Text type="secondary">
                  <CalendarOutlined style={{ marginRight: 6 }} />
                  Prazo atual: {formatDate(selectedTask.dueDate) || '-'}
                </Text>

                <Text type="secondary">
                  <EnvironmentOutlined style={{ marginRight: 6 }} />
                  Local: {selectedTask.location?.name || '-'}
                </Text>

                <Text type="secondary">
                  Cliente: {selectedTask.client?.name || '-'}
                </Text>
              </div>
            </Card>
          </Form>
        ) : (
          <Empty description="Nenhuma demanda selecionada." />
        )}
      </Modal>
    </div>
  );
}