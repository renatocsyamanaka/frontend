import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Grid,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SwapOutlined,
  UploadOutlined,
  AppstoreOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';

type Client = { id: number; name: string };
type Status = 'A_INICIAR' | 'INICIADO' | 'FINALIZADO';
type RecordType = 'BASE' | 'PROJECT';
type RoleLite = { id: number; name: string; level: number };

type UserLite = {
  id: number;
  name: string;
  managerId?: number | null;
  role?: RoleLite;
  roleId?: number;
  roleLevel?: number;
};

type Option = { id: number; name: string };

type InstallationProjectItem = {
  id?: number;
  equipmentName: string;
  equipmentCode?: string | null;
  qty: number;
};

type InstallationProject = {
  id: number;
  title: string;
  af?: string | null;
  status: Status;
  recordType?: RecordType;
  importBatch?: string | null;
  saleDate?: string | null;

  clientId: number | null;
  client?: { id: number; name: string } | null;

  technicianId?: number | null;
  technicianIds?: number[];
  technician?: { id: number; name: string } | null;
  techniciansList?: { id: number; name: string }[];
  technicianNames?: string[];

  supervisorId?: number | null;
  supervisor?: { id: number; name: string } | null;

  coordinatorId?: number | null;
  coordinator?: { id: number; name: string } | null;

  startPlannedAt?: string | null;
  endPlannedAt?: string | null;

  trucksTotal: number;
  trucksDone: number;

  equipmentsTotal?: number;
  equipmentsPerDay?: number | null;
  daysEstimated?: number | null;

  contactName?: string | null;
  contactEmail?: string | null;
  contactEmails?: string[];
  contactPhone?: string | null;
  notes?: string | null;

  requestedLocationText?: string | null;
  requestedCity?: string | null;
  requestedState?: string | null;
  requestedCep?: string | null;
  requestedLat?: number | null;
  requestedLng?: number | null;

  items?: InstallationProjectItem[];
};

type CreateDTO = {
  title: string;
  clientId: number | null;
  technicianIds: number[];
  technicianId?: number | null;
  supervisorId: number | null;
  startPlannedAt: string | null;
  saleDate?: string | null;
  equipmentsPerDay: number;
  trucksTotal: number;
  af?: string | null;
  contactName?: string | null;
  contactEmails: string[];
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  requestedLocationText?: string | null;
  requestedCity?: string | null;
  requestedState?: string | null;
  requestedCep?: string | null;
  requestedLat?: number | null;
  requestedLng?: number | null;
  recordType?: RecordType;
};

type GeocodeResult = {
  label?: string | null;
  displayName?: string | null;
  city?: string | null;
  state?: string | null;
  uf?: string | null;
  cep?: string | null;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
  addressStreet?: string | null;
  street?: string | null;
  road?: string | null;
  district?: string | null;
  suburb?: string | null;
  neighbourhood?: string | null;
  neighborhood?: string | null;
  address?: any;
};

function unwrap<T>(resData: any): T {
  return resData && typeof resData === 'object' && 'data' in resData
    ? (resData.data as T)
    : (resData as T);
}

function getRoleName(u: UserLite) {
  return u?.role?.name;
}

function getRoleLevel(u: UserLite) {
  return u?.role?.level ?? u?.roleLevel;
}

function getRoleId(u: UserLite) {
  return u?.role?.id ?? u?.roleId;
}

const ROLE_ID_TECNICO = 1;
const ROLE_ID_SUPERVISOR = 3;
const ROLE_ID_PSO = 8;

function isSupervisor(u: UserLite) {
  const level = getRoleLevel(u);
  const name = getRoleName(u);
  const id = getRoleId(u);
  return level === 3 || name === 'Supervisor' || id === ROLE_ID_SUPERVISOR;
}

function isTechnicianOrPSO(u: UserLite) {
  const name = getRoleName(u);
  const id = getRoleId(u);
  if (id === ROLE_ID_TECNICO || id === ROLE_ID_PSO) return true;
  if (name === 'Tecnico' || name === 'PSO') return true;
  return false;
}

function normalizeEmailList(input: unknown): string[] {
  let arr: unknown[] = [];

  if (!input) return [];

  if (Array.isArray(input)) {
    arr = input;
  } else if (typeof input === 'string') {
    arr = input.split(/[;,]/);
  } else {
    arr = [input];
  }

  return [
    ...new Set(
      arr
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function isValidEmail(email?: string | null) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function normalizeUF(value?: string | null) {
  return String(value || '').trim().toUpperCase().slice(0, 2);
}

function normalizeCep(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function isValidLatLng(lat?: unknown, lng?: unknown) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false;
  return latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
}

function statusTag(s: Status) {
  if (s === 'A_INICIAR') return <Tag style={{ borderRadius: 999 }}>À iniciar</Tag>;
  if (s === 'INICIADO') return <Tag color="blue" style={{ borderRadius: 999 }}>Iniciado</Tag>;
  return <Tag color="green" style={{ borderRadius: 999 }}>Finalizado</Tag>;
}

function recordTypeTag(type?: RecordType) {
  if (type === 'BASE') return <Tag color="gold" style={{ borderRadius: 999 }}>BASE</Tag>;
  return <Tag color="purple" style={{ borderRadius: 999 }}>PROJETO</Tag>;
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY') : '-';
}

function getTechnicianLabel(r: InstallationProject) {
  if (r.technicianNames?.length) return r.technicianNames.join(', ');
  if (r.techniciansList?.length) return r.techniciansList.map((t) => t.name).join(', ');
  return r.technician?.name || (r.technicianId ? `#${r.technicianId}` : '-');
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  bg,
  iconBg,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  bg: string;
  iconBg: string;
}) {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 24,
        background: bg,
        height: '100%',
        boxShadow: '0 14px 28px rgba(15,23,42,0.08)',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{title}</div>
          <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900, lineHeight: 1.05, color: '#0f172a' }}>
            {value}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>{subtitle}</div>
        </div>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 22,
            flexShrink: 0,
            boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function InstallationProjectsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [open, setOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoResults, setGeoResults] = useState<GeocodeResult[]>([]);
  const [geoQuery, setGeoQuery] = useState('');
  const [activeTab, setActiveTab] = useState<RecordType>('PROJECT');
  const [status, setStatus] = useState<Status | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');
  const [saleDateRange, setSaleDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [techSearch, setTechSearch] = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();
  const [visibleCount, setVisibleCount] = useState(6);
  const watchedTrucksTotal = Form.useWatch('trucksTotal', form);
  const watchedEquipmentsPerDay = Form.useWatch('equipmentsPerDay', form);
  const watchedStartPlannedAt = Form.useWatch('startPlannedAt', form);

  const clientsQuery = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const usersQuery = useQuery<UserLite[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return unwrap<UserLite[]>(res.data);
    },
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const allUsers = usersQuery.data || [];

  const technicianOptions: Option[] = useMemo(() => {
    const q = techSearch.trim().toLowerCase();

    return allUsers
      .filter(isTechnicianOrPSO)
      .filter((u) => !q || String(u.name || '').toLowerCase().includes(q))
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, techSearch]);

  const supervisorOptions: Option[] = useMemo(() => {
    const q = supervisorSearch.trim().toLowerCase();

    return allUsers
      .filter(isSupervisor)
      .filter((u) => !q || String(u.name || '').toLowerCase().includes(q))
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, supervisorSearch]);

 const projectsQuery = useQuery<InstallationProject[]>({
  queryKey: [
    'installation-projects',
    activeTab,
    status,
    saleDateRange?.[0]?.format('YYYY-MM-DD') || null,
    saleDateRange?.[1]?.format('YYYY-MM-DD') || null,
  ],
  queryFn: async () => {
    const params: any = {
      recordType: activeTab, // PROJECT ou BASE
    };

    if (status !== 'TODOS') params.status = status;
    if (saleDateRange?.[0]) params.saleDateFrom = saleDateRange[0].format('YYYY-MM-DD');
    if (saleDateRange?.[1]) params.saleDateTo = saleDateRange[1].format('YYYY-MM-DD');

    const res = await api.get('/installation-projects', { params });
    return unwrap<InstallationProject[]>(res.data);
  },
  retry: false,
  refetchOnWindowFocus: false,
  staleTime: 20_000,
});

  const createProject = useMutation({
    mutationFn: async (payload: CreateDTO) =>
      (await api.post('/installation-projects', payload)).data,
    onSuccess: async () => {
      message.success('Projeto criado com sucesso!');
      setOpen(false);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao criar projeto');
    },
  });

  const convertBase = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/installation-projects/${id}/convert-to-project`)).data,
    onSuccess: async () => {
      message.success('Registro movido para Projetos!');
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao converter base');
    },
  });

  const importBase = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/installation-projects/import-base', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrap<any>(res.data);
    },
    onSuccess: async (data) => {
      message.success(
        `Importação concluída. Novos: ${data?.importedCount ?? 0} | Atualizados: ${data?.updatedCount ?? 0}`
      );
      setImportOpen(false);
      setFileList([]);
      setActiveTab('BASE');
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao importar Excel');
    },
  });

  const rows = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const rowsByTab = rows.filter((r) => {
      const type = r.recordType || 'PROJECT';
      return activeTab === 'PROJECT' ? type === 'PROJECT' : type === 'BASE';
    });

    if (!q) return rowsByTab;

    return rowsByTab.filter((r) => {
      const haystack = [
        r.title,
        r.af,
        r.client?.name,
        getTechnicianLabel(r),
        r.coordinator?.name,
        r.contactEmail,
        r.importBatch,
        r.items?.map((i) => i.equipmentName).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, search, activeTab]);

  const totals = useMemo(() => {
    const totalProjects = rows.filter((r) => (r.recordType || 'PROJECT') === 'PROJECT').length;
    const totalBase = rows.filter((r) => r.recordType === 'BASE').length;
    const totalIniciado = rows.filter((r) => r.status === 'INICIADO').length;
    const totalFinalizado = rows.filter((r) => r.status === 'FINALIZADO').length;
    const totalAIniciar = rows.filter((r) => r.status === 'A_INICIAR').length;

    return {
      totalGeral: rows.length,
      totalProjects,
      totalBase,
      totalIniciado,
      totalFinalizado,
      totalAIniciar,
    };
  }, [rows]);

  const pagedRows = useMemo(() => {
    if (!isMobile) return filteredRows;
    return filteredRows.slice(0, visibleCount);
  }, [filteredRows, isMobile, visibleCount]);

  const hasMoreRows = isMobile && filteredRows.length > visibleCount;

  useEffect(() => {
    setVisibleCount(6);
  }, [activeTab, status, search, saleDateRange]);

  const endPreview = useMemo(() => {
    const trucksTotal = Number(watchedTrucksTotal ?? 0);
    const perDay = Number(watchedEquipmentsPerDay ?? 0);
    const start = watchedStartPlannedAt as Dayjs | undefined;

    if (!open || !start || !trucksTotal || !perDay) return null;

    const daysNeeded = Math.ceil(trucksTotal / perDay);
    return `${daysNeeded} dia(s) úteis (previsão final calculada no backend)`;
  }, [open, watchedTrucksTotal, watchedEquipmentsPerDay, watchedStartPlannedAt]);

  const coordinatorPreviewText = 'Será definido automaticamente a partir do supervisor';

  const searchGeo = async () => {
    if (!geoQuery.trim()) {
      message.warning('Digite uma cidade, CEP ou endereço para buscar.');
      return;
    }

    setGeoLoading(true);
    try {
      const items = (await api.get('/geocode', { params: { q: geoQuery } })).data as GeocodeResult[];
      setGeoResults(Array.isArray(items) ? items : []);
      if (!items || !items.length) {
        message.warning('Nenhum resultado encontrado para essa busca.');
      }
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Falha na busca geográfica');
    } finally {
      setGeoLoading(false);
    }
  };

  const applyGeo = (it: GeocodeResult) => {
    const street =
      it.addressStreet ||
      it.street ||
      it.road ||
      it.address?.road ||
      it.address?.pedestrian ||
      it.address?.residential ||
      undefined;

    const district =
      it.district ||
      it.suburb ||
      it.neighbourhood ||
      it.neighborhood ||
      it.address?.suburb ||
      it.address?.neighbourhood ||
      it.address?.neighborhood ||
      undefined;

    const city =
      it.city ||
      it.address?.city ||
      it.address?.town ||
      it.address?.village ||
      it.address?.municipality ||
      undefined;

    const state = normalizeUF(
      it.uf || it.state || it.address?.state_code || it.address?.state || undefined
    );

    const zip = normalizeCep(it.cep || it.postcode || it.address?.postcode || undefined) || undefined;

    const displayName =
      it.displayName ||
      it.label ||
      [street, district, city, state].filter(Boolean).join(', ') ||
      undefined;

    form.setFieldsValue({
      requestedLocationText: displayName || form.getFieldValue('requestedLocationText') || null,
      requestedCity: city || form.getFieldValue('requestedCity') || null,
      requestedState: state || form.getFieldValue('requestedState') || null,
      requestedCep: zip || form.getFieldValue('requestedCep') || null,
      requestedLat: it.lat != null ? Number(it.lat) : form.getFieldValue('requestedLat') ?? null,
      requestedLng: it.lng != null ? Number(it.lng) : form.getFieldValue('requestedLng') ?? null,
    });

    setGeoOpen(false);
    message.success('Localização aplicada com sucesso.');
  };

  const handleCreate = async () => {
    try {
      const v = await form.validateFields();

      const technicianIds = Array.isArray(v.technicianIds)
        ? [...new Set(v.technicianIds.map((n: any) => Number(n)).filter(Boolean))]
        : [];

      const contactEmails = normalizeEmailList(v.contactEmails);

      const payload: CreateDTO = {
        title: v.title,
        af: v.af ?? null,
        clientId: v.clientId ?? null,
        technicianIds,
        technicianId: technicianIds[0] ?? null,
        supervisorId: v.supervisorId ? Number(v.supervisorId) : null,
        trucksTotal: Number(v.trucksTotal),
        equipmentsPerDay: Number(v.equipmentsPerDay),
        startPlannedAt: v.startPlannedAt ? (v.startPlannedAt as Dayjs).format('YYYY-MM-DD') : null,
        saleDate: v.saleDate ? (v.saleDate as Dayjs).format('YYYY-MM-DD') : null,
        contactName: v.contactName ?? null,
        contactEmails,
        contactEmail: contactEmails[0] ?? null,
        contactPhone: v.contactPhone ?? null,
        notes: v.notes ?? null,
        requestedLocationText: v.requestedLocationText ?? null,
        requestedCity: v.requestedCity ? String(v.requestedCity).trim() : null,
        requestedState: v.requestedState ? String(v.requestedState).trim().toUpperCase() : null,
        requestedCep: v.requestedCep ?? null,
        requestedLat: v.requestedLat != null && v.requestedLat !== '' ? Number(v.requestedLat) : null,
        requestedLng: v.requestedLng != null && v.requestedLng !== '' ? Number(v.requestedLng) : null,
        recordType: 'PROJECT',
      };

      if (
        (payload.requestedLat != null || payload.requestedLng != null) &&
        !isValidLatLng(payload.requestedLat, payload.requestedLng)
      ) {
        message.error('Latitude/Longitude inválidas.');
        return;
      }

      createProject.mutate(payload);
    } catch {
      //
    }
  };

  const handleImport = async () => {
    const raw = fileList[0]?.originFileObj;
    if (!raw) {
      message.warning('Selecione um arquivo Excel.');
      return;
    }
    importBase.mutate(raw as File);
  };

  const commonColumns: ColumnsType<InstallationProject> = [
    {
      title: 'Tipo',
      dataIndex: 'recordType',
      key: 'recordType',
      width: 100,
      render: (_, r) => recordTypeTag(r.recordType),
    },
    {
      title: 'Projeto / Cliente',
      dataIndex: 'title',
      key: 'title',
      width: 280,
      render: (_, r) => (
        <div style={{ minWidth: 0 }}>
          <div>
            <Link to={`/projetos-instalacao/${r.id}`}>{r.title}</Link>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {r.client?.name || '-'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'AF',
      dataIndex: 'af',
      key: 'af',
      width: 130,
      render: (v) => v || '-',
    },
    {
      title: 'Venda',
      dataIndex: 'saleDate',
      key: 'saleDate',
      width: 120,
      render: (v) => formatDate(v),
    },
    {
      title: 'Produtos',
      key: 'items',
      width: 260,
      render: (_, r) =>
        r.items?.length ? (
          <div style={{ display: 'grid', gap: 4 }}>
            {r.items.map((item, idx) => (
              <Typography.Text key={`${r.id}-${idx}`} style={{ fontSize: 12 }}>
                {item.equipmentName} • {item.qty}
              </Typography.Text>
            ))}
          </div>
        ) : (
          '-'
        ),
    },
    {
      title: 'Equip.',
      key: 'equipmentsTotal',
      width: 90,
      align: 'center',
      render: (_, r) => r.equipmentsTotal ?? r.trucksTotal ?? '-',
    },
    {
      title: 'Técnico / Prestador',
      key: 'technician',
      width: 220,
      render: (_, r) => getTechnicianLabel(r),
    },
    {
      title: 'Supervisor',
      key: 'supervisor',
      width: 170,
      render: (_, r) => r.supervisor?.name || (r.supervisorId ? `#${r.supervisorId}` : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: Status) => statusTag(s),
    },
  ];

  const projectColumns: ColumnsType<InstallationProject> = [
    ...commonColumns,
    {
      title: 'Início',
      key: 'start',
      width: 120,
      render: (_, r) => formatDate(r.startPlannedAt),
    },
    {
      title: 'Fim',
      key: 'end',
      width: 120,
      render: (_, r) => formatDate(r.endPlannedAt),
    },
  ];

  const baseColumns: ColumnsType<InstallationProject> = [
    ...commonColumns,
    {
      title: 'Lote',
      dataIndex: 'importBatch',
      key: 'importBatch',
      width: 170,
      render: (v) => v || '-',
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 180,
      fixed: isMobile ? undefined : 'right',
      render: (_, r) => (
        <Space wrap>
          <Button size="small" onClick={() => navigate(`/projetos-instalacao/${r.id}`)}>
            Abrir
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<SwapOutlined />}
            loading={convertBase.isPending}
            onClick={() => {
              Modal.confirm({
                title: 'Mover para Projetos?',
                content: `A AF ${r.af || r.title} deixará a BASE e passará para a visão de Projetos.`,
                okText: 'Mover',
                cancelText: 'Cancelar',
                onOk: async () => {
                  await convertBase.mutateAsync(r.id);
                },
              });
            }}
          >
            Mover
          </Button>
        </Space>
      ),
    },
  ];

const tabItems = [
  {
    key: 'PROJECT',
    label: <span style={{ fontWeight: 700 }}>Projetos</span>,
    children: isMobile ? (
      <div style={{ display: 'grid', gap: 12 }}>
        {projectsQuery.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spin />
          </div>
        ) : filteredRows.length ? (
          <>
            {pagedRows.map((r) => (
              <Card
                key={r.id}
                size="small"
                style={{
                  borderRadius: 18,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 20px rgba(15,23,42,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong>
                      <Link to={`/projetos-instalacao/${r.id}`}>{r.title}</Link>
                    </Typography.Text>
                    <div style={{ marginTop: 8 }}>
                      <Space size={[6, 6]} wrap>
                        {recordTypeTag(r.recordType)}
                        {statusTag(r.status)}
                      </Space>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'grid', gap: 7 }}>
                  <Typography.Text style={{ fontSize: 12 }}>
                    <b>AF:</b> {r.af || '-'}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>
                    <b>Cliente:</b> {r.client?.name || '-'}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>
                    <b>Venda:</b> {formatDate(r.saleDate)}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>
                    <b>Técnico:</b> {getTechnicianLabel(r)}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>
                    <b>Início:</b> {formatDate(r.startPlannedAt)} {' • '}
                    <b>Fim:</b> {formatDate(r.endPlannedAt)}
                  </Typography.Text>
                </div>

                <div style={{ marginTop: 14 }}>
                  <Button
                    block
                    type="primary"
                    onClick={() => navigate(`/projetos-instalacao/${r.id}`)}
                    style={{ borderRadius: 12 }}
                  >
                    Abrir projeto
                  </Button>
                </div>
              </Card>
            ))}

            {hasMoreRows && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <Button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  style={{ borderRadius: 12 }}
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        ) : (
          <Typography.Text type="secondary">Nenhum projeto encontrado.</Typography.Text>
        )}
      </div>
    ) : (
      <Table
        rowKey="id"
        loading={projectsQuery.isLoading}
        dataSource={filteredRows}
        columns={projectColumns}
        scroll={{ x: 1600 }}
        pagination={{ pageSize: 10 }}
      />
    ),
  },
  {
    key: 'BASE',
    label: <span style={{ fontWeight: 700 }}>Base</span>,
    children: isMobile ? (
      <div style={{ display: 'grid', gap: 12 }}>
        {projectsQuery.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spin />
          </div>
        ) : filteredRows.length ? (
          <>
            {pagedRows.map((r) => (
              <Card
                key={r.id}
                size="small"
                style={{
                  borderRadius: 18,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 20px rgba(15,23,42,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong>
                      <Link to={`/projetos-instalacao/${r.id}`}>{r.title}</Link>
                    </Typography.Text>
                    <div style={{ marginTop: 8 }}>
                      <Space size={[6, 6]} wrap>
                        {recordTypeTag(r.recordType)}
                        {statusTag(r.status)}
                      </Space>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'grid', gap: 7 }}>
                  <Typography.Text style={{ fontSize: 12 }}>
                    <b>AF:</b> {r.af || '-'}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>
                    <b>Venda:</b> {formatDate(r.saleDate)}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>
                    <b>Lote:</b> {r.importBatch || '-'}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>
                    <b>Produtos:</b>{' '}
                    {r.items?.length
                      ? r.items.map((item) => `${item.equipmentName} (${item.qty})`).join(', ')
                      : '-'}
                  </Typography.Text>
                </div>

                <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
                  <Button
                    style={{ borderRadius: 12 }}
                    onClick={() => navigate(`/projetos-instalacao/${r.id}`)}
                  >
                    Abrir
                  </Button>
                  <Button
                    type="primary"
                    icon={<SwapOutlined />}
                    loading={convertBase.isPending}
                    style={{ borderRadius: 12 }}
                    onClick={() => convertBase.mutate(r.id)}
                  >
                    Mover para Projetos
                  </Button>
                </div>
              </Card>
            ))}

            {hasMoreRows && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <Button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  style={{ borderRadius: 12 }}
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        ) : (
          <Typography.Text type="secondary">Nenhum registro de base encontrado.</Typography.Text>
        )}
      </div>
    ) : (
      <Table
        rowKey="id"
        loading={projectsQuery.isLoading}
        dataSource={filteredRows}
        columns={baseColumns}
        scroll={{ x: 1850 }}
        pagination={{ pageSize: 10 }}
      />
    ),
  },
];

  return (
    <div
      style={{
        display: 'grid',
        gap: isMobile ? 12 : 16,
        maxWidth: '100%',
        overflowX: 'hidden',
        padding: isMobile ? 0 : 4,
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 28,
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 58%, #3b82f6 100%)',
          boxShadow: '0 20px 40px rgba(15,23,42,0.16)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: isMobile ? 18 : 26 } }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.16)',
                color: '#dbeafe',
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              <ProjectOutlined />
              Gestão operacional
            </div>

            <Typography.Title level={2} style={{ margin: 0, color: '#fff' }}>
              Projetos de Instalação
            </Typography.Title>

            <Typography.Paragraph
              style={{
                margin: '10px 0 0',
                color: 'rgba(255,255,255,0.82)',
                maxWidth: 760,
              }}
            >
              Visualize a base importada, acompanhe projetos ativos e mova registros da base para projetos com mais clareza.
            </Typography.Paragraph>
          </div>

          <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
            <Button
              onClick={() => navigate('/projetos-instalacao/geolocalizacao')}
              style={{ borderRadius: 14 }}
            >
              Geolocalização
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => projectsQuery.refetch()}
              style={{ borderRadius: 14 }}
            >
              Atualizar
            </Button>
            <Button
              icon={<BarChartOutlined />}
              onClick={() => navigate('/projetos-instalacao/dashboard')}
              style={{ borderRadius: 14 }}
            >
              Dashboard
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportOpen(true)}
              style={{ borderRadius: 14 }}
            >
              Importar BASE
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
              style={{ borderRadius: 14, fontWeight: 700 }}
            >
              Novo Projeto
            </Button>
          </Space>
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {activeTab === 'PROJECT' && (
          <>
            <SummaryCard
              title="Total projetos"
              value={totals.totalProjects}
              subtitle="Itens da aba de projetos"
              icon={<ProjectOutlined />}
              bg="linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)"
              iconBg="linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)"
            />

            <SummaryCard
              title="Iniciados"
              value={totals.totalIniciado}
              subtitle="Projetos em andamento"
              icon={<ClockCircleOutlined />}
              bg="linear-gradient(180deg, #eef6ff 0%, #ffffff 100%)"
              iconBg="linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)"
            />

            <SummaryCard
              title="Finalizados"
              value={totals.totalFinalizado}
              subtitle="Projetos concluídos"
              icon={<CheckCircleOutlined />}
              bg="linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)"
              iconBg="linear-gradient(135deg, #16a34a 0%, #4ade80 100%)"
            />
          </>
        )}
        {activeTab === 'BASE' && (
          <SummaryCard
            title="Total base"
            value={totals.totalBase}
            subtitle="Itens importados na base"
            icon={<DatabaseOutlined />}
            bg="linear-gradient(180deg, #fff8e6 0%, #ffffff 100%)"
            iconBg="linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
          />
        )}
      </div>

      <Card
        bordered={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <SearchOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>Gestão de projetos</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Pesquise, filtre e acompanhe base e projetos com melhor leitura
              </div>
            </div>
          </div>
        }
        style={{
          borderRadius: 24,
          boxShadow: '0 14px 32px rgba(15,23,42,0.06)',
        }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.15fr 0.7fr 320px',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Pesquisar por projeto, AF, cliente, produto, técnico, lote..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(6);
            }}
            size="large"
            style={{ borderRadius: 14 }}
          />

          <Select
            value={status}
            size="large"
            onChange={(v) => {
              setStatus(v);
              setVisibleCount(6);
            }}
            style={{ width: '100%' }}
            options={[
              { label: 'Todos os status', value: 'TODOS' },
              { label: 'À iniciar', value: 'A_INICIAR' },
              { label: 'Iniciado', value: 'INICIADO' },
              { label: 'Finalizado', value: 'FINALIZADO' },
            ]}
          />

          <DatePicker.RangePicker
            size="large"
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={saleDateRange}
            onChange={(dates) => {
              setSaleDateRange((dates as [Dayjs | null, Dayjs | null]) || null);
              setVisibleCount(6);
            }}
            placeholder={['Venda de', 'Venda até']}
          />
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as RecordType);
            setVisibleCount(6);
          }}
          items={tabItems}
        />
      </Card>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title="Novo Projeto"
        okText="Criar"
        confirmLoading={createProject.isPending}
        width={isMobile ? '100%' : 1280}
        centered
        destroyOnHidden
        onOk={handleCreate}
        afterOpenChange={(isOpen) => {
          if (isOpen) {
            setTechSearch('');
            setSupervisorSearch('');
            form.setFieldsValue({
              trucksTotal: 1,
              equipmentsPerDay: 1,
              startPlannedAt: dayjs(),
              saleDate: dayjs(),
              clientId: null,
              af: null,
              contactName: null,
              contactEmails: [],
              contactPhone: null,
              notes: null,
              technicianIds: [],
              supervisorId: null,
              requestedLocationText: null,
              requestedCity: null,
              requestedState: null,
              requestedCep: null,
              requestedLat: null,
              requestedLng: null,
            });
          }
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ trucksTotal: 1, equipmentsPerDay: 1 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1.08fr 0.92fr',
              gap: 16,
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <Card size="small" title="Dados do projeto" style={{ borderRadius: 16 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <Form.Item label="Técnico / Prestador" name="technicianIds">
                    <Select
                      mode="multiple"
                      showSearch
                      placeholder={usersQuery.isLoading ? 'Carregando...' : 'Selecione um ou mais'}
                      filterOption={false}
                      onSearch={(v) => setTechSearch(v)}
                      onOpenChange={(isOpen) => isOpen && setTechSearch('')}
                      loading={usersQuery.isLoading}
                      options={technicianOptions.map((t) => ({ value: t.id, label: t.name }))}
                      notFoundContent={
                        usersQuery.isLoading ? <Spin size="small" /> : 'Nenhum técnico/prestador encontrado'
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    label="Supervisor"
                    name="supervisorId"
                    rules={[{ required: true, message: 'Selecione um supervisor' }]}
                  >
                    <Select
                      showSearch
                      placeholder={usersQuery.isLoading ? 'Carregando...' : 'Selecione'}
                      filterOption={false}
                      onSearch={(v) => setSupervisorSearch(v)}
                      onOpenChange={(isOpen) => isOpen && setSupervisorSearch('')}
                      loading={usersQuery.isLoading}
                      options={supervisorOptions.map((u) => ({ value: u.id, label: u.name }))}
                      notFoundContent={
                        usersQuery.isLoading ? <Spin size="small" /> : 'Nenhum supervisor encontrado'
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    label="Coordenador"
                    tooltip="Definido automaticamente pelo supervisor"
                    style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}
                  >
                    <Input value={coordinatorPreviewText} disabled />
                  </Form.Item>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
                    gap: 12,
                  }}
                >
                  <Form.Item
                    label="Nome do Projeto"
                    name="title"
                    rules={[{ required: true, message: 'Informe o nome do projeto' }]}
                  >
                    <Input placeholder="Ex: Implantação cliente X" />
                  </Form.Item>

                  <Form.Item label="AF" name="af" rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}>
                    <Input placeholder="Ex: G-001234" />
                  </Form.Item>
                </div>

                <Form.Item label="Cliente" name="clientId">
                  <Select
                    showSearch
                    allowClear
                    placeholder={clientsQuery.isLoading ? 'Carregando...' : 'Selecione'}
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
                    }
                    options={(clientsQuery.data || []).map((c) => ({ value: c.id, label: c.name }))}
                  />
                </Form.Item>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr',
                    gap: 12,
                  }}
                >
                  <Form.Item
                    label="Qtd. Veículos (total)"
                    name="trucksTotal"
                    rules={[{ required: true, message: 'Informe a quantidade total' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item
                    label="Instalações por dia"
                    name="equipmentsPerDay"
                    rules={[{ required: true, message: 'Informe a previsão por dia' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item label="Data da venda" name="saleDate">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>

                  <Form.Item
                    label="Data prevista de início"
                    name="startPlannedAt"
                    rules={[{ required: true, message: 'Selecione a data de início' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </div>

                {endPreview && (
                  <Typography.Text type="secondary" style={{ display: 'block', marginTop: -2 }}>
                    Previsão de duração: {endPreview}
                  </Typography.Text>
                )}

                <Form.Item label="Observações" name="notes" style={{ marginTop: 12, marginBottom: 0 }}>
                  <Input.TextArea rows={4} placeholder="Anotações iniciais..." />
                </Form.Item>
              </Card>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <Card
                size="small"
                title={
                  <Space>
                    <EnvironmentOutlined />
                    Localização
                  </Space>
                }
                style={{ borderRadius: 16 }}
              >
                <Form.Item label="Endereço / localização" name="requestedLocationText">
                  <Input
                    placeholder="Ex: Rua X, Centro, Campinas - SP"
                    addonAfter={
                      <Button
                        type="link"
                        style={{ paddingInline: 0 }}
                        onClick={() => {
                          const city = String(form.getFieldValue('requestedCity') || '').trim();
                          const uf = normalizeUF(form.getFieldValue('requestedState'));
                          const cep = String(form.getFieldValue('requestedCep') || '').trim();
                          const address = String(form.getFieldValue('requestedLocationText') || '').trim();
                          const q = address || cep || [city, uf].filter(Boolean).join(', ');
                          setGeoQuery(q);
                          setGeoResults([]);
                          setGeoOpen(true);
                        }}
                      >
                        Buscar
                      </Button>
                    }
                  />
                </Form.Item>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.7fr 0.9fr',
                    gap: 12,
                  }}
                >
                  <Form.Item label="Cidade" name="requestedCity">
                    <Input placeholder="Cidade da instalação" />
                  </Form.Item>

                  <Form.Item
                    label="UF"
                    name="requestedState"
                    rules={[{ len: 2, message: 'Informe a UF com 2 letras' }]}
                  >
                    <Input
                      maxLength={2}
                      placeholder="SP"
                      onChange={(e) => form.setFieldValue('requestedState', normalizeUF(e.target.value))}
                    />
                  </Form.Item>

                  <Form.Item label="CEP" name="requestedCep">
                    <Input
                      placeholder="00000-000"
                      onChange={(e) => form.setFieldValue('requestedCep', normalizeCep(e.target.value))}
                    />
                  </Form.Item>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <Form.Item
                    label="Latitude"
                    name="requestedLat"
                    rules={[
                      {
                        validator: async (_, value) => {
                          if (value == null || value === '') return;
                          const num = Number(value);
                          if (!Number.isFinite(num) || num < -90 || num > 90) {
                            throw new Error('Latitude inválida');
                          }
                        },
                      },
                    ]}
                  >
                    <InputNumber placeholder="-23.55052" style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item
                    label="Longitude"
                    name="requestedLng"
                    rules={[
                      {
                        validator: async (_, value) => {
                          if (value == null || value === '') return;
                          const num = Number(value);
                          if (!Number.isFinite(num) || num < -180 || num > 180) {
                            throw new Error('Longitude inválida');
                          }
                        },
                      },
                    ]}
                  >
                    <InputNumber placeholder="-46.633308" style={{ width: '100%' }} />
                  </Form.Item>
                </div>

                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  A geolocalização do projeto usa os dados informados aqui.
                </Typography.Text>
              </Card>

              <Card size="small" title="Dados de contato" style={{ borderRadius: 16 }}>
                <Form.Item label="Contato" name="contactName">
                  <Input placeholder="Nome do contato" />
                </Form.Item>

                <Form.Item
                  label="E-mails"
                  name="contactEmails"
                  rules={[
                    { required: true, message: 'Informe pelo menos um e-mail' },
                    {
                      validator: async (_, value) => {
                        const emails = normalizeEmailList(value);
                        if (!emails.length) throw new Error('Informe pelo menos um e-mail');
                        const invalid = emails.find((email) => !isValidEmail(email));
                        if (invalid) throw new Error(`E-mail inválido: ${invalid}`);
                      },
                    },
                  ]}
                >
                  <Select
                    mode="tags"
                    tokenSeparators={[',', ';', ' ']}
                    placeholder="Digite um ou mais e-mails"
                  />
                </Form.Item>

                <Form.Item label="Telefone" name="contactPhone" style={{ marginBottom: 0 }}>
                  <Input placeholder="(11) 99999-9999" />
                </Form.Item>
              </Card>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Importar Excel para BASE"
        open={importOpen}
        onCancel={() => {
          if (!importBase.isPending) {
            setImportOpen(false);
            setFileList([]);
          }
        }}
        onOk={handleImport}
        okText="Importar"
        confirmLoading={importBase.isPending}
        destroyOnHidden
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <Typography.Text type="secondary">
            Envie um arquivo Excel com colunas como AF, DATA, CLIENTE, PRODUTO, QUANTIDADE_PRODUTO e TOTAL_EQUIPAMENTOS_AF.
          </Typography.Text>

          <Upload.Dragger
            multiple={false}
            accept=".xlsx,.xls"
            maxCount={1}
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: next }) => setFileList(next)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Clique ou arraste o Excel aqui</p>
            <p className="ant-upload-hint">A importação vai alimentar a aba BASE.</p>
          </Upload.Dragger>
        </div>
      </Modal>

      <Modal
        title="Buscar coordenadas"
        open={geoOpen}
        onCancel={() => setGeoOpen(false)}
        footer={null}
        destroyOnHidden
        width={isMobile ? '100%' : 900}
      >
        <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
          <Input
            placeholder="Ex.: Cotia, SP ou Rua XV de Novembro, Curitiba"
            value={geoQuery}
            onChange={(e) => setGeoQuery(e.target.value)}
            onPressEnter={searchGeo}
          />
          <Button type="primary" icon={<SearchOutlined />} loading={geoLoading} onClick={searchGeo}>
            Buscar
          </Button>
        </Space.Compact>

        <List
          bordered
          locale={{ emptyText: geoLoading ? 'Buscando...' : 'Nenhum resultado' }}
          dataSource={geoResults}
          renderItem={(item: GeocodeResult) => (
            <List.Item actions={[<Button type="link" onClick={() => applyGeo(item)}>Usar</Button>]}>
              <List.Item.Meta
                title={item.label || item.displayName || 'Local encontrado'}
                description={
                  <>
                    <div>
                      <b>lat/lng:</b> {item.lat ?? '—'}, {item.lng ?? '—'}
                    </div>
                    <div>
                      <b>cidade:</b>{' '}
                      {item.city || item.address?.city || item.address?.town || item.address?.village || '—'}
                      {' • '}
                      <b>UF:</b>{' '}
                      {normalizeUF(item.uf || item.state || item.address?.state_code || item.address?.state) || '—'}
                    </div>
                    <div>
                      <b>CEP:</b> {normalizeCep(item.cep || item.postcode || item.address?.postcode) || '—'}
                    </div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}