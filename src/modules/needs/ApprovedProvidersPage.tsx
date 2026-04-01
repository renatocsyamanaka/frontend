import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { api } from '../../lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  'https://api.projetos-rc.online';

type ApprovedProviderItem = {
  id: number;
  needId: number;
  inviteId: number;
  status: string;
  fullName?: string | null;
  company?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  roleName?: string | null;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  reviewedBy?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  need?: {
    id: number;
    requestedName?: string | null;
    providerName?: string | null;
    requestedLocationText?: string | null;
    requestedCity?: string | null;
    requestedState?: string | null;
    requestedCep?: string | null;
    homologationStatus?: string | null;
    homologationReviewedAt?: string | null;
  } | null;
  invite?: {
    id: number;
    technicianName?: string | null;
    technicianEmail?: string | null;
    technicianPhone?: string | null;
    status?: string | null;
    openedAt?: string | null;
    usedAt?: string | null;
    lastSentAt?: string | null;
    expiresAt?: string | null;
  } | null;
  totals?: {
    documentsSent: number;
    documentsApproved: number;
  };
};

type ApprovedProvidersResponse = {
  items: ApprovedProviderItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ApprovedDocument = {
  id: number;
  registrationId: number;
  documentTypeId: number;
  typeName?: string | null;
  typeCode?: string | null;
  status: string;
  originalName: string;
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
  url?: string | null;
  notes?: string | null;
  uploadedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  canView: boolean;
  canDownload: boolean;
  viewUrl: string;
  downloadUrl: string;
};

type ApprovedDocumentsResponse = {
  registrationId: number;
  documents: ApprovedDocument[];
};

type ApprovedProviderDetailResponse = {
  registration: {
    id: number;
    status: string;
    fullName?: string | null;
    rg?: string | null;
    cpf?: string | null;
    birthDate?: string | null;
    motherName?: string | null;
    address?: string | null;
    district?: string | null;
    company?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    phone?: string | null;
    roleName?: string | null;
    cnpj?: string | null;
    email?: string | null;
    schedulingContactName?: string | null;
    schedulingContactEmail?: string | null;
    schedulingContactPhone?: string | null;
    paymentContactName?: string | null;
    paymentContactEmail?: string | null;
    paymentContactPhone?: string | null;
    witnessName?: string | null;
    witnessCpf?: string | null;
    witnessEmail?: string | null;
    witnessPhone?: string | null;
    bankName?: string | null;
    bankCode?: string | null;
    agency?: string | null;
    agencyDigit?: string | null;
    accountNumber?: string | null;
    accountDigit?: string | null;
    hasCltEmployees?: boolean;
    serviceOmnilinkWorkshop?: boolean;
    serviceLinkerWorkshop?: boolean;
    serviceOmnilinkExternal?: boolean;
    serviceLinkerExternal?: boolean;
    vehicleCar?: boolean;
    vehicleMoto?: boolean;
    vehicleTruck?: boolean;
    agreeTravel?: boolean;
    declarationAccepted?: boolean;
    reviewNotes?: string | null;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: {
      id: number;
      name?: string | null;
      email?: string | null;
    } | null;
  };
  invite: any;
  need: any;
  documents: ApprovedDocument[];
  requiredDocuments: ApprovedDocument[];
  additionalDocuments: ApprovedDocument[];
  progress?: {
    requiredTotal?: number;
    requiredApproved?: number;
    requiredPending?: number;
    additionalTotal?: number;
  };
};

function pageCardStyle(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: '1px solid #e7edf5',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
  };
}

function sectionCardStyle(): React.CSSProperties {
  return {
    borderRadius: 20,
    border: '1px solid #e6edf7',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
  };
}

function fieldCardStyle(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: '1px solid #edf2f7',
    background: '#fbfdff',
    minHeight: 88,
  };
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return '—';
  const d = dayjs(value);
  if (!d.isValid()) return '—';
  return withTime ? d.format('DD/MM/YYYY HH:mm') : d.format('DD/MM/YYYY');
}

function fileSize(size?: number | null) {
  if (!size) return '—';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function getStatusTag(status?: string | null) {
  const map: Record<string, { color: string; label: string }> = {
    APPROVED: { color: 'green', label: 'Aprovado' },
    REJECTED: { color: 'red', label: 'Reprovado' },
    SUBMITTED: { color: 'blue', label: 'Enviado' },
    SENT: { color: 'blue', label: 'Enviado' },
    UNDER_REVIEW: { color: 'gold', label: 'Em análise' },
    ADJUSTMENT_REQUIRED: { color: 'orange', label: 'Ajuste solicitado' },
    PENDING: { color: 'default', label: 'Pendente' },
    OPENED: { color: 'cyan', label: 'Aberto' },
    EXPIRED: { color: 'red', label: 'Expirado' },
    CANCELLED: { color: 'red', label: 'Cancelado' },
  };

  const item = map[String(status || '').toUpperCase()] || {
    color: 'default',
    label: status || '—',
  };

  return (
    <Tag
      color={item.color}
      style={{
        borderRadius: 999,
        paddingInline: 10,
        fontWeight: 500,
        margin: 0,
      }}
    >
      {item.label}
    </Tag>
  );
}

function resolveAssetUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base}${String(url).startsWith('/') ? '' : '/'}${url}`;
}

function isImageFile(doc?: ApprovedDocument | null) {
  if (!doc) return false;
  const mime = String(doc.mimeType || '').toLowerCase();
  const name = String(doc.originalName || doc.fileName || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

function isPdfFile(doc?: ApprovedDocument | null) {
  if (!doc) return false;
  const mime = String(doc.mimeType || '').toLowerCase();
  const name = String(doc.originalName || doc.fileName || '').toLowerCase();
  return mime.includes('pdf') || /\.pdf$/i.test(name);
}

function infoText(value?: string | null) {
  return value && String(value).trim() ? value : '—';
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <Title level={5} style={{ margin: 0 }}>
        {title}
      </Title>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <Card style={fieldCardStyle()} styles={{ body: { padding: '14px 16px' } }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {label}
        </Text>
        <Text strong style={{ fontSize: 15 }}>
          {infoText(value)}
        </Text>
      </div>
    </Card>
  );
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export default function ApprovedProvidersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState<string | undefined>(undefined);
  const [company, setCompany] = useState('');
  const [dateRange, setDateRange] = useState<any>(null);

  const [selectedRow, setSelectedRow] = useState<ApprovedProviderItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [documentsRegistrationId, setDocumentsRegistrationId] = useState<number | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ApprovedDocument | null>(null);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };

    if (query.trim()) p.q = query.trim();
    if (city.trim()) p.city = city.trim();
    if (state) p.state = state;
    if (company.trim()) p.company = company.trim();
    if (dateRange?.[0]) p.dateFrom = dayjs(dateRange[0]).format('YYYY-MM-DD');
    if (dateRange?.[1]) p.dateTo = dayjs(dateRange[1]).format('YYYY-MM-DD');

    return p;
  }, [page, limit, query, city, state, company, dateRange]);

  const listQuery = useQuery<ApprovedProvidersResponse>({
    queryKey: ['approved-providers', params],
    queryFn: async () => (await api.get('/need-homologation/approved', { params })).data,
  });

  const detailQuery = useQuery<ApprovedProviderDetailResponse>({
    queryKey: ['approved-provider-detail', selectedRow?.id],
    queryFn: async () =>
      (await api.get(`/need-homologation/approved/${selectedRow?.id}`)).data,
    enabled: !!selectedRow?.id && detailsOpen,
    retry: false,
  });

  const documentsQuery = useQuery<ApprovedDocumentsResponse>({
    queryKey: ['approved-provider-documents', documentsRegistrationId],
    queryFn: async () =>
      (await api.get(`/need-homologation/approved/${documentsRegistrationId}/documents`)).data,
    enabled: !!documentsRegistrationId && documentsOpen,
  });

  const handleSearch = () => {
    setPage(1);
    setQuery(search);
  };

  const handleClearFilters = () => {
    setSearch('');
    setQuery('');
    setCity('');
    setState(undefined);
    setCompany('');
    setDateRange(null);
    setPage(1);
    setLimit(10);
  };

  const openDetails = (row: ApprovedProviderItem) => {
    setSelectedRow(row);
    setDetailsOpen(true);
  };

  const openDocuments = (row: ApprovedProviderItem) => {
    setDocumentsRegistrationId(row.id);
    setDocumentsOpen(true);
  };

  const handlePreviewDocument = (doc: ApprovedDocument) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
    setPreviewLoading(true);
  };

  const handleDownloadDocument = (doc: ApprovedDocument) => {
    const fileUrl = resolveAssetUrl(doc.url) || doc.downloadUrl;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', doc.originalName || doc.fileName || 'arquivo');
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPreviewContent = () => {
    if (!previewDoc) return null;

    const fileUrl = resolveAssetUrl(previewDoc.url) || previewDoc.viewUrl;

    if (isImageFile(previewDoc)) {
      return (
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: 420,
            background: '#f8fafc',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <img
            src={fileUrl}
            alt={previewDoc.originalName}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
            }}
            onLoad={() => setPreviewLoading(false)}
            onError={() => {
              setPreviewLoading(false);
              message.error('Não foi possível abrir a imagem');
            }}
          />
        </div>
      );
    }

    if (isPdfFile(previewDoc)) {
      return (
        <iframe
          src={fileUrl}
          title={previewDoc.originalName}
          style={{
            width: '100%',
            height: '72vh',
            border: 'none',
            borderRadius: 12,
            background: '#fff',
          }}
          onLoad={() => setPreviewLoading(false)}
        />
      );
    }

    setTimeout(() => setPreviewLoading(false), 0);

    return (
      <div
        style={{
          display: 'grid',
          gap: 16,
          justifyItems: 'center',
          alignContent: 'center',
          minHeight: 320,
          textAlign: 'center',
          background: '#f8fafc',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <FileOutlined style={{ fontSize: 48 }} />
        <Space direction="vertical" size={4}>
          <Text strong>{previewDoc.originalName}</Text>
          <Text type="secondary">Pré-visualização não disponível para este formato.</Text>
        </Space>

        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadDocument(previewDoc)}
            style={{ borderRadius: 12 }}
          >
            Download
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => window.open(fileUrl, '_blank')}
            style={{ borderRadius: 12 }}
          >
            Abrir arquivo
          </Button>
        </Space>
      </div>
    );
  };

  const columns: ColumnsType<ApprovedProviderItem> = [
    {
      title: 'Prestador',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (_, row) => (
        <div style={{ display: 'grid', gap: 6 }}>
          <Text strong style={{ fontSize: 15 }}>
            {infoText(row.fullName)}
          </Text>
          <Text type="secondary">{infoText(row.company)}</Text>
        </div>
      ),
    },
    {
      title: 'Contato',
      key: 'contact',
      render: (_, row) => (
        <div style={{ display: 'grid', gap: 6 }}>
          <Text>{infoText(row.phone)}</Text>
          <Text type="secondary">{infoText(row.email)}</Text>
        </div>
      ),
    },
    {
      title: 'Cidade / UF',
      key: 'location',
      width: 170,
      render: (_, row) => (
        <div style={{ display: 'grid', gap: 6 }}>
          <Text>{infoText(row.city)}</Text>
          <Text type="secondary">{infoText(row.state)}</Text>
        </div>
      ),
    },
    {
      title: 'Documentos',
      key: 'docs',
      width: 170,
      render: (_, row) => (
        <div style={{ display: 'grid', gap: 6 }}>
          <Text>{row.totals?.documentsApproved ?? 0} aprovados</Text>
          <Text type="secondary">{row.totals?.documentsSent ?? 0} enviados</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (_, row) => getStatusTag(row.status),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 150,
      render: (_, row) => (
        <Space size={8}>
          <Tooltip title="Ver cadastro">
            <Button
              icon={<EyeOutlined />}
              style={{ borderRadius: 12 }}
              onClick={() => openDetails(row)}
            />
          </Tooltip>

          <Tooltip title="Ver documentos">
            <Button
              icon={<FileTextOutlined />}
              style={{ borderRadius: 12 }}
              onClick={() => openDocuments(row)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: 24,
        display: 'grid',
        gap: 16,
      }}
    >
      <Card
        style={pageCardStyle()}
        styles={{
          body: {
            padding: 28,
            background:
              'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,1) 100%)',
          },
        }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space size={10}>
                <TeamOutlined style={{ fontSize: 20 }} />
                <Title level={3} style={{ margin: 0 }}>
                  Prestadores aprovados
                </Title>
              </Space>

              <Text type="secondary" style={{ fontSize: 15 }}>
                Visualize os dados completos do cadastro e os documentos enviados no processo de homologação.
              </Text>
            </Space>
          </Col>

          <Col xs={24} lg="auto">
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => listQuery.refetch()}
                style={{ borderRadius: 12, minWidth: 120 }}
              >
                Atualizar
              </Button>

            </Space>
          </Col>
        </Row>
      </Card>

      <Card style={pageCardStyle()} styles={{ body: { padding: 20 } }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12} lg={8}>
            <Input
              placeholder="Buscar por nome, empresa, CPF, CNPJ, e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
              style={{ borderRadius: 12 }}
              allowClear
            />
          </Col>

          <Col xs={24} md={12} lg={4}>
            <Input
              placeholder="Cidade"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
              style={{ borderRadius: 12 }}
              allowClear
            />
          </Col>

          <Col xs={24} md={12} lg={4}>
            <Select
              placeholder="UF"
              allowClear
              value={state}
              onChange={(value) => {
                setState(value);
                setPage(1);
              }}
              options={UFS.map((uf) => ({ label: uf, value: uf }))}
              style={{ width: '100%' }}
            />
          </Col>

          <Col xs={24} md={12} lg={4}>
            <Input
              placeholder="Empresa"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setPage(1);
              }}
              style={{ borderRadius: 12 }}
              allowClear
            />
          </Col>

          <Col xs={24} lg={4}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(value) => {
                setDateRange(value);
                setPage(1);
              }}
              format="DD/MM/YYYY"
              placeholder={['Data inicial', 'Data final']}
            />
          </Col>

          <Col xs={24}>
            <Space wrap>
              <Button
                type="primary"
                onClick={handleSearch}
                style={{ borderRadius: 12, minWidth: 96 }}
              >
                Buscar
              </Button>
              <Button
                onClick={handleClearFilters}
                style={{ borderRadius: 12, minWidth: 110 }}
              >
                Limpar filtros
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card style={pageCardStyle()} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={listQuery.data?.items || []}
          loading={listQuery.isLoading}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nenhum prestador encontrado"
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: limit,
            total: listQuery.data?.pagination?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (nextPage, nextLimit) => {
              setPage(nextPage);
              setLimit(nextLimit);
            },
          }}
          scroll={{ x: 960 }}
        />
      </Card>

      <Modal
        open={detailsOpen}
        onCancel={() => {
          setDetailsOpen(false);
          setSelectedRow(null);
        }}
        footer={null}
        width={1200}
        centered
        destroyOnHidden
        title="Dados do cadastro do prestador"
      >
        {detailQuery.isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        ) : !detailQuery.data?.registration ? (
          <Alert
            type="warning"
            showIcon
            message="Não foi possível carregar os detalhes"
            style={{ borderRadius: 12 }}
          />
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            <Card style={sectionCardStyle()} styles={{ body: { padding: 18 } }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'grid', gap: 6 }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Resumo do cadastro
                  </Title>
                  <Text type="secondary">
                    Visualização organizada dos dados informados pelo prestador.
                  </Text>
                </div>
                {getStatusTag(detailQuery.data.registration.status)}
              </div>

              {detailQuery.data.registration.reviewNotes ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e7edf5',
                  }}
                >
                  <Text strong>Observação:</Text>{' '}
                  <Text>{detailQuery.data.registration.reviewNotes}</Text>
                </div>
              ) : null}
            </Card>

            <Card style={sectionCardStyle()} styles={{ body: { padding: 18 } }}>
              <SectionTitle title="Dados do prestador" />
              <Row gutter={[14, 14]}>
                <Col xs={24} md={12}>
                  <InfoField label="Nome completo" value={detailQuery.data.registration.fullName} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Função" value={detailQuery.data.registration.roleName} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="CPF" value={detailQuery.data.registration.cpf} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="RG" value={detailQuery.data.registration.rg} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Data de nascimento" value={formatDate(detailQuery.data.registration.birthDate)} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Nome da mãe" value={detailQuery.data.registration.motherName} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Telefone" value={detailQuery.data.registration.phone} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="E-mail" value={detailQuery.data.registration.email} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Empresa" value={detailQuery.data.registration.company} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="CNPJ" value={detailQuery.data.registration.cnpj} />
                </Col>
              </Row>
            </Card>

            <Card style={sectionCardStyle()} styles={{ body: { padding: 18 } }}>
              <SectionTitle title="Dados complementares" />
              <Row gutter={[14, 14]}>
                <Col xs={24} md={12}>
                  <InfoField label="Contato agendamento" value={detailQuery.data.registration.schedulingContactName} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="E-mail agendamento" value={detailQuery.data.registration.schedulingContactEmail} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Telefone agendamento" value={detailQuery.data.registration.schedulingContactPhone} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Contato pagamento" value={detailQuery.data.registration.paymentContactName} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="E-mail pagamento" value={detailQuery.data.registration.paymentContactEmail} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Telefone pagamento" value={detailQuery.data.registration.paymentContactPhone} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Enviado em" value={formatDate(detailQuery.data.registration.submittedAt, true)} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Status atual" value={detailQuery.data.registration.status} />
                </Col>
              </Row>
            </Card>

            <Card style={sectionCardStyle()} styles={{ body: { padding: 18 } }}>
              <SectionTitle title="Endereço" />
              <Row gutter={[14, 14]}>
                <Col xs={24} md={12}>
                  <InfoField label="Endereço" value={detailQuery.data.registration.address} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Bairro" value={detailQuery.data.registration.district} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Cidade" value={detailQuery.data.registration.city} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="UF" value={detailQuery.data.registration.state} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="CEP" value={detailQuery.data.registration.zipCode} />
                </Col>
              </Row>
            </Card>

            <Card style={sectionCardStyle()} styles={{ body: { padding: 18 } }}>
              <SectionTitle title="Dados bancários" />
              <Row gutter={[14, 14]}>
                <Col xs={24} md={12}>
                  <InfoField label="Banco" value={detailQuery.data.registration.bankName} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Código banco" value={detailQuery.data.registration.bankCode} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Agência" value={detailQuery.data.registration.agency} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Dígito agência" value={detailQuery.data.registration.agencyDigit} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Conta" value={detailQuery.data.registration.accountNumber} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Dígito conta" value={detailQuery.data.registration.accountDigit} />
                </Col>
              </Row>
            </Card>

            <Card style={sectionCardStyle()} styles={{ body: { padding: 18 } }}>
              <SectionTitle title="Testemunhas" />
              <Row gutter={[14, 14]}>
                <Col xs={24} md={12}>
                  <InfoField label="Nome da testemunha" value={detailQuery.data.registration.witnessName} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="CPF da testemunha" value={detailQuery.data.registration.witnessCpf} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="E-mail da testemunha" value={detailQuery.data.registration.witnessEmail} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoField label="Telefone da testemunha" value={detailQuery.data.registration.witnessPhone} />
                </Col>
              </Row>
            </Card>

            <Card style={sectionCardStyle()} styles={{ body: { padding: 18 } }}>
              <SectionTitle title="Atuação / perfil do prestador" />
              <Space wrap size={[10, 10]}>
                <Tag color={detailQuery.data.registration.hasCltEmployees ? 'blue' : 'default'} style={{ borderRadius: 999 }}>Funcionários CLT: {detailQuery.data.registration.hasCltEmployees ? 'Sim' : 'Não'}</Tag>
                <Tag color={detailQuery.data.registration.serviceOmnilinkWorkshop ? 'green' : 'default'} style={{ borderRadius: 999 }}>Oficina Omnilink: {detailQuery.data.registration.serviceOmnilinkWorkshop ? 'Sim' : 'Não'}</Tag>
                <Tag color={detailQuery.data.registration.serviceLinkerWorkshop ? 'green' : 'default'} style={{ borderRadius: 999 }}>Oficina Linker: {detailQuery.data.registration.serviceLinkerWorkshop ? 'Sim' : 'Não'}</Tag>
                <Tag color={detailQuery.data.registration.serviceOmnilinkExternal ? 'purple' : 'default'} style={{ borderRadius: 999 }}>Externo Omnilink: {detailQuery.data.registration.serviceOmnilinkExternal ? 'Sim' : 'Não'}</Tag>
                <Tag color={detailQuery.data.registration.serviceLinkerExternal ? 'purple' : 'default'} style={{ borderRadius: 999 }}>Externo Linker: {detailQuery.data.registration.serviceLinkerExternal ? 'Sim' : 'Não'}</Tag>
                <Tag color={detailQuery.data.registration.vehicleCar ? 'cyan' : 'default'} style={{ borderRadius: 999 }}>Carro: {detailQuery.data.registration.vehicleCar ? 'Sim' : 'Não'}</Tag>
                <Tag color={detailQuery.data.registration.vehicleMoto ? 'cyan' : 'default'} style={{ borderRadius: 999 }}>Moto: {detailQuery.data.registration.vehicleMoto ? 'Sim' : 'Não'}</Tag>
                <Tag color={detailQuery.data.registration.vehicleTruck ? 'cyan' : 'default'} style={{ borderRadius: 999 }}>Caminhão: {detailQuery.data.registration.vehicleTruck ? 'Sim' : 'Não'}</Tag>
                <Tag color={detailQuery.data.registration.agreeTravel ? 'gold' : 'default'} style={{ borderRadius: 999 }}>Aceita deslocamento: {detailQuery.data.registration.agreeTravel ? 'Sim' : 'Não'}</Tag>
              </Space>
            </Card>

            <Card style={sectionCardStyle()} styles={{ body: { padding: 18 } }}>
              <SectionTitle title="Resumo dos documentos enviados" />
              <Space wrap size={[10, 10]}>
                <Tag color="blue" style={{ borderRadius: 999 }}>
                  Obrigatórios: {detailQuery.data.progress?.requiredTotal ?? 0}
                </Tag>
                <Tag color="green" style={{ borderRadius: 999 }}>
                  Obrigatórios aprovados: {detailQuery.data.progress?.requiredApproved ?? 0}
                </Tag>
                <Tag color="orange" style={{ borderRadius: 999 }}>
                  Obrigatórios pendentes: {detailQuery.data.progress?.requiredPending ?? 0}
                </Tag>
                <Tag color="purple" style={{ borderRadius: 999 }}>
                  Adicionais: {detailQuery.data.progress?.additionalTotal ?? 0}
                </Tag>
              </Space>

              <div style={{ marginTop: 18 }}>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  style={{ borderRadius: 12 }}
                  onClick={() => {
                    setDocumentsRegistrationId(detailQuery.data.registration.id);
                    setDocumentsOpen(true);
                  }}
                >
                  Ver documentos enviados
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        open={documentsOpen}
        onCancel={() => {
          setDocumentsOpen(false);
          setDocumentsRegistrationId(null);
        }}
        footer={null}
        width={1080}
        title="Documentos do cadastro"
        destroyOnHidden
      >
        {documentsQuery.isLoading ? (
          <Text>Carregando documentos...</Text>
        ) : !documentsQuery.data?.documents?.length ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Nenhum documento encontrado"
          />
        ) : (
          <div style={{ display: 'grid', gap: 12, maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 }}>
            {documentsQuery.data.documents.map((doc) => (
              <Card
                key={doc.id}
                size="small"
                style={{
                  borderRadius: 18,
                  border: '1px solid #e7edf5',
                  background: '#fafcff',
                }}
                styles={{ body: { padding: 18 } }}
              >
                <Row gutter={[12, 12]} align="middle">
                  <Col xs={24} lg={10}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <Text strong style={{ fontSize: 16 }}>
                        {doc.typeName || 'Documento'}
                      </Text>
                      <Text>{doc.originalName}</Text>
                      <Text type="secondary">
                        {fileSize(doc.size)} • {formatDate(doc.uploadedAt, true)}
                      </Text>
                    </div>
                  </Col>

                  <Col xs={24} lg={4}>
                    <Space wrap>{getStatusTag(doc.status)}</Space>
                  </Col>

                  <Col xs={24} lg={10}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Button
                        icon={<EyeOutlined />}
                        style={{ borderRadius: 12 }}
                        onClick={() => handlePreviewDocument(doc)}
                        disabled={!doc.canView}
                      >
                        Abrir
                      </Button>

                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        style={{ borderRadius: 12 }}
                        onClick={() => handleDownloadDocument(doc)}
                        disabled={!doc.canDownload}
                      >
                        Baixar
                      </Button>
                    </div>
                  </Col>
                </Row>

                {doc.notes ? (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid #eef2f7',
                    }}
                  >
                    <Text type="secondary">{doc.notes}</Text>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={previewOpen}
        onCancel={() => {
          setPreviewOpen(false);
          setPreviewDoc(null);
          setPreviewLoading(false);
        }}
        title={previewDoc?.originalName || 'Visualizar arquivo'}
        width="90vw"
        style={{ top: 20 }}
        destroyOnHidden
        footer={
          previewDoc ? (
            <Space wrap>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadDocument(previewDoc)}
                style={{ borderRadius: 12 }}
              >
                Download
              </Button>
              <Button
                onClick={() => {
                  setPreviewOpen(false);
                  setPreviewDoc(null);
                  setPreviewLoading(false);
                }}
                style={{ borderRadius: 12 }}
              >
                Fechar
              </Button>
            </Space>
          ) : null
        }
      >
        <div
          style={{
            position: 'relative',
            minHeight: 320,
          }}
        >
          {previewLoading ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.65)',
                borderRadius: 12,
              }}
            >
              <Spin size="large" />
            </div>
          ) : null}

          {renderPreviewContent()}
        </div>
      </Modal>
    </div>
  );
}