import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Form,
  Select,
  Space,
  Table,
  Tag,
  message,
  Modal,
  Input,
  Typography,
  Upload,
  List,
  Divider,
  Popconfirm,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  ReloadOutlined,
  CheckOutlined,
  StopOutlined,
  RollbackOutlined,
  PlusOutlined,
  SearchOutlined,
  IdcardOutlined,
  EditOutlined,
  UploadOutlined,
  PaperClipOutlined,
  DeleteOutlined,
  EyeOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';

type TechType = { id: number; name: string };
type SimpleUser = { id: number; name: string };

type NeedStatus = 'OPEN' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED';
type Tier = 'OURO' | 'PRATA' | 'BRONZE';

// ✅ status por etapa (igual backend)
type StepStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';

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

  // ✅ NOVOS CAMPOS (iguais ao Model Need no backend)
  homologTablesStatus?: StepStatus | null;
  homologDocsStatus?: StepStatus | null;
  homologContractStatus?: StepStatus | null;
  homologCrmStatus?: StepStatus | null;
  homologErpStatus?: StepStatus | null;
};

type Requester = { id: number; name: string; count?: number };

type AttachmentKind = 'CONTRATO' | 'DOCUMENTO' | 'FOTO' | 'OUTRO';

type NeedAttachment = {
  id: number;
  needId: number;
  kind: AttachmentKind;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

const STATUS_OPTS = [
  { value: 'OPEN', label: 'Aberta' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'FULFILLED', label: 'Atendida' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const TIER_OPTS = [
  { value: 'OURO', label: 'Ouro' },
  { value: 'PRATA', label: 'Prata' },
  { value: 'BRONZE', label: 'Bronze' },
];

const STEP_STATUS_OPTS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'CONCLUIDO', label: 'Concluído' },
];

const ATTACH_KIND_OPTS = [
  { value: 'CONTRATO', label: 'Contrato' },
  { value: 'DOCUMENTO', label: 'Documento' },
  { value: 'FOTO', label: 'Foto' },
  { value: 'OUTRO', label: 'Outro' },
];

function statusTag(s: NeedStatus) {
  const map = {
    OPEN: { color: 'blue', text: 'Aberta' },
    IN_PROGRESS: { color: 'gold', text: 'Em andamento' },
    FULFILLED: { color: 'green', text: 'Atendida' },
    CANCELLED: { color: 'red', text: 'Cancelada' },
  } as const;
  const m = map[s];
  return <Tag color={m.color}>{m.text}</Tag>;
}

/** ===== Helpers ===== */
function onlyDigits(v: string) {
  return (v || '').replace(/\D+/g, '');
}
function maskPhoneBR(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function maskCepBR(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (!d) return '';
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
function fmtBytes(n?: number) {
  const x = Number(n || 0);
  if (!x) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = x;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
function whatsappLink(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/55${digits}`;
}
/** ✅ Resolve origin correto (pra NÃO virar /api/uploads...) */
function getApiOrigin() {
  const baseURL = (api as any)?.defaults?.baseURL || import.meta.env.VITE_API_URL || '';
  try {
    return baseURL ? new URL(baseURL).origin : window.location.origin;
  } catch {
    return window.location.origin;
  }
}

/** ✅ Faz download autenticado e abre preview (imagem/pdf) via blob */
async function fetchAsBlobUrl(fileUrl: string, mimeType?: string) {
  const origin = getApiOrigin();
  const isAbs = /^https?:\/\//i.test(fileUrl);
  const full = isAbs ? fileUrl : `${origin}${fileUrl}`;

  const res = await api.get(isAbs ? full : fileUrl, {
    responseType: 'blob',
    baseURL: isAbs ? undefined : origin,
  });

  const blob = new Blob([res.data], { type: mimeType || 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, fullUrl: full };
}

/** ===== Geocoding + Autocomplete ===== */
type NominatimSuggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: any;
};

async function searchNominatim(q: string): Promise<NominatimSuggestion[]> {
  const query = (q || '').trim();
  if (query.length < 5) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=br&q=` +
    encodeURIComponent(query);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as any[];
  if (!Array.isArray(data)) return [];

  return data.map((x) => ({
    place_id: Number(x.place_id),
    display_name: String(x.display_name || ''),
    lat: String(x.lat || ''),
    lon: String(x.lon || ''),
    address: x.address,
  }));
}

function normalizeUF(uf?: string) {
  if (!uf) return null;
  const s = String(uf).trim().toUpperCase();
  return s.length === 2 ? s : null;
}

function extractFromNominatim(address: any) {
  const city =
    address?.city ||
    address?.town ||
    address?.village ||
    address?.municipality ||
    address?.county ||
    null;

  const state = normalizeUF(address?.state_code) || null;
  const postcode = address?.postcode ? String(address.postcode) : null;

  return {
    requestedCity: city ? String(city) : null,
    requestedState: state,
    requestedCep: postcode,
  };
}

async function fetchViaCep(cepRaw: string): Promise<{ city: string; uf: string; cep: string } | null> {
  const digits = onlyDigits(cepRaw);
  if (digits.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.erro) return null;
  const city = String(data?.localidade || '').trim();
  const uf = String(data?.uf || '').trim().toUpperCase();
  const cep = String(data?.cep || '').trim();
  if (!city || !uf) return null;
  return { city, uf, cep };
}

async function enrichWithViaCep(fields: {
  requestedCity: string | null;
  requestedState: string | null;
  requestedCep: string | null;
}) {
  if (!fields.requestedCep) return fields;
  const vc = await fetchViaCep(fields.requestedCep);
  if (!vc) return fields;
  return {
    requestedCity: vc.city || fields.requestedCity,
    requestedState: vc.uf || fields.requestedState,
    requestedCep: vc.cep || fields.requestedCep,
  };
}

export default function NeedsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [form] = Form.useForm();

  const initial = {
    status: params.get('status') || undefined,
    techTypeId: params.get('techTypeId') ? Number(params.get('techTypeId')) : undefined,
    requesterId: params.get('requesterId') ? Number(params.get('requesterId')) : undefined,
    q: params.get('q') || '',
  };

  // ✅ correto no seu backend: /techtypes
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

      // (opcional) filtro textual local
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
    keepPreviousData: true,
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

  const requesters: Requester[] = serverRequesters.length ? serverRequesters : derivedRequesters;

  useEffect(() => {
    form.setFieldsValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ===== Mutations ===== */
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: NeedStatus }) =>
      (await api.patch(`/needs/${id}/status`, { status })).data,
    onSuccess: async () => {
      message.success('Status atualizado');
      await qc.invalidateQueries({ queryKey: ['needs'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar status'),
  });

  const [openNew, setOpenNew] = useState(false);
  const [formNew] = Form.useForm();

  const createNeed = useMutation({
    mutationFn: async (payload: any) => (await api.post('/needs', payload)).data as Need,
    onSuccess: async () => {
      message.success('Solicitação criada');
      setOpenNew(false);
      formNew.resetFields();
      await qc.invalidateQueries({ queryKey: ['needs'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao criar solicitação'),
  });

  /** ===== Modal Prestador ===== */
  const [openProvider, setOpenProvider] = useState(false);
  const [providerNeed, setProviderNeed] = useState<Need | null>(null);
  const [formProvider] = Form.useForm();

  const updateProvider = useMutation({
    mutationFn: async (payload: any) => (await api.patch(`/needs/${payload.id}/provider`, payload)).data,
    onSuccess: async () => {
      message.success('Prestador atualizado');
      await qc.invalidateQueries({ queryKey: ['needs'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar prestador'),
  });

  const openProviderModal = (n: Need) => {
    setProviderNeed(n);
    setOpenProvider(true);
    setUploadKind('DOCUMENTO');
    setUploadFileList([]);

    formProvider.setFieldsValue({
      providerName: n.providerName ?? '',
      providerWhatsapp: n.providerWhatsapp ?? '',
      negotiationTier: n.negotiationTier ?? null,

      // ✅ nomes IGUAIS ao backend
      homologTablesStatus: n.homologTablesStatus ?? 'PENDENTE',
      homologDocsStatus: n.homologDocsStatus ?? 'PENDENTE',
      homologContractStatus: n.homologContractStatus ?? 'PENDENTE',
      homologCrmStatus: n.homologCrmStatus ?? 'PENDENTE',
      homologErpStatus: n.homologErpStatus ?? 'PENDENTE',

      negotiationNotes: n.negotiationNotes ?? '',
    });
  };

  const closeProviderModal = () => {
    setOpenProvider(false);
    setProviderNeed(null);
    formProvider.resetFields();
    setUploadFileList([]);
  };

  /** ===== Anexos (Provider Modal) ===== */
  const [uploadKind, setUploadKind] = useState<AttachmentKind>('DOCUMENTO');
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewMime, setPreviewMime] = useState<string>('');
  const lastBlobUrlRef = useRef<string | null>(null);

  const {
    data: attachments = [],
    refetch: refetchAttachments,
    isFetching: isFetchingAttachments,
  } = useQuery<NeedAttachment[]>({
    queryKey: ['need-attachments', providerNeed?.id],
    enabled: !!providerNeed?.id && openProvider,
    queryFn: async () => {
      const res = await api.get(`/needs/${providerNeed!.id}/attachments`);
      return res.data as NeedAttachment[];
    },
  });

  async function openAttachment(a: NeedAttachment) {
    if (!a?.url) return;

    const mime = (a.mimeType || '').toLowerCase();
    const isPreviewable = mime.startsWith('image/') || mime === 'application/pdf';

    try {
      if (lastBlobUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(lastBlobUrlRef.current);
        lastBlobUrlRef.current = null;
      }

      const { blobUrl } = await fetchAsBlobUrl(a.url, a.mimeType);

      if (isPreviewable) {
        lastBlobUrlRef.current = blobUrl;
        setPreviewUrl(blobUrl);
        setPreviewTitle(a.originalName);
        setPreviewMime(mime);
        setPreviewOpen(true);
        return;
      }

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = a.originalName || 'arquivo';
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Não foi possível abrir o arquivo.');
    }
  }

  const uploadAttachment = useMutation({
    mutationFn: async (payload: { needId: number; kind: AttachmentKind; file: File }) => {
      const fd = new FormData();
      fd.append('file', payload.file);
      fd.append('kind', payload.kind);

      const res = await api.post(`/needs/${payload.needId}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return res.data;
    },
    onSuccess: async () => {
      message.success('Arquivo anexado');
      setUploadFileList([]);
      await refetchAttachments();
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao anexar arquivo'),
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: number) => {
      if (!providerNeed?.id) throw new Error('Need não selecionada');
      await api.delete(`/needs/${providerNeed.id}/attachments/${attachmentId}`);
      return true;
    },
    onSuccess: async () => {
      message.success('Arquivo removido');
      await refetchAttachments();
    },
    onError: (e: any) => message.error(e?.response?.data?.error || e?.message || 'Falha ao remover arquivo'),
  });

  const handleUpload = async () => {
    if (!providerNeed?.id) return;
    const f = uploadFileList?.[0]?.originFileObj as File | undefined;
    if (!f) return message.error('Selecione um arquivo');
    uploadAttachment.mutate({ needId: providerNeed.id, kind: uploadKind, file: f });
  };

  /** ===== Editar Endereço ===== */
  const [openEditAddr, setOpenEditAddr] = useState(false);
  const [editAddrNeed, setEditAddrNeed] = useState<Need | null>(null);
  const [formAddr] = Form.useForm();

  const updateAddress = useMutation({
    mutationFn: async (payload: any) => (await api.patch(`/needs/${payload.id}/address`, payload)).data,
    onSuccess: async () => {
      message.success('Endereço atualizado');
      setOpenEditAddr(false);
      setEditAddrNeed(null);
      formAddr.resetFields();
      await qc.invalidateQueries({ queryKey: ['needs'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar endereço'),
  });

  /** ===== Autocomplete compartilhado (novo + editar) ===== */
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrOptions, setAddrOptions] = useState<NominatimSuggestion[]>([]);
  const debounceRef = useRef<any>(null);

  const runSearch = (q: string) => {
    const s = (q || '').trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (s.length < 5) {
        setAddrOptions([]);
        return;
      }
      setAddrLoading(true);
      try {
        const items = await searchNominatim(s);
        setAddrOptions(items);
      } finally {
        setAddrLoading(false);
      }
    }, 350);
  };

  const applySuggestionToForm = async (targetForm: any, opt: any) => {
    const lat = Number(opt?.lat);
    const lng = Number(opt?.lon);

    const base = extractFromNominatim(opt?.address);
    const enriched = await enrichWithViaCep(base);

    targetForm.setFieldsValue({
      requestedLocationText: opt.display_name,
      requestedLat: Number.isFinite(lat) ? lat : null,
      requestedLng: Number.isFinite(lng) ? lng : null,
      requestedCity: enriched.requestedCity,
      requestedState: enriched.requestedState,
      requestedCep: enriched.requestedCep ? maskCepBR(enriched.requestedCep) : null,
    });

    setAddrOptions([]);
  };

  const openEditAddressModal = (n: Need) => {
    setEditAddrNeed(n);
    setOpenEditAddr(true);
    setAddrOptions([]);

    formAddr.setFieldsValue({
      requestedLocationText: n.requestedLocationText || '',
      requestedLat: n.requestedLat ?? null,
      requestedLng: n.requestedLng ?? null,
      requestedCity: n.requestedCity ?? null,
      requestedState: n.requestedState ?? null,
      requestedCep: n.requestedCep ? maskCepBR(n.requestedCep) : null,
    });

    runSearch(n.requestedLocationText || '');
  };

  /** ===== Table ===== */
  const columns = useMemo(
    () => [
      {
        title: 'Local',
        render: (_: any, r: Need) => {
          const city = (r.requestedCity || '').trim();
          const uf = (r.requestedState || '').trim().toUpperCase();
          const local = city && uf ? `${city}/${uf}` : city ? city : uf ? uf : r.requestedLocationText || '—';
          return <span>{local}</span>;
        },
      },
      { title: 'Técnico (livre)', dataIndex: 'requestedName' },
      { title: 'Tipo', render: (_: any, r: Need) => r.techType?.name || '-' },
      {
        title: 'Status',
        render: (_: any, r: Need) => statusTag(r.status),
        filters: STATUS_OPTS.map((s) => ({ text: s.label, value: s.value })),
        onFilter: (v: any, rec: Need) => rec.status === v,
      },
      { title: 'Solicitado por', render: (_: any, r: Need) => r.requestedBy?.name || '—' },
      { title: 'Prestador', render: (_: any, r: Need) => r.providerName || '—' },
      {
        title: 'Criado em',
        render: (_: any, r: Need) =>
          new Date(r.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      },
      {
        title: 'Ações',
        render: (_: any, r: Need) => {
          const confirm = (to: NeedStatus, title: string) => {
            Modal.confirm({ title, onOk: () => updateStatus.mutate({ id: r.id, status: to }) });
          };

          return (
            <Space wrap>
              <Button icon={<EditOutlined />} size="small" onClick={() => openEditAddressModal(r)}>
                Endereço
              </Button>

              <Button icon={<IdcardOutlined />} size="small" onClick={() => openProviderModal(r)}>
                Prestador
              </Button>

              <Button
                icon={<CheckOutlined />}
                size="small"
                type="primary"
                disabled={r.status === 'FULFILLED'}
                onClick={() => confirm('FULFILLED', 'Marcar como atendida?')}
              >
                Atender
              </Button>

              <Button
                icon={<StopOutlined />}
                size="small"
                danger
                disabled={r.status === 'CANCELLED'}
                onClick={() => confirm('CANCELLED', 'Cancelar solicitação?')}
              >
                Cancelar
              </Button>

              <Button
                icon={<RollbackOutlined />}
                size="small"
                disabled={r.status === 'OPEN'}
                onClick={() => confirm('OPEN', 'Reabrir solicitação?')}
              >
                Reabrir
              </Button>

              <Button size="small" onClick={() => navigate(`/needs/map?focus=${r.id}`)}>
                Mapa
              </Button>
            </Space>
          );
        },
      },
    ],
    [navigate, updateStatus]
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card>
        <Form
          layout="inline"
          form={form}
          initialValues={initial}
          onFinish={(v) => {
            const next = new URLSearchParams();
            if (v.status) next.set('status', v.status);
            if (v.techTypeId) next.set('techTypeId', String(v.techTypeId));
            if (v.requesterId) next.set('requesterId', String(v.requesterId));
            if (v.q) next.set('q', String(v.q));
            setParams(next, { replace: true });
            refetch();
          }}
        >
          <Form.Item name="status" label="Status">
            <Select allowClear style={{ width: 160 }} options={STATUS_OPTS} />
          </Form.Item>

          <Form.Item name="techTypeId" label="Tipo técnico">
            <Select
              allowClear
              style={{ width: 220 }}
              options={techTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>

          <Form.Item name="requesterId" label="Solicitante">
            <Select
              allowClear
              showSearch
              style={{ width: 260 }}
              placeholder="Filtrar por solicitante"
              suffixIcon={<SearchOutlined />}
              options={requesters.map((r) => ({
                value: r.id,
                label: r.count ? `${r.name} (${r.count})` : r.name,
              }))}
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item name="q" label="Busca">
            <Input style={{ width: 240 }} placeholder="Local / técnico / prestador" allowClear />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" icon={<ReloadOutlined />}>
              Filtrar
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                setParams(new URLSearchParams(), { replace: true });
                refetch();
              }}
            >
              Limpar
            </Button>
          </Space>
        </Form>
      </Card>

      <Card
        title="Requisições de técnicos"
        extra={
          <Space>
            <Button onClick={() => navigate('/needs/map')}>Mapa geral</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                formNew.setFieldsValue({
                  requestedLocationText: '',
                  requestedCity: '',
                  requestedState: '',
                  requestedCep: '',
                  requestedLat: null,
                  requestedLng: null,
                  requestedName: 'Técnico a definir',
                  techTypeId: undefined,
                  notes: '',
                });
                setAddrOptions([]);
                setOpenNew(true);
              }}
            >
              Novo pedido
            </Button>
            <span style={{ color: '#64748b' }}>{isFetching ? 'Atualizando…' : ''}</span>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={isLoading || updateStatus.isPending}
          dataSource={data}
          columns={columns as any}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* ===== Modal Novo Pedido (com autocomplete) ===== */}
      <Modal
        title="Nova solicitação de técnico"
        open={openNew}
        onCancel={() => {
          setOpenNew(false);
          setAddrOptions([]);
        }}
        onOk={() => formNew.submit()}
        confirmLoading={createNeed.isPending}
        destroyOnClose
        width={820}
      >
        <Form
          layout="vertical"
          form={formNew}
          onFinish={async (v) => {
            const requestedLocationText = String(v.requestedLocationText || '').trim();

            const lat = Number(v.requestedLat);
            const lng = Number(v.requestedLng);
            const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

            if (!requestedLocationText || requestedLocationText.length < 5) {
              message.error('Informe o endereço');
              return;
            }
            if (!hasCoords) {
              message.error('Selecione um endereço da lista para gerar lat/lng.');
              return;
            }

            createNeed.mutate({
              requestedLocationText,
              requestedCity: v.requestedCity ? String(v.requestedCity).trim() : null,
              requestedState: v.requestedState ? String(v.requestedState).trim().toUpperCase() : null,
              requestedCep: v.requestedCep ? String(v.requestedCep).trim() : null,
              requestedLat: lat,
              requestedLng: lng,
              requestedName: String(v.requestedName || 'Técnico a definir').trim(),
              techTypeId: v.techTypeId || null,
              notes: v.notes || '',
            });
          }}
        >
          <Form.Item
            name="requestedLocationText"
            label="Endereço (digite e selecione o correto)"
            rules={[{ required: true, message: 'Informe o endereço' }, { min: 5 }]}
          >
            <Select
              showSearch
              filterOption={false}
              onSearch={(q) => runSearch(q)}
              notFoundContent={addrLoading ? 'Buscando…' : 'Digite para buscar'}
              placeholder="Ex.: Av. X, 123 - Osasco/SP"
              options={addrOptions.map((x) => ({
                value: x.display_name,
                label: x.display_name,
                ...x,
              }))}
              onSelect={async (_value, option: any) => {
                await applySuggestionToForm(formNew, option);
              }}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="requestedLat" label="Latitude">
              <Input disabled />
            </Form.Item>
            <Form.Item name="requestedLng" label="Longitude">
              <Input disabled />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px', gap: 12 }}>
            <Form.Item name="requestedCity" label="Cidade">
              <Input />
            </Form.Item>
            <Form.Item name="requestedState" label="UF">
              <Input maxLength={2} />
            </Form.Item>
            <Form.Item name="requestedCep" label="CEP">
              <Input
                placeholder="00000-000"
                onChange={(e) => formNew.setFieldValue('requestedCep', maskCepBR(e.target.value))}
              />
            </Form.Item>
          </div>

          <Form.Item name="requestedName" label="Nome do técnico (livre)" rules={[{ required: true }]}>
            <Input placeholder="Ex.: Técnico João / Técnico a definir" />
          </Form.Item>

          <Form.Item name="techTypeId" label="Tipo de técnico">
            <Select allowClear placeholder="Selecione (opcional)" options={techTypes.map((tt) => ({ value: tt.id, label: tt.name }))} />
          </Form.Item>

          <Form.Item name="notes" label="Observações">
            <Input.TextArea rows={3} placeholder="Requisitos, disponibilidade, etc." />
          </Form.Item>

          <Typography.Text type="secondary">
            Dica: sempre selecione um item da lista para preencher lat/lng automaticamente.
          </Typography.Text>
        </Form>
      </Modal>

      {/* ===== Modal Prestador + Anexos ===== */}
      <Modal
        title="Prestador (captação / homologação)"
        open={openProvider}
        onCancel={closeProviderModal}
        okText="Salvar"
        confirmLoading={updateProvider.isPending}
        onOk={async () => {
          try {
            const v = await formProvider.validateFields();
            if (!providerNeed?.id) return;

            await updateProvider.mutateAsync({
              id: providerNeed.id,
              providerName: String(v.providerName).trim(),
              providerWhatsapp: v.providerWhatsapp ? String(v.providerWhatsapp).trim() : null,
              negotiationTier: v.negotiationTier ?? null,
              negotiationNotes: v.negotiationNotes ? String(v.negotiationNotes) : null,

              // ✅ chaves corretas
              homologTablesStatus: v.homologTablesStatus ?? null,
              homologDocsStatus: v.homologDocsStatus ?? null,
              homologContractStatus: v.homologContractStatus ?? null,
              homologCrmStatus: v.homologCrmStatus ?? null,
              homologErpStatus: v.homologErpStatus ?? null,
            });
          } catch {}
        }}
        width={900}
        destroyOnClose
      >
        {providerNeed ? (
          <>
            <Typography.Text type="secondary">
              Pedido #{providerNeed.id} • {providerNeed.requestedLocationText}
            </Typography.Text>

            <Form layout="vertical" form={formProvider} style={{ marginTop: 12 }}>
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 12,
      alignItems: 'end',
    }}
  >
    <Form.Item
      name="providerName"
      label="Nome do prestador (obrigatório)"
      rules={[
        { required: true, message: 'Informe o nome do prestador' },
        { min: 2 },
      ]}
    >
      <Input placeholder="Ex.: João da Silva (Prestador X)" />
    </Form.Item>

    <Form.Item name="providerWhatsapp" label="WhatsApp do prestador">
      <Input
        placeholder="(11) 99999-9999"
        onChange={(e) =>
          formProvider.setFieldValue(
            'providerWhatsapp',
            maskPhoneBR(e.target.value)
          )
        }
        addonAfter={(() => {
          const phone = formProvider.getFieldValue('providerWhatsapp');
          const link = whatsappLink(phone);

          return (
            <Button
              type="text"
              icon={
                <WhatsAppOutlined
                  style={{ color: '#25D366', fontSize: 18 }}
                />
              }
              disabled={!link}
              onClick={() => {
                if (link) window.open(link, '_blank');
              }}
            />
          );
        })()}
      />
    </Form.Item>
  </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item name="negotiationTier" label="Categoria negociada">
                  <Select allowClear options={TIER_OPTS} placeholder="Ouro / Prata / Bronze" />
                </Form.Item>
                <div />
              </div>

              <Divider style={{ margin: '8px 0 12px' }} />
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Status da homologação
              </Typography.Title>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item name="homologTablesStatus" label="Apresentação de Tabelas">
                  <Select options={STEP_STATUS_OPTS} placeholder="Selecione" />
                </Form.Item>

                <Form.Item name="homologDocsStatus" label="Envio de documentos">
                  <Select options={STEP_STATUS_OPTS} placeholder="Selecione" />
                </Form.Item>

                <Form.Item name="homologContractStatus" label="Assinatura de contrato">
                  <Select options={STEP_STATUS_OPTS} placeholder="Selecione" />
                </Form.Item>

                <Form.Item name="homologCrmStatus" label="Cadastro no CRM">
                  <Select options={STEP_STATUS_OPTS} placeholder="Selecione" />
                </Form.Item>

                <Form.Item name="homologErpStatus" label="Cadastro no ERP">
                  <Select options={STEP_STATUS_OPTS} placeholder="Selecione" />
                </Form.Item>
              </div>

              <Form.Item name="negotiationNotes" label="Observações da negociação">
                <Input.TextArea rows={4} placeholder="Detalhes de valores, prazo, pendências, documentos, etc." />
              </Form.Item>
            </Form>

            <Divider style={{ margin: '10px 0 14px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Documentos do prestador
              </Typography.Title>
              <Button size="small" icon={<ReloadOutlined />} onClick={() => refetchAttachments()} loading={isFetchingAttachments}>
                Atualizar
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 12, marginTop: 12 }}>
              <Select value={uploadKind} onChange={(v) => setUploadKind(v)} options={ATTACH_KIND_OPTS} />

              <Upload
                beforeUpload={() => false}
                fileList={uploadFileList}
                onChange={({ fileList }) => setUploadFileList(fileList.slice(-1))}
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>Selecionar arquivo</Button>
              </Upload>

              <Button type="primary" icon={<PaperClipOutlined />} loading={uploadAttachment.isPending} onClick={handleUpload}>
                Anexar
              </Button>
            </div>

            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Dica: anexar <b>CONTRATO</b> e <b>DOCUMENTO</b> ajuda no controle de homologação.
            </Typography.Text>

            <Divider style={{ margin: '14px 0' }} />

            <List
              bordered
              locale={{ emptyText: 'Nenhum documento anexado' }}
              dataSource={attachments}
              renderItem={(a) => (
                <List.Item
                  actions={[
                    <Button key="open" size="small" icon={<EyeOutlined />} onClick={() => void openAttachment(a)}>
                      Abrir
                    </Button>,
                    <Popconfirm
                      key="del"
                      title="Excluir este arquivo?"
                      okText="Excluir"
                      cancelText="Cancelar"
                      onConfirm={() => deleteAttachment.mutate(a.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} loading={deleteAttachment.isPending}>
                        Excluir
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag>{a.kind}</Tag>
                        <span style={{ fontWeight: 600 }}>{a.originalName}</span>
                      </Space>
                    }
                    description={
                      <Space split={<span style={{ color: '#cbd5e1' }}>•</span>}>
                        <span>{a.mimeType}</span>
                        <span>{fmtBytes(a.size)}</span>
                        <span>{new Date(a.createdAt).toLocaleString('pt-BR')}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />

            <Modal
              open={previewOpen}
              title={previewTitle}
              footer={null}
              onCancel={() => {
                setPreviewOpen(false);
                setPreviewMime('');
                setPreviewTitle('');

                if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
                if (lastBlobUrlRef.current?.startsWith('blob:')) {
                  URL.revokeObjectURL(lastBlobUrlRef.current);
                  lastBlobUrlRef.current = null;
                }
                setPreviewUrl(null);
              }}
              width={900}
              destroyOnClose
            >
              {!previewUrl ? null : previewMime.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
                />
              ) : previewMime === 'application/pdf' ? (
                <iframe src={previewUrl} title={previewTitle} style={{ width: '100%', height: '70vh', border: 'none' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <Typography.Text>Pré-visualização não disponível para este tipo de arquivo.</Typography.Text>
                </div>
              )}
            </Modal>
          </>
        ) : (
          <Typography.Text type="secondary">Nenhum pedido selecionado.</Typography.Text>
        )}
      </Modal>

      {/* ===== Modal Editar Endereço ===== */}
      <Modal
        title="Editar endereço (gera lat/lng)"
        open={openEditAddr}
        onCancel={() => {
          setOpenEditAddr(false);
          setEditAddrNeed(null);
          formAddr.resetFields();
          setAddrOptions([]);
        }}
        okText="Salvar"
        confirmLoading={updateAddress.isPending}
        onOk={async () => {
          try {
            const v = await formAddr.validateFields();
            if (!editAddrNeed?.id) return;

            const lat = Number(v.requestedLat);
            const lng = Number(v.requestedLng);
            const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

            if (!hasCoords) {
              message.error('Selecione um endereço da lista para gerar lat/lng.');
              return;
            }

            updateAddress.mutate({
              id: editAddrNeed.id,
              requestedLocationText: String(v.requestedLocationText).trim(),
              requestedLat: lat,
              requestedLng: lng,
              requestedCity: v.requestedCity ? String(v.requestedCity).trim() : null,
              requestedState: v.requestedState ? String(v.requestedState).trim().toUpperCase() : null,
              requestedCep: v.requestedCep ? String(v.requestedCep).trim() : null,
            });
          } catch {}
        }}
        width={820}
        destroyOnClose
      >
        {editAddrNeed ? (
          <>
            <Typography.Text type="secondary">Pedido #{editAddrNeed.id}</Typography.Text>

            <Form layout="vertical" form={formAddr} style={{ marginTop: 12 }}>
              <Form.Item
                name="requestedLocationText"
                label="Endereço (digite e selecione o correto)"
                rules={[{ required: true, message: 'Informe o endereço' }, { min: 5 }]}
              >
                <Select
                  showSearch
                  filterOption={false}
                  onSearch={(q) => runSearch(q)}
                  notFoundContent={addrLoading ? 'Buscando…' : 'Digite para buscar'}
                  placeholder="Digite o endereço e selecione"
                  options={addrOptions.map((x) => ({
                    value: x.display_name,
                    label: x.display_name,
                    ...x,
                  }))}
                  onSelect={async (_value, option: any) => {
                    await applySuggestionToForm(formAddr, option);
                  }}
                />
              </Form.Item>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item name="requestedLat" label="Latitude">
                  <Input disabled />
                </Form.Item>
                <Form.Item name="requestedLng" label="Longitude">
                  <Input disabled />
                </Form.Item>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px', gap: 12 }}>
                <Form.Item name="requestedCity" label="Cidade">
                  <Input />
                </Form.Item>
                <Form.Item name="requestedState" label="UF">
                  <Input maxLength={2} />
                </Form.Item>
                <Form.Item name="requestedCep" label="CEP">
                  <Input placeholder="00000-000" onChange={(e) => formAddr.setFieldValue('requestedCep', maskCepBR(e.target.value))} />
                </Form.Item>
              </div>

              <Typography.Text type="secondary">
                Se o CEP vier preenchido, o sistema usa ViaCEP para garantir cidade/UF corretos.
              </Typography.Text>
            </Form>
          </>
        ) : (
          <Typography.Text type="secondary">Nenhum pedido selecionado.</Typography.Text>
        )}
      </Modal>
    </div>
  );
}
