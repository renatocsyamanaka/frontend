import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Grid,
  Input,
  InputNumber,
  List,
  Modal,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CopyOutlined,
  EyeOutlined,
  LoginOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const { Title, Text, Link } = Typography;
const { TextArea } = Input;

type ClientRow = {
  id: number;
  name: string;
};

type ProviderRow = {
  id: number;
  name: string;
  email?: string | null;
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

type PublicSearchItem = {
  id: number;
  partCode?: string | null;
  partName: string;
  unit?: string | null;
  requestedQty: number;
  approvedQty: number;
  deliveredQty: number;
  rejectedQty: number;
  pendingQty: number;
  itemStatus: string;
  itemRequestNote?: string | null;
  managerNote?: string | null;
  stockNote?: string | null;
  reasonCode?: string | null;
  reasonDetails?: string | null;
};

type PublicSearchResponse = {
  id: number;
  requestNumber: string;
  status: string;
  originType?: string;
  requesterName: string;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  requestType?: string | null;
  clientName?: string | null;
  providerName?: string | null;
  technicianName?: string | null;
  fulfillmentType?: string | null;
  city?: string | null;
  state?: string | null;
  requestNotes?: string | null;
  createdAt?: string;
  submittedAt?: string;
  items: PublicSearchItem[];
};

function unwrapList<T>(resData: any): T[] {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
}

function requestStatusTag(status?: string) {
  const map: Record<string, string> = {
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

  const labelMap: Record<string, string> = {
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

  return <Tag color={map[status || ''] || 'default'}>{labelMap[status || ''] || status || '-'}</Tag>;
}

function itemStatusTag(status?: string) {
  const map: Record<string, string> = {
    PENDING_REVIEW: 'gold',
    APPROVED_PARTIAL: 'orange',
    APPROVED: 'green',
    REJECTED: 'red',
    PARTIALLY_FULFILLED: 'cyan',
    FULFILLED: 'green',
    CANCELLED: 'default',
    REOPENED: 'purple',
  };

  const labelMap: Record<string, string> = {
    PENDING_REVIEW: 'Pendente de análise',
    APPROVED_PARTIAL: 'Aprovado parcialmente',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    PARTIALLY_FULFILLED: 'Atendido parcialmente',
    FULFILLED: 'Atendido',
    CANCELLED: 'Cancelado',
    REOPENED: 'Reaberto',
  };

  return <Tag color={map[status || ''] || 'default'}>{labelMap[status || ''] || status || '-'}</Tag>;
}

function fulfillmentTypeLabel(value?: string | null) {
  if (value === 'RETIRADA') return 'Retirada';
  if (value === 'ENTREGA') return 'Entrega';
  return '-';
}

function formatDateTime(v?: string | null) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('pt-BR');
}

function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function PublicPartRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const isLogged = !!user?.id;

  const [createOpen, setCreateOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<PublicSearchResponse | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [lastCreatedNumber, setLastCreatedNumber] = useState<string | null>(null);

  const [clientSearch, setClientSearch] = useState('');
  const [providerSearch, setProviderSearch] = useState('');

  const debouncedClientSearch = useDebouncedValue(clientSearch, 400);
  const debouncedProviderSearch = useDebouncedValue(providerSearch, 400);

  const [searchForm] = Form.useForm();
  const [createForm] = Form.useForm();

  const clientsQuery = useQuery<ClientRow[]>({
    queryKey: ['public-part-request-clients', debouncedClientSearch, isLogged],
    queryFn: async () => {
      if (isLogged) {
        const res = await api.get('/clients', {
          params: debouncedClientSearch ? { q: debouncedClientSearch } : {},
        });
        return unwrapList<ClientRow>(res.data);
      }

      const res = await api.get('/clients/autocomplete', {
        params: { q: debouncedClientSearch },
      });
      return unwrapList<ClientRow>(res.data);
    },
    enabled: createOpen && (isLogged || debouncedClientSearch.trim().length >= 2),
    staleTime: 30_000,
    retry: false,
  });

  const providersQuery = useQuery<ProviderRow[]>({
    queryKey: ['public-part-request-providers', debouncedProviderSearch, isLogged],
    queryFn: async () => {
      const res = await api.get('/users/providers', {
        params: isLogged
          ? (debouncedProviderSearch ? { q: debouncedProviderSearch } : {})
          : { q: debouncedProviderSearch },
      });
      return unwrapList<ProviderRow>(res.data);
    },
    enabled: createOpen && (isLogged || debouncedProviderSearch.trim().length >= 2),
    staleTime: 30_000,
    retry: false,
  });

  const partsQuery = useQuery<PartCatalogItem[]>({
    queryKey: ['public-part-request-items'],
    queryFn: async () => {
      const res = await api.get('/parts');
      return unwrapList<PartCatalogItem>(res.data);
    },
    staleTime: 60_000,
    retry: false,
  });

  const clientOptions = useMemo(() => {
    return (clientsQuery.data || []).map((c) => ({
      value: c.id,
      label: c.name,
      raw: c,
    }));
  }, [clientsQuery.data]);

  const providerOptions = useMemo(() => {
    return (providersQuery.data || []).map((u) => ({
      value: u.id,
      label: u.email ? `${u.name} (${u.email})` : u.name,
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
    if (!createOpen) return;

    createForm.setFieldsValue({
      requesterName: user?.name || '',
      requesterEmail: user?.email || '',
      requesterPhone: '',
      requesterDocument: '',
      requestType: 'ATENDIMENTO',
      fulfillmentType: 'ENTREGA',
      clientSelector: null,
      clientId: null,
      clientNameSnapshot: null,
      providerSelector: null,
      providerId: null,
      providerNameSnapshot: null,
      technicianId: null,
      technicianNameSnapshot: null,
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
    });

    setClientSearch('');
    setProviderSearch('');
  }, [createOpen, createForm, user]);

  const searchRequest = useMutation({
    mutationFn: async (payload: { requestNumber: string; email: string }) => {
      const res = await api.get('/part-requests/public/search', {
        params: payload,
      });
      return res.data as PublicSearchResponse;
    },
    onSuccess: (data) => {
      setSearchResult(data);
      setResultOpen(true);
      message.success('Pedido localizado com sucesso.');
    },
    onError: (e: any) => {
      setSearchResult(null);
      setResultOpen(false);
      message.error(e?.response?.data?.message || 'Não foi possível localizar o pedido.');
    },
  });

  const createRequest = useMutation({
    mutationFn: async (payload: any) => (await api.post('/part-requests/public', payload)).data,
    onSuccess: (data) => {
      const createdNumber = data?.requestNumber || null;
      const requesterEmail = createForm.getFieldValue('requesterEmail') || user?.email || '';

      setLastCreatedNumber(createdNumber);

      message.success(
        createdNumber
          ? `Solicitação enviada com sucesso: ${createdNumber}`
          : 'Solicitação enviada com sucesso.'
      );

      setCreateOpen(false);
      createForm.resetFields();
      setClientSearch('');
      setProviderSearch('');

      if (createdNumber) {
        searchForm.setFieldsValue({
          requestNumber: createdNumber,
          email: requesterEmail,
        });
      }
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Não foi possível enviar a solicitação.');
    },
  });

  const handleCopyNumber = async () => {
    if (!lastCreatedNumber) return;
    try {
      await navigator.clipboard.writeText(lastCreatedNumber);
      message.success('Número do pedido copiado.');
    } catch {
      message.warning('Não foi possível copiar automaticamente.');
    }
  };

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f5f5',
          padding: isMobile ? 12 : 24,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
          }}
        >
          <Row gutter={[24, 24]} align="top">
            <Col xs={24} lg={7} xl={6}>
              <Card
                style={{
                  position: isMobile ? 'static' : 'sticky',
                  top: 24,
                  borderRadius: 16,
                }}
                bodyStyle={{
                  padding: 24,
                }}
              >
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <div>
                    <Button
                      type="link"
                      icon={<LoginOutlined />}
                      style={{ paddingLeft: 0 }}
                      onClick={() => navigate('/login')}
                    >
                      Voltar ao login
                    </Button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: 280,
                    }}
                  >
                    <img
                      src="/logo.png"
                      alt="Logo"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 220,
                        objectFit: 'contain',
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <Title level={4} style={{ marginBottom: 8 }}>
                      Portal de Peças
                    </Title>
                    <Text type="secondary">
                      Consulte um pedido existente ou abra uma nova solicitação.
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={17} xl={18}>
              <div
                style={{
                  display: 'grid',
                  gap: 16,
                }}
              >
                <div>
                  <Title level={isMobile ? 3 : 2} style={{ marginBottom: 4 }}>
                    Portal de Solicitação de Peças
                  </Title>
                  <Text type="secondary">
                    Consulte um pedido existente ou abra uma nova solicitação.
                  </Text>
                </div>

                {lastCreatedNumber ? (
                  <Alert
                    type="success"
                    showIcon
                    message={`Solicitação enviada com sucesso. Número do pedido: ${lastCreatedNumber}`}
                    action={
                      <Space wrap>
                        <Button size="small" icon={<CopyOutlined />} onClick={handleCopyNumber}>
                          Copiar número
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          icon={<SearchOutlined />}
                          onClick={() => {
                            const email = createForm.getFieldValue('requesterEmail') || user?.email || '';
                            searchForm.setFieldsValue({
                              requestNumber: lastCreatedNumber,
                              email,
                            });
                          }}
                        >
                          Preencher consulta
                        </Button>
                      </Space>
                    }
                  />
                ) : null}

                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={12}>
                    <Card title="Consultar pedido" styles={{ body: { paddingBottom: 8 } }}>
                      <Form
                        form={searchForm}
                        layout="vertical"
                        onFinish={(values) => {
                          searchRequest.mutate({
                            requestNumber: values.requestNumber,
                            email: values.email,
                          });
                        }}
                      >
                        <Form.Item
                          name="requestNumber"
                          label="Número do pedido"
                          rules={[{ required: true, message: 'Informe o número do pedido' }]}
                        >
                          <Input placeholder="Ex.: PP-2026-123456" />
                        </Form.Item>

                        <Form.Item
                          name="email"
                          label="E-mail do solicitante"
                          rules={[
                            { required: true, message: 'Informe o e-mail do solicitante' },
                            { type: 'email', message: 'Informe um e-mail válido' },
                          ]}
                        >
                          <Input placeholder="Digite o e-mail usado na solicitação" />
                        </Form.Item>

                        <Space wrap>
                          <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SearchOutlined />}
                            loading={searchRequest.isPending}
                          >
                            Consultar pedido
                          </Button>

                          <Button
                            onClick={() => {
                              searchForm.resetFields();
                              setSearchResult(null);
                              setResultOpen(false);
                            }}
                          >
                            Limpar
                          </Button>
                        </Space>
                      </Form>
                    </Card>
                  </Col>

                  <Col xs={24} xl={12}>
                    <Card title="Nova solicitação">
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Text type="secondary">
                          Abra uma nova solicitação de peças. Você pode fazer isso com ou sem login.
                        </Text>

                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setCreateOpen(true)}
                          block={isMobile}
                        >
                          Nova solicitação de peças
                        </Button>

                        <Text type="secondary">
                          {isLogged
                            ? 'Seu nome e e-mail serão preenchidos automaticamente.'
                            : 'Se você não estiver logado, basta informar nome e e-mail.'}
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                </Row>

              </div>
            </Col>
          </Row>
        </div>
      </div>

      <Modal
        title="Resultado da consulta"
        open={resultOpen}
        onCancel={() => setResultOpen(false)}
        footer={[
          <Button key="close" onClick={() => setResultOpen(false)}>
            Fechar
          </Button>,
        ]}
        width={isMobile ? '96vw' : 1100}
      >
        {searchRequest.isPending ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : searchResult ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Número">{searchResult.requestNumber}</Descriptions.Item>
              <Descriptions.Item label="Status">{requestStatusTag(searchResult.status)}</Descriptions.Item>
              <Descriptions.Item label="Solicitante">{searchResult.requesterName || '-'}</Descriptions.Item>
              <Descriptions.Item label="E-mail">{searchResult.requesterEmail || '-'}</Descriptions.Item>
              <Descriptions.Item label="Telefone">{searchResult.requesterPhone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Cliente">{searchResult.clientName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Prestador">{searchResult.providerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Técnico">{searchResult.technicianName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Atendimento">
                {fulfillmentTypeLabel(searchResult.fulfillmentType)}
              </Descriptions.Item>
              <Descriptions.Item label="Cidade/UF">
                {[searchResult.city, searchResult.state].filter(Boolean).join(' / ') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Criado em">
                {formatDateTime(searchResult.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Enviado em">
                {formatDateTime(searchResult.submittedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Observações" span={2}>
                {searchResult.requestNotes || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5} style={{ marginBottom: 8 }}>
                Itens do pedido
              </Title>

              <List
                dataSource={searchResult.items || []}
                locale={{ emptyText: 'Sem itens.' }}
                renderItem={(item) => (
                  <List.Item>
                    <Card size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <Text strong>{item.partName}</Text>
                            <div>
                              <Text type="secondary">{item.partCode || 'Sem código'}</Text>
                            </div>
                          </div>

                          <div>{itemStatusTag(item.itemStatus)}</div>
                        </div>

                        <Row gutter={[8, 8]}>
                          <Col xs={12} md={4}>
                            <Text type="secondary">Solicitada</Text>
                            <div>{item.requestedQty}</div>
                          </Col>
                          <Col xs={12} md={4}>
                            <Text type="secondary">Aprovada</Text>
                            <div>{item.approvedQty}</div>
                          </Col>
                          <Col xs={12} md={4}>
                            <Text type="secondary">Entregue</Text>
                            <div>{item.deliveredQty}</div>
                          </Col>
                          <Col xs={12} md={4}>
                            <Text type="secondary">Rejeitada</Text>
                            <div>{item.rejectedQty}</div>
                          </Col>
                          <Col xs={12} md={4}>
                            <Text type="secondary">Pendente</Text>
                            <div>{item.pendingQty}</div>
                          </Col>
                          <Col xs={12} md={4}>
                            <Text type="secondary">Unidade</Text>
                            <div>{item.unit || '-'}</div>
                          </Col>
                        </Row>

                        {item.itemRequestNote ? (
                          <div>
                            <Text type="secondary">Observação do item</Text>
                            <div>{item.itemRequestNote}</div>
                          </div>
                        ) : null}

                        {item.managerNote ? (
                          <div>
                            <Text type="secondary">Observação do gestor</Text>
                            <div>{item.managerNote}</div>
                          </div>
                        ) : null}

                        {item.stockNote ? (
                          <div>
                            <Text type="secondary">Observação do estoque</Text>
                            <div>{item.stockNote}</div>
                          </div>
                        ) : null}

                        {item.reasonCode || item.reasonDetails ? (
                          <div>
                            <Text type="secondary">Motivo</Text>
                            <div>
                              {[item.reasonCode, item.reasonDetails].filter(Boolean).join(' — ')}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            </div>
          </div>
        ) : (
          <Result
            icon={<EyeOutlined />}
            title="Nenhum pedido consultado"
            subTitle="Preencha o número do pedido e o e-mail do solicitante para acompanhar a solicitação."
          />
        )}
      </Modal>

      <Modal
        title="Nova solicitação de peças"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        width={isMobile ? '96vw' : 980}
        confirmLoading={createRequest.isPending}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(values) => {
            createRequest.mutate({
              requesterName: values.requesterName,
              requesterEmail: values.requesterEmail || null,
              requesterPhone: values.requesterPhone || null,
              requesterDocument: values.requesterDocument || null,
              requestType: values.requestType,
              clientId: values.clientId || null,
              clientNameSnapshot: values.clientNameSnapshot || null,
              fulfillmentType: values.fulfillmentType || null,
              providerId: values.providerId || null,
              providerNameSnapshot: values.providerNameSnapshot || null,
              technicianId: values.technicianId || null,
              technicianNameSnapshot: values.technicianNameSnapshot || null,
              region: values.region || null,
              city: values.city || null,
              state: values.state || null,
              occurrence: values.occurrence || null,
              naCode: values.naCode || null,
              osCode: values.osCode || null,
              scheduleSla: values.scheduleSla || null,
              customerClassification: values.customerClassification || null,
              projectName: values.projectName || null,
              requestNotes: values.requestNotes || null,
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
          <Form.Item name="clientId" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="clientNameSnapshot" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="providerId" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="providerNameSnapshot" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="technicianId" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="technicianNameSnapshot" hidden>
            <Input />
          </Form.Item>

          <Row gutter={[12, 8]}>
            <Col xs={24} md={8}>
              <Form.Item
                name="requesterName"
                label="Nome do solicitante"
                rules={[{ required: true, message: 'Informe o nome do solicitante' }]}
              >
                <Input disabled={isLogged} placeholder="Digite seu nome" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="requesterEmail"
                label="E-mail"
                rules={[
                  { required: !isLogged, message: 'Informe o e-mail' },
                  { type: 'email', message: 'Informe um e-mail válido' },
                ]}
              >
                <Input disabled={isLogged} placeholder="Digite seu e-mail" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="requesterPhone" label="Telefone">
                <Input placeholder="Telefone para contato" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="requesterDocument" label="Documento">
                <Input placeholder="CPF / matrícula / documento" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="requestType"
                label="Tipo"
                rules={[{ required: true, message: 'Selecione o tipo' }]}
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
              <Form.Item name="fulfillmentType" label="Atendimento">
                <Select
                  allowClear
                  options={[
                    { value: 'RETIRADA', label: 'Retirada' },
                    { value: 'ENTREGA', label: 'Entrega' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="clientSelector"
                label="Cliente"
                rules={[{ required: true, message: 'Selecione o cliente' }]}
                extra={isLogged ? 'Você pode buscar ou visualizar todos.' : 'Digite ao menos 2 letras para buscar o cliente.'}
              >
                <Select
                  showSearch
                  allowClear
                  filterOption={false}
                  placeholder="Digite para buscar o cliente"
                  options={clientOptions}
                  onSearch={(value) => setClientSearch(value)}
                  notFoundContent={
                    clientsQuery.isFetching ? (
                      <Spin size="small" />
                    ) : !isLogged && debouncedClientSearch.trim().length < 2 ? (
                      'Digite ao menos 2 letras'
                    ) : (
                      'Nenhum cliente encontrado'
                    )
                  }
                  onChange={(value) => {
                    const selected = clientOptions.find((c) => c.value === value);
                    const selectedName = selected?.raw?.name || null;

                    createForm.setFieldsValue({
                      clientSelector: value || null,
                      clientId: value || null,
                      clientNameSnapshot: selectedName,
                    });
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="providerSelector"
                label="Prestador / Técnico"
                rules={[{ required: true, message: 'Selecione o prestador/técnico' }]}
                extra={isLogged ? 'Você pode buscar ou visualizar todos.' : 'Digite ao menos 2 letras para buscar o prestador.'}
              >
                <Select
                  showSearch
                  allowClear
                  filterOption={false}
                  placeholder="Digite para buscar o prestador"
                  options={providerOptions}
                  onSearch={(value) => setProviderSearch(value)}
                  notFoundContent={
                    providersQuery.isFetching ? (
                      <Spin size="small" />
                    ) : !isLogged && debouncedProviderSearch.trim().length < 2 ? (
                      'Digite ao menos 2 letras'
                    ) : (
                      'Nenhum prestador encontrado'
                    )
                  }
                  onChange={(value) => {
                    const selected = providerOptions.find((p) => p.value === value);
                    const selectedName = selected?.raw?.name || null;

                    createForm.setFieldsValue({
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
              <Form.Item name="region" label="Região">
                <Input placeholder="Região" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="city" label="Cidade">
                <Input placeholder="Cidade" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="state" label="UF">
                <Input placeholder="UF" maxLength={2} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="occurrence" label="Ocorrência">
                <Input placeholder="Ocorrência" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="naCode" label="NA">
                <Input placeholder="Número da NA" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="osCode" label="OS">
                <Input placeholder="Número da OS" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="scheduleSla" label="Prazo / SLA">
                <Input placeholder="Ex.: 24H" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="customerClassification" label="Classificação">
                <Input placeholder="Classificação" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="projectName" label="Projeto">
                <Input placeholder="Projeto" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="requestNotes" label="Observações gerais">
                <TextArea rows={3} placeholder="Descreva o contexto da solicitação" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0 12px' }}>
            Itens solicitados
          </Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div style={{ display: 'grid', gap: 10 }}>
                {fields.map((field, idx) => (
                  <Card
                    key={field.key}
                    size="small"
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
                        >
                          <Select
                            showSearch
                            allowClear
                            optionFilterProp="label"
                            placeholder={partsQuery.isLoading ? 'Carregando itens...' : 'Selecione um item'}
                            options={partOptions}
                            loading={partsQuery.isLoading}
                            filterOption={(input, option) =>
                              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                            }
                            notFoundContent={partsQuery.isLoading ? <Spin size="small" /> : 'Nenhum item encontrado'}
                            onChange={(value) => {
                              const selected = partOptions.find((p) => p.value === value)?.raw;
                              if (!selected) return;

                              const currentItems = createForm.getFieldValue('items') || [];
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

                              createForm.setFieldsValue({ items: nextItems });
                            }}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={6}>
                        <Form.Item
                          name={[field.name, 'requestedQty']}
                          label="Qtd."
                          rules={[{ required: true, message: 'Informe a quantidade' }]}
                        >
                          <InputNumber style={{ width: '100%' }} min={1} />
                        </Form.Item>
                      </Col>

                      <Col xs={24}>
                        <Form.Item name={[field.name, 'itemRequestNote']} label="Observação do item">
                          <TextArea rows={2} placeholder="Detalhe do item / motivo da solicitação" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
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
    </>
  );
}