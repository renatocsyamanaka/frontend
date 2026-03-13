import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
import {
  Button,
  Card,
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
} from 'antd';
import {
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea, Search } = Input;

type SimpleUser = {
  id: number;
  name: string;
  email?: string | null;
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
};

function unwrapList<T>(resData: any): T[] {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
}

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

export default function MyPartRequestsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { useBreakpoint } = Grid;
  const bp = useBreakpoint();
  const isMobile = !bp.md;

  const [filters, setFilters] = useState<{
    requestNumber?: string;
    status?: PartRequest['status'];
  }>({});

  const [openNew, setOpenNew] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [openCatalog, setOpenCatalog] = useState(false);

  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [filterForm] = Form.useForm();
  const [newForm] = Form.useForm();

  const queryParams = useMemo(() => {
    const params: Record<string, any> = { mine: true };
    if (filters.requestNumber) params.requestNumber = filters.requestNumber;
    if (filters.status) params.status = filters.status;
    return params;
  }, [filters]);

  const {
    data: requests = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<PartRequest[]>({
    queryKey: ['my-part-requests', queryParams],
    queryFn: async () => (await api.get('/part-requests', { params: queryParams })).data,
    keepPreviousData: true,
  });

  const {
    data: requestDetails,
    isFetching: isFetchingDetails,
  } = useQuery<PartRequest>({
    queryKey: ['my-part-request-details', selectedId],
    queryFn: async () => (await api.get(`/part-requests/${selectedId}`)).data,
    enabled: !!selectedId,
  });

  const clientsQuery = useQuery<ClientRow[]>({
    queryKey: ['clients', 'my-part-request'],
    queryFn: async () => {
      const res = await api.get('/clients');
      return unwrapList<ClientRow>(res.data);
    },
    staleTime: 60_000,
    retry: false,
  });

  const providersQuery = useQuery<SimpleUser[]>({
    queryKey: ['users', 'my-part-request'],
    queryFn: async () => {
      const res = await api.get('/users');
      return unwrapList<SimpleUser>(res.data);
    },
    staleTime: 60_000,
    retry: false,
  });

  const partsQuery = useQuery<PartCatalogItem[]>({
    queryKey: ['parts-catalog', 'my-part-request', catalogSearch],
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

  useEffect(() => {
    if (!openNew) return;

    newForm.setFieldsValue({
      originType: 'INTERNAL',
      requestType: 'ATENDIMENTO',
      fulfillmentType: 'ENTREGA',
      requesterName: user?.name || '',
      requesterEmail: user?.email || '',
    });
  }, [openNew, user, newForm]);

  const createRequest = useMutation({
    mutationFn: async (payload: any) => (await api.post('/part-requests', payload)).data,
    onSuccess: (data) => {
      message.success(`Pedido criado com sucesso: ${data.requestNumber}`);
      setOpenNew(false);
      newForm.resetFields();
      qc.invalidateQueries({ queryKey: ['my-part-requests'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Falha ao criar pedido'),
  });

  const requestColumns = useMemo(
    () => [
      { title: 'Número', dataIndex: 'requestNumber', key: 'requestNumber', width: 170 },
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
        title: 'Atendimento',
        dataIndex: 'fulfillmentType',
        key: 'fulfillmentType',
        width: 120,
        render: (value: PartRequest['fulfillmentType']) => fulfillmentTypeLabel(value),
      },
      {
        title: 'NF',
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        width: 120,
        render: (value: string | null | undefined) => value || '-',
      },
      {
        title: 'Expedido',
        dataIndex: 'isExpedited',
        key: 'isExpedited',
        width: 110,
        render: (value: boolean | undefined) =>
          value ? <Tag color="green">Sim</Tag> : <Tag>Não</Tag>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 180,
        render: (value: PartRequest['status']) => requestStatusTag(value),
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
          Meus Pedidos de Peças
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

      <Card bodyStyle={{ padding: 12 }}>
        <Form
          form={filterForm}
          layout="vertical"
          onFinish={(values) => {
            setFilters({
              requestNumber: values.requestNumber || undefined,
              status: values.status || undefined,
            });
          }}
        >
          <Row gutter={[12, 8]}>
            <Col xs={24} md={12}>
              <Form.Item name="requestNumber" label="Número do pedido" style={{ marginBottom: 12 }}>
                <Input placeholder="Ex.: PP-2026-123456" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
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

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={requestColumns}
          dataSource={requests}
          loading={isLoading}
          scroll={{ x: 1000 }}
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

          <Row gutter={[12, 8]}>
            <Col xs={24} md={8}>
              <Form.Item name="originType" label="Origem" style={{ marginBottom: 12 }}>
                <Select
                  options={[
                    { value: 'INTERNAL', label: 'Interno' },
                    { value: 'EXTERNAL_IDENTIFIED', label: 'Externo identificado' },
                  ]}
                />
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
              <Form.Item name="clientNameSnapshot" label="Nome cliente" style={{ marginBottom: 12 }}>
                <Input placeholder="Nome do cliente" />
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

            <Col xs={24} md={12}>
              <Form.Item name="providerNameSnapshot" label="Prestador" style={{ marginBottom: 12 }}>
                <Input placeholder="Prestador" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="technicianNameSnapshot" label="Técnico" style={{ marginBottom: 12 }}>
                <Input placeholder="Técnico" />
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
                    bodyStyle={{ padding: 12 }}
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
          <Search
            placeholder="Pesquisar por código, nome, categoria..."
            allowClear
            enterButton="Buscar"
            onSearch={(value) => setCatalogSearch(value)}
          />

          <Card bodyStyle={{ padding: 0 }}>
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
            <Card size="small" bodyStyle={{ padding: 10 }}>
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
                <Descriptions.Item label="Prestador">
                  {requestDetails.providerNameSnapshot || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Técnico">
                  {requestDetails.technicianNameSnapshot || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Atendimento">
                  {fulfillmentTypeLabel(requestDetails.fulfillmentType)}
                </Descriptions.Item>
                <Descriptions.Item label="Número da NF">
                  {requestDetails.invoiceNumber || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Expedido">
                  {requestDetails.isExpedited ? <Tag color="green">Sim</Tag> : <Tag>Não</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Observações" span={2}>
                  {requestDetails.requestNotes || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="Itens" bodyStyle={{ padding: 10 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                {(requestDetails.items || []).length ? (
                  requestDetails.items!.map((item) => (
                    <Card key={item.id} size="small" bodyStyle={{ padding: 10 }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                          <div>
                            <Text strong style={{ display: 'block' }}>{item.partName}</Text>
                            <Text type="secondary">{item.partCode || 'Sem código'}</Text>
                          </div>
                          {itemStatusTag(item.itemStatus)}
                        </div>

                        <Row gutter={[8, 8]}>
                          <Col xs={12} md={6}><Text type="secondary">Solicitada</Text><div>{item.requestedQty}</div></Col>
                          <Col xs={12} md={6}><Text type="secondary">Aprovada</Text><div>{item.approvedQty}</div></Col>
                          <Col xs={12} md={6}><Text type="secondary">Entregue</Text><div>{item.deliveredQty}</div></Col>
                          <Col xs={12} md={6}><Text type="secondary">Pendente</Text><div>{item.pendingQty}</div></Col>
                        </Row>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Text type="secondary">Sem itens.</Text>
                )}
              </div>
            </Card>

            <Card size="small" title="Histórico" bodyStyle={{ padding: 10 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                {(requestDetails.history || []).length ? (
                  requestDetails.history!.map((h) => (
                    <Card key={h.id} size="small" bodyStyle={{ padding: 10 }}>
                      <Space direction="vertical" size={2}>
                        <Text strong>{historyActionLabel(h.actionType)}</Text>
                        <Text type="secondary">
                          {h.performedByName || '-'}
                          {h.performedByProfile ? ` • ${h.performedByProfile}` : ''}
                        </Text>
                        <Text type="secondary">
                          {new Date(h.createdAt).toLocaleString('pt-BR')}
                        </Text>
                        {h.comments ? <Text>{h.comments}</Text> : null}
                      </Space>
                    </Card>
                  ))
                ) : (
                  <Text type="secondary">Sem histórico.</Text>
                )}
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}