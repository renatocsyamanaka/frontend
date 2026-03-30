import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Grid,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FundOutlined,
  ReloadOutlined,
  RiseOutlined,
  SearchOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';

import InstallationHeatMap from './InstallationHeatMap';


const { RangePicker } = DatePicker;

type DashboardOverview = {
  totalProjects: number;
  planned: number;
  done: number;
  pending: number;
  delayedProjects: number;
  percentDone: number;
};

type ProductivityDay = {
  date: string;
  installed: number;
};

type ProductivityWeek = {
  weekStart: string;
  installed: number;
};

type DashboardProductivity = {
  totalInstalled: number;
  averageDaily: number;
  averageWeekly: number;
  targetDaily: number;
  targetWeekly: number;
  compareDailyPct: number;
  compareWeeklyPct: number;
  byDay: ProductivityDay[];
  byWeek: ProductivityWeek[];
};

type ByClientRow = {
  clientId: number;
  clientName: string;
  planned: number;
  done: number;
  pending: number;
  projects: number;
  percentDone: number;
};

type ByStatusRow = {
  status: string;
  total: number;
};

type ByCoordinatorRow = {
  coordinatorId: number;
  coordinatorName: string;
  projects: number;
  planned: number;
  done: number;
  pending: number;
  delayedProjects: number;
  percentDone: number;
};

type ByTechnicianRow = {
  technicianId: number;
  technicianName: string;
  projects: number;
  planned: number;
  done: number;
  pending: number;
  percentDone: number;
};

type ByRegionRow = {
  region: string;
  uf: string;
  city: string;
  projects: number;
  planned: number;
  done: number;
  pending: number;
  delayedProjects: number;
  percentDone: number;
};

type ByProductRow = {
  product: string;
  code?: string | null;
  planned: number;
  done: number;
  pending: number;
  percentDone: number;
};

type FailureReasonRow = {
  reason: string;
  total: number;
};

type SuccessRate = {
  attempts: number;
  successfulInstallations: number;
  failedAttempts: number;
  successRate: number;
  failureReasons: FailureReasonRow[];
};

type MapRow = {
  lat: number;
  lng: number;
  city?: string | null;
  uf?: string | null;
  region?: string | null;
  clients?: string[];
  projects: number;
  planned: number;
  done: number;
  pending: number;
  delayedProjects: number;
  heat: number;
};

type DashboardResponse = {
  filters: Record<string, any>;
  overview: DashboardOverview;
  productivity: DashboardProductivity;
  byClient: ByClientRow[];
  byStatus: ByStatusRow[];
  byCoordinator: ByCoordinatorRow[];
  byTechnician: ByTechnicianRow[];
  byRegion: ByRegionRow[];
  byProduct: ByProductRow[];
  successRate: SuccessRate;
  map: MapRow[];
};

type Client = { id: number; name: string };
type UserLite = { id: number; name: string; role?: { id: number; name: string; level: number } };

function unwrap<T>(resData: any): T {
  return resData && typeof resData === 'object' && 'data' in resData
    ? (resData.data as T)
    : (resData as T);
}

function statusLabel(value: string) {
  if (value === 'AGENDADO') return 'Agendado';
  if (value === 'EM_ANDAMENTO') return 'Em andamento';
  if (value === 'CONCLUIDO') return 'Concluído';
  if (value === 'CANCELADO') return 'Cancelado';
  if (value === 'REAGENDADO') return 'Reagendado';
  if (value === 'NAO_INFORMADO') return 'Não informado';
  return value;
}

function statusPill(value: string) {
  if (value === 'AGENDADO') return { bg: '#fff7e6', border: '#ffd591', color: '#d46b08' };
  if (value === 'EM_ANDAMENTO') return { bg: '#e6f4ff', border: '#91caff', color: '#0958d9' };
  if (value === 'CONCLUIDO') return { bg: '#f6ffed', border: '#b7eb8f', color: '#389e0d' };
  if (value === 'CANCELADO') return { bg: '#fff1f0', border: '#ffa39e', color: '#cf1322' };
  if (value === 'REAGENDADO') return { bg: '#fff7e6', border: '#ffd591', color: '#d46b08' };
  return { bg: '#fafafa', border: '#d9d9d9', color: '#434343' };
}

function reasonLabel(value: string) {
  if (value === 'CLIENTE_AUSENTE') return 'Cliente ausente';
  if (value === 'PROBLEMA_TECNICO') return 'Problema técnico';
  if (value === 'VEICULO_INDISPONIVEL') return 'Veículo indisponível';
  if (value === 'REAGENDADO') return 'Reagendado';
  if (value === 'CANCELADO') return 'Cancelado';
  if (value === 'ENDERECO_INCORRETO') return 'Endereço incorreto';
  if (value === 'OUTROS') return 'Outros';
  return value;
}

function buildParams(filters: {
  range?: [Dayjs | null, Dayjs | null] | null;
  clientId?: number | null;
  coordinatorId?: number | null;
  technicianId?: number | null;
  region?: string | null;
  uf?: string | null;
  product?: string;
  status?: string | null;
  q?: string;
}) {
  const params: Record<string, any> = {};

  if (filters.range?.[0]) params.startDate = filters.range[0].format('YYYY-MM-DD');
  if (filters.range?.[1]) params.endDate = filters.range[1].format('YYYY-MM-DD');
  if (filters.clientId) params.clientId = filters.clientId;
  if (filters.coordinatorId) params.coordinatorId = filters.coordinatorId;
  if (filters.technicianId) params.technicianId = filters.technicianId;
  if (filters.region) params.region = filters.region;
  if (filters.uf) params.uf = filters.uf;
  if (filters.product?.trim()) params.product = filters.product.trim();
  if (filters.status) params.status = filters.status;
  if (filters.q?.trim()) params.q = filters.q.trim();

  return params;
}

function sectionTitle(icon: React.ReactNode, title: string, subtitle?: string) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
          color: '#fff',
          boxShadow: '0 10px 24px rgba(22,119,255,0.22)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#0f172a' }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 12, color: '#64748b' }}>{subtitle}</div> : null}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  subtitle,
  colors,
  suffix,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  suffix?: string;
  colors: {
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
  };
}) {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 24,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{title}</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              lineHeight: 1.1,
              fontWeight: 800,
              color: '#0f172a',
            }}
          >
            {value}
            {suffix ? <span style={{ fontSize: 16, marginLeft: 4 }}>{suffix}</span> : null}
          </div>
          {subtitle ? <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>{subtitle}</div> : null}
        </div>

        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            background: colors.iconBg,
            color: colors.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

function SimpleBars({
  data,
  valueKey,
  labelKey,
  maxItems = 5,
  color = 'linear-gradient(90deg, #1677ff 0%, #69b1ff 100%)',
}: {
  data: Record<string, any>[];
  valueKey: string;
  labelKey: string;
  maxItems?: number;
  color?: string;
}) {
  const rows = useMemo(
    () =>
      [...data]
        .sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0))
        .slice(0, maxItems),
    [data, valueKey, maxItems]
  );

  const max = Math.max(...rows.map((r) => Number(r[valueKey] || 0)), 0);

  if (!rows.length) {
    return <Empty description="Sem dados" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {rows.map((row, index) => {
        const value = Number(row[valueKey] || 0);
        const percent = max ? Math.round((value / max) * 100) : 0;

        return (
          <div
            key={`${row[labelKey]}_${index}`}
            style={{
              display: 'grid',
              gap: 8,
              padding: 12,
              borderRadius: 16,
              background: '#f8fafc',
              border: '1px solid #eef2f7',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 13,
                color: '#0f172a',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
              >
                {String(row[labelKey] || '-')}
              </span>
              <b>{value}</b>
            </div>

            <div
              style={{
                width: '100%',
                height: 12,
                background: '#e2e8f0',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 999,
                  boxShadow: '0 8px 20px rgba(22,119,255,0.22)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusSummaryCards({ data }: { data: ByStatusRow[] }) {
  const rows = data.slice(0, 6);

  if (!rows.length) {
    return <Empty description="Sem dados de status" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {rows.map((row) => {
        const theme = statusPill(row.status);

        return (
          <div
            key={row.status}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              border: '1px solid #eef2f7',
              borderRadius: 18,
              padding: 14,
              background: '#f8fafc',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 10,
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                color: theme.color,
                fontSize: 13,
              }}
            >
              {statusLabel(row.status)}
            </span>

            <b style={{ fontSize: 22, color: '#0f172a' }}>{row.total}</b>
          </div>
        );
      })}
    </div>
  );
}

function HeatMapGrid({
  data,
  fallbackRegions,
  maxItems = 5,
}: {
  data: MapRow[];
  fallbackRegions: ByRegionRow[];
  maxItems?: number;
}) {
  const validRows = [...data]
    .filter((item) => {
      const validLat = Number.isFinite(Number(item.lat)) && Number(item.lat) !== 0;
      const validLng = Number.isFinite(Number(item.lng)) && Number(item.lng) !== 0;
      return validLat && validLng;
    })
    .sort((a, b) => b.heat - a.heat)
    .slice(0, maxItems);

  if (validRows.length) {
    const max = Math.max(...validRows.map((r) => Number(r.heat || 0)), 0);

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {validRows.map((item, index) => {
          const percent = max ? item.heat / max : 0;

          let background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
          let color = '#0f172a';

          if (percent > 0.75) {
            background = 'linear-gradient(135deg, #ef4444 0%, #fb7185 100%)';
            color = '#fff';
          } else if (percent > 0.45) {
            background = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
            color = '#0f172a';
          } else if (percent > 0.2) {
            background = 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)';
            color = '#fff';
          }

          return (
            <div
              key={`${item.lat}_${item.lng}_${index}`}
              style={{
                borderRadius: 18,
                padding: 14,
                background,
                color,
                boxShadow: '0 14px 28px rgba(15,23,42,0.10)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontWeight: 800 }}>
                  {[item.city, item.uf, item.region].filter(Boolean).join(' • ') || 'Região'}
                </div>
                <Tag color={color === '#fff' ? 'default' : 'blue'} style={{ marginRight: 0 }}>
                  Heat {item.heat}
                </Tag>
              </div>

              <div style={{ fontSize: 12, marginTop: 8, opacity: 0.95 }}>
                Projetos: {item.projects} | Planejado: {item.planned} | Realizado: {item.done} | Pendente:{' '}
                {item.pending}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.95 }}>
                Atrasados: {item.delayedProjects}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const regionFallback = [...fallbackRegions]
    .sort((a, b) => b.planned - a.planned || b.projects - a.projects)
    .slice(0, maxItems);

  if (!regionFallback.length) {
    return <Empty description="Sem dados para o mapa de calor" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const max = Math.max(...regionFallback.map((r) => Number(r.planned || 0)), 0);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {regionFallback.map((item, index) => {
        const percent = max ? item.planned / max : 0;

        let background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
        let color = '#0f172a';

        if (percent > 0.75) {
          background = 'linear-gradient(135deg, #ef4444 0%, #fb7185 100%)';
          color = '#fff';
        } else if (percent > 0.45) {
          background = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
          color = '#0f172a';
        } else if (percent > 0.2) {
          background = 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)';
          color = '#fff';
        }

        return (
          <div
            key={`${item.region}_${item.uf}_${item.city}_${index}`}
            style={{
              borderRadius: 18,
              padding: 14,
              background,
              color,
              boxShadow: '0 14px 28px rgba(15,23,42,0.10)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontWeight: 800 }}>
                {[item.city, item.uf, item.region].filter(Boolean).join(' • ') || 'Região'}
              </div>
              <Tag color={color === '#fff' ? 'default' : 'blue'} style={{ marginRight: 0 }}>
                Heat {item.planned}
              </Tag>
            </div>

            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.95 }}>
              Projetos: {item.projects} | Planejado: {item.planned} | Realizado: {item.done} | Pendente:{' '}
              {item.pending}
            </div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.95 }}>
              Atrasados: {item.delayedProjects}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function InstallationProjectsDashboardPage() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [clientId, setClientId] = useState<number | null>(null);
  const [coordinatorId, setCoordinatorId] = useState<number | null>(null);
  const [technicianId, setTechnicianId] = useState<number | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [uf, setUf] = useState<string | null>(null);
  const [product, setProduct] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const [openDayModal, setOpenDayModal] = useState(false);
  const [openWeekModal, setOpenWeekModal] = useState(false);
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [openMapModal, setOpenMapModal] = useState(false);
  const [modalMapKey, setModalMapKey] = useState(0);
  
  const filters = useMemo(
    () => ({
      range,
      clientId,
      coordinatorId,
      technicianId,
      region,
      uf,
      product,
      status,
      q,
    }),
    [range, clientId, coordinatorId, technicianId, region, uf, product, status, q]
  );

  const clientsQuery = useQuery<Client[]>({
    queryKey: ['clients-dashboard-installation'],
    queryFn: async () => {
      const res = await api.get('/clients');
      return unwrap<Client[]>(res.data);
    },
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const usersQuery = useQuery<UserLite[]>({
    queryKey: ['users-dashboard-installation'],
    queryFn: async () => {
      const res = await api.get('/users');
      return unwrap<UserLite[]>(res.data);
    },
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const dashboardQuery = useQuery<DashboardResponse>({
    queryKey: ['installation-projects-dashboard', filters],
    queryFn: async () => {
      const res = await api.get('/installation-projects/dashboard/overview', {
        params: buildParams(filters),
      });
      return unwrap<DashboardResponse>(res.data);
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 20000,
  });

  const coordinators = useMemo(() => {
    const rows = usersQuery.data || [];
    return rows
      .filter((u) => (u.role?.level || 0) >= 4)
      .map((u) => ({ value: u.id, label: u.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [usersQuery.data]);

  const technicians = useMemo(() => {
    const rows = usersQuery.data || [];
    return rows
      .filter((u) => [1, 8].includes(u.role?.id || 0))
      .map((u) => ({ value: u.id, label: u.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [usersQuery.data]);

  const overview = dashboardQuery.data?.overview;
  const productivity = dashboardQuery.data?.productivity;
  const byClient = dashboardQuery.data?.byClient || [];
  const byStatus = dashboardQuery.data?.byStatus || [];
  const byCoordinator = dashboardQuery.data?.byCoordinator || [];
  const byTechnician = dashboardQuery.data?.byTechnician || [];
  const byRegion = dashboardQuery.data?.byRegion || [];
  const byProduct = dashboardQuery.data?.byProduct || [];
  const successRate = dashboardQuery.data?.successRate;
  const mapRows = dashboardQuery.data?.map || [];

  const today = dayjs().endOf('day');

  const byDayNoFuture = useMemo(() => {
    return (productivity?.byDay || [])
      .filter((item) => dayjs(item.date).isValid() && !dayjs(item.date).isAfter(today))
      .map((item) => ({
        label: dayjs(item.date).format('DD/MM'),
        valor: item.installed,
        rawDate: item.date,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [productivity?.byDay, today]);

  const byWeekNoFuture = useMemo(() => {
    return (productivity?.byWeek || [])
      .filter((item) => dayjs(item.weekStart).isValid() && !dayjs(item.weekStart).isAfter(today))
      .map((item) => ({
        label: `Sem. ${dayjs(item.weekStart).format('DD/MM')}`,
        valor: item.installed,
        rawWeek: item.weekStart,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [productivity?.byWeek, today]);

  const clientColumns: ColumnsType<ByClientRow> = [
    { title: 'Cliente', dataIndex: 'clientName', key: 'clientName' },
    { title: 'Projetos', dataIndex: 'projects', key: 'projects', width: 90, align: 'center' },
    { title: 'Planejado', dataIndex: 'planned', key: 'planned', width: 110, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 110, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 110, align: 'center' },
    {
      title: '% Conclusão',
      dataIndex: 'percentDone',
      key: 'percentDone',
      width: 140,
      render: (v) => <Progress percent={Number(v || 0)} size="small" strokeColor="#1677ff" />,
    },
  ];

  const coordinatorColumns: ColumnsType<ByCoordinatorRow> = [
    { title: 'Coordenador', dataIndex: 'coordinatorName', key: 'coordinatorName' },
    { title: 'Projetos', dataIndex: 'projects', key: 'projects', width: 90, align: 'center' },
    { title: 'Planejado', dataIndex: 'planned', key: 'planned', width: 100, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 100, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 100, align: 'center' },
    { title: 'Atrasados', dataIndex: 'delayedProjects', key: 'delayedProjects', width: 100, align: 'center' },
    {
      title: '%',
      dataIndex: 'percentDone',
      key: 'percentDone',
      width: 120,
      render: (v) => <Progress percent={Number(v || 0)} size="small" strokeColor="#1677ff" />,
    },
  ];

  const technicianColumns: ColumnsType<ByTechnicianRow> = [
    { title: 'Técnico / Prestador', dataIndex: 'technicianName', key: 'technicianName' },
    { title: 'Projetos', dataIndex: 'projects', key: 'projects', width: 90, align: 'center' },
    { title: 'Planejado', dataIndex: 'planned', key: 'planned', width: 100, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 100, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 100, align: 'center' },
    {
      title: '%',
      dataIndex: 'percentDone',
      key: 'percentDone',
      width: 120,
      render: (v) => <Progress percent={Number(v || 0)} size="small" strokeColor="#1677ff" />,
    },
  ];

  const regionColumns: ColumnsType<ByRegionRow> = [
    { title: 'Região', dataIndex: 'region', key: 'region', width: 120 },
    { title: 'UF', dataIndex: 'uf', key: 'uf', width: 70, align: 'center' },
    { title: 'Cidade', dataIndex: 'city', key: 'city' },
    { title: 'Projetos', dataIndex: 'projects', key: 'projects', width: 90, align: 'center' },
    { title: 'Planejado', dataIndex: 'planned', key: 'planned', width: 100, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 100, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 100, align: 'center' },
    { title: 'Atrasados', dataIndex: 'delayedProjects', key: 'delayedProjects', width: 100, align: 'center' },
  ];

  const productColumns: ColumnsType<ByProductRow> = [
    { title: 'Produto / Equipamento', dataIndex: 'product', key: 'product' },
    {
      title: 'Código',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v) => v || '-',
    },
    { title: 'Planejado', dataIndex: 'planned', key: 'planned', width: 110, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 110, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 110, align: 'center' },
    {
      title: '%',
      dataIndex: 'percentDone',
      key: 'percentDone',
      width: 120,
      render: (v) => <Progress percent={Number(v || 0)} size="small" strokeColor="#1677ff" />,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gap: 18,
        background: 'linear-gradient(180deg, #f8fbff 0%, #f3f7fc 100%)',
        padding: isMobile ? 10 : 4,
        borderRadius: 24,
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 28,
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
          boxShadow: '0 18px 42px rgba(15,23,42,0.18)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: isMobile ? 18 : 26 } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
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
                background: 'rgba(255,255,255,0.14)',
                color: '#dbeafe',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              <FundOutlined />
              Visão administrativa
            </div>

            <Typography.Title level={2} style={{ margin: 0, color: '#fff' }}>
              Dashboard de Instalação
            </Typography.Title>

            <Typography.Paragraph
              style={{
                margin: '10px 0 0',
                color: 'rgba(255,255,255,0.78)',
                maxWidth: 760,
              }}
            >
              Acompanhe produção, pendências, taxa de sucesso, clientes, coordenadores, técnicos,
              regiões e volume por produto com uma visão mais executiva e operacional.
            </Typography.Paragraph>
          </div>

          <Space wrap>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/projetos-instalacao')}
              style={{
                borderRadius: 14,
                borderColor: 'rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
              }}
            >
              Voltar
            </Button>
            <Button
              size="large"
              icon={<EnvironmentOutlined />}
              onClick={() => navigate('/projetos-instalacao/geolocalizacao')}
              style={{
                borderRadius: 14,
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#0f172a',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              Validar geolocalização
            </Button>
            <Button
              size="large"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => dashboardQuery.refetch()}
              style={{
                borderRadius: 14,
                background: '#fff',
                color: '#1d4ed8',
                borderColor: '#fff',
                fontWeight: 700,
              }}
            >
              Atualizar
            </Button>
          </Space>
        </div>
      </Card>

      <Card
        bordered={false}
        style={{
          borderRadius: 24,
          boxShadow: '0 14px 32px rgba(15,23,42,0.06)',
        }}
        title={sectionTitle(
          <CalendarOutlined />,
          'Filtros do dashboard',
          'Refine a análise por período, cliente, região, equipe e produto'
        )}
        styles={{ body: { padding: isMobile ? 14 : 20 } }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <RangePicker
              value={range as any}
              onChange={(v) => setRange((v as [Dayjs | null, Dayjs | null]) || null)}
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              size="large"
            />
          </Col>

          <Col xs={24} md={6}>
            <Select
              allowClear
              showSearch
              size="large"
              placeholder="Cliente"
              style={{ width: '100%' }}
              value={clientId ?? undefined}
              onChange={(v) => setClientId(v ?? null)}
              optionFilterProp="label"
              options={(clientsQuery.data || []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Col>

          <Col xs={24} md={5}>
            <Select
              allowClear
              showSearch
              size="large"
              placeholder="Coordenador"
              style={{ width: '100%' }}
              value={coordinatorId ?? undefined}
              onChange={(v) => setCoordinatorId(v ?? null)}
              optionFilterProp="label"
              options={coordinators}
            />
          </Col>

          <Col xs={24} md={5}>
            <Select
              allowClear
              showSearch
              size="large"
              placeholder="Técnico / Prestador"
              style={{ width: '100%' }}
              value={technicianId ?? undefined}
              onChange={(v) => setTechnicianId(v ?? null)}
              optionFilterProp="label"
              options={technicians}
            />
          </Col>

          <Col xs={24} md={4}>
            <Select
              allowClear
              size="large"
              placeholder="Região"
              style={{ width: '100%' }}
              value={region ?? undefined}
              onChange={(v) => setRegion(v ?? null)}
              options={[
                { value: 'Norte', label: 'Norte' },
                { value: 'Nordeste', label: 'Nordeste' },
                { value: 'Centro-Oeste', label: 'Centro-Oeste' },
                { value: 'Sudeste', label: 'Sudeste' },
                { value: 'Sul', label: 'Sul' },
              ]}
            />
          </Col>

          <Col xs={24} md={4}>
            <Select
              allowClear
              size="large"
              placeholder="UF"
              style={{ width: '100%' }}
              value={uf ?? undefined}
              onChange={(v) => setUf(v ?? null)}
              options={[
                'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
                'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
                'SP','SE','TO'
              ].map((value) => ({ value, label: value }))}
            />
          </Col>

          <Col xs={24} md={4}>
            <Select
              allowClear
              size="large"
              placeholder="Status"
              style={{ width: '100%' }}
              value={status ?? undefined}
              onChange={(v) => setStatus(v ?? null)}
              options={[
                { value: 'A_INICIAR', label: 'À iniciar' },
                { value: 'INICIADO', label: 'Iniciado' },
                { value: 'FINALIZADO', label: 'Finalizado' },
              ]}
            />
          </Col>

          <Col xs={24} md={6}>
            <Input
              allowClear
              size="large"
              placeholder="Produto / equipamento"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
          </Col>

          <Col xs={24} md={10}>
            <Input
              allowClear
              size="large"
              prefix={<SearchOutlined />}
              placeholder="Buscar por projeto, AF, cliente, coordenador ou técnico"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Col>
        </Row>
      </Card>

      {dashboardQuery.isLoading ? (
        <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        </Card>
      ) : !dashboardQuery.data ? (
        <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}>
          <Empty description="Sem dados do dashboard" />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard
                title="Total planejado"
                value={overview?.planned || 0}
                subtitle="Volume total previsto"
                icon={<FundOutlined />}
                colors={{
                  bg: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
                  border: '#dbeafe',
                  iconBg: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
                  iconColor: '#fff',
                }}
              />
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <KpiCard
                title="Total realizado"
                value={overview?.done || 0}
                subtitle="Instalações já concluídas"
                icon={<CheckCircleOutlined />}
                colors={{
                  bg: 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)',
                  border: '#bbf7d0',
                  iconBg: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)',
                  iconColor: '#fff',
                }}
              />
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <KpiCard
                title="Total pendente"
                value={overview?.pending || 0}
                subtitle="Ainda falta instalar"
                icon={<ClockCircleOutlined />}
                colors={{
                  bg: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
                  border: '#fed7aa',
                  iconBg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                  iconColor: '#fff',
                }}
              />
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <KpiCard
                title="% concluído"
                value={overview?.percentDone || 0}
                suffix="%"
                subtitle="Percentual geral de execução"
                icon={<TrophyOutlined />}
                colors={{
                  bg: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)',
                  border: '#ddd6fe',
                  iconBg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                  iconColor: '#fff',
                }}
              />
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <KpiCard
                title="Projetos"
                value={overview?.totalProjects || 0}
                subtitle="Quantidade total de projetos"
                icon={<TeamOutlined />}
                colors={{
                  bg: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                  border: '#e2e8f0',
                  iconBg: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                  iconColor: '#fff',
                }}
              />
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <KpiCard
                title="Projetos atrasados"
                value={overview?.delayedProjects || 0}
                subtitle="Demandam atenção imediata"
                icon={<WarningOutlined />}
                colors={{
                  bg: 'linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)',
                  border: '#fecaca',
                  iconBg: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
                  iconColor: '#fff',
                }}
              />
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <KpiCard
                title="Média diária"
                value={productivity?.averageDaily || 0}
                subtitle="Produção média por dia"
                icon={<RiseOutlined />}
                colors={{
                  bg: 'linear-gradient(180deg, #eefbf3 0%, #ffffff 100%)',
                  border: '#c7f9d4',
                  iconBg: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                  iconColor: '#fff',
                }}
              />
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <KpiCard
                title="Média semanal"
                value={productivity?.averageWeekly || 0}
                subtitle="Produção média por semana"
                icon={<CalendarOutlined />}
                colors={{
                  bg: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
                  border: '#dbeafe',
                  iconBg: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
                  iconColor: '#fff',
                }}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<RiseOutlined />, 'Produtividade por dia', 'Top 5 períodos com instalações realizadas')}
                extra={
                  byDayNoFuture.length > 5 ? (
                    <Button type="link" icon={<EyeOutlined />} onClick={() => setOpenDayModal(true)}>
                      Ver mais
                    </Button>
                  ) : null
                }
              >
                <SimpleBars
                  data={byDayNoFuture}
                  labelKey="label"
                  valueKey="valor"
                  maxItems={5}
                  color="linear-gradient(90deg, #1677ff 0%, #60a5fa 100%)"
                />
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<CalendarOutlined />, 'Produtividade por semana', 'Top 5 períodos consolidados')}
                extra={
                  byWeekNoFuture.length > 5 ? (
                    <Button type="link" icon={<EyeOutlined />} onClick={() => setOpenWeekModal(true)}>
                      Ver mais
                    </Button>
                  ) : null
                }
              >
                <SimpleBars
                  data={byWeekNoFuture}
                  labelKey="label"
                  valueKey="valor"
                  maxItems={5}
                  color="linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)"
                />
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<TrophyOutlined />, 'Meta diária', 'Acompanhamento frente ao objetivo diário')}
              >
                <Statistic title="Comparação com meta" value={productivity?.compareDailyPct || 0} suffix="%" />
                <div style={{ marginTop: 14 }}>
                  <Progress
                    percent={Math.min(Number(productivity?.compareDailyPct || 0), 100)}
                    strokeColor={{ '0%': '#1677ff', '100%': '#69b1ff' }}
                  />
                </div>
                <Typography.Text type="secondary">Meta diária: {productivity?.targetDaily || 0}</Typography.Text>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<FundOutlined />, 'Meta semanal', 'Acompanhamento frente ao objetivo semanal')}
              >
                <Statistic title="Comparação com meta" value={productivity?.compareWeeklyPct || 0} suffix="%" />
                <div style={{ marginTop: 14 }}>
                  <Progress
                    percent={Math.min(Number(productivity?.compareWeeklyPct || 0), 100)}
                    strokeColor={{ '0%': '#7c3aed', '100%': '#a78bfa' }}
                  />
                </div>
                <Typography.Text type="secondary">Meta semanal: {productivity?.targetWeekly || 0}</Typography.Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<CheckCircleOutlined />, 'Status das instalações', 'Distribuição geral por situação')}
                extra={
                  byStatus.length > 5 ? (
                    <Button type="link" icon={<EyeOutlined />} onClick={() => setOpenStatusModal(true)}>
                      Ver mais
                    </Button>
                  ) : null
                }
              >
                <StatusSummaryCards data={byStatus.slice(0, 5)} />
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<TrophyOutlined />, 'Taxa de sucesso', 'Tentativas, falhas e motivos')}
              >
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Card size="small" style={{ borderRadius: 16, background: '#f8fafc' }}>
                      <Statistic title="Tentativas" value={successRate?.attempts || 0} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ borderRadius: 16, background: '#f0fdf4' }}>
                      <Statistic title="Sucesso" value={successRate?.successfulInstallations || 0} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ borderRadius: 16, background: '#fef2f2' }}>
                      <Statistic title="Falhas" value={successRate?.failedAttempts || 0} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ borderRadius: 16, background: '#eff6ff' }}>
                      <Statistic title="Taxa" value={successRate?.successRate || 0} suffix="%" />
                    </Card>
                  </Col>
                </Row>

                <div style={{ marginTop: 16 }}>
                  <Progress
                    percent={Math.min(Number(successRate?.successRate || 0), 100)}
                    strokeColor={{ '0%': '#16a34a', '100%': '#4ade80' }}
                  />
                </div>

                <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
                  {(successRate?.failureReasons || []).filter((r) => r.total > 0).length ? (
                    (successRate?.failureReasons || [])
                      .filter((r) => r.total > 0)
                      .map((item) => (
                        <div
                          key={item.reason}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: 12,
                            borderRadius: 14,
                            background: '#fff7ed',
                            border: '1px solid #fed7aa',
                          }}
                        >
                          <span>{reasonLabel(item.reason)}</span>
                          <b>{item.total}</b>
                        </div>
                      ))
                  ) : (
                    <Empty description="Sem falhas registradas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<TeamOutlined />, 'Volume por cliente', 'Maiores clientes por produção')}
              >
                <SimpleBars
                  data={byClient.map((item) => ({
                    nome: item.clientName,
                    total: item.done,
                  }))}
                  labelKey="nome"
                  valueKey="total"
                  maxItems={5}
                  color="linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)"
                />
              </Card>
            </Col>

<Col xs={24} xl={12}>
  <Card
    bordered={false}
    style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
    title={sectionTitle(<EnvironmentOutlined />, 'Mapa de calor', 'Distribuição geográfica das instalações')}
    extra={
      (mapRows.length > 0 || byRegion.length > 0) ? (
        <Button type="link" icon={<EyeOutlined />} onClick={() => setOpenMapModal(true)}>
          Ver mais
        </Button>
      ) : null
    }
  >
    <InstallationHeatMap data={mapRows} fallbackRegions={byRegion} height={430} />
  </Card>
</Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<FundOutlined />, 'Visão por cliente', 'Planejado, realizado e pendente')}
              >
                <Table
                  rowKey="clientId"
                  dataSource={byClient}
                  columns={clientColumns}
                  pagination={{ pageSize: 6 }}
                  scroll={{ x: 900 }}
                />
              </Card>
            </Col>

            <Col xs={24}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<TeamOutlined />, 'Visão por coordenador', 'Performance e atrasos')}
              >
                <Table
                  rowKey="coordinatorId"
                  dataSource={byCoordinator}
                  columns={coordinatorColumns}
                  pagination={{ pageSize: 6 }}
                  scroll={{ x: 900 }}
                />
              </Card>
            </Col>

            <Col xs={24}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<ToolOutlined />, 'Visão por técnico / prestador', 'Execução por responsável')}
              >
                <Table
                  rowKey="technicianId"
                  dataSource={byTechnician}
                  columns={technicianColumns}
                  pagination={{ pageSize: 6 }}
                  scroll={{ x: 900 }}
                />
              </Card>
            </Col>

            <Col xs={24}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<EnvironmentOutlined />, 'Visão por região', 'Distribuição geográfica e atrasos')}
              >
                <Table
                  rowKey={(r) => `${r.region}_${r.uf}_${r.city}`}
                  dataSource={byRegion}
                  columns={regionColumns}
                  pagination={{ pageSize: 6 }}
                  scroll={{ x: 900 }}
                />
              </Card>
            </Col>

            <Col xs={24}>
              <Card
                bordered={false}
                style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}
                title={sectionTitle(<ToolOutlined />, 'Visão por produto', 'Volume por equipamento')}
              >
                <Table
                  rowKey={(r) => `${r.code || r.product}`}
                  dataSource={byProduct}
                  columns={productColumns}
                  pagination={{ pageSize: 6 }}
                  scroll={{ x: 900 }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Modal
        title="Produtividade por dia"
        open={openDayModal}
        onCancel={() => setOpenDayModal(false)}
        footer={null}
        width={760}
      >
        <SimpleBars
          data={byDayNoFuture}
          labelKey="label"
          valueKey="valor"
          maxItems={999}
          color="linear-gradient(90deg, #1677ff 0%, #60a5fa 100%)"
        />
      </Modal>

      <Modal
        title="Produtividade por semana"
        open={openWeekModal}
        onCancel={() => setOpenWeekModal(false)}
        footer={null}
        width={760}
      >
        <SimpleBars
          data={byWeekNoFuture}
          labelKey="label"
          valueKey="valor"
          maxItems={999}
          color="linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)"
        />
      </Modal>

      <Modal
        title="Status das instalações"
        open={openStatusModal}
        onCancel={() => setOpenStatusModal(false)}
        footer={null}
        width={720}
      >
        <StatusSummaryCards data={byStatus} />
      </Modal>

        <Modal
          title="Mapa de calor"
          open={openMapModal}
          onCancel={() => setOpenMapModal(false)}
          footer={null}
          width={1150}
          destroyOnHidden
          afterOpenChange={(open) => {
            if (open) {
              setTimeout(() => {
                setModalMapKey((prev) => prev + 1);
              }, 150);
            }
          }}
          styles={{ body: { padding: 12 } }}
        >
          {openMapModal ? (
            <InstallationHeatMap
              key={`modal-map-${modalMapKey}`}
              data={mapRows}
              fallbackRegions={byRegion}
              height={650}
              resizeKey={modalMapKey}
            />
          ) : null}
        </Modal>
    </div>
  );
}