import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Dropdown,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  AimOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  MoreOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';

const { useBreakpoint } = Grid;
const { Title, Text, Paragraph } = Typography;

type TechType = { id: number; name: string };
type SimpleUser = { id: number; name: string };

type NeedStatus = 'OPEN' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED';
type Tier = 'OURO' | 'PRATA' | 'BRONZE';
type StepStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';

type HomologationStatus =
  | 'NOT_SENT'
  | 'LINK_SENT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADJUSTMENT_REQUIRED'
  | 'APPROVED'
  | 'REJECTED';

type Need = {
  id: number;
  status: NeedStatus;
  requestedName: string;
  notes?: string | null;
  createdAt: string;

  requestedLocationText: string;
  requestedCity?: string | null;
  requestedState?: string | null;
  requestedCep?: string | null;

  requestedLat?: number | null;
  requestedLng?: number | null;

  techType?: TechType | null;
  requestedBy?: SimpleUser | null;

  providerName?: string | null;
  providerWhatsapp?: string | null;
  negotiationTier?: Tier | null;
  negotiationNotes?: string | null;

  homologTablesStatus?: StepStatus | null;
  homologDocsStatus?: StepStatus | null;
  homologContractStatus?: StepStatus | null;
  homologCrmStatus?: StepStatus | null;
  homologErpStatus?: StepStatus | null;

  homologationStatus?: HomologationStatus | null;
};

type Requester = { id: number; name: string; count?: number };

type InternalDocument = {
  id: number;
  title?: string | null;
  description?: string | null;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
};

type QuickTypeMode = 'ALL' | 'ATA' | 'PSO_SPOT';

const STATUS_OPTS = [
  { value: 'OPEN', label: 'Aberta' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'FULFILLED', label: 'Atendida' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

function fmtDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('pt-BR');
}

function cityUfText(r: Need) {
  const city = String(r.requestedCity || '').trim();
  const uf = String(r.requestedState || '').trim().toUpperCase();
  if (city && uf) return `${city}/${uf}`;
  if (city) return city;
  if (uf) return uf;
  return r.requestedLocationText || '—';
}

function getStatusMeta(status?: NeedStatus | null) {
  const map: Record<string, { color: string; label: string }> = {
    OPEN: { color: 'gold', label: 'Aberta' },
    IN_PROGRESS: { color: 'blue', label: 'Em andamento' },
    FULFILLED: { color: 'green', label: 'Atendida' },
    CANCELLED: { color: 'red', label: 'Cancelada' },
  };
  return map[String(status || '')] || { color: 'default', label: status || '—' };
}

function getStatusTag(status?: NeedStatus | null) {
  const info = getStatusMeta(status);
  return (
    <Tag color={info.color} style={{ borderRadius: 999 }}>
      {info.label}
    </Tag>
  );
}

function getHomologationMeta(status?: HomologationStatus | null) {
  const map: Record<string, { color: string; label: string }> = {
    NOT_SENT: { color: 'default', label: 'Não iniciado' },
    LINK_SENT: { color: 'blue', label: 'Link enviado' },
    IN_PROGRESS: { color: 'processing', label: 'Em preenchimento' },
    SUBMITTED: { color: 'cyan', label: 'Enviado' },
    UNDER_REVIEW: { color: 'gold', label: 'Em análise' },
    ADJUSTMENT_REQUIRED: { color: 'orange', label: 'Ajuste solicitado' },
    APPROVED: { color: 'green', label: 'Aprovado' },
    REJECTED: { color: 'red', label: 'Reprovado' },
  };
  return map[String(status || '')] || { color: 'default', label: status || '—' };
}

function getHomologationTag(status?: HomologationStatus | null) {
  const info = getHomologationMeta(status);
  return (
    <Tag color={info.color} style={{ borderRadius: 999 }}>
      {info.label}
    </Tag>
  );
}

function getStepTag(status?: StepStatus | null) {
  const map: Record<string, { color: string; label: string }> = {
    PENDENTE: { color: 'default', label: 'Pendente' },
    EM_ANDAMENTO: { color: 'processing', label: 'Em andamento' },
    CONCLUIDO: { color: 'green', label: 'Concluído' },
  };
  const info = map[String(status || '')] || { color: 'default', label: '—' };
  return (
    <Tag color={info.color} style={{ borderRadius: 999 }}>
      {info.label}
    </Tag>
  );
}

function formatCoord(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(6);
}

function hasCoords(lat?: number | null, lng?: number | null) {
  return lat !== null && lat !== undefined && lng !== null && lng !== undefined;
}

function buildGoogleMapsLink(lat?: number | null, lng?: number | null, address?: string | null) {
  if (hasCoords(lat, lng)) return `https://www.google.com/maps?q=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
}

function buildOsmEmbed(lat?: number | null, lng?: number | null) {
  if (!hasCoords(lat, lng)) return '';
  const dLat = 0.01;
  const dLng = 0.01;
  const bbox = `${Number(lng) - dLng}%2C${Number(lat) - dLat}%2C${Number(lng) + dLng}%2C${Number(lat) + dLat}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function resolveAttachmentUrl(url?: string | null) {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;

  const base = String(api.defaults.baseURL || '').replace(/\/+$/, '');
  const path = String(url).startsWith('/') ? String(url) : `/${String(url)}`;
  return `${base}${path}`;
}

function formatFileSize(bytes?: number | null) {
  const size = Number(bytes || 0);
  if (!size) return '0 KB';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function clampText(lines = 2): React.CSSProperties {
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
}

function normalizeTechName(name?: string | null) {
  return String(name || '').trim().toUpperCase();
}

function isAtaTech(name?: string | null) {
  const n = normalizeTechName(name);
  return n === 'ATA' || n.includes('ATA');
}

function isPsoOrSpotTech(name?: string | null) {
  const n = normalizeTechName(name);
  return n.includes('PSO') || n.includes('SPOT');
}

function getTechTypeIdByExactOrContains(techTypes: TechType[], keyword: string) {
  const upper = keyword.toUpperCase();
  const exact = techTypes.find((t) => normalizeTechName(t.name) === upper);
  if (exact) return exact.id;
  const contains = techTypes.find((t) => normalizeTechName(t.name).includes(upper));
  return contains?.id;
}

async function geocodeAddress(params: {
  requestedLocationText?: string;
  requestedCity?: string;
  requestedState?: string;
  requestedCep?: string;
}) {
  const parts = [
    params.requestedLocationText,
    params.requestedCity,
    params.requestedState,
    params.requestedCep,
    'Brasil',
  ]
    .filter(Boolean)
    .join(', ');

  if (!parts.trim()) {
    throw new Error('Preencha o endereço antes de buscar no mapa');
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(parts)}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Não foi possível consultar o mapa agora');
  }

  const data = await response.json();

  if (!Array.isArray(data) || !data.length) {
    throw new Error('Não encontramos esse endereço no mapa');
  }

  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
  };
}

function shellCardStyle(): React.CSSProperties {
  return {
    borderRadius: 26,
    border: '1px solid #e5e7eb',
    boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)',
  };
}

function softCardStyle(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: '1px solid #edf2f7',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
    height: '100%',
  };
}

function needCardStyle(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: '1px solid #e8eef5',
    boxShadow: '0 10px 26px rgba(15, 23, 42, 0.05)',
    width: '100%',
    overflow: 'hidden',
  };
}

function NeedCard({
  row,
  onOpenFlow,
  onEditAddress,
  onOpenMap,
  onChangeStatus,
}: {
  row: Need;
  onOpenFlow: () => void;
  onEditAddress: () => void;
  onOpenMap: () => void;
  onChangeStatus: (status: NeedStatus) => void;
}) {
  const statusMeta = getStatusMeta(row.status);
  const ata = isAtaTech(row.techType?.name);

  return (
    <Card
      style={needCardStyle()}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        },
      }}
    >
      <div
        style={{
          padding: 18,
          background:
            'linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 55%, rgba(239,246,255,0.8) 100%)',
          borderBottom: '1px solid #eef2f7',
        }}
      >
        <Space
          align="start"
          style={{
            width: '100%',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Space align="start" size={12} style={{ minWidth: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: ata ? '#ecfdf5' : '#eff6ff',
                color: ata ? '#16a34a' : '#2563eb',
                flexShrink: 0,
              }}
            >
              <BuildOutlined />
            </div>

            <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
              <Text strong style={{ fontSize: 16, ...clampText(2) }}>
                {row.requestedName || 'Sem nome'}
              </Text>

              <Space wrap size={[8, 6]}>
                <Tag style={{ borderRadius: 999 }}>#{row.id}</Tag>
                <Tag style={{ borderRadius: 999 }} icon={<ClockCircleOutlined />}>
                  {fmtDate(row.createdAt)}
                </Tag>
                {row.techType?.name ? (
                  <Tag color={ata ? 'green' : 'blue'} style={{ borderRadius: 999 }}>
                    {row.techType.name}
                  </Tag>
                ) : null}
              </Space>
            </div>
          </Space>

          <Space direction="vertical" size={6} align="end">
            {getStatusTag(row.status)}
            {getHomologationTag(row.homologationStatus)}
          </Space>
        </Space>
      </div>

      <div
        style={{
          padding: 18,
          display: 'grid',
          gap: 16,
        }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Card
              size="small"
              style={{ borderRadius: 18, border: '1px solid #eef2f7', height: 132 }}
              styles={{ body: { padding: 14, height: '100%' } }}
            >
              <Space align="start" size={10}>
                <EnvironmentOutlined style={{ marginTop: 3, color: '#2563eb' }} />
                <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                  <Text strong>Local</Text>
                  <Text>{cityUfText(row)}</Text>
                  <Text type="secondary" style={clampText(3)}>
                    {row.requestedLocationText || '—'}
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              size="small"
              style={{ borderRadius: 18, border: '1px solid #eef2f7', height: 132 }}
              styles={{ body: { padding: 14, height: '100%' } }}
            >
              <Space align="start" size={10}>
                <UserOutlined style={{ marginTop: 3, color: '#7c3aed' }} />
                <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                  <Text strong>Pessoas</Text>
                  <Text style={clampText(1)}>
                    Solicitante: {row.requestedBy?.name || '—'}
                  </Text>
                  <Text type="secondary" style={clampText(1)}>
                    Prestador: {row.providerName || 'Não definido'}
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              size="small"
              style={{ borderRadius: 18, border: '1px solid #eef2f7', height: 120 }}
              styles={{ body: { padding: 14, height: '100%' } }}
            >
              <Space align="start" size={10}>
                <CompassOutlined style={{ marginTop: 3, color: '#0891b2' }} />
                <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                  <Text strong>Coordenadas</Text>
                  <Text style={clampText(1)}>
                    Lat: {formatCoord(row.requestedLat)} • Lng: {formatCoord(row.requestedLng)}
                  </Text>
                  <Text type="secondary">
                    {hasCoords(row.requestedLat, row.requestedLng)
                      ? 'Localização validada'
                      : 'Sem coordenadas precisas'}
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              size="small"
              style={{ borderRadius: 18, border: '1px solid #eef2f7', height: 120 }}
              styles={{ body: { padding: 14, height: '100%' } }}
            >
              <Space align="start" size={10}>
                <CheckCircleOutlined style={{ marginTop: 3, color: '#16a34a' }} />
                <div style={{ display: 'grid', gap: 6 }}>
                  <Text strong>Etapas internas</Text>
                  <Space wrap size={[6, 6]}>
                    {getStepTag(row.homologTablesStatus)}
                    {getStepTag(row.homologDocsStatus)}
                    {getStepTag(row.homologContractStatus)}
                    {getStepTag(row.homologCrmStatus)}
                    {getStepTag(row.homologErpStatus)}
                  </Space>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {row.notes ? (
          <Card
            size="small"
            style={{ borderRadius: 18, border: '1px dashed #dbe4ee', background: '#fafcff' }}
            styles={{ body: { padding: 14 } }}
          >
            <Text strong>Observações</Text>
            <Paragraph style={{ marginTop: 8, marginBottom: 0, ...clampText(2) }}>
              {row.notes}
            </Paragraph>
          </Card>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Space wrap>
            <Button icon={<EyeOutlined />} onClick={onOpenFlow} style={{ borderRadius: 12 }}>
              {ata ? 'Cadastro ATA' : 'Homologação'}
            </Button>

            <Button icon={<EditOutlined />} onClick={onEditAddress} style={{ borderRadius: 12 }}>
              Endereço
            </Button>

            <Button icon={<GlobalOutlined />} onClick={onOpenMap} style={{ borderRadius: 12 }}>
              Mapa
            </Button>
          </Space>

          <Space wrap>
            <Text type="secondary">Status</Text>
            <Select
              value={row.status}
              options={STATUS_OPTS}
              style={{ width: 170 }}
              onChange={onChangeStatus}
            />

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'flow',
                    label: ata ? 'Abrir cadastro ATA' : 'Abrir homologação',
                    icon: <CheckCircleOutlined />,
                    onClick: onOpenFlow,
                  },
                  {
                    key: 'endereco',
                    label: 'Editar endereço',
                    icon: <EnvironmentOutlined />,
                    onClick: onEditAddress,
                  },
                  {
                    key: 'mapa',
                    label: 'Abrir no mapa',
                    icon: <CompassOutlined />,
                    onClick: onOpenMap,
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button icon={<MoreOutlined />} style={{ borderRadius: 12 }} />
            </Dropdown>
          </Space>
        </div>
      </div>

      <div
        style={{
          height: 4,
          background:
            statusMeta.color === 'green'
              ? 'linear-gradient(90deg,#22c55e,#16a34a)'
              : statusMeta.color === 'blue'
              ? 'linear-gradient(90deg,#60a5fa,#2563eb)'
              : statusMeta.color === 'gold'
              ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
              : 'linear-gradient(90deg,#f87171,#dc2626)',
        }}
      />
    </Card>
  );
}

export default function NeedsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [formFilter] = Form.useForm();
  const [formAta] = Form.useForm();
  const [formPsoSpot] = Form.useForm();
  const [formAddress] = Form.useForm();

  const [openAtaRequest, setOpenAtaRequest] = useState(false);
  const [openPsoSpotRequest, setOpenPsoSpotRequest] = useState(false);
  const [openAddress, setOpenAddress] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<Need | null>(null);

  const [openInternalDocs, setOpenInternalDocs] = useState(false);
  const [previewInternalDoc, setPreviewInternalDoc] = useState<InternalDocument | null>(null);

  const [locatingAta, setLocatingAta] = useState(false);
  const [locatingPsoSpot, setLocatingPsoSpot] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);

  const [searchingMapAta, setSearchingMapAta] = useState(false);
  const [searchingMapPsoSpot, setSearchingMapPsoSpot] = useState(false);
  const [searchingMapAddress, setSearchingMapAddress] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 6;

  const [quickTypeMode, setQuickTypeMode] = useState<QuickTypeMode>('ALL');

  const initial = {
    status: params.get('status') || undefined,
    techTypeId: params.get('techTypeId') ? Number(params.get('techTypeId')) : undefined,
    requesterId: params.get('requesterId') ? Number(params.get('requesterId')) : undefined,
    q: params.get('q') || '',
  };

  useEffect(() => {
    formFilter.setFieldsValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [initial.status, initial.techTypeId, initial.requesterId, initial.q, quickTypeMode]);

  const { data: techTypes = [] } = useQuery<TechType[]>({
    queryKey: ['techtypes'],
    queryFn: async () => (await api.get('/techtypes')).data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: serverRequesters = [] } = useQuery<Requester[]>({
    queryKey: ['needs-requesters'],
    queryFn: async () => (await api.get('/needs/requesters')).data,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const { data = [], isLoading, refetch, isFetching } = useQuery<Need[]>({
    queryKey: ['needs', initial],
    queryFn: async () => {
      const res = await api.get('/needs', {
        params: {
          status: initial.status,
          techTypeId: initial.techTypeId,
          requesterId: initial.requesterId,
          q: initial.q || undefined,
        },
      });

      let rows: Need[] = res.data;

      if (initial.q) {
        const s = initial.q.toLowerCase();
        rows = rows.filter(
          (n) =>
            String(n.requestedLocationText || '').toLowerCase().includes(s) ||
            String(n.requestedName || '').toLowerCase().includes(s) ||
            String(n.providerName || '').toLowerCase().includes(s)
        );
      }

      return rows;
    },
    placeholderData: (prev) => prev,
  });

  const {
    data: internalDocs = [],
    isLoading: loadingInternalDocs,
    refetch: refetchInternalDocs,
  } = useQuery<InternalDocument[]>({
    queryKey: ['needs-internal-documents'],
    queryFn: async () => {
      const res = await api.get('/needs/internal-documents');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: openInternalDocs,
  });

  const derivedRequesters: Requester[] = useMemo(() => {
    const map = new Map<number, Requester>();
    data.forEach((n) => {
      const u = n.requestedBy;
      if (u?.id) {
        const cur = map.get(u.id) || { id: u.id, name: u.name, count: 0 };
        cur.count = (cur.count || 0) + 1;
        map.set(u.id, cur);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const requesters = serverRequesters.length ? serverRequesters : derivedRequesters;

  const ataTechTypeId = useMemo(() => getTechTypeIdByExactOrContains(techTypes, 'ATA'), [techTypes]);

  const filteredByQuickMode = useMemo(() => {
    if (quickTypeMode === 'ALL') return data;
    if (quickTypeMode === 'ATA') return data.filter((n) => isAtaTech(n.techType?.name));
    return data.filter((n) => isPsoOrSpotTech(n.techType?.name));
  }, [data, quickTypeMode]);

  const paginatedNeeds = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredByQuickMode.slice(start, end);
  }, [filteredByQuickMode, page]);

  const createNeed = useMutation({
    mutationFn: async (payload: any) => (await api.post('/needs', payload)).data,
    onSuccess: async () => {
      message.success('Solicitação criada com sucesso');
      setOpenAtaRequest(false);
      setOpenPsoSpotRequest(false);
      formAta.resetFields();
      formPsoSpot.resetFields();
      await qc.invalidateQueries({ queryKey: ['needs'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao criar solicitação');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: NeedStatus }) =>
      (await api.patch(`/needs/${id}/status`, { status })).data,
    onSuccess: async () => {
      message.success('Status atualizado');
      await qc.invalidateQueries({ queryKey: ['needs'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao atualizar status');
    },
  });

  const updateAddress = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) =>
      (await api.patch(`/needs/${id}/address`, payload)).data,
    onSuccess: async () => {
      message.success('Endereço atualizado');
      setOpenAddress(false);
      setSelectedNeed(null);
      await qc.invalidateQueries({ queryKey: ['needs'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao atualizar endereço');
    },
  });

  const uploadInternalDocument = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);

      return (
        await api.post('/needs/internal-documents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: async () => {
      message.success('Documento interno enviado com sucesso');
      await refetchInternalDocs();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao enviar documento interno');
    },
  });

  const deleteInternalDocument = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/needs/internal-documents/${id}`)).data,
    onSuccess: async () => {
      message.success('Documento interno excluído com sucesso');
      await refetchInternalDocs();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao excluir documento interno');
    },
  });

  const totals = useMemo(() => {
    return {
      total: data.length,
      abertas: data.filter((x) => x.status === 'OPEN').length,
      andamento: data.filter((x) => x.status === 'IN_PROGRESS').length,
      atendidas: data.filter((x) => x.status === 'FULFILLED').length,
      homologacaoAprovada: data.filter((x) => x.homologationStatus === 'APPROVED').length,
    };
  }, [data]);

  const applyFilters = (values: any) => {
    const next = new URLSearchParams();

    if (values.status) next.set('status', values.status);
    if (values.techTypeId) next.set('techTypeId', String(values.techTypeId));
    if (values.requesterId) next.set('requesterId', String(values.requesterId));
    if (values.q) next.set('q', String(values.q).trim());

    setParams(next);
  };

  const clearFilters = () => {
    formFilter.resetFields();
    setParams({});
  };

  const openAddressModal = (need: Need) => {
    setSelectedNeed(need);
    setOpenAddress(true);
    formAddress.setFieldsValue({
      requestedLocationText: need.requestedLocationText || '',
      requestedCity: need.requestedCity || '',
      requestedState: need.requestedState || '',
      requestedCep: need.requestedCep || '',
      requestedLat: need.requestedLat ?? null,
      requestedLng: need.requestedLng ?? null,
    });
  };

  const openNeedFlow = (need: Need) => {
    if (isAtaTech(need.techType?.name)) {
      navigate(`/requisicoes/${need.id}/ata`);
      return;
    }

    navigate(`/requisicoes/${need.id}/homologacao`);
  };

  const capturePreciseLocation = async (
    form: any,
    mode: 'ata' | 'pso-spot' | 'address'
  ) => {
    const setLoading =
      mode === 'ata'
        ? setLocatingAta
        : mode === 'pso-spot'
        ? setLocatingPsoSpot
        : setLocatingAddress;

    if (!navigator.geolocation) {
      message.error('Seu navegador não suporta geolocalização');
      return;
    }

    setLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      form.setFieldsValue({
        requestedLat: Number(position.coords.latitude.toFixed(6)),
        requestedLng: Number(position.coords.longitude.toFixed(6)),
      });

      message.success('Localização precisa capturada com sucesso');
    } catch {
      message.error('Não foi possível capturar sua localização precisa');
    } finally {
      setLoading(false);
    }
  };

  const searchCoordsByAddress = async (
    form: any,
    mode: 'ata' | 'pso-spot' | 'address'
  ) => {
    const setLoading =
      mode === 'ata'
        ? setSearchingMapAta
        : mode === 'pso-spot'
        ? setSearchingMapPsoSpot
        : setSearchingMapAddress;

    try {
      setLoading(true);
      const values = form.getFieldsValue();
      const result = await geocodeAddress(values);

      form.setFieldsValue({
        requestedLat: Number(result.lat.toFixed(6)),
        requestedLng: Number(result.lng.toFixed(6)),
      });

      message.success('Coordenadas localizadas no mapa');
    } catch (error: any) {
      message.error(error?.message || 'Não foi possível localizar esse endereço');
    } finally {
      setLoading(false);
    }
  };

  const renderMapPreview = (form: any) => {
    const lat = form.getFieldValue('requestedLat');
    const lng = form.getFieldValue('requestedLng');
    const address = form.getFieldValue('requestedLocationText');
    const embedUrl = buildOsmEmbed(lat, lng);

    return (
      <div style={{ display: 'grid', gap: 12, width: '100%', overflowX: 'hidden' }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Card size="small" style={{ borderRadius: 18 }} styles={{ body: { padding: 12 } }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Latitude">{formatCoord(lat)}</Descriptions.Item>
                <Descriptions.Item label="Longitude">{formatCoord(lng)}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card size="small" style={{ borderRadius: 18 }} styles={{ body: { padding: 12 } }}>
              <Space wrap>
                <Button
                  icon={<GlobalOutlined />}
                  disabled={!address && !hasCoords(lat, lng)}
                  onClick={() => window.open(buildGoogleMapsLink(lat, lng, address), '_blank')}
                >
                  Abrir no Google Maps
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        {embedUrl ? (
          <div
            style={{
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
              background: '#f8fafc',
              width: '100%',
            }}
          >
            <iframe
              title="Mapa da localização"
              src={embedUrl}
              style={{ width: '100%', height: 260, border: 0 }}
              loading="lazy"
            />
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Capture ou busque uma localização para visualizar o mapa"
          />
        )}
      </div>
    );
  };

  const uploadInternalProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      uploadInternalDocument.mutate(file);
      return false;
    },
  };

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'visible',
        overflowX: 'hidden',
        height: 'auto',
        maxHeight: 'none',
      }}
    >
      <Card
        style={{
          ...shellCardStyle(),
          overflow: 'hidden',
        }}
        styles={{
          body: {
            display: 'grid',
            gap: 22,
            padding: isMobile ? 16 : 24,
            background:
              'linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 50%, rgba(239,246,255,0.72) 100%)',
          },
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <Space wrap>
              <Tag color="blue" style={{ borderRadius: 999 }}>
                Gestão de prospecção
              </Tag>
              <Tag style={{ borderRadius: 999 }}>{totals.total} solicitações</Tag>
            </Space>

            <Title level={3} style={{ margin: 0 }}>
              Prospecção de técnicos
            </Title>

            <Text type="secondary">
              Solicitação ATA separada da solicitação PSO/SPOT, com rolagem única da página.
            </Text>
          </div>

          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              loading={isFetching}
              onClick={() => refetch()}
              style={{ borderRadius: 12 }}
            >
              Atualizar
            </Button>

            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => setOpenInternalDocs(true)}
              style={{ borderRadius: 12 }}
            >
              Documentos internos
            </Button>

            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={() => {
                formPsoSpot.resetFields();
                setOpenPsoSpotRequest(true);
              }}
              style={{ borderRadius: 12 }}
            >
              Solicitar PSO/SPOT
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                formAta.resetFields();
                if (ataTechTypeId) {
                  formAta.setFieldsValue({ techTypeId: ataTechTypeId });
                }
                setOpenAtaRequest(true);
              }}
              style={{ borderRadius: 12 }}
            >
              Solicitar ATA
            </Button>
          </Space>
        </div>

        <Row gutter={[14, 14]}>
          <Col xs={24} sm={12} xl={6}>
            <Card style={softCardStyle()} styles={{ body: { padding: 18 } }}>
              <Statistic title="Total" value={totals.total} prefix={<BuildOutlined />} />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card style={softCardStyle()} styles={{ body: { padding: 18 } }}>
              <Statistic title="Abertas" value={totals.abertas} prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card style={softCardStyle()} styles={{ body: { padding: 18 } }}>
              <Statistic title="Em andamento" value={totals.andamento} prefix={<ReloadOutlined />} />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card style={softCardStyle()} styles={{ body: { padding: 18 } }}>
              <Statistic title="Homologadas" value={totals.homologacaoAprovada} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
        </Row>

        <Card
          size="small"
          style={{ borderRadius: 22, border: '1px solid #edf2f7' }}
          styles={{ body: { padding: 16 } }}
        >
          <Space wrap>
            <Text strong>Separar visualização:</Text>

            <Button
              type={quickTypeMode === 'ALL' ? 'primary' : 'default'}
              onClick={() => setQuickTypeMode('ALL')}
              style={{ borderRadius: 999 }}
            >
              Todos
            </Button>

            <Button
              type={quickTypeMode === 'ATA' ? 'primary' : 'default'}
              onClick={() => setQuickTypeMode('ATA')}
              style={{ borderRadius: 999 }}
            >
              ATA
            </Button>

            <Button
              type={quickTypeMode === 'PSO_SPOT' ? 'primary' : 'default'}
              onClick={() => setQuickTypeMode('PSO_SPOT')}
              style={{ borderRadius: 999 }}
            >
              PSO/SPOT
            </Button>
          </Space>
        </Card>
      </Card>

      <Card style={shellCardStyle()} styles={{ body: { padding: isMobile ? 14 : 20 } }}>
        <Form form={formFilter} layout="vertical" onFinish={applyFilters}>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} md={6}>
              <Form.Item name="status" label="Status" style={{ marginBottom: 0 }}>
                <Select allowClear options={STATUS_OPTS} placeholder="Todos" />
              </Form.Item>
            </Col>

            <Col xs={24} md={5}>
              <Form.Item name="techTypeId" label="Tipo técnico" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="Todos"
                  options={techTypes.map((t) => ({ value: t.id, label: t.name }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={5}>
              <Form.Item name="requesterId" label="Solicitante" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="Todos"
                  options={requesters.map((r) => ({
                    value: r.id,
                    label: r.count ? `${r.name} (${r.count})` : r.name,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={5}>
              <Form.Item name="q" label="Buscar" style={{ marginBottom: 0 }}>
                <Input placeholder="Nome, local ou prestador" prefix={<SearchOutlined />} />
              </Form.Item>
            </Col>

            <Col xs={24} md={3}>
              <Space wrap>
                <Button htmlType="submit" type="primary" style={{ borderRadius: 12 }}>
                  Filtrar
                </Button>
                <Button onClick={clearFilters} style={{ borderRadius: 12 }}>
                  Limpar
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {isLoading ? (
        <Card style={shellCardStyle()} styles={{ body: { padding: 28 } }}>
          <Empty description="Carregando solicitações..." />
        </Card>
      ) : !filteredByQuickMode.length ? (
        <Card style={shellCardStyle()} styles={{ body: { padding: 28 } }}>
          <Empty description="Nenhuma solicitação encontrada" />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 18, width: '100%', overflow: 'visible', overflowX: 'hidden' }}>
          <Row gutter={[16, 16]} align="stretch">
            {paginatedNeeds.map((row) => (
              <Col xs={24} xl={12} key={row.id} style={{ display: 'flex' }}>
                <NeedCard
                  row={row}
                  onOpenFlow={() => openNeedFlow(row)}
                  onEditAddress={() => openAddressModal(row)}
                  onOpenMap={() =>
                    window.open(
                      buildGoogleMapsLink(row.requestedLat, row.requestedLng, row.requestedLocationText),
                      '_blank'
                    )
                  }
                  onChangeStatus={(status) => updateStatus.mutate({ id: row.id, status })}
                />
              </Col>
            ))}
          </Row>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={filteredByQuickMode.length}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
            />
          </div>
        </div>
      )}

      <Modal
        title="Solicitar ATA"
        open={openAtaRequest}
        onCancel={() => {
          setOpenAtaRequest(false);
          formAta.resetFields();
        }}
        onOk={() => formAta.submit()}
        confirmLoading={createNeed.isPending}
        okText="Salvar"
        width={920}
        destroyOnHidden
      >
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 16, borderRadius: 14 }}
          message="Fluxo ATA"
          description="Fluxo simplificado. Após criar, o card abrirá o cadastro ATA."
        />

        <Form
          form={formAta}
          layout="vertical"
          onFinish={(values) =>
            createNeed.mutate({
              ...values,
              techTypeId: ataTechTypeId || values.techTypeId,
            })
          }
        >
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="requestedName"
                label="Nome da solicitação"
                rules={[{ required: true, message: 'Informe o nome' }]}
              >
                <Input placeholder="Ex.: ATA para Vitória" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="techTypeId" label="Tipo técnico">
                <Select
                  disabled
                  value={ataTechTypeId}
                  options={techTypes
                    .filter((t) => isAtaTech(t.name))
                    .map((t) => ({ value: t.id, label: t.name }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="requestedLocationText"
                label="Endereço / local"
                rules={[{ required: true, message: 'Informe o local' }]}
              >
                <Input placeholder="Ex.: Rua, número, bairro ou referência" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="requestedCity" label="Cidade">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={4}>
              <Form.Item name="requestedState" label="UF">
                <Input maxLength={2} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="requestedCep" label="CEP">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={3}>
              <Form.Item name="requestedLat" label="Latitude">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={3}>
              <Form.Item name="requestedLng" label="Longitude">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Space wrap>
                <Button
                  icon={<AimOutlined />}
                  loading={locatingAta}
                  onClick={() => capturePreciseLocation(formAta, 'ata')}
                >
                  Usar minha localização precisa
                </Button>

                <Button
                  icon={<EnvironmentOutlined />}
                  loading={searchingMapAta}
                  onClick={() => searchCoordsByAddress(formAta, 'ata')}
                >
                  Buscar coordenadas pelo endereço
                </Button>

                <Button
                  icon={<GlobalOutlined />}
                  onClick={() => {
                    const vals = formAta.getFieldsValue();
                    window.open(
                      buildGoogleMapsLink(
                        vals.requestedLat,
                        vals.requestedLng,
                        vals.requestedLocationText
                      ),
                      '_blank'
                    );
                  }}
                >
                  Validar no Google Maps
                </Button>
              </Space>
            </Col>

            <Col xs={24}>{renderMapPreview(formAta)}</Col>

            <Col xs={24}>
              <Divider style={{ margin: '8px 0' }} />
            </Col>

            <Col xs={24}>
              <Form.Item name="notes" label="Observações">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Solicitar PSO / SPOT"
        open={openPsoSpotRequest}
        onCancel={() => {
          setOpenPsoSpotRequest(false);
          formPsoSpot.resetFields();
        }}
        onOk={() => formPsoSpot.submit()}
        confirmLoading={createNeed.isPending}
        okText="Salvar"
        width={920}
        destroyOnHidden
      >
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 16, borderRadius: 14 }}
          message="Fluxo PSO / SPOT"
          description="Após criar, o card abrirá a homologação completa."
        />

        <Form
          form={formPsoSpot}
          layout="vertical"
          onFinish={(values) => createNeed.mutate(values)}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="requestedName"
                label="Nome da solicitação"
                rules={[{ required: true, message: 'Informe o nome' }]}
              >
                <Input placeholder="Ex.: Técnico PSO para Barueri" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="techTypeId"
                label="Tipo técnico"
                rules={[{ required: true, message: 'Selecione o tipo' }]}
              >
                <Select
                  options={techTypes
                    .filter((t) => isPsoOrSpotTech(t.name))
                    .map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="Selecione PSO ou SPOT"
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="requestedLocationText"
                label="Endereço / local"
                rules={[{ required: true, message: 'Informe o local' }]}
              >
                <Input placeholder="Ex.: Rua, número, bairro ou referência" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="requestedCity" label="Cidade">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={4}>
              <Form.Item name="requestedState" label="UF">
                <Input maxLength={2} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="requestedCep" label="CEP">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={3}>
              <Form.Item name="requestedLat" label="Latitude">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={3}>
              <Form.Item name="requestedLng" label="Longitude">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Space wrap>
                <Button
                  icon={<AimOutlined />}
                  loading={locatingPsoSpot}
                  onClick={() => capturePreciseLocation(formPsoSpot, 'pso-spot')}
                >
                  Usar minha localização precisa
                </Button>

                <Button
                  icon={<EnvironmentOutlined />}
                  loading={searchingMapPsoSpot}
                  onClick={() => searchCoordsByAddress(formPsoSpot, 'pso-spot')}
                >
                  Buscar coordenadas pelo endereço
                </Button>

                <Button
                  icon={<GlobalOutlined />}
                  onClick={() => {
                    const vals = formPsoSpot.getFieldsValue();
                    window.open(
                      buildGoogleMapsLink(
                        vals.requestedLat,
                        vals.requestedLng,
                        vals.requestedLocationText
                      ),
                      '_blank'
                    );
                  }}
                >
                  Validar no Google Maps
                </Button>
              </Space>
            </Col>

            <Col xs={24}>{renderMapPreview(formPsoSpot)}</Col>

            <Col xs={24}>
              <Divider style={{ margin: '8px 0' }} />
            </Col>

            <Col xs={24}>
              <Form.Item name="notes" label="Observações">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={`Editar endereço${selectedNeed ? ` • #${selectedNeed.id}` : ''}`}
        open={openAddress}
        onCancel={() => {
          setOpenAddress(false);
          setSelectedNeed(null);
          formAddress.resetFields();
        }}
        onOk={() => formAddress.submit()}
        confirmLoading={updateAddress.isPending}
        okText="Salvar"
        width={920}
        destroyOnHidden
      >
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 16, borderRadius: 14 }}
          message="Validação geográfica"
          description="Atualize o endereço, capture a localização precisa ou busque as coordenadas pelo mapa."
        />

        <Form
          form={formAddress}
          layout="vertical"
          onFinish={(values) => {
            if (!selectedNeed?.id) return;
            updateAddress.mutate({ id: selectedNeed.id, payload: values });
          }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24}>
              <Form.Item name="requestedLocationText" label="Endereço / referência">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="requestedCity" label="Cidade">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={4}>
              <Form.Item name="requestedState" label="UF">
                <Input maxLength={2} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="requestedCep" label="CEP">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={3}>
              <Form.Item name="requestedLat" label="Latitude">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={3}>
              <Form.Item name="requestedLng" label="Longitude">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Space wrap>
                <Button
                  icon={<AimOutlined />}
                  loading={locatingAddress}
                  onClick={() => capturePreciseLocation(formAddress, 'address')}
                >
                  Capturar localização precisa
                </Button>

                <Button
                  icon={<EnvironmentOutlined />}
                  loading={searchingMapAddress}
                  onClick={() => searchCoordsByAddress(formAddress, 'address')}
                >
                  Buscar coordenadas pelo endereço
                </Button>

                <Button
                  icon={<GlobalOutlined />}
                  onClick={() => {
                    const vals = formAddress.getFieldsValue();
                    window.open(
                      buildGoogleMapsLink(
                        vals.requestedLat,
                        vals.requestedLng,
                        vals.requestedLocationText
                      ),
                      '_blank'
                    );
                  }}
                >
                  Abrir no Google Maps
                </Button>
              </Space>
            </Col>

            <Col xs={24}>{renderMapPreview(formAddress)}</Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Documentos internos"
        open={openInternalDocs}
        onCancel={() => setOpenInternalDocs(false)}
        footer={null}
        width={900}
        destroyOnHidden
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <Alert
            showIcon
            type="info"
            style={{ borderRadius: 14 }}
            message="Documentos internos gerais"
            description="Área para a equipe interna cadastrar, visualizar, baixar e excluir arquivos de uso interno do módulo Need."
          />

          <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
            <Upload {...uploadInternalProps}>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={uploadInternalDocument.isPending}
              >
                Enviar documento
              </Button>
            </Upload>

            <Button
              icon={<ReloadOutlined />}
              loading={loadingInternalDocs}
              onClick={() => refetchInternalDocs()}
            >
              Atualizar lista
            </Button>
          </Space>

          <Card size="small" style={{ borderRadius: 18 }} styles={{ body: { padding: 12 } }}>
            <List
              loading={loadingInternalDocs}
              locale={{ emptyText: 'Nenhum documento interno cadastrado' }}
              dataSource={internalDocs}
              renderItem={(item) => {
                const isPdf = String(item.mimeType || '').includes('pdf');
                const isImage = String(item.mimeType || '').includes('image');
                const fileUrl = resolveAttachmentUrl(item.url);

                return (
                  <List.Item
                    actions={[
                      <Button
                        key="visualizar"
                        size="small"
                        type="link"
                        onClick={() => setPreviewInternalDoc(item)}
                      >
                        Visualizar
                      </Button>,
                      <Button
                        key="baixar"
                        size="small"
                        type="link"
                        onClick={() => window.open(fileUrl, '_blank')}
                      >
                        Baixar
                      </Button>,
                      <Popconfirm
                        key="excluir"
                        title="Excluir documento?"
                        description="Essa ação não poderá ser desfeita."
                        okText="Excluir"
                        cancelText="Cancelar"
                        onConfirm={() => deleteInternalDocument.mutate(item.id)}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          loading={
                            deleteInternalDocument.isPending &&
                            deleteInternalDocument.variables === item.id
                          }
                        >
                          Excluir
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        isPdf ? (
                          <FilePdfOutlined style={{ fontSize: 20 }} />
                        ) : isImage ? (
                          <FileImageOutlined style={{ fontSize: 20 }} />
                        ) : (
                          <PaperClipOutlined style={{ fontSize: 20 }} />
                        )
                      }
                      title={item.title || item.originalName}
                      description={
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div>{item.originalName}</div>
                          <div style={{ color: '#64748b', fontSize: 12 }}>
                            {formatFileSize(item.size)} • {fmtDate(item.createdAt)}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        </div>
      </Modal>

      <Modal
        open={!!previewInternalDoc}
        onCancel={() => setPreviewInternalDoc(null)}
        footer={null}
        title={previewInternalDoc?.title || previewInternalDoc?.originalName || 'Visualizar documento'}
        width={1000}
        destroyOnHidden
      >
        {previewInternalDoc ? (
          String(previewInternalDoc.mimeType || '').includes('pdf') ? (
            <iframe
              src={resolveAttachmentUrl(previewInternalDoc.url)}
              title={previewInternalDoc.originalName}
              style={{ width: '100%', height: '75vh', border: 0, borderRadius: 12 }}
            />
          ) : String(previewInternalDoc.mimeType || '').includes('image') ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={resolveAttachmentUrl(previewInternalDoc.url)}
                alt={previewInternalDoc.originalName}
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 12 }}
              />
            </div>
          ) : (
            <Empty
              description={
                <Space direction="vertical">
                  <Text>Pré-visualização não disponível para este formato.</Text>
                  <Button onClick={() => window.open(resolveAttachmentUrl(previewInternalDoc.url), '_blank')}>
                    Abrir arquivo
                  </Button>
                </Space>
              }
            />
          )
        ) : null}
      </Modal>
    </div>
  );
}