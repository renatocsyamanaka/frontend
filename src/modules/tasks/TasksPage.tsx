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
  message,
  Segmented,
} from 'antd';
import {
  CheckOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
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
  { key: 'NEW',         title: 'Novas',        color: 'default' },
  { key: 'ACK',         title: 'Confirmadas',  color: 'blue' },
  { key: 'IN_PROGRESS', title: 'Em andamento', color: 'gold' },
  { key: 'DONE',        title: 'Concluídas',   color: 'green' },
  { key: 'BLOCKED',     title: 'Canceladas',   color: 'red' },
  // Observação: CANCELLED continua acessível pelo seletor do card,
  // mas não mostramos uma coluna dedicada para ela.
];

const PRIORITY_TAG: Record<Task['priority'], JSX.Element> = {
  LOW: <Tag>Baixa</Tag>,
  MEDIUM: <Tag color="blue">Média</Tag>,
  HIGH: <Tag color="red">Alta</Tag>,
};

type Scope = 'subs' | 'mine' | 'one';

export default function TasksPage() {
  const qc = useQueryClient();

  // ===== filtros
  const [scope, setScope] = useState<Scope>('subs'); // padrão: subordinados
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | undefined>(undefined);

  const queryParams = useMemo(() => {
    if (scope === 'mine') return { mine: true, status: statusFilter };
    if (scope === 'one' && assigneeId) return { assignedToId: assigneeId, status: statusFilter };
    return { status: statusFilter }; // subs é o padrão do backend
  }, [scope, assigneeId, statusFilter]);

  const { data: tasks = [], isLoading, refetch, isFetching } = useQuery<Task[]>({
    queryKey: ['tasks', queryParams], // muda quando filtros mudam
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

    // Regras de negócio:
    // 1) Nunca mover para NEW (NEW só existe na criação)
    if (to === 'NEW') {
      message.warning('Não é possível mover para "Novas".');
      return;
    }

    // 2) ACK só a partir de NEW
    if (to === 'ACK' && from !== 'NEW') {
      message.warning('Só é permitido mover para "Confirmadas" a partir de "Novas".');
      return;
    }

    // 3) Atualiza status (pode ser ACK, IN_PROGRESS, DONE, BLOCKED, CANCELLED)
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
          }}
        >
          <Card size="small" hoverable>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontWeight: 600 }}>{t.title}</div>
              {PRIORITY_TAG[t.priority]}
            </div>
            {t.dueDate && (
              <div style={{ color: '#64748b' }}>
                Prazo: {dayjs(t.dueDate).format('DD/MM/YYYY')}
              </div>
            )}
            {t.assignee && (
              <div style={{ color: '#64748b' }}>Resp.: {t.assignee.name}</div>
            )}
            {t.location && (
              <div style={{ color: '#64748b' }}>Local: {t.location.name}</div>
            )}
            {t.client && (
              <div style={{ color: '#64748b' }}>Cliente: {t.client.name}</div>
            )}
            {t.description && <div style={{ marginTop: 6 }}>{t.description}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {t.status === 'NEW' && (
                <Button
                  icon={<CheckOutlined />}
                  size="small"
                  onClick={() => ackTask.mutate(t.id)}
                >
                  Confirmar recebimento
                </Button>
              )}

              {t.status !== 'DONE' && t.status !== 'CANCELLED' && (
                <Select
                  size="small"
                  value={t.status}
                  onChange={(s) => {
                    // As mesmas regras do DnD se aplicam aqui:
                    if (s === 'NEW') {
                      message.warning('Não é possível voltar para "Novas".');
                      return;
                    }
                    if (s === 'ACK' && t.status !== 'NEW') {
                      message.warning(
                        'Só é permitido mover para "Confirmadas" a partir de "Novas".'
                      );
                      return;
                    }
                    setStatus.mutate({ id: t.id, status: s as Task['status'] });
                  }}
                  style={{ minWidth: 170 }}
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

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h2 style={{ margin: 0 }}>Demandas (Planner)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenNew(true)}>
            Nova demanda
          </Button>
        </div>
      </div>

      {/* Barra de filtros */}
      <Card>
        <Space wrap align="center">
          <Segmented
            value={scope}
            onChange={(v) => setScope(v as Scope)}
            options={[
              { label: 'Subordinados', value: 'subs' },
              { label: 'Minhas', value: 'mine' },
              { label: 'Responsável', value: 'one' },
            ]}
          />

          {scope === 'one' && (
            <div style={{ minWidth: 260 }}>
              <UserSelect
                allowClear
                placeholder="Selecione o responsável"
                onChange={(val) => setAssigneeId(val as number | undefined)}
                style={{ width: '100%' }}
                suffixIcon={<UserOutlined />}
              />
            </div>
          )}

          <Select
            allowClear
            placeholder="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as Task['status'] | undefined)}
            style={{ width: 200 }}
            options={[
              { value: 'NEW', label: 'Novas' },
              { value: 'ACK', label: 'Confirmadas' },
              { value: 'IN_PROGRESS', label: 'Em andamento' },
              { value: 'DONE', label: 'Concluídas' },
              { value: 'BLOCKED', label: 'Bloqueadas' },
              { value: 'CANCELLED', label: 'Canceladas' },
            ]}
          />

          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
            Atualizar
          </Button>
        </Space>

        <div style={{ color: '#64748b', marginTop: 8 }}>
          {scope === 'subs' &&
            'Mostrando tarefas dos seus subordinados (diretos e indiretos).'}
          {scope === 'mine' && 'Mostrando apenas as suas tarefas.'}
          {scope === 'one' &&
            (assigneeId
              ? `Mostrando tarefas do usuário #${assigneeId}.`
              : 'Selecione um responsável.')}
        </div>
      </Card>

      {/* Colunas do planner com DnD */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Row gutter={16}>
          {STATUS_COLS.map((col) => (
            <Col key={col.key} xs={24} md={12} lg={8} xl={6}>
              <Card
                title={
                  <span>
                    {col.title}{' '}
                    <Tag color={col.color}>{grouped[col.key]?.length || 0}</Tag>
                  </span>
                }
                loading={isLoading}
              >
                <Droppable
                  droppableId={col.key}
                  isDropDisabled={col.key === 'NEW'} // bloqueia drop em "Novas"
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: 40,
                        transition: 'background 0.2s',
                        background: snapshot.isDraggingOver ? '#f5f7ff' : undefined,
                        borderRadius: 6,
                        padding: 2,
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {grouped[col.key]?.map((t, idx) => renderCard(t, idx))}
                        {(grouped[col.key]?.length || 0) === 0 && (
                          <div style={{ color: '#94a3b8' }}>Sem itens</div>
                        )}
                      </Space>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </Card>
            </Col>
          ))}
        </Row>
      </DragDropContext>

      {/* Modal Nova Demanda */}
      <Modal
        title="Nova demanda"
        open={openNew}
        onCancel={() => setOpenNew(false)}
        onOk={() => formNew.submit()}
        destroyOnHidden
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
              // DatePicker (dayjs) -> Date -> ISO
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

          <Form.Item
            name="assignedToId"
            label="Responsável (Supervisor)"
            rules={[{ required: true }]}
          >
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
          {/* Se quiser clientes, crie um ClientSelect similar ao LocationSelect e use aqui */}
        </Form>
      </Modal>
    </div>
  );
}
