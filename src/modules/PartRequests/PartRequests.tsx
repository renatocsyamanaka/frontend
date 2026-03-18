import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, API_URL } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Spin,
  Switch,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
  EditOutlined,
  HistoryOutlined,
  CheckOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea, Search } = Input;

type SimpleUser = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
  avatarUrl?: string | null;
  role?: { id: number; name: string; level: number };
  roleId?: number;
  roleLevel?: number;
  manager?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
  vendorCode?: string | null;
  serviceAreaCode?: string | null;
  serviceAreaName?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  addressCountry?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type ClientRow = {
  id: number;
  name: string;
  cidade?: string | null;
  estado?: string | null;
  documento?: string | null;
  telefone1?: string | null;
};

type PartCatalogItem = {
  id: number;
  code: string;
  name: string;
  unit?: string | null;
  category?: string | null;
  brand?: string | null;
  description?: string | null;
  isActive?: boolean;
};

type PartRequestHistory = {
  id: number;
  actionType: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  approvedQty?: number | null;
  deliveredQty?: number | null;
  comments?: string | null;
  performedByName?: string | null;
  performedByProfile?: string | null;
  createdAt: string;
};

type PartRequestItem = {
  id: number;
  partRequestId: number;
  partCode?: string | null;
  partName: string;
  unit: string;
  requestedQty: number;
  approvedQty: number;
  deliveredQty: number;
  rejectedQty: number;
  pendingQty: number;
  itemStatus:
    | 'PENDING_REVIEW'
    | 'APPROVED_PARTIAL'
    | 'APPROVED'
    | 'REJECTED'
    | 'PARTIALLY_FULFILLED'
    | 'FULFILLED'
    | 'CANCELLED'
    | 'REOPENED';
  itemRequestNote?: string | null;
  reasonCode?: string | null;
  reasonDetails?: string | null;
  managerNote?: string | null;
  stockNote?: string | null;
  history?: PartRequestHistory[];
};

type PartRequest = {
  id: number;
  requestNumber: string;
  originType: 'INTERNAL' | 'EXTERNAL_IDENTIFIED';
  requesterName: string;
  requesterDocument?: string | null;
  requesterPhone?: string | null;
  requesterEmail?: string | null;
  requestType: 'ATENDIMENTO' | 'TECNICO' | 'OUTRO';
  clientId?: number | null;
  clientNameSnapshot?: string | null;
  providerId?: number | null;
  providerNameSnapshot?: string | null;
  technicianId?: number | null;
  technicianNameSnapshot?: string | null;
  region?: string | null;
  occurrence?: string | null;
  naCode?: string | null;
  osCode?: string | null;
  conversationKey?: string | null;
  fulfillmentType?: 'RETIRADA' | 'ENTREGA' | null;
  invoiceNumber?: string | null;
  isExpedited?: boolean;
  city?: string | null;
  state?: string | null;
  scheduleSla?: string | null;
  customerClassification?: string | null;
  projectName?: string | null;
  requestNotes?: string | null;
  status:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'PARTIALLY_APPROVED'
    | 'APPROVED'
    | 'PARTIALLY_FULFILLED'
    | 'FULFILLED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'REOPENED';
  managerId?: number | null;
  manager?: SimpleUser | null;
  requesterUser?: SimpleUser | null;
  client?: { id: number; name: string } | null;
  items?: PartRequestItem[];
  history?: PartRequestHistory[];
  createdAt?: string;
};

type BatchRow = {
  itemId: number;
  selected: boolean;
  approvedQty: number;
  managerNote?: string;
  reasonCode?: string;
  reasonDetails?: string;
};

const REQUEST_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'SUBMITTED', label: 'Enviado' },
  { value: 'UNDER_REVIEW', label: 'Em análise' },
  { value: 'PARTIALLY_APPROVED', label: 'Aprovado parcialmente' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'PARTIALLY_FULFILLED', label: 'Atendido parcialmente' },
  { value: 'FULFILLED', label: 'Atendido' },
  { value: 'REJECTED', label: 'Rejeitado' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'REOPENED', label: 'Reaberto' },
];

const REASON_OPTIONS = [
  { value: 'SEM_ESTOQUE', label: 'Sem estoque' },
  { value: 'REPROVADO_GERENTE', label: 'Reprovado pelo gestor' },
  { value: 'DADOS_INSUFICIENTES', label: 'Dados insuficientes' },
  { value: 'ITEM_INCORRETO', label: 'Item incorreto' },
  { value: 'ATENDIMENTO_PARCIAL', label: 'Atendimento parcial' },
  { value: 'AGUARDANDO_VALIDACAO', label: 'Aguardando validação' },
  { value: 'FORA_DO_ESCOPO', label: 'Fora do escopo' },
  { value: 'OUTROS', label: 'Outros' },
];

const REQUEST_STATUS_COLOR: Record<PartRequest['status'], string> = {
  DRAFT: 'default',
  SUBMITTED: 'blue',
  UNDER_REVIEW: 'gold',
  PARTIALLY_APPROVED: 'orange',
  APPROVED: 'green',
  PARTIALLY_FULFILLED: 'cyan',
  FULFILLED: 'green',
  REJECTED: 'red',
  CANCELLED: 'default',
  REOPENED: 'purple',
};

const ITEM_STATUS_COLOR: Record<PartRequestItem['itemStatus'], string> = {
  PENDING_REVIEW: 'gold',
  APPROVED_PARTIAL: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  PARTIALLY_FULFILLED: 'cyan',
  FULFILLED: 'green',
  CANCELLED: 'default',
  REOPENED: 'purple',
};

const REQUEST_STATUS_LABEL: Record<PartRequest['status'], string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviado',
  UNDER_REVIEW: 'Em análise',
  PARTIALLY_APPROVED: 'Aprovado parcialmente',
  APPROVED: 'Aprovado',
  PARTIALLY_FULFILLED: 'Atendido parcialmente',
  FULFILLED: 'Atendido',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
  REOPENED: 'Reaberto',
};

const ITEM_STATUS_LABEL: Record<PartRequestItem['itemStatus'], string> = {
  PENDING_REVIEW: 'Pendente de análise',
  APPROVED_PARTIAL: 'Aprovado parcialmente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  PARTIALLY_FULFILLED: 'Atendido parcialmente',
  FULFILLED: 'Atendido',
  CANCELLED: 'Cancelado',
  REOPENED: 'Reaberto',
};

const REQUEST_TYPE_LABEL: Record<PartRequest['requestType'], string> = {
  ATENDIMENTO: 'Atendimento',
  TECNICO: 'Técnico',
  OUTRO: 'Outro',
};

const HISTORY_ACTION_LABEL: Record<string, string> = {
  SUBMITTED: 'Pedido criado',
  ITEM_APPROVED: 'Item aprovado',
  ITEM_PARTIALLY_APPROVED: 'Item aprovado parcialmente',
  ITEM_REJECTED: 'Item rejeitado',
  REQUEST_UPDATED: 'Pedido atualizado',
  REQUEST_STATUS_UPDATED: 'Status do pedido atualizado',
  BATCH_APPROVAL: 'Aprovação em lote',
};


function unwrapList<T>(resData: any): T[] {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
}

const abs = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}/${String(url).replace(/^\/+/, '')}`;
};

const initial = (s?: string | null) => (s?.trim()?.[0]?.toUpperCase() ?? '?');

function requestStatusTag(status: PartRequest['status']) {
  return (
    <Tag color={REQUEST_STATUS_COLOR[status] || 'default'} style={{ marginInlineEnd: 0 }}>
      {REQUEST_STATUS_LABEL[status] || status}
    </Tag>
  );
}

function itemStatusTag(status: PartRequestItem['itemStatus']) {
  return (
    <Tag color={ITEM_STATUS_COLOR[status] || 'default'} style={{ marginInlineEnd: 0 }}>
      {ITEM_STATUS_LABEL[status] || status}
    </Tag>
  );
}

function historyActionLabel(actionType: string) {
  return HISTORY_ACTION_LABEL[actionType] || actionType;
}

function fulfillmentTypeLabel(value?: 'RETIRADA' | 'ENTREGA' | null) {
  if (value === 'RETIRADA') return 'Retirada';
  if (value === 'ENTREGA') return 'Entrega';
  return '-';
}

function canBatchApprove(item: PartRequestItem) {
  return ['PENDING_REVIEW', 'REOPENED'].includes(item.itemStatus);
}

export default function PartRequestsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { useBreakpoint } = Grid;
  const bp = useBreakpoint();
  const isMobile = !bp.md;

  const [filters, setFilters] = useState<{
    requestNumber?: string;
    requesterName?: string;
    status?: PartRequest['status'];
  }>({});

  const [openNew, setOpenNew] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [openCatalog, setOpenCatalog] = useState(false);
  const [openCatalogCreate, setOpenCatalogCreate] = useState(false);
  const [openEditRequest, setOpenEditRequest] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [openBatchApprove, setOpenBatchApprove] = useState(false);
  const [openProviderModal, setOpenProviderModal] = useState(false);

  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [providerUser, setProviderUser] = useState<SimpleUser | null>(null);

  const [approveState, setApproveState] = useState<{
    open: boolean;
    item: PartRequestItem | null;
  }>({ open: false, item: null });

  const [rejectState, setRejectState] = useState<{
    open: boolean;
    item: PartRequestItem | null;
  }>({ open: false, item: null });

  const [filterForm] = Form.useForm();
  const [newForm] = Form.useForm();
  const [catalogForm] = Form.useForm();
  const [editRequestForm] = Form.useForm();
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (filters.requestNumber) params.requestNumber = filters.requestNumber;
    if (filters.requesterName) params.requesterName = filters.requesterName;
    if (filters.status) params.status = filters.status;
    return params;
  }, [filters]);

  const {
    data: requests = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<PartRequest[]>({
    queryKey: ['part-requests', queryParams],
    queryFn: async () => (await api.get('/part-requests', { params: queryParams })).data,
    placeholderData: (prev) => prev,
  });

  const {
    data: requestDetails,
    isFetching: isFetchingDetails,
  } = useQuery<PartRequest>({
    queryKey: ['part-request-details', selectedId],
    queryFn: async () => (await api.get(`/part-requests/${selectedId}`)).data,
    enabled: !!selectedId,
  });

  const clientsQuery = useQuery<ClientRow[]>({
    queryKey: ['clients', 'part-request'],
    queryFn: async () => {
      const res = await api.get('/clients');
      return unwrapList<ClientRow>(res.data);
    },
    staleTime: 60_000,
    retry: false,
  });

  const providersQuery = useQuery<SimpleUser[]>({
    queryKey: ['users', 'part-request'],
    queryFn: async () => {
      const res = await api.get('/users');
      return unwrapList<SimpleUser>(res.data);
    },
    staleTime: 60_000,
    retry: false,
  });

  const partsQuery = useQuery<PartCatalogItem[]>({
    queryKey: ['parts-catalog', catalogSearch],
    queryFn: async () => {
      const params = catalogSearch ? { q: catalogSearch } : {};
      const res = await api.get('/parts', { params });
      return unwrapList<PartCatalogItem>(res.data);
    },
    staleTime: 30_000,
    retry: false,
  });

  const clientOptions = useMemo(() => {
    return (clientsQuery.data || []).map((c) => {
      const loc = [c.cidade, c.estado].filter(Boolean).join(' / ');
      const doc = c.documento ? ` • ${c.documento}` : '';
      const tel = c.telefone1 ? ` • ${c.telefone1}` : '';
      return {
        value: c.id,
        label: `${c.name}${loc ? ` — ${loc}` : ''}${doc}${tel}`,
        raw: c,
      };
    });
  }, [clientsQuery.data]);

  const providerOptions = useMemo(() => {
    return (providersQuery.data || []).map((u) => ({
      value: u.id,
      label: u.name,
      raw: u,
    }));
  }, [providersQuery.data]);

  const partOptions = useMemo(() => {
    return (partsQuery.data || [])
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        value: p.id,
        label: `${p.code} — ${p.name}`,
        raw: p,
      }));
  }, [partsQuery.data]);

  const batchableItems = useMemo(() => {
    return (requestDetails?.items || []).filter(canBatchApprove);
  }, [requestDetails]);

  useEffect(() => {
    if (!openNew) return;

    newForm.setFieldsValue({
      originType: 'INTERNAL',
      requestType: 'ATENDIMENTO',
      fulfillmentType: 'ENTREGA',
      requesterName: user?.name || '',
      requesterEmail: user?.email || '',
      clientId: null,
      clientNameSnapshot: null,
      providerSelector: null,
      providerId: null,
      providerNameSnapshot: null,
      technicianId: null,
      technicianNameSnapshot: null,
    });
  }, [openNew, user, newForm]);

  const createRequest = useMutation({
    mutationFn: async (payload: any) => (await api.post('/part-requests', payload)).data,
    onSuccess: (data) => {
      message.success(`Pedido criado com sucesso: ${data.requestNumber}`);
      setOpenNew(false);
      newForm.resetFields();
      qc.invalidateQueries({ queryKey: ['part-requests'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Falha ao criar pedido'),
  });

  const createCatalogItem = useMutation({
    mutationFn: async (payload: any) => (await api.post('/parts', payload)).data,
    onSuccess: () => {
      message.success('Item cadastrado com sucesso');
      setOpenCatalogCreate(false);
      catalogForm.resetFields();
      qc.invalidateQueries({ queryKey: ['parts-catalog'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Falha ao cadastrar item'),
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) =>
      (await api.patch(`/part-requests/${id}`, payload)).data,
    onSuccess: () => {
      message.success('Pedido atualizado com sucesso');
      setOpenEditRequest(false);
      editRequestForm.resetFields();
      qc.invalidateQueries({ queryKey: ['part-requests'] });
      if (selectedId) qc.invalidateQueries({ queryKey: ['part-request-details', selectedId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Falha ao atualizar pedido'),
  });

  const approveItem = useMutation({
    mutationFn: async ({
      itemId,
      payload,
    }: {
      itemId: number;
      payload: {
        approvedQty: number;
        managerNote?: string | null;
        reasonCode?: string | null;
        reasonDetails?: string | null;
      };
    }) => (await api.post(`/part-requests/items/${itemId}/approve`, payload)).data,
    onSuccess: () => {
      message.success('Item aprovado com sucesso');
      setApproveState({ open: false, item: null });
      approveForm.resetFields();
      qc.invalidateQueries({ queryKey: ['part-requests'] });
      if (selectedId) qc.invalidateQueries({ queryKey: ['part-request-details', selectedId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Falha ao aprovar item'),
  });

  const rejectItem = useMutation({
    mutationFn: async ({
      itemId,
      payload,
    }: {
      itemId: number;
      payload: {
        managerNote?: string | null;
        reasonCode?: string | null;
        reasonDetails?: string | null;
      };
    }) => (await api.post(`/part-requests/items/${itemId}/reject`, payload)).data,
    onSuccess: () => {
      message.success('Item rejeitado com sucesso');
      setRejectState({ open: false, item: null });
      rejectForm.resetFields();
      qc.invalidateQueries({ queryKey: ['part-requests'] });
      if (selectedId) qc.invalidateQueries({ queryKey: ['part-request-details', selectedId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Falha ao rejeitar item'),
  });

  const batchApprove = useMutation({
    mutationFn: async ({
      requestId,
      items,
    }: {
      requestId: number;
      items: BatchRow[];
    }) =>
      (
        await api.post(`/part-requests/${requestId}/batch-approve`, {
          items: items.map((row) => ({
            itemId: row.itemId,
            approvedQty: Number(row.approvedQty || 0),
            managerNote: row.managerNote || null,
            reasonCode: row.reasonCode || null,
            reasonDetails: row.reasonDetails || null,
          })),
        })
      ).data,
    onSuccess: () => {
      message.success('Aprovação em lote realizada com sucesso');
      setOpenBatchApprove(false);
      setBatchRows([]);
      qc.invalidateQueries({ queryKey: ['part-requests'] });
      if (selectedId) qc.invalidateQueries({ queryKey: ['part-request-details', selectedId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Falha na aprovação em lote'),
  });

  const requestColumns = useMemo(
    () => [
      { title: 'Número', dataIndex: 'requestNumber', key: 'requestNumber', width: 170 },
      { title: 'Solicitante', dataIndex: 'requesterName', key: 'requesterName' },
      {
        title: 'Cliente',
        key: 'client',
        render: (_: any, row: PartRequest) => row.clientNameSnapshot || row.client?.name || '-',
      },
      {
        title: 'Tipo',
        dataIndex: 'requestType',
        key: 'requestType',
        width: 140,
        render: (value: PartRequest['requestType']) => REQUEST_TYPE_LABEL[value] || value,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 190,
        render: (value: PartRequest['status']) => requestStatusTag(value),
      },
      {
        title: 'Itens',
        key: 'itemsCount',
        width: 90,
        render: (_: any, row: PartRequest) => row.items?.length || 0,
      },
      {
        title: 'Ações',
        key: 'actions',
        width: 120,
        render: (_: any, row: PartRequest) => (
          <Button
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedId(row.id);
              setOpenDetails(true);
            }}
          >
            Ver
          </Button>
        ),
      },
    ],
    []
  );

  const catalogColumns = useMemo(
    () => [
      { title: 'Código', dataIndex: 'code', key: 'code', width: 160 },
      { title: 'Nome', dataIndex: 'name', key: 'name' },
      { title: 'Unidade', dataIndex: 'unit', key: 'unit', width: 100, render: (v: string) => v || 'UN' },
      { title: 'Categoria', dataIndex: 'category', key: 'category', width: 140, render: (v: string) => v || '-' },
      {
        title: 'Ativo',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 100,
        render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Sim' : 'Não'}</Tag>,
      },
    ],
    []
  );

  const currentProviderId = requestDetails?.providerId || requestDetails?.technicianId || null;

  const currentProviderFromList = useMemo(() => {
    if (!currentProviderId) return null;
    return (providersQuery.data || []).find((u) => Number(u.id) === Number(currentProviderId)) || null;
  }, [currentProviderId, providersQuery.data]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
          Pedido de Peças
        </Title>

        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()} block={isMobile}>
            Atualizar
          </Button>

          <Button icon={<UnorderedListOutlined />} onClick={() => setOpenCatalog(true)} block={isMobile}>
            Catálogo de itens
          </Button>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenNew(true)} block={isMobile}>
            Novo pedido
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 12 } }}>
        <Form
          form={filterForm}
          layout="vertical"
          onFinish={(values) => {
            setFilters({
              requestNumber: values.requestNumber || undefined,
              requesterName: values.requesterName || undefined,
              status: values.status || undefined,
            });
          }}
        >
          <Row gutter={[12, 8]}>
            <Col xs={24} md={8}>
              <Form.Item name="requestNumber" label="Número do pedido" style={{ marginBottom: 12 }}>
                <Input placeholder="Ex.: PP-2026-123456" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="requesterName" label="Solicitante" style={{ marginBottom: 12 }}>
                <Input placeholder="Nome do solicitante" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="status" label="Status" style={{ marginBottom: 12 }}>
                <Select allowClear placeholder="Selecione" options={REQUEST_STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Space wrap>
            <Button type="primary" htmlType="submit">
              Filtrar
            </Button>
            <Button
              onClick={() => {
                filterForm.resetFields();
                setFilters({});
              }}
            >
              Limpar
            </Button>
          </Space>
        </Form>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={requestColumns}
          dataSource={requests}
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="small"
        />
      </Card>

      <Modal
        title="Novo pedido de peças"
        open={openNew}
        onCancel={() => setOpenNew(false)}
        onOk={() => newForm.submit()}
        width={isMobile ? '95vw' : 980}
        confirmLoading={createRequest.isPending}
        destroyOnClose
      >
        <Form
          form={newForm}
          layout="vertical"
          initialValues={{
            originType: 'INTERNAL',
            requestType: 'ATENDIMENTO',
            fulfillmentType: 'ENTREGA',
            items: [
              {
                catalogItemId: null,
                partCode: '',
                partName: '',
                unit: 'UN',
                requestedQty: 1,
                itemRequestNote: '',
              },
            ],
          }}
          onFinish={(values) => {
            createRequest.mutate({
              ...values,
              originType: 'INTERNAL',
              items: (values.items || []).map((item: any) => ({
                partCode: item.partCode || null,
                partName: item.partName,
                unit: item.unit || 'UN',
                requestedQty: Number(item.requestedQty || 0),
                itemRequestNote: item.itemRequestNote || null,
              })),
            });
          }}
        >
          <Form.Item name="providerId" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="technicianId" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="clientNameSnapshot" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="providerNameSnapshot" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="technicianNameSnapshot" hidden>
            <Input />
          </Form.Item>

          <Row gutter={[12, 8]}>
            <Col xs={24} md={8}>
              <Form.Item name="originType" label="Origem" style={{ marginBottom: 12 }}>
                <Select disabled options={[{ value: 'INTERNAL', label: 'Interno' }]} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="requestType"
                label="Tipo"
                rules={[{ required: true, message: 'Informe o tipo' }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  options={[
                    { value: 'ATENDIMENTO', label: 'Atendimento' },
                    { value: 'TECNICO', label: 'Técnico' },
                    { value: 'OUTRO', label: 'Outro' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="fulfillmentType" label="Atendimento" style={{ marginBottom: 12 }}>
                <Select
                  allowClear
                  options={[
                    { value: 'RETIRADA', label: 'Retirada' },
                    { value: 'ENTREGA', label: 'Entrega' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="requesterName"
                label="Solicitante"
                rules={[{ required: true, message: 'Informe o solicitante' }]}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder="Nome do solicitante" disabled />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="requesterEmail" label="E-mail" style={{ marginBottom: 12 }}>
                <Input placeholder="E-mail" disabled />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="requesterDocument" label="Documento" style={{ marginBottom: 12 }}>
                <Input placeholder="CPF / matrícula / documento" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="requesterPhone" label="Telefone" style={{ marginBottom: 12 }}>
                <Input placeholder="Telefone" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="managerId" label="Gestor (ID)" style={{ marginBottom: 12 }}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="clientId" label="Cliente" style={{ marginBottom: 12 }}>
                <Select
                  showSearch
                  allowClear
                  loading={clientsQuery.isLoading}
                  placeholder={clientsQuery.isLoading ? 'Carregando clientes...' : 'Selecione o cliente'}
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={clientOptions}
                  notFoundContent={clientsQuery.isLoading ? <Spin size="small" /> : 'Nenhum cliente encontrado'}
                  onChange={(value) => {
                    const selected = clientOptions.find((c) => c.value === value);
                    newForm.setFieldsValue({
                      clientId: value || null,
                      clientNameSnapshot: selected?.raw?.name || null,
                    });
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="providerSelector" label="Prestador / Técnico" style={{ marginBottom: 12 }}>
                <Select
                  showSearch
                  allowClear
                  loading={providersQuery.isLoading}
                  placeholder={providersQuery.isLoading ? 'Carregando prestadores...' : 'Selecione o prestador'}
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={providerOptions}
                  notFoundContent={providersQuery.isLoading ? <Spin size="small" /> : 'Nenhum prestador encontrado'}
                  onChange={(value) => {
                    const selected = providerOptions.find((p) => p.value === value);
                    const selectedName = selected?.raw?.name || null;

                    newForm.setFieldsValue({
                      providerSelector: value || null,
                      providerId: value || null,
                      providerNameSnapshot: selectedName,
                      technicianId: value || null,
                      technicianNameSnapshot: selectedName,
                    });
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="region" label="Região" style={{ marginBottom: 12 }}>
                <Input placeholder="Região" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="city" label="Cidade" style={{ marginBottom: 12 }}>
                <Input placeholder="Cidade" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="state" label="UF" style={{ marginBottom: 12 }}>
                <Input placeholder="UF" maxLength={2} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="occurrence" label="Ocorrência" style={{ marginBottom: 12 }}>
                <Input placeholder="Ocorrência" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="naCode" label="NA" style={{ marginBottom: 12 }}>
                <Input placeholder="Número da NA" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="osCode" label="OS" style={{ marginBottom: 12 }}>
                <Input placeholder="Número da OS" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="scheduleSla" label="Prazo / SLA" style={{ marginBottom: 12 }}>
                <Input placeholder="Ex.: 24H" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="customerClassification" label="Classificação" style={{ marginBottom: 12 }}>
                <Input placeholder="Classificação" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="projectName" label="Projeto" style={{ marginBottom: 12 }}>
                <Input placeholder="Projeto" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="requestNotes" label="Observações gerais" style={{ marginBottom: 12 }}>
                <TextArea rows={3} placeholder="Descreva o contexto do pedido" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0 12px' }}>
            Itens
          </Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div style={{ display: 'grid', gap: 10 }}>
                {fields.map((field, idx) => (
                  <Card
                    key={field.key}
                    size="small"
                    styles={{ body: { padding: 12 } }}
                    title={`Item ${idx + 1}`}
                    extra={
                      fields.length > 1 ? (
                        <Button danger size="small" onClick={() => remove(field.name)}>
                          Remover
                        </Button>
                      ) : null
                    }
                  >
                    <Form.Item name={[field.name, 'partCode']} hidden>
                      <Input />
                    </Form.Item>

                    <Form.Item name={[field.name, 'partName']} hidden>
                      <Input />
                    </Form.Item>

                    <Form.Item name={[field.name, 'unit']} hidden>
                      <Input />
                    </Form.Item>

                    <Row gutter={[12, 8]}>
                      <Col xs={24} md={18}>
                        <Form.Item
                          name={[field.name, 'catalogItemId']}
                          label="Item cadastrado"
                          rules={[{ required: true, message: 'Selecione um item' }]}
                          style={{ marginBottom: 12 }}
                        >
                          <Select
                            showSearch
                            allowClear
                            placeholder={partsQuery.isLoading ? 'Carregando itens...' : 'Selecione um item cadastrado'}
                            loading={partsQuery.isLoading}
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={partOptions}
                            notFoundContent={partsQuery.isLoading ? <Spin size="small" /> : 'Nenhum item encontrado'}
                            onChange={(value) => {
                              const selected = partOptions.find((p) => p.value === value)?.raw;
                              if (!selected) return;

                              const currentItems = newForm.getFieldValue('items') || [];
                              const nextItems = currentItems.map((it: any, index: number) => {
                                if (index !== field.name) return it;
                                return {
                                  ...it,
                                  catalogItemId: selected.id,
                                  partCode: selected.code,
                                  partName: selected.name,
                                  unit: selected.unit || 'UN',
                                };
                              });

                              newForm.setFieldsValue({ items: nextItems });
                            }}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={6}>
                        <Form.Item
                          name={[field.name, 'requestedQty']}
                          label="Qtd."
                          rules={[{ required: true, message: 'Informe a quantidade' }]}
                          style={{ marginBottom: 12 }}
                        >
                          <InputNumber style={{ width: '100%' }} min={1} />
                        </Form.Item>
                      </Col>

                      <Col xs={24}>
                        <Form.Item
                          name={[field.name, 'itemRequestNote']}
                          label="Observação do item"
                          style={{ marginBottom: 0 }}
                        >
                          <TextArea rows={2} placeholder="Motivo / detalhe do item" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  onClick={() =>
                    add({
                      catalogItemId: null,
                      partCode: '',
                      partName: '',
                      unit: 'UN',
                      requestedQty: 1,
                      itemRequestNote: '',
                    })
                  }
                  block
                >
                  Adicionar item
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title="Catálogo de itens"
        open={openCatalog}
        onCancel={() => setOpenCatalog(false)}
        footer={null}
        width={isMobile ? '96vw' : 960}
        destroyOnClose
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Space wrap>
            <Search
              placeholder="Pesquisar por código, nome, categoria..."
              allowClear
              enterButton="Buscar"
              onSearch={(value) => setCatalogSearch(value)}
              style={{ maxWidth: 420 }}
            />

            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenCatalogCreate(true)}>
              Cadastrar item
            </Button>
          </Space>

          <Card styles={{ body: { padding: 0 } }}>
            <Table
              rowKey="id"
              columns={catalogColumns}
              dataSource={partsQuery.data || []}
              loading={partsQuery.isLoading}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 700 }}
              size="small"
            />
          </Card>
        </div>
      </Modal>

      <Modal
        title="Cadastrar item"
        open={openCatalogCreate}
        onCancel={() => setOpenCatalogCreate(false)}
        onOk={() => catalogForm.submit()}
        confirmLoading={createCatalogItem.isPending}
        destroyOnClose
      >
        <Form
          form={catalogForm}
          layout="vertical"
          initialValues={{
            unit: 'UN',
            isActive: true,
          }}
          onFinish={(values) => createCatalogItem.mutate(values)}
        >
          <Form.Item
            name="code"
            label="Código"
            rules={[{ required: true, message: 'Informe o código' }]}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder="Ex.: MOD-001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Nome"
            rules={[{ required: true, message: 'Informe o nome' }]}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder="Ex.: Módulo Rastreador" />
          </Form.Item>

          <Form.Item name="unit" label="Unidade" style={{ marginBottom: 12 }}>
            <Input placeholder="UN" />
          </Form.Item>

          <Form.Item name="category" label="Categoria" style={{ marginBottom: 12 }}>
            <Input placeholder="Ex.: Rastreador" />
          </Form.Item>

          <Form.Item name="brand" label="Marca" style={{ marginBottom: 12 }}>
            <Input placeholder="Ex.: Omnilink" />
          </Form.Item>

          <Form.Item name="description" label="Descrição" style={{ marginBottom: 12 }}>
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item name="isActive" label="Ativo" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={requestDetails?.requestNumber || 'Detalhes do pedido'}
        open={openDetails}
        onCancel={() => {
          setOpenDetails(false);
          setSelectedId(null);
        }}
        footer={null}
        width={isMobile ? '96vw' : 980}
        destroyOnClose
        centered
        styles={{
          body: {
            maxHeight: '78vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: 8,
          },
        }}
      >
        {isFetchingDetails || !requestDetails ? (
          <Text>Carregando...</Text>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <Space wrap>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  editRequestForm.setFieldsValue({
                    fulfillmentType: requestDetails.fulfillmentType ?? null,
                    invoiceNumber: requestDetails.invoiceNumber ?? null,
                    isExpedited: !!requestDetails.isExpedited,
                  });
                  setOpenEditRequest(true);
                }}
              >
                Editar pedido
              </Button>

              <Button icon={<HistoryOutlined />} onClick={() => setOpenHistory(true)}>
                Histórico
              </Button>

              <Button
                type="primary"
                icon={<CheckOutlined />}
                disabled={!batchableItems.length}
                onClick={() => {
                  setBatchRows(
                    batchableItems.map((item) => ({
                      itemId: item.id,
                      selected: true,
                      approvedQty: item.requestedQty,
                      managerNote: '',
                      reasonCode: undefined,
                      reasonDetails: '',
                    }))
                  );
                  setOpenBatchApprove(true);
                }}
              >
                Aprovar em lote
              </Button>
            </Space>

            <Card size="small" styles={{ body: { padding: 10 } }}>
              <Descriptions title="Dados gerais" bordered size="small" column={2}>
                <Descriptions.Item label="Número">{requestDetails.requestNumber}</Descriptions.Item>
                <Descriptions.Item label="Status">{requestStatusTag(requestDetails.status)}</Descriptions.Item>
                <Descriptions.Item label="Solicitante">{requestDetails.requesterName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tipo">
                  {REQUEST_TYPE_LABEL[requestDetails.requestType] || requestDetails.requestType}
                </Descriptions.Item>
                <Descriptions.Item label="Cliente">
                  {requestDetails.clientNameSnapshot || requestDetails.client?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Gestor">
                  {requestDetails.manager?.name || requestDetails.managerId || '-'}
                </Descriptions.Item>

                <Descriptions.Item label="Prestador / Técnico" span={2}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      {requestDetails.providerNameSnapshot || requestDetails.technicianNameSnapshot || '-'}
                    </span>

                    <Button
                      icon={<EyeOutlined />}
                      disabled={!currentProviderId}
                      onClick={() => {
                        if (!currentProviderId) return;
                        setProviderUser(currentProviderFromList);
                        setOpenProviderModal(true);
                      }}
                    >
                      Ver dados do prestador
                    </Button>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label="Atendimento">
                  {fulfillmentTypeLabel(requestDetails.fulfillmentType)}
                </Descriptions.Item>
                <Descriptions.Item label="Número da NF">{requestDetails.invoiceNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Expedido">
                  {requestDetails.isExpedited ? <Tag color="green">Sim</Tag> : <Tag>Não</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Observações" span={2}>
                  {requestDetails.requestNotes || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="Itens" styles={{ body: { padding: 10 } }}>
              <div style={{ display: 'grid', gap: 10 }}>
                {(requestDetails.items || []).length ? (
                  requestDetails.items!.map((item) => (
                    <Card key={item.id} size="small" styles={{ body: { padding: 10 } }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                          <div>
                            <Text strong style={{ display: 'block' }}>
                              {item.partName}
                            </Text>
                            <Text type="secondary">{item.partCode || 'Sem código'}</Text>
                          </div>
                          {itemStatusTag(item.itemStatus)}
                        </div>

                        <Row gutter={[8, 8]}>
                          <Col xs={12} md={6}>
                            <Text type="secondary">Solicitada</Text>
                            <div>{item.requestedQty}</div>
                          </Col>
                          <Col xs={12} md={6}>
                            <Text type="secondary">Aprovada</Text>
                            <div>{item.approvedQty}</div>
                          </Col>
                          <Col xs={12} md={6}>
                            <Text type="secondary">Entregue</Text>
                            <div>{item.deliveredQty}</div>
                          </Col>
                          <Col xs={12} md={6}>
                            <Text type="secondary">Pendente</Text>
                            <div>{item.pendingQty}</div>
                          </Col>
                        </Row>

                        <Space wrap>
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => {
                              setApproveState({ open: true, item });
                              approveForm.setFieldsValue({
                                approvedQty: item.requestedQty,
                                managerNote: undefined,
                                reasonCode: undefined,
                                reasonDetails: undefined,
                              });
                            }}
                          >
                            Aprovar
                          </Button>

                          <Button
                            danger
                            size="small"
                            icon={<CloseCircleOutlined />}
                            onClick={() => {
                              setRejectState({ open: true, item });
                              rejectForm.setFieldsValue({
                                managerNote: undefined,
                                reasonCode: 'REPROVADO_GERENTE',
                                reasonDetails: undefined,
                              });
                            }}
                          >
                            Rejeitar
                          </Button>
                        </Space>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Text type="secondary">Sem itens.</Text>
                )}
              </div>
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        title="Histórico do pedido"
        open={openHistory}
        onCancel={() => setOpenHistory(false)}
        footer={null}
        width={isMobile ? '96vw' : 820}
        destroyOnClose
      >
        <div style={{ display: 'grid', gap: 8 }}>
          {(requestDetails?.history || []).length ? (
            requestDetails!.history!.map((h) => (
              <Card key={h.id} size="small" styles={{ body: { padding: 10 } }}>
                <Space direction="vertical" size={2}>
                  <Text strong>{historyActionLabel(h.actionType)}</Text>
                  <Text type="secondary">
                    {h.performedByName || '-'}
                    {h.performedByProfile ? ` • ${h.performedByProfile}` : ''}
                  </Text>
                  <Text type="secondary">{new Date(h.createdAt).toLocaleString('pt-BR')}</Text>
                  {h.comments ? <Text>{h.comments}</Text> : null}
                </Space>
              </Card>
            ))
          ) : (
            <Text type="secondary">Sem histórico.</Text>
          )}
        </div>
      </Modal>

      <Modal
        title="Aprovação em lote"
        open={openBatchApprove}
        onCancel={() => {
          setOpenBatchApprove(false);
          setBatchRows([]);
        }}
        onOk={() => {
          if (!selectedId) return;

          const selectedRows = batchRows.filter((row) => row.selected);
          if (!selectedRows.length) {
            message.warning('Selecione pelo menos um item.');
            return;
          }

          batchApprove.mutate({
            requestId: selectedId,
            items: selectedRows,
          });
        }}
        confirmLoading={batchApprove.isPending}
        width={isMobile ? '96vw' : 900}
        destroyOnClose
      >
        <div style={{ display: 'grid', gap: 10 }}>
          {batchRows.map((row) => {
            const item = batchableItems.find((x) => x.id === row.itemId);
            if (!item) return null;

            return (
              <Card key={row.itemId} size="small" styles={{ body: { padding: 12 } }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <Checkbox
                    checked={row.selected}
                    onChange={(e) => {
                      setBatchRows((prev) =>
                        prev.map((r) =>
                          r.itemId === row.itemId ? { ...r, selected: e.target.checked } : r
                        )
                      );
                    }}
                  >
                    <Text strong>{item.partName}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      {item.partCode || 'Sem código'}
                    </Text>
                  </Checkbox>

                  <Row gutter={[12, 8]}>
                    <Col xs={24} md={6}>
                      <Text type="secondary">Solicitada</Text>
                      <div>{item.requestedQty}</div>
                    </Col>

                    <Col xs={24} md={6}>
                      <Text type="secondary">Qtd. aprovada</Text>
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={item.requestedQty}
                        value={row.approvedQty}
                        disabled={!row.selected}
                        onChange={(value) => {
                          setBatchRows((prev) =>
                            prev.map((r) =>
                              r.itemId === row.itemId ? { ...r, approvedQty: Number(value || 0) } : r
                            )
                          );
                        }}
                      />
                    </Col>

                    <Col xs={24} md={12}>
                      <Text type="secondary">Observação do gestor</Text>
                      <Input
                        value={row.managerNote}
                        disabled={!row.selected}
                        onChange={(e) => {
                          const value = e.target.value;
                          setBatchRows((prev) =>
                            prev.map((r) =>
                              r.itemId === row.itemId ? { ...r, managerNote: value } : r
                            )
                          );
                        }}
                      />
                    </Col>

                    <Col xs={24} md={12}>
                      <Text type="secondary">Motivo</Text>
                      <Select
                        allowClear
                        style={{ width: '100%' }}
                        value={row.reasonCode}
                        disabled={!row.selected}
                        options={REASON_OPTIONS}
                        onChange={(value) => {
                          setBatchRows((prev) =>
                            prev.map((r) =>
                              r.itemId === row.itemId ? { ...r, reasonCode: value } : r
                            )
                          );
                        }}
                      />
                    </Col>

                    <Col xs={24} md={12}>
                      <Text type="secondary">Detalhamento</Text>
                      <Input
                        value={row.reasonDetails}
                        disabled={!row.selected}
                        onChange={(e) => {
                          const value = e.target.value;
                          setBatchRows((prev) =>
                            prev.map((r) =>
                              r.itemId === row.itemId ? { ...r, reasonDetails: value } : r
                            )
                          );
                        }}
                      />
                    </Col>
                  </Row>
                </div>
              </Card>
            );
          })}
        </div>
      </Modal>

      <Modal
        title="Editar pedido"
        open={openEditRequest}
        onCancel={() => {
          setOpenEditRequest(false);
          editRequestForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await editRequestForm.validateFields();
            if (!selectedId) return;

            updateRequest.mutate({
              id: selectedId,
              payload: {
                fulfillmentType: values.fulfillmentType || null,
                invoiceNumber: values.invoiceNumber || null,
                isExpedited: !!values.isExpedited,
              },
            });
          } catch {}
        }}
        confirmLoading={updateRequest.isPending}
        destroyOnClose
      >
        <Form form={editRequestForm} layout="vertical">
          <Form.Item name="fulfillmentType" label="Atendimento" style={{ marginBottom: 12 }}>
            <Select
              allowClear
              options={[
                { value: 'RETIRADA', label: 'Retirada' },
                { value: 'ENTREGA', label: 'Entrega' },
              ]}
            />
          </Form.Item>

          <Form.Item name="invoiceNumber" label="Número da NF" style={{ marginBottom: 12 }}>
            <Input placeholder="Ex.: 123456" />
          </Form.Item>

          <Form.Item name="isExpedited" label="Expedido" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Aprovar item${approveState.item ? ` - ${approveState.item.partName}` : ''}`}
        open={approveState.open}
        onCancel={() => {
          setApproveState({ open: false, item: null });
          approveForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await approveForm.validateFields();
            if (!approveState.item) return;
            approveItem.mutate({
              itemId: approveState.item.id,
              payload: {
                approvedQty: Number(values.approvedQty),
                managerNote: values.managerNote || null,
                reasonCode: values.reasonCode || null,
                reasonDetails: values.reasonDetails || null,
              },
            });
          } catch {}
        }}
        confirmLoading={approveItem.isPending}
        destroyOnClose
      >
        <Form form={approveForm} layout="vertical">
          <Form.Item
            name="approvedQty"
            label="Quantidade aprovada"
            rules={[{ required: true }]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber style={{ width: '100%' }} min={0} max={approveState.item?.requestedQty || 0} />
          </Form.Item>

          <Form.Item name="managerNote" label="Observação do gestor" style={{ marginBottom: 12 }}>
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item name="reasonCode" label="Motivo" style={{ marginBottom: 12 }}>
            <Select allowClear options={REASON_OPTIONS} />
          </Form.Item>

          <Form.Item name="reasonDetails" label="Detalhamento" style={{ marginBottom: 0 }}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Rejeitar item${rejectState.item ? ` - ${rejectState.item.partName}` : ''}`}
        open={rejectState.open}
        onCancel={() => {
          setRejectState({ open: false, item: null });
          rejectForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await rejectForm.validateFields();
            if (!rejectState.item) return;
            rejectItem.mutate({
              itemId: rejectState.item.id,
              payload: {
                managerNote: values.managerNote || null,
                reasonCode: values.reasonCode || null,
                reasonDetails: values.reasonDetails || null,
              },
            });
          } catch {}
        }}
        confirmLoading={rejectItem.isPending}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical" initialValues={{ reasonCode: 'REPROVADO_GERENTE' }}>
          <Form.Item name="managerNote" label="Observação do gestor" style={{ marginBottom: 12 }}>
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item name="reasonCode" label="Motivo" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
            <Select options={REASON_OPTIONS} />
          </Form.Item>

          <Form.Item name="reasonDetails" label="Detalhamento" style={{ marginBottom: 0 }}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar src={abs(providerUser?.avatarUrl)} size={48}>
              {initial(providerUser?.name)}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600 }}>{providerUser?.name || 'Prestador'}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{providerUser?.role?.name || '-'}</div>
            </div>
          </div>
        }
        open={openProviderModal}
        onCancel={() => {
          setOpenProviderModal(false);
          setProviderUser(null);
        }}
        footer={
          <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Tooltip
              title={
                providerUser?.lat != null && providerUser?.lng != null ? 'Ver no mapa' : 'Sem coordenadas'
              }
            >
              <Button
                icon={<EnvironmentOutlined />}
                disabled={!(providerUser?.lat != null && providerUser?.lng != null)}
                onClick={() => {
                  if (!(providerUser?.lat != null && providerUser?.lng != null)) return;
                  const url = `https://www.google.com/maps?q=${providerUser.lat},${providerUser.lng}`;
                  window.open(url, '_blank');
                }}
              >
                Ver no mapa
              </Button>
            </Tooltip>

            <Button
              onClick={() => {
                setOpenProviderModal(false);
                setProviderUser(null);
              }}
            >
              Fechar
            </Button>
          </Space>
        }
        destroyOnClose
        width={isMobile ? '100%' : 900}
        style={isMobile ? { top: 0, padding: 0 } : undefined}
      >
        {providersQuery.isLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : providerUser ? (
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Card size="small" title="Profissional">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Cargo">{providerUser.role?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Gestor">{providerUser.manager?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Local">{providerUser.location?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      {providerUser.isActive ? 'Ativo' : 'Inativo'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card size="small" title="Contato">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="E-mail">{providerUser.email || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Telefone">{providerUser.phone || '—'}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Space>
            </Col>

            <Col xs={24} md={8}>
              <Card size="small" title="Área de atendimento">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Código fornecedor">{providerUser.vendorCode || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Código da área">{providerUser.serviceAreaCode || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Nome da área">{providerUser.serviceAreaName || '—'}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card size="small" title="Endereço">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Logradouro">
                    {providerUser.addressStreet || '—'} {providerUser.addressNumber || ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="Complemento">{providerUser.addressComplement || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Bairro">{providerUser.addressDistrict || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Cidade/UF">
                    {providerUser.addressCity || '—'}
                    {providerUser.addressState ? ` / ${providerUser.addressState}` : ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="CEP">{providerUser.addressZip || '—'}</Descriptions.Item>
                  <Descriptions.Item label="País">{providerUser.addressCountry || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Coordenadas">
                    {providerUser.lat != null && providerUser.lng != null ? (
                      <Tag
                        color="green"
                        style={{
                          maxWidth: '100%',
                          display: 'inline-block',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {providerUser.lat}, {providerUser.lng}
                      </Tag>
                    ) : (
                      <Tag>Sem coordenadas</Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        ) : (
          <Text type="secondary">Prestador não encontrado.</Text>
        )}
      </Modal>
    </div>
  );
}