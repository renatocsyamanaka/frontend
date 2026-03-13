// src/modules/tasks/TasksPage.tsx
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
  Segmented,
  Grid,
  Tabs,
} from 'antd';
import { CheckOutlined, PlusOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { UserSelect } from '../shared/UserSelect';
import { LocationSelect } from '../shared/LocationSelect';

import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

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

const STATUS_COLS: Array<{ key: Exclude<Task['status'], 'CANCELLED'>; title: string; color: string }> = [
  { key: 'NEW', title: 'Novas', color: 'default' },
  { key: 'ACK', title: 'Confirmadas', color: 'blue' },
  { key: 'IN_PROGRESS', title: 'Em andamento', color: 'gold' },
  { key: 'DONE', title: 'Concluídas', color: 'green' },
  { key: 'BLOCKED', title: 'Bloqueadas', color: 'red' },
];

const PRIORITY_TAG: Record<Task['priority'], JSX.Element> = {
  LOW: <Tag>Baixa</Tag>,
  MEDIUM: <Tag color="blue">Média</Tag>,
  HIGH: <Tag color="red">Alta</Tag>,
};

type Scope = 'subs' | 'mine' | 'one';

export default function TasksPage() {
  const qc = useQueryClient();

  const { useBreakpoint } = Grid;
  const bp = useBreakpoint();
  const isMobile = !bp.md; // < md

  // ===== filtros
  const [scope, setScope] = useState<Scope>('subs');
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | undefined>(undefined);

  // mobile: tab ativa
  const [activeTab, setActiveTab] = useState<Exclude<Task['status'], 'CANCELLED'>>('NEW');

  const queryParams = useMemo(() => {
    if (scope === 'mine') return { mine: true, status: statusFilter };
    if (scope === 'one' && assigneeId) return { assignedToId: assigneeId, status: statusFilter };
    return { status: statusFilter };
  }, [scope, assigneeId, statusFilter]);

  const { data: tasks = [], isLoading, refetch, isFetching } = useQuery<Task[]>({
    queryKey: ['tasks', queryParams],
    queryFn: async () => (await api.get('/tasks', { params: queryParams })).data,
    keepPreviousData: true,
  });

  // ===== criar
  const [openNew, setOpenNew] = useState(false);
  const [formNew] = Form.useForm();

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

  const grouped = useMemo(() => {
    const g: Record<Task['status'], Task[]> = {
      NEW: [],
      ACK: [],
      IN_PROGRESS: [],
      DONE: [],
      BLOCKED: [],
      CANCELLED: [],
    };
    tasks.forEach((t) => g[t.status].push(t));
    return g;
  }, [tasks]);

  // ===== DnD
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

  const renderCard = (t: Task, index: number) => (
    <Draggable draggableId={String(t.id)} index={index} key={t.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.9 : 1,
            minWidth: 0,
          }}
        >
          <Card
            size="small"
            hoverable
            style={{ borderRadius: 12, minWidth: 0 }}
            bodyStyle={{ padding: isMobile ? 10 : 12 }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'start', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Typography.Text
                  strong
                  style={{
                    display: 'block',
                    fontSize: 13,
                    lineHeight: 1.25,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {t.title}
                </Typography.Text>
              </div>
              <div style={{ flexShrink: 0 }}>{PRIORITY_TAG[t.priority]}</div>
            </div>

            <div style={{ marginTop: 6, display: 'grid', gap: 2 }}>
              {t.dueDate && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Prazo: {dayjs(t.dueDate).format('DD/MM/YYYY')}
                </Typography.Text>
              )}
              {t.assignee && (
                <Typography.Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
                  Resp.: {t.assignee.name}
                </Typography.Text>
              )}
              {t.location && (
                <Typography.Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
                  Local: {t.location.name}
                </Typography.Text>
              )}
              {t.client && (
                <Typography.Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
                  Cliente: {t.client.name}
                </Typography.Text>
              )}
            </div>

            {t.description && (
              <Typography.Paragraph
                style={{ marginTop: 8, marginBottom: 0, fontSize: 12, overflowWrap: 'anywhere' }}
                ellipsis={{ rows: isMobile ? 2 : 3 }}
              >
                {t.description}
              </Typography.Paragraph>
            )}

            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {t.status === 'NEW' && (
                <Button icon={<CheckOutlined />} size="small" onClick={() => ackTask.mutate(t.id)} block>
                  Confirmar recebimento
                </Button>
              )}

              {t.status !== 'DONE' && t.status !== 'CANCELLED' && (
                <Select
                  size="small"
                  value={t.status}
                  onChange={(s) => {
                    if (s === 'NEW') return message.warning('Não é possível voltar para "Novas".');
                    if (s === 'ACK' && t.status !== 'NEW') {
                      return message.warning('Só é permitido mover para "Confirmadas" a partir de "Novas".');
                    }
                    setStatus.mutate({ id: t.id, status: s as Task['status'] });
                  }}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'ACK', label: 'Confirmada' },
                    { value: 'IN_PROGRESS', label: 'Em andamento' },
                    { value: 'DONE', label: 'Concluída' },
                    { value: 'BLOCKED', label: 'Bloqueada' },
                    { value: 'CANCELLED', label: 'Cancelada' },
                  ]}
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );

  const FilterBar = (
    <Card bodyStyle={{ padding: isMobile ? 12 : 12 }}>
      <div
        style={{
          display: 'grid',
          gap: 10,
          gridTemplateColumns: isMobile ? '1fr' : '340px 1fr 260px',
          alignItems: 'center',
          maxWidth: '100%',
        }}
      >
        <Segmented
          size="small"
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
      </div>

      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        {scope === 'subs' && 'Mostrando tarefas dos seus subordinados (diretos e indiretos).'}
        {scope === 'mine' && 'Mostrando apenas as suas tarefas.'}
        {scope === 'one' && (assigneeId ? `Mostrando tarefas do usuário #${assigneeId}.` : 'Selecione um responsável.')}
      </Typography.Text>
    </Card>
  );

  const Header = (
    <div style={{ display: 'grid', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 10,
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          maxWidth: '100%',
        }}
      >
        <Typography.Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
          Demandas (Planner)
        </Typography.Title>

        <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()} block={isMobile}>
            Atualizar
          </Button>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenNew(true)} block={isMobile}>
            Nova demanda
          </Button>
        </div>
      </div>
    </div>
  );

  const Column = (colKey: Exclude<Task['status'], 'CANCELLED'>) => {
    const col = STATUS_COLS.find((c) => c.key === colKey)!;
    return (
      <Card
        title={
          <span>
            {col.title} <Tag color={col.color}>{grouped[col.key]?.length || 0}</Tag>
          </span>
        }
        loading={isLoading}
        bodyStyle={{ padding: isMobile ? 12 : 12 }}
        style={{ minWidth: 0 }}
      >
        <Droppable droppableId={col.key} isDropDisabled={col.key === 'NEW'}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: 40,
                borderRadius: 12,
                padding: 2,
                background: snapshot.isDraggingOver ? '#f5f7ff' : undefined,
                transition: 'background 0.2s',
                display: 'grid',
                gap: 10,
                minWidth: 0,
              }}
            >
              {grouped[col.key]?.map((t, idx) => renderCard(t, idx))}
              {(grouped[col.key]?.length || 0) === 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Sem itens
                </Typography.Text>
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
        overflowX: 'hidden', // ✅ mata scroll lateral no mobile
      }}
    >
      {Header}
      {FilterBar}

      <DragDropContext onDragEnd={onDragEnd}>
        {isMobile ? (
          <Card bodyStyle={{ padding: 10 }} style={{ minWidth: 0 }}>
            <Tabs
              activeKey={activeTab}
              onChange={(k) => setActiveTab(k as any)}
              centered={false}
              tabBarGutter={8}
              items={STATUS_COLS.map((c) => ({
                key: c.key,
                label: (
                  <span style={{ fontSize: 12 }}>
                    {c.title} <Tag style={{ marginInlineStart: 6 }} color={c.color}>{grouped[c.key]?.length || 0}</Tag>
                  </span>
                ),
                children: <div style={{ marginTop: 10 }}>{Column(c.key)}</div>,
              }))}
            />
          </Card>
        ) : (
          <Row gutter={[16, 16]} style={{ margin: 0 }}>
            {STATUS_COLS.map((col) => (
              <Col key={col.key} xs={24} md={12} lg={8} xl={6} style={{ minWidth: 0 }}>
                {Column(col.key)}
              </Col>
            ))}
          </Row>
        )}
      </DragDropContext>

      {/* Modal Nova Demanda */}
      <Modal
        title="Nova demanda"
        open={openNew}
        onCancel={() => setOpenNew(false)}
        onOk={() => formNew.submit()}
        destroyOnClose
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
    </div>
  );
}
