import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Segmented,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SearchOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  BugOutlined,
  StopOutlined,
  UserOutlined,
  CalendarOutlined,
  BarChartOutlined,
  FileExcelOutlined,
  CodeOutlined,
  PlayCircleOutlined,
  UnorderedListOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';
import UserSelect from '../shared/UserSelect';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type ScreenMode = 'DEMANDS' | 'ACTIVITIES';

type DemandTipo = 'DEV_WEB' | 'DASHBOARD' | 'EXCEL' | 'OUTRAS_DEMANDAS';

type DemandStatus =
  | 'A_INICIAR'
  | 'EM_ANDAMENTO'
  | 'DISPONIVEL_TESTE'
  | 'EM_TESTE'
  | 'IMPEDIDO'
  | 'CONCLUIDO';

type DemandUrgencia = 'BAIXA' | 'MEDIA' | 'ALTA';

type Demand = {
  id: number;
  tipo: DemandTipo;
  nome: string;
  plataforma?: string | null;
  periodicidade?: string | null;
  diaAplicacao?: string | null;
  urgencia?: DemandUrgencia | string | null;
  solicitante?: string | null;
  descricao?: string | null;
  observacoes?: string | null;
  status?: DemandStatus | string | null;
  entregaPrevista?: string | null;
  dataEntrega?: string | null;
  workspace?: string | null;
  origemExcelAba?: string | null;
  responsavelId?: number | null;
  responsavel?: {
    id: number;
    name: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type DashboardActivity = {
  id: number;
  workspace: string;
  nome: string;
  periodicidade: 'DIARIO' | 'SEMANAL' | 'MENSAL' | string;
  diaAplicacao?: string | null;
  responsavelId?: number | null;
  responsavel?: {
    id: number;
    name: string;
    email?: string;
  } | null;
  urgencia?: 'BAIXA' | 'MEDIA' | 'ALTA' | string | null;
  solicitante?: string | null;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type DemandHistory = {
  id: number;
  demandId: number;
  actionType: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  comments?: string | null;
  performedByName?: string | null;
  performedByProfile?: string | null;
  createdAt: string;
};

type SummaryResponse = {
  total: number;
  devWeb: number;
  dashboard: number;
  excel: number;
  outrasDemandas: number;
  status?: {
    aIniciar?: number;
    emAndamento?: number;
    disponivelTeste?: number;
    emTeste?: number;
    impedido?: number;
    concluido?: number;
  };
};

type ListResponse = {
  data: Demand[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const TYPE_OPTIONS = [
  { label: 'Dev Web', value: 'DEV_WEB' },
  { label: 'Dashboard', value: 'DASHBOARD' },
  { label: 'Excel', value: 'EXCEL' },
  { label: 'Outras demandas', value: 'OUTRAS_DEMANDAS' },
];

const STATUS_OPTIONS = [
  { label: 'A iniciar', value: 'A_INICIAR' },
  { label: 'Em andamento', value: 'EM_ANDAMENTO' },
  { label: 'Disponível para teste', value: 'DISPONIVEL_TESTE' },
  { label: 'Em teste', value: 'EM_TESTE' },
  { label: 'Impedido', value: 'IMPEDIDO' },
  { label: 'Concluído', value: 'CONCLUIDO' },
];

const URGENCY_OPTIONS = [
  { label: 'Baixa', value: 'BAIXA' },
  { label: 'Média', value: 'MEDIA' },
  { label: 'Alta', value: 'ALTA' },
];

const PERIODICIDADE_OPTIONS = [
  { label: 'Diário', value: 'DIARIO' },
  { label: 'Semanal', value: 'SEMANAL' },
  { label: 'Mensal', value: 'MENSAL' },
];

const TYPE_LABEL: Record<string, string> = {
  DEV_WEB: 'Dev Web',
  DASHBOARD: 'Dashboard',
  EXCEL: 'Excel',
  OUTRAS_DEMANDAS: 'Outras demandas',
};

const STATUS_LABEL: Record<string, string> = {
  A_INICIAR: 'A iniciar',
  EM_ANDAMENTO: 'Em andamento',
  DISPONIVEL_TESTE: 'Disponível para teste',
  EM_TESTE: 'Em teste',
  IMPEDIDO: 'Impedido',
  CONCLUIDO: 'Concluído',
};

const STATUS_COLORS: Record<string, string> = {
  A_INICIAR: 'default',
  EM_ANDAMENTO: 'processing',
  DISPONIVEL_TESTE: 'cyan',
  EM_TESTE: 'purple',
  IMPEDIDO: 'red',
  CONCLUIDO: 'success',
};

const URGENCY_COLORS: Record<string, string> = {
  BAIXA: 'default',
  MEDIA: 'gold',
  ALTA: 'red',
};

function unwrapList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function normalizeText(value?: string | null) {
  return String(value || '').trim();
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '-';
}

function formatDateOnly(value?: string | null) {
  if (!value) return '-';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '-';
}

function getTypeLabel(tipo?: string | null) {
  return TYPE_LABEL[normalizeText(tipo)] || normalizeText(tipo) || '-';
}

function getStatusLabel(status?: string | null) {
  return STATUS_LABEL[normalizeText(status)] || normalizeText(status) || '-';
}

function getStatusColor(status?: string | null) {
  return STATUS_COLORS[normalizeText(status)] || 'default';
}

function getUrgencyLabel(urgencia?: string | null) {
  const map: Record<string, string> = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
  };
  return map[normalizeText(urgencia)] || normalizeText(urgencia) || '-';
}

function getUrgencyColor(urgencia?: string | null) {
  return URGENCY_COLORS[normalizeText(urgencia)] || 'default';
}

function getPeriodicidadeLabel(value?: string | null) {
  const map: Record<string, string> = {
    DIARIO: 'Diário',
    SEMANAL: 'Semanal',
    MENSAL: 'Mensal',
  };
  return map[normalizeText(value).toUpperCase()] || normalizeText(value) || '-';
}

function getTypeIcon(tipo?: string | null) {
  const current = normalizeText(tipo);
  if (current === 'DEV_WEB') return <CodeOutlined />;
  if (current === 'DASHBOARD') return <BarChartOutlined />;
  if (current === 'EXCEL') return <FileExcelOutlined />;
  return <AppstoreOutlined />;
}

function defaultFormValues(tipo: DemandTipo) {
  return {
    tipo,
    status: 'A_INICIAR',
    urgencia: 'MEDIA',
  };
}

function getActionLabel(actionType?: string | null) {
  const value = normalizeText(actionType).toUpperCase();

  const map: Record<string, string> = {
    CREATED: 'Criado',
    UPDATED: 'Atualizado',
    DELETED: 'Excluído',
    RESTORED: 'Restaurado',
  };

  return map[value] || value || '-';
}

function getFieldLabel(fieldName?: string | null) {
  const value = normalizeText(fieldName);

  const map: Record<string, string> = {
    registro: 'Registro',
    nome: 'Nome',
    tipo: 'Tipo',
    status: 'Status',
    urgencia: 'Urgência',
    plataforma: 'Plataforma',
    workspace: 'Workspace',
    descricao: 'Descrição',
    observacoes: 'Observações',
    solicitante: 'Solicitante',
    responsavelId: 'Responsável',
    entregaPrevista: 'Entrega prevista',
    dataEntrega: 'Data da entrega',
    periodicidade: 'Periodicidade',
    diaAplicacao: 'Dia de aplicação',
  };

  return map[value] || value || 'Registro';
}

function prettyHistoryValue(value?: string | null, fieldName?: string | null) {
  if (!value) return '-';

  if (fieldName === 'status') return getStatusLabel(value);
  if (fieldName === 'tipo') return getTypeLabel(value);
  if (fieldName === 'urgencia') return getUrgencyLabel(value);
  if (fieldName === 'entregaPrevista' || fieldName === 'dataEntrega') return formatDateOnly(value);

  const maybeDate = dayjs(value);
  if (maybeDate.isValid() && /^\d{4}-\d{2}-\d{2}/.test(String(value))) {
    return maybeDate.format('DD/MM/YYYY');
  }

  return String(value);
}

export default function DemandsPage() {
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  const [mode, setMode] = useState<ScreenMode>('DEMANDS');

  const [activeTipo, setActiveTipo] = useState<DemandTipo | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [urgenciaFilter, setUrgenciaFilter] = useState<string | undefined>();
  const [responsavelId, setResponsavelId] = useState<number | null>(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Demand | null>(null);
  const [viewing, setViewing] = useState<Demand | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Demand | null>(null);

  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DashboardActivity | null>(null);

  const [form] = Form.useForm();
  const [activityForm] = Form.useForm();

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      tipo: activeTipo || undefined,
      search: search || undefined,
      status: statusFilter || undefined,
      urgencia: urgenciaFilter || undefined,
      responsavelId: responsavelId || undefined,
      includeDeleted: includeDeleted ? 'true' : 'false',
    }),
    [page, limit, activeTipo, search, statusFilter, urgenciaFilter, responsavelId, includeDeleted]
  );

  const summaryQuery = useQuery<SummaryResponse>({
    queryKey: ['demands-summary'],
    queryFn: async () => {
      const res = await api.get('/demands/summary');
      return res.data;
    },
    enabled: mode === 'DEMANDS',
    staleTime: 30000,
  });

  const listQuery = useQuery<ListResponse>({
    queryKey: ['demands', queryParams],
    queryFn: async () => {
      const res = await api.get('/demands', { params: queryParams });
      return res.data;
    },
    enabled: mode === 'DEMANDS',
    placeholderData: (prev) => prev,
  });

  const activitiesQuery = useQuery<DashboardActivity[]>({
    queryKey: ['dashboard-activities'],
    queryFn: async () => {
      const res = await api.get('/dashboard-activities');
      return unwrapList<DashboardActivity>(res.data);
    },
    enabled: mode === 'ACTIVITIES',
    staleTime: 30000,
  });

  const historyQuery = useQuery<DemandHistory[]>({
    queryKey: ['demand-history', historyTarget?.id],
    queryFn: async () => {
      if (!historyTarget?.id) return [];
      const res = await api.get(`/demands/${historyTarget.id}/history`);
      return unwrapList<DemandHistory>(res.data);
    },
    enabled: !!historyTarget?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/demands', payload)).data,
    onSuccess: async () => {
      message.success('Demanda criada com sucesso.');
      setOpenForm(false);
      setEditing(null);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['demands'] });
      await qc.invalidateQueries({ queryKey: ['demands-summary'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || 'Falha ao criar demanda.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) =>
      (await api.put(`/demands/${id}`, payload)).data,
    onSuccess: async () => {
      message.success('Demanda atualizada com sucesso.');
      setOpenForm(false);
      setEditing(null);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['demands'] });
      await qc.invalidateQueries({ queryKey: ['demands-summary'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || 'Falha ao atualizar demanda.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) =>
      (await api.delete(`/demands/${id}`, { data: { comments } })).data,
    onSuccess: async () => {
      message.success('Demanda excluída com sucesso.');
      await qc.invalidateQueries({ queryKey: ['demands'] });
      await qc.invalidateQueries({ queryKey: ['demands-summary'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || 'Falha ao excluir demanda.');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) =>
      (await api.patch(`/demands/${id}/restore`, { comments })).data,
    onSuccess: async () => {
      message.success('Demanda restaurada com sucesso.');
      await qc.invalidateQueries({ queryKey: ['demands'] });
      await qc.invalidateQueries({ queryKey: ['demands-summary'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || 'Falha ao restaurar demanda.');
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/dashboard-activities', payload)).data,
    onSuccess: async () => {
      message.success('Responsabilidade cadastrada com sucesso.');
      setActivityFormOpen(false);
      setEditingActivity(null);
      activityForm.resetFields();
      await qc.invalidateQueries({ queryKey: ['dashboard-activities'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || 'Falha ao cadastrar responsabilidade.');
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) =>
      (await api.put(`/dashboard-activities/${id}`, payload)).data,
    onSuccess: async () => {
      message.success('Responsabilidade atualizada com sucesso.');
      setActivityFormOpen(false);
      setEditingActivity(null);
      activityForm.resetFields();
      await qc.invalidateQueries({ queryKey: ['dashboard-activities'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || 'Falha ao atualizar responsabilidade.');
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/dashboard-activities/${id}`)).data,
    onSuccess: async () => {
      message.success('Responsabilidade excluída com sucesso.');
      await qc.invalidateQueries({ queryKey: ['dashboard-activities'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || 'Falha ao excluir responsabilidade.');
    },
  });

  const rows = listQuery.data?.data || [];
  const meta = listQuery.data?.meta;
  const activities = activitiesQuery.data || [];

  const handleNew = (tipo?: DemandTipo) => {
    const selectedTipo = tipo || activeTipo || 'DEV_WEB';
    setEditing(null);
    form.resetFields();
    form.setFieldsValue(defaultFormValues(selectedTipo));
    setOpenForm(true);
  };

  const handleEdit = (record: Demand) => {
    setEditing(record);
    form.setFieldsValue({
      tipo: record.tipo,
      nome: record.nome,
      plataforma: record.plataforma || undefined,
      periodicidade: record.periodicidade || undefined,
      diaAplicacao: record.diaAplicacao || undefined,
      urgencia: record.urgencia || undefined,
      solicitante: record.solicitante || undefined,
      descricao: record.descricao || undefined,
      observacoes: record.observacoes || undefined,
      status: record.status || undefined,
      entregaPrevista: record.entregaPrevista ? dayjs(record.entregaPrevista) : undefined,
      dataEntrega: record.dataEntrega ? dayjs(record.dataEntrega) : undefined,
      workspace: record.workspace || undefined,
      responsavelId: record.responsavelId || undefined,
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        tipo: values.tipo,
        nome: values.nome,
        plataforma: values.plataforma || null,
        periodicidade: values.periodicidade || null,
        diaAplicacao: values.diaAplicacao || null,
        urgencia: values.urgencia || null,
        solicitante: values.solicitante || null,
        descricao: values.descricao || null,
        observacoes: values.observacoes || null,
        status: values.status || null,
        entregaPrevista: values.entregaPrevista
          ? (values.entregaPrevista as Dayjs).format('YYYY-MM-DD')
          : null,
        dataEntrega: values.dataEntrega
          ? (values.dataEntrega as Dayjs).format('YYYY-MM-DD')
          : null,
        workspace: values.workspace || null,
        responsavelId: values.responsavelId || null,
      };

      if (editing?.id) {
        updateMutation.mutate({ id: editing.id, payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch {
      //
    }
  };

  const handleNewActivity = () => {
    setEditingActivity(null);
    activityForm.resetFields();
    activityForm.setFieldsValue({
      periodicidade: 'DIARIO',
      urgencia: 'MEDIA',
    });
    setActivityFormOpen(true);
  };

  const handleEditActivity = (record: DashboardActivity) => {
    setEditingActivity(record);
    activityForm.setFieldsValue({
      workspace: record.workspace || undefined,
      nome: record.nome || undefined,
      periodicidade: record.periodicidade || undefined,
      diaAplicacao: record.diaAplicacao || undefined,
      responsavelId: record.responsavelId || undefined,
      urgencia: record.urgencia || undefined,
      solicitante: record.solicitante || undefined,
      observacoes: record.observacoes || undefined,
    });
    setActivityFormOpen(true);
  };

  const handleSubmitActivity = async () => {
    try {
      const values = await activityForm.validateFields();

      const payload = {
        workspace: values.workspace,
        nome: values.nome,
        periodicidade: values.periodicidade,
        diaAplicacao: values.diaAplicacao || null,
        responsavelId: values.responsavelId || null,
        urgencia: values.urgencia || null,
        solicitante: values.solicitante || null,
        observacoes: values.observacoes || null,
      };

      if (editingActivity?.id) {
        updateActivityMutation.mutate({ id: editingActivity.id, payload });
      } else {
        createActivityMutation.mutate(payload);
      }
    } catch {
      //
    }
  };

  const demandColumns: ColumnsType<Demand> = [
    {
      title: 'Demanda',
      dataIndex: 'nome',
      key: 'nome',
      render: (_, record) => (
        <div style={{ display: 'grid', gap: 4 }}>
          <Text strong>{record.nome}</Text>
          <Space size={6} wrap>
            <Tag icon={getTypeIcon(record.tipo)}>{getTypeLabel(record.tipo)}</Tag>
            {record.deletedAt && <Tag color="warning">Excluída</Tag>}
          </Space>
        </div>
      ),
    },
    {
      title: activeTipo === 'DASHBOARD' ? 'Workspace' : 'Plataforma',
      key: 'plataforma_workspace',
      responsive: ['md'],
      render: (_, record) => record.workspace || record.plataforma || '-',
    },
    {
      title: 'Responsável',
      key: 'responsavel',
      responsive: ['lg'],
      render: (_, record) => (
        <Space size={6}>
          <UserOutlined />
          <span>{record.responsavel?.name || '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) =>
        value ? <Tag color={getStatusColor(value)}>{getStatusLabel(value)}</Tag> : '-',
    },
    {
      title: 'Urgência',
      dataIndex: 'urgencia',
      key: 'urgencia',
      responsive: ['md'],
      render: (value) =>
        value ? <Tag color={getUrgencyColor(value)}>{getUrgencyLabel(value)}</Tag> : '-',
    },
    {
      title: 'Entrega prevista',
      key: 'data',
      responsive: ['lg'],
      render: (_, record) => (
        <Space size={6}>
          <CalendarOutlined />
          <span>{formatDate(record.entregaPrevista || record.dataEntrega)}</span>
        </Space>
      ),
    },
    {
      title: 'Observações / Descrição',
      key: 'campoExtra',
      responsive: ['xl'],
      render: (_, record) => (
        <div style={{ maxWidth: 280 }}>
          <Text
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {record.observacoes || record.descricao || record.periodicidade || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, record) => (
        <Space size={4} wrap>
          <Tooltip title="Visualizar">
            <Button icon={<EyeOutlined />} onClick={() => setViewing(record)} />
          </Tooltip>

          {!record.deletedAt && (
            <Tooltip title="Editar">
              <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
            </Tooltip>
          )}

          <Tooltip title="Histórico">
            <Button icon={<HistoryOutlined />} onClick={() => setHistoryTarget(record)} />
          </Tooltip>

          {!record.deletedAt ? (
            <Popconfirm
              title="Excluir demanda?"
              description="A exclusão será lógica e poderá ser restaurada depois."
              onConfirm={() => deleteMutation.mutate({ id: record.id })}
              okText="Excluir"
              cancelText="Cancelar"
            >
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Restaurar demanda?"
              onConfirm={() => restoreMutation.mutate({ id: record.id })}
              okText="Restaurar"
              cancelText="Cancelar"
            >
              <Button icon={<RollbackOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const activityColumns: ColumnsType<DashboardActivity> = [
    {
      title: 'Workspace',
      dataIndex: 'workspace',
      key: 'workspace',
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      render: (value) => value || '-',
    },
    {
      title: 'Periodicidade',
      dataIndex: 'periodicidade',
      key: 'periodicidade',
      render: (value) => getPeriodicidadeLabel(value),
    },
    {
      title: 'Dia',
      dataIndex: 'diaAplicacao',
      key: 'diaAplicacao',
      render: (value) => value || '-',
    },
    {
      title: 'Responsável',
      key: 'responsavel',
      render: (_, record) => record.responsavel?.name || '-',
    },
    {
      title: 'Urgência',
      dataIndex: 'urgencia',
      key: 'urgencia',
      render: (value) =>
        value ? <Tag color={getUrgencyColor(value)}>{getUrgencyLabel(value)}</Tag> : '-',
    },
    {
      title: 'Solicitante',
      dataIndex: 'solicitante',
      key: 'solicitante',
      render: (value) => value || '-',
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, record) => (
        <Space size={4} wrap>
          <Tooltip title="Editar">
            <Button icon={<EditOutlined />} onClick={() => handleEditActivity(record)} />
          </Tooltip>

          <Popconfirm
            title="Excluir responsabilidade?"
            onConfirm={() => deleteActivityMutation.mutate(record.id)}
            okText="Excluir"
            cancelText="Cancelar"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card
        style={{
          borderRadius: 16,
          border: '1px solid #e5eef8',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 16,
          }}
        >
          <div>
            <Space size={12} align="center">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontSize: 20,
                }}
              >
                {mode === 'DEMANDS' ? <AppstoreOutlined /> : <DatabaseOutlined />}
              </div>

              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {mode === 'DEMANDS' ? 'Gestão de Demandas' : 'Responsabilidades de Atualização'}
                </Title>
                <Text type="secondary">
                  {mode === 'DEMANDS'
                    ? 'Controle de demandas com acompanhamento por status.'
                    : 'Cadastro de responsáveis por dashboards e sistemas.'}
                </Text>
              </div>
            </Space>
          </div>

          <Space direction={isMobile ? 'vertical' : 'horizontal'} size={12}>
            <Segmented
              value={mode}
              onChange={(value) => setMode(value as ScreenMode)}
              options={[
                { label: 'Demandas', value: 'DEMANDS' },
                { label: 'Responsabilidades', value: 'ACTIVITIES' },
              ]}
            />

            {mode === 'DEMANDS' ? (
              <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={() => listQuery.refetch()}>
                  Atualizar
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleNew()}>
                  Nova demanda
                </Button>
              </Space>
            ) : (
              <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={() => activitiesQuery.refetch()}>
                  Atualizar
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleNewActivity}>
                  Nova responsabilidade
                </Button>
              </Space>
            )}
          </Space>
        </div>
      </Card>

      {mode === 'DEMANDS' ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '2.2fr 1fr',
              gap: 16,
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <StatusSummaryCard
                title="A iniciar"
                value={summaryQuery.data?.status?.aIniciar || 0}
                loading={summaryQuery.isLoading}
                icon={<ClockCircleOutlined />}
                bg="#fcf8ee"
                iconBg="#fff"
                iconColor="#d4a24c"
              />

              <StatusSummaryCard
                title="Em andamento"
                value={summaryQuery.data?.status?.emAndamento || 0}
                loading={summaryQuery.isLoading}
                icon={<LoadingOutlined />}
                bg="#f2f7fb"
                iconBg="#fff"
                iconColor="#5b8fc7"
              />

              <StatusSummaryCard
                title="Disponível p/ teste"
                value={summaryQuery.data?.status?.disponivelTeste || 0}
                loading={summaryQuery.isLoading}
                icon={<BugOutlined />}
                bg="#eef8f7"
                iconBg="#fff"
                iconColor="#46b7b2"
              />

              <StatusSummaryCard
                title="Em teste"
                value={summaryQuery.data?.status?.emTeste || 0}
                loading={summaryQuery.isLoading}
                icon={<PlayCircleOutlined />}
                bg="#f6f1fa"
                iconBg="#fff"
                iconColor="#8a68b8"
              />

              <StatusSummaryCard
                title="Impedido"
                value={summaryQuery.data?.status?.impedido || 0}
                loading={summaryQuery.isLoading}
                icon={<StopOutlined />}
                bg="#faf3f3"
                iconBg="#fff"
                iconColor="#d07070"
              />

              <StatusSummaryCard
                title="Concluído"
                value={summaryQuery.data?.status?.concluido || 0}
                loading={summaryQuery.isLoading}
                icon={<CheckCircleOutlined />}
                bg="#f3f8ee"
                iconBg="#fff"
                iconColor="#74a95a"
              />
            </div>

            <TotalSummaryCard
              title="Total de demandas"
              value={summaryQuery.data?.total || 0}
              loading={summaryQuery.isLoading}
              icon={<AppstoreOutlined />}
            />
          </div>

          <Card style={{ borderRadius: 16 }} styles={{ body: { paddingBottom: 12 } }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={7}>
                  <Input.Search
                    placeholder="Buscar por nome, solicitante, plataforma..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onSearch={(value) => {
                      setSearch(value.trim());
                      setPage(1);
                    }}
                  />
                </Col>

                <Col xs={24} md={4}>
                  <Select
                    allowClear
                    placeholder="Tipo"
                    options={TYPE_OPTIONS}
                    value={activeTipo}
                    onChange={(value) => {
                      setActiveTipo(value);
                      setPage(1);
                    }}
                    style={{ width: '100%' }}
                  />
                </Col>

                <Col xs={24} md={4}>
                  <Select
                    allowClear
                    placeholder="Status"
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value);
                      setPage(1);
                    }}
                    style={{ width: '100%' }}
                  />
                </Col>

                <Col xs={24} md={3}>
                  <Select
                    allowClear
                    placeholder="Urgência"
                    value={urgenciaFilter}
                    onChange={(value) => {
                      setUrgenciaFilter(value);
                      setPage(1);
                    }}
                    options={URGENCY_OPTIONS}
                    style={{ width: '100%' }}
                  />
                </Col>

                <Col xs={24} md={4}>
                  <UserSelect
                    value={responsavelId}
                    onChange={(value) => {
                      setResponsavelId(value);
                      setPage(1);
                    }}
                    placeholder="Responsável"
                    style={{ width: '100%' }}
                  />
                </Col>

                <Col xs={24} md={2}>
                  <Select
                    value={includeDeleted ? '1' : '0'}
                    onChange={(v) => {
                      setIncludeDeleted(v === '1');
                      setPage(1);
                    }}
                    options={[
                      { label: 'Ativas', value: '0' },
                      { label: 'Todas', value: '1' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </div>
          </Card>

          <Card style={{ borderRadius: 16 }}>
            {listQuery.isLoading ? (
              <div style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
                <Spin />
              </div>
            ) : listQuery.isError ? (
              <Alert
                type="error"
                showIcon
                message="Falha ao carregar demandas"
                description={
                  (listQuery.error as any)?.response?.data?.error ||
                  'Verifique os endpoints do backend.'
                }
              />
            ) : rows.length === 0 ? (
              <Empty description="Nenhuma demanda encontrada." />
            ) : (
              <>
                <Table
                  rowKey="id"
                  dataSource={rows}
                  columns={demandColumns}
                  pagination={false}
                  size="middle"
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 16,
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <Text type="secondary">
                    Total: <strong>{meta?.total || 0}</strong>
                  </Text>

                  <Pagination
                    current={page}
                    pageSize={limit}
                    total={meta?.total || 0}
                    onChange={(nextPage, nextPageSize) => {
                      setPage(nextPage);
                      setLimit(nextPageSize);
                    }}
                    showSizeChanger
                  />
                </div>
              </>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card style={{ borderRadius: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={6}>
                <Input.Search placeholder="Buscar responsabilidade..." allowClear enterButton={<SearchOutlined />} />
              </Col>
              <Col xs={24} md={4}>
                <Select allowClear placeholder="Periodicidade" options={PERIODICIDADE_OPTIONS} />
              </Col>
              <Col xs={24} md={4}>
                <Select allowClear placeholder="Urgência" options={URGENCY_OPTIONS} />
              </Col>
              <Col xs={24} md={4}>
                <UserSelect placeholder="Responsável" style={{ width: '100%' }} />
              </Col>
              <Col xs={24} md={6}>
                <Text type="secondary">
                  Use esta área para controlar quem é responsável por atualizar dashboards e sistemas.
                </Text>
              </Col>
            </Row>
          </Card>

          <Card style={{ borderRadius: 16 }}>
            {activitiesQuery.isLoading ? (
              <div style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
                <Spin />
              </div>
            ) : activitiesQuery.isError ? (
              <Alert
                type="error"
                showIcon
                message="Falha ao carregar responsabilidades"
                description={
                  (activitiesQuery.error as any)?.response?.data?.error ||
                  'Verifique os endpoints do backend de responsabilidades.'
                }
              />
            ) : activities.length === 0 ? (
              <Empty description="Nenhuma responsabilidade cadastrada." />
            ) : (
              <Table
                rowKey="id"
                dataSource={activities}
                columns={activityColumns}
                pagination={{ pageSize: 10 }}
                size="middle"
              />
            )}
          </Card>
        </>
      )}

      <Modal
        title={editing ? 'Editar demanda' : 'Nova demanda'}
        open={openForm}
        onCancel={() => {
          setOpenForm(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        okText={editing ? 'Salvar' : 'Criar'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={920}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Tipo"
                name="tipo"
                rules={[{ required: true, message: 'Informe o tipo.' }]}
              >
                <Select options={TYPE_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Responsável" name="responsavelId">
                <UserSelect style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Solicitante" name="solicitante">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item
                label="Nome"
                name="nome"
                rules={[{ required: true, message: 'Informe o nome da demanda.' }]}
              >
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const tipo = getFieldValue('tipo') as DemandTipo;

                  if (tipo === 'DASHBOARD') {
                    return (
                      <Form.Item label="Workspace" name="workspace">
                        <Input />
                      </Form.Item>
                    );
                  }

                  return (
                    <Form.Item label="Plataforma" name="plataforma">
                      <Input />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Status" name="status">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Urgência" name="urgencia">
                <Select allowClear options={URGENCY_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Entrega prevista" name="entregaPrevista">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Data da entrega" name="dataEntrega">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Dia (caso se aplique)" name="diaAplicacao">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Periodicidade" name="periodicidade">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Descrição" name="descricao">
                <TextArea rows={4} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Observações" name="observacoes">
                <TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={editingActivity ? 'Editar responsabilidade' : 'Nova responsabilidade'}
        open={activityFormOpen}
        onCancel={() => {
          setActivityFormOpen(false);
          setEditingActivity(null);
          activityForm.resetFields();
        }}
        onOk={handleSubmitActivity}
        okText={editingActivity ? 'Salvar' : 'Criar'}
        confirmLoading={createActivityMutation.isPending || updateActivityMutation.isPending}
        width={840}
        destroyOnHidden
      >
        <Form form={activityForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Workspace"
                name="workspace"
                rules={[{ required: true, message: 'Informe o workspace.' }]}
              >
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item
                label="Nome"
                name="nome"
                rules={[{ required: true, message: 'Informe o nome.' }]}
              >
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="Periodicidade"
                name="periodicidade"
                rules={[{ required: true, message: 'Informe a periodicidade.' }]}
              >
                <Select options={PERIODICIDADE_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Dia (caso se aplique)" name="diaAplicacao">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Responsável" name="responsavelId">
                <UserSelect style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Urgência" name="urgencia">
                <Select allowClear options={URGENCY_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Solicitante" name="solicitante">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Observações" name="observacoes">
                <TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Detalhes da demanda"
        open={!!viewing}
        onCancel={() => setViewing(null)}
        footer={null}
        width={840}
      >
        {viewing && (
          <div style={{ display: 'grid', gap: 16 }}>
            {viewing.deletedAt && (
              <Alert
                type="warning"
                showIcon
                message="Registro excluído logicamente"
                description="Essa demanda está marcada como excluída, mas ainda pode ser restaurada."
              />
            )}

            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Tipo">
                <Tag icon={getTypeIcon(viewing.tipo)}>{getTypeLabel(viewing.tipo)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Nome">{viewing.nome}</Descriptions.Item>
              <Descriptions.Item label="Responsável">
                {viewing.responsavel?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Solicitante">
                {viewing.solicitante || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Plataforma / Workspace">
                {viewing.workspace || viewing.plataforma || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {viewing.status ? (
                  <Tag color={getStatusColor(viewing.status)}>
                    {getStatusLabel(viewing.status)}
                  </Tag>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Urgência">
                {viewing.urgencia ? (
                  <Tag color={getUrgencyColor(viewing.urgencia)}>
                    {getUrgencyLabel(viewing.urgencia)}
                  </Tag>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Periodicidade">
                {viewing.periodicidade || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Dia">{viewing.diaAplicacao || '-'}</Descriptions.Item>
              <Descriptions.Item label="Entrega prevista">
                {formatDate(viewing.entregaPrevista)}
              </Descriptions.Item>
              <Descriptions.Item label="Data da entrega">
                {formatDate(viewing.dataEntrega)}
              </Descriptions.Item>
              <Descriptions.Item label="Observações">
                <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                  {viewing.observacoes || '-'}
                </Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="Descrição">
                <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                  {viewing.descricao || '-'}
                </Paragraph>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      <Modal
        title={`Histórico${historyTarget ? ` — ${historyTarget.nome}` : ''}`}
        open={!!historyTarget}
        onCancel={() => setHistoryTarget(null)}
        footer={null}
        width={860}
      >
        {historyQuery.isLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
            <Spin />
          </div>
        ) : historyQuery.data?.length ? (
          <Timeline
            items={historyQuery.data.map((item) => ({
              color:
                item.actionType === 'CREATED'
                  ? 'green'
                  : item.actionType === 'UPDATED'
                  ? 'blue'
                  : item.actionType === 'DELETED'
                  ? 'red'
                  : 'gray',
              children: (
                <div style={{ display: 'grid', gap: 8 }}>
                  <Space wrap>
                    <Tag>{getActionLabel(item.actionType)}</Tag>
                    <Text strong>{getFieldLabel(item.fieldName || 'registro')}</Text>
                    <Text type="secondary">{formatDateOnly(item.createdAt)}</Text>
                  </Space>

                  <div>
                    <Text>
                      <strong>{item.performedByName || 'Sistema'}</strong>
                      {item.performedByProfile ? ` • ${item.performedByProfile}` : ''}
                    </Text>
                  </div>

                  {(item.oldValue || item.newValue) && (
                    <div>
                      <Text type="secondary">Antes:</Text>{' '}
                      <Text>{prettyHistoryValue(item.oldValue, item.fieldName)}</Text>
                      <br />
                      <Text type="secondary">Depois:</Text>{' '}
                      <Text>{prettyHistoryValue(item.newValue, item.fieldName)}</Text>
                    </div>
                  )}

                  {item.comments && (
                    <div>
                      <Text type="secondary">Observação:</Text> <Text>{item.comments}</Text>
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="Sem histórico para esta demanda." />
        )}
      </Modal>

      <style>
        {`
          .row-soft-deleted td {
            background: #fff7e6 !important;
            opacity: 0.82;
          }
        `}
      </style>
    </div>
  );
}

function StatusSummaryCard({
  title,
  value,
  loading,
  icon,
  bg,
  iconBg,
  iconColor,
}: {
  title: string;
  value: number;
  loading?: boolean;
  icon: React.ReactNode;
  bg: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card
      style={{
        borderRadius: 18,
        border: '1px solid rgba(15, 23, 42, 0.04)',
        boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
        background: bg,
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text style={{ fontSize: 14, color: '#667085' }}>{title}</Text>
          <div style={{ marginTop: 10 }}>
            <Statistic
              value={value}
              loading={loading}
              valueStyle={{ fontSize: 28, fontWeight: 700, color: '#1f1f1f' }}
            />
          </div>
        </div>

        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: iconBg,
            display: 'grid',
            placeItems: 'center',
            color: iconColor,
            fontSize: 18,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

function TotalSummaryCard({
  title,
  value,
  loading,
  icon,
}: {
  title: string;
  value: number;
  loading?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card
      style={{
        height: '100%',
        minHeight: 236,
        borderRadius: 22,
        border: '1px solid rgba(15, 23, 42, 0.06)',
        boxShadow: '0 12px 34px rgba(15, 23, 42, 0.08)',
        background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
        overflow: 'hidden',
      }}
      styles={{ body: { height: '100%', padding: 24 } }}
    >
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 15 }}>{title}</Text>
            <div style={{ marginTop: 18 }}>
              <Statistic
                value={value}
                loading={loading}
                valueStyle={{
                  color: '#fff',
                  fontSize: 64,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              />
            </div>
          </div>

          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: 24,
            }}
          >
            {icon}
          </div>
        </div>

        <div>
          <Text style={{ color: 'rgba(255,255,255,0.82)' }}>
            Visão consolidada de todas as demandas cadastradas.
          </Text>
        </div>
      </div>
    </Card>
  );
}