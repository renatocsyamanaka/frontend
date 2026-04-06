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
  List,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Table,
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
  FilterOutlined,
  FundOutlined,
  ReloadOutlined,
  RiseOutlined,
  SearchOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  WarningOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  DownOutlined,
  UpOutlined,
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

type DelayedProjectRow = {
  id: number;
  title: string;
  af?: string | null;
  status: string;
  clientId?: number | null;
  clientName?: string | null;
  supervisorId?: number | null;
  supervisorName?: string | null;
  coordinatorId?: number | null;
  coordinatorName?: string | null;
  startPlannedAt?: string | null;
  endPlannedAt?: string | null;
  planned: number;
  done: number;
  pending: number;
  daysLate: number;
  equipments: {
    id: number;
    name?: string | null;
    code?: string | null;
    qty: number;
  }[];
  equipmentsLabel?: string | null;
  projectUrl: string;
};

type ProductivityDay = { date: string; installed: number };
type ProductivityWeek = { weekStart: string; installed: number };

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
  totalProjects: number;
  completedProjects: number;
  planned: number;
  done: number;
  pending: number;
  percentDone: number;
};

type ByStatusRow = { status: string; total: number };

type ByCoordinatorRow = {
  coordinatorId: number;
  coordinatorName: string;
  projects?: number;
  totalProjects?: number;
  planned: number;
  done: number;
  pending: number;
  delayedProjects: number;
  percentDone: number;
};

type BySupervisorRow = {
  supervisorId: number;
  supervisorName: string;
  totalProjects: number;
  completedProjects: number;
  planned: number;
  done: number;
  pending: number;
  delayedProjects: number;
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

type EndingSoonRow = {
  id: number;
  title: string;
  af?: string | null;
  status: string;
  clientId?: number | null;
  clientName?: string | null;
  supervisorId?: number | null;
  supervisorName?: string | null;
  coordinatorId?: number | null;
  coordinatorName?: string | null;
  startPlannedAt?: string | null;
  endPlannedAt?: string | null;
  planned: number;
  done: number;
  pending: number;
  daysLeft: number;
};

type DashboardResponse = {
  filters: Record<string, any>;
  overview: DashboardOverview;
  productivity: DashboardProductivity;
  byClient: ByClientRow[];
  byStatus: ByStatusRow[];
  byCoordinator: ByCoordinatorRow[];
  bySupervisor: BySupervisorRow[];
  byRegion: ByRegionRow[];
  byProduct: ByProductRow[];
  endingSoon: EndingSoonRow[];
  map: MapRow[];
};

type Client = { id: number; name: string };
type UserLite = { id: number; name: string; role?: { id: number; name: string; level: number } };
type StatusCardRow = ByStatusRow & { percent: number };
type DonutItem = { name: string; value: number; color?: string };

const DONUT_COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

function unwrap<T>(resData: any): T {
  return resData && typeof resData === 'object' && 'data' in resData ? (resData.data as T) : (resData as T);
}

function statusLabel(value: string) {
  if (value === 'A_INICIAR') return 'À iniciar';
  if (value === 'INICIADO') return 'Iniciado';
  if (value === 'FINALIZADO') return 'Finalizado';
  if (value === 'AGENDADO') return 'Não iniciado';
  if (value === 'EM_ANDAMENTO') return 'Em andamento';
  if (value === 'CONCLUIDO') return 'Concluído';
  if (value === 'NAO_INFORMADO') return 'Não informado';
  return value;
}

function statusPill(value: string) {
  if (value === 'A_INICIAR') return { bg: '#fff7e6', border: '#ffd591', color: '#d46b08' };
  if (value === 'INICIADO') return { bg: '#e6f4ff', border: '#91caff', color: '#0958d9' };
  if (value === 'FINALIZADO') return { bg: '#f6ffed', border: '#b7eb8f', color: '#389e0d' };
  if (value === 'AGENDADO') return { bg: '#fff7e6', border: '#ffd591', color: '#d46b08' };
  if (value === 'EM_ANDAMENTO') return { bg: '#e6f4ff', border: '#91caff', color: '#0958d9' };
  if (value === 'CONCLUIDO') return { bg: '#f6ffed', border: '#b7eb8f', color: '#389e0d' };
  return { bg: '#fafafa', border: '#d9d9d9', color: '#434343' };
}

function buildParams(filters: {
  range?: [Dayjs | null, Dayjs | null] | null;
  clientId?: number | null;
  coordinatorId?: number | null;
  supervisorId?: number | null;
  region?: string | null;
  uf?: string | null;
  product?: string;
  status?: string | null;
  q?: string;
  delayed?: boolean;
  recordType?: 'BASE' | 'PROJECT' | null;
}) {
  const params: Record<string, any> = {};

  if (filters.range?.[0]) params.startDate = filters.range[0].format('YYYY-MM-DD');
  if (filters.range?.[1]) params.endDate = filters.range[1].format('YYYY-MM-DD');
  if (filters.clientId) params.clientId = filters.clientId;
  if (filters.coordinatorId) params.coordinatorId = filters.coordinatorId;
  if (filters.supervisorId) params.supervisorId = filters.supervisorId;
  if (filters.region) params.region = filters.region;
  if (filters.uf) params.uf = filters.uf;
  if (filters.product?.trim()) params.product = filters.product.trim();
  if (filters.status) params.status = filters.status;
  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.delayed) params.delayed = true;

  // força somente projetos reais
  params.recordType = 'PROJECT';

  return params;
}

function sectionTitle(icon: React.ReactNode, title: string, subtitle?: string) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
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
        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 16 }}>{title}</div>
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
  colors: { bg: string; border: string; iconBg: string; iconColor: string };
}) {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 24,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 16px 32px rgba(15,23,42,0.08)',
        overflow: 'hidden',
        height: '100%',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>{title}</div>
          <div style={{ marginTop: 8, fontSize: 30, lineHeight: 1.1, fontWeight: 900, color: '#0f172a' }}>
            {value}
            {suffix ? <span style={{ fontSize: 16, marginLeft: 4 }}>{suffix}</span> : null}
          </div>
          {subtitle ? <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>{subtitle}</div> : null}
        </div>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            background: colors.iconBg,
            color: colors.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            boxShadow: '0 10px 24px rgba(15,23,42,0.10)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

function HighlightCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 26,
        background: gradient,
        color: '#fff',
        height: '100%',
        boxShadow: '0 18px 40px rgba(15,23,42,0.18)',
        overflow: 'hidden',
      }}
      styles={{ body: { padding: 22 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.88 }}>{title}</div>
          <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05, marginTop: 10 }}>{value}</div>
          {subtitle ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82 }}>{subtitle}</div> : null}
        </div>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(6px)',
            fontSize: 24,
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
    () => [...data].sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0)).slice(0, maxItems),
    [data, valueKey, maxItems]
  );
  const max = Math.max(...rows.map((r) => Number(r[valueKey] || 0)), 0);

  if (!rows.length) return <Empty description="Sem dados" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {rows.map((row, index) => {
        const value = Number(row[valueKey] || 0);
        const percent = max ? Math.round((value / max) * 100) : 0;

        return (
          <div
            key={`${row[labelKey]}_${index}`}
            style={{ display: 'grid', gap: 8, padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #e5edf7' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: '#0f172a' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                {String(row[labelKey] || '-')}
              </span>
              <b>{value}</b>
            </div>

            <div style={{ width: '100%', height: 12, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
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

function StatusSummaryCards({ data }: { data: StatusCardRow[] }) {
  if (!data.length) return <Empty description="Sem dados" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {data.map((row) => {
        const theme = statusPill(row.status);
        return (
          <div
            key={row.status}
            style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 10 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 10,
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.color,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {statusLabel(row.status)}
              </span>
              <b style={{ fontSize: 18, color: '#0f172a' }}>{row.total}</b>
            </div>
            <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${row.percent}%`,
                  height: '100%',
                  background:
                    row.status === 'FINALIZADO' || row.status === 'CONCLUIDO'
                      ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                      : row.status === 'INICIADO' || row.status === 'EM_ANDAMENTO'
                        ? 'linear-gradient(90deg, #1677ff, #69b1ff)'
                        : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{row.percent}% do total</div>
          </div>
        );
      })}
    </div>
  );
}

function buildDonutGradient(data: DonutItem[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) return 'conic-gradient(#e5e7eb 0deg 360deg)';

  let current = 0;
  const segments = data.map((item, index) => {
    const color = item.color || DONUT_COLORS[index % DONUT_COLORS.length];
    const slice = (item.value / total) * 360;
    const start = current;
    const end = current + slice;
    current = end;
    return `${color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

function DonutChart({
  data,
  centerValue,
  centerLabel,
}: {
  data: DonutItem[];
  centerValue: string | number;
  centerLabel: string;
}) {
  const gradient = buildDonutGradient(data);

  return (
    <div style={{ display: 'grid', placeItems: 'center' }}>
      <div
        style={{
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: gradient,
          position: 'relative',
          boxShadow: '0 18px 42px rgba(15,23,42,0.10)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 32,
            borderRadius: '50%',
            background: '#fff',
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            padding: 12,
            border: '1px solid #eef2f7',
          }}
        >
          <div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{centerValue}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{centerLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutLegend({ data }: { data: DonutItem[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {data.map((item, index) => {
        const color = item.color || DONUT_COLORS[index % DONUT_COLORS.length];
        const percent = total ? ((item.value / total) * 100).toFixed(1) : '0.0';

        return (
          <div
            key={`${item.name}-${index}`}
            style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 14, background: '#f8fafc', border: '1px solid #eef2f7' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </span>
              </div>
              <b style={{ color: '#0f172a' }}>{item.value}</b>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{percent}% do total</div>
          </div>
        );
      })}
    </div>
  );
}

function PieAndDetailsCard({
  title,
  subtitle,
  data,
  centerValue,
  centerLabel,
}: {
  title: string;
  subtitle?: string;
  data: DonutItem[];
  centerValue: string | number;
  centerLabel: string;
}) {
  return (
    <Card
      bordered={false}
      style={{ borderRadius: 20, border: '1px solid #eef2f7', boxShadow: '0 10px 24px rgba(15,23,42,0.05)', height: '100%' }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, color: '#0f172a' }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{subtitle}</div> : null}
      </div>
      {!data.length ? (
        <Empty description="Sem dados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={12}>
            <DonutChart data={data} centerValue={centerValue} centerLabel={centerLabel} />
          </Col>
          <Col xs={24} lg={12}>
            <DonutLegend data={data} />
          </Col>
        </Row>
      )}
    </Card>
  );
}

function DetailMetricBox({ label, value, bg }: { label: string; value: string | number; bg: string }) {
  return (
    <div
      style={{
        borderRadius: 18,
        background: bg,
        border: '1px solid #e5e7eb',
        padding: 16,
        minHeight: 92,
        display: 'grid',
        alignContent: 'center',
      }}
    >
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{value}</div>
    </div>
  );
}

export default function InstallationProjectsDashboardPage() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>([
    dayjs('2026-01-01'),
    dayjs('2026-12-31'),
  ]);

  const [clientId, setClientId] = useState<number | null>(null);
  const [coordinatorId, setCoordinatorId] = useState<number | null>(null);
  const [supervisorId, setSupervisorId] = useState<number | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [uf, setUf] = useState<string | null>(null);
  const [product, setProduct] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [openDayModal, setOpenDayModal] = useState(false);
  const [openWeekModal, setOpenWeekModal] = useState(false);
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [openMapModal, setOpenMapModal] = useState(false);
  const [openDelayedModal, setOpenDelayedModal] = useState(false);
  const [openEndingSoonModal, setOpenEndingSoonModal] = useState(false);
  const [modalMapKey, setModalMapKey] = useState(0);

  const filters = useMemo(
    () => ({
      range,
      clientId,
      coordinatorId,
      supervisorId,
      region,
      uf,
      product,
      status,
      q,
      recordType: 'PROJECT' as const,
    }),
    [range, clientId, coordinatorId, supervisorId, region, uf, product, status, q]
  );

  const clientsQuery = useQuery<Client[]>({
    queryKey: ['clients-dashboard-installation'],
    queryFn: async () => unwrap<Client[]>((await api.get('/clients')).data),
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const usersQuery = useQuery<UserLite[]>({
    queryKey: ['users-dashboard-installation'],
    queryFn: async () => unwrap<UserLite[]>((await api.get('/users')).data),
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const dashboardQuery = useQuery<DashboardResponse>({
    queryKey: ['installation-projects-dashboard', filters],
    queryFn: async () =>
      unwrap<DashboardResponse>(
        (await api.get('/installation-projects/dashboard/overview', { params: buildParams(filters) })).data
      ),
  });
  
  const delayedProjectsQuery = useQuery<{ filters: Record<string, any>; data: DelayedProjectRow[] }>({
    queryKey: ['installation-projects-delayed', filters],
    queryFn: async () =>
      unwrap<{ filters: Record<string, any>; data: DelayedProjectRow[] }>(
        (await api.get('/installation-projects/dashboard/delayed-projects', { params: buildParams(filters) })).data
      ),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 20000,
  });

  const delayedProjects = useMemo(() => delayedProjectsQuery.data?.data || [], [delayedProjectsQuery.data]);

  const coordinators = useMemo(() => {
    const rows = usersQuery.data || [];
    return rows
      .filter((u) => (u.role?.level || 0) >= 4)
      .map((u) => ({ value: u.id, label: u.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [usersQuery.data]);

  const supervisors = useMemo(() => {
    const rows = usersQuery.data || [];
    return rows
      .filter((u) => (u.role?.level || 0) === 3)
      .map((u) => ({ value: u.id, label: u.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [usersQuery.data]);

  const rawOverview = dashboardQuery.data?.overview;
  const rawProductivity = dashboardQuery.data?.productivity;
  const rawByClient = dashboardQuery.data?.byClient || [];
  const rawByStatus = dashboardQuery.data?.byStatus || [];
  const rawByCoordinator = dashboardQuery.data?.byCoordinator || [];
  const rawBySupervisor = dashboardQuery.data?.bySupervisor || [];
  const rawByRegion = dashboardQuery.data?.byRegion || [];
  const rawByProduct = dashboardQuery.data?.byProduct || [];
  const rawEndingSoon = dashboardQuery.data?.endingSoon || [];
  const mapRows = dashboardQuery.data?.map || [];

  const today = dayjs().endOf('day');

  const byDayNoFuture = useMemo(() => {
    const start = range?.[0]?.startOf('day');
    const end = range?.[1]?.endOf('day');

    return (rawProductivity?.byDay || [])
      .filter((item) => dayjs(item.date).isValid() && !dayjs(item.date).isAfter(today))
      .filter((item) => {
        if (!start || !end) return true;
        const d = dayjs(item.date);
        return d.isSame(start, 'day') || d.isSame(end, 'day') || (d.isAfter(start) && d.isBefore(end));
      })
      .map((item) => ({
        label: dayjs(item.date).format('DD/MM'),
        valor: Number(item.installed || 0),
        rawDate: item.date,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [rawProductivity?.byDay, today, range]);

  const byWeekNoFuture = useMemo(() => {
    const start = range?.[0]?.startOf('day');
    const end = range?.[1]?.endOf('day');

    return (rawProductivity?.byWeek || [])
      .filter((item) => dayjs(item.weekStart).isValid() && !dayjs(item.weekStart).isAfter(today))
      .filter((item) => {
        if (!start || !end) return true;
        const d = dayjs(item.weekStart);
        return d.isSame(start, 'day') || d.isSame(end, 'day') || (d.isAfter(start) && d.isBefore(end));
      })
      .map((item) => ({
        label: `Sem. ${dayjs(item.weekStart).format('DD/MM')}`,
        valor: Number(item.installed || 0),
        rawWeek: item.weekStart,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [rawProductivity?.byWeek, today, range]);

  const noDataInPeriod = useMemo(() => {
    if (!range?.[0] || !range?.[1]) return false;
    return byDayNoFuture.length === 0 && byWeekNoFuture.length === 0;
  }, [range, byDayNoFuture.length, byWeekNoFuture.length]);

  const overview = useMemo<DashboardOverview>(() => {
    if (noDataInPeriod) {
      return {
        totalProjects: 0,
        planned: 0,
        done: 0,
        pending: 0,
        delayedProjects: 0,
        percentDone: 0,
      };
    }

    return rawOverview || {
      totalProjects: 0,
      planned: 0,
      done: 0,
      pending: 0,
      delayedProjects: 0,
      percentDone: 0,
    };
  }, [rawOverview, noDataInPeriod]);

  const productivity = useMemo<DashboardProductivity>(() => {
    if (noDataInPeriod) {
      return {
        totalInstalled: 0,
        averageDaily: 0,
        averageWeekly: 0,
        targetDaily: 0,
        targetWeekly: 0,
        compareDailyPct: 0,
        compareWeeklyPct: 0,
        byDay: [],
        byWeek: [],
      };
    }

    return rawProductivity || {
      totalInstalled: 0,
      averageDaily: 0,
      averageWeekly: 0,
      targetDaily: 0,
      targetWeekly: 0,
      compareDailyPct: 0,
      compareWeeklyPct: 0,
      byDay: [],
      byWeek: [],
    };
  }, [rawProductivity, noDataInPeriod]);

  const byClient = noDataInPeriod ? [] : rawByClient;
  const byStatus = noDataInPeriod ? [] : rawByStatus;
  const byCoordinator = noDataInPeriod ? [] : rawByCoordinator;
  const bySupervisor = noDataInPeriod ? [] : rawBySupervisor;
  const byRegion = noDataInPeriod ? [] : rawByRegion;
  const byProduct = noDataInPeriod ? [] : rawByProduct;
  const endingSoon = noDataInPeriod ? [] : rawEndingSoon;

  const totalBase = Number(overview.planned || 0);

  const successSummary = useMemo(() => {
    const totalProjects = Number(overview.totalProjects || 0);
    const delayedProjects = Number(overview.delayedProjects || 0);
    const onTimeProjects = Math.max(totalProjects - delayedProjects, 0);
    const successRate = totalProjects > 0 ? Number(((onTimeProjects / totalProjects) * 100).toFixed(2)) : 0;
    return { totalProjects, delayedProjects, onTimeProjects, successRate };
  }, [overview]);

  const byStatusFiltered = useMemo(
    () => byStatus.filter((s) => !['CANCELADO', 'REAGENDADO', 'NAO_INFORMADO', 'Não informado'].includes(s.status)),
    [byStatus]
  );

  const totalStatus = useMemo(
    () => byStatusFiltered.reduce((acc, s) => acc + Number(s.total || 0), 0),
    [byStatusFiltered]
  );

  const statusCardsData = useMemo<StatusCardRow[]>(
    () =>
      byStatusFiltered.map((item) => ({
        ...item,
        percent: totalStatus ? Math.round((Number(item.total || 0) / totalStatus) * 100) : 0,
      })),
    [byStatusFiltered, totalStatus]
  );

  const successDonutData = useMemo<DonutItem[]>(() => {
    if (!successSummary.totalProjects) return [];
    return [
      { name: 'No prazo', value: successSummary.onTimeProjects, color: '#16a34a' },
      { name: 'Atrasados', value: successSummary.delayedProjects, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [successSummary]);

  const coordinatorProjectsDonut = useMemo<DonutItem[]>(() => byCoordinator.map((item, index) => ({
    name: item.coordinatorName,
    value: Number(item.totalProjects ?? item.projects ?? 0),
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6), [byCoordinator]);

  const coordinatorDoneDonut = useMemo<DonutItem[]>(() => byCoordinator.map((item, index) => ({
    name: item.coordinatorName,
    value: Number(item.done || 0),
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6), [byCoordinator]);

  const supervisorProjectsDonut = useMemo<DonutItem[]>(() => bySupervisor.map((item, index) => ({
    name: item.supervisorName,
    value: Number(item.totalProjects || 0),
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6), [bySupervisor]);

  const supervisorDoneDonut = useMemo<DonutItem[]>(() => bySupervisor.map((item, index) => ({
    name: item.supervisorName,
    value: Number(item.done || 0),
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6), [bySupervisor]);

  const productPlannedDonut = useMemo<DonutItem[]>(() => byProduct.map((item, index) => ({
    name: item.product,
    value: Number(item.planned || 0),
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6), [byProduct]);

  const productDoneDonut = useMemo<DonutItem[]>(
    () =>
      byProduct
        .map((item, index) => ({
          name: item.product,
          value: Number(item.done || 0),
          color: DONUT_COLORS[index % DONUT_COLORS.length],
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [byProduct]
  );

  const clearFilters = () => {
    setRange(null);
    setClientId(null);
    setCoordinatorId(null);
    setSupervisorId(null);
    setRegion(null);
    setUf(null);
    setProduct('');
    setStatus(null);
    setQ('');
  };

  const clientColumns: ColumnsType<ByClientRow> = [
    { title: 'Cliente', dataIndex: 'clientName', key: 'clientName' },
    { title: 'Projetos', dataIndex: 'totalProjects', key: 'totalProjects', width: 100, align: 'center' },
    { title: 'Concluídos', dataIndex: 'completedProjects', key: 'completedProjects', width: 110, align: 'center' },
    { title: 'Base', dataIndex: 'planned', key: 'planned', width: 110, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 110, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 110, align: 'center' },
    { title: '% Conclusão', dataIndex: 'percentDone', key: 'percentDone', width: 140, render: (v) => <Progress percent={Number(v || 0)} size="small" strokeColor="#1677ff" /> },
  ];

  const coordinatorColumns: ColumnsType<ByCoordinatorRow> = [
    { title: 'Coordenador', dataIndex: 'coordinatorName', key: 'coordinatorName' },
    { title: 'Projetos', key: 'projects', width: 90, align: 'center', render: (_, row) => Number(row.totalProjects ?? row.projects ?? 0) },
    { title: 'Base', dataIndex: 'planned', key: 'planned', width: 100, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 100, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 100, align: 'center' },
    { title: 'Atrasados', dataIndex: 'delayedProjects', key: 'delayedProjects', width: 100, align: 'center' },
    { title: '%', dataIndex: 'percentDone', key: 'percentDone', width: 120, render: (v) => <Progress percent={Number(v || 0)} size="small" strokeColor="#1677ff" /> },
  ];

  const supervisorColumns: ColumnsType<BySupervisorRow> = [
    { title: 'Supervisor', dataIndex: 'supervisorName', key: 'supervisorName' },
    { title: 'Projetos', dataIndex: 'totalProjects', key: 'totalProjects', width: 90, align: 'center' },
    { title: 'Concluídos', dataIndex: 'completedProjects', key: 'completedProjects', width: 100, align: 'center' },
    { title: 'Base', dataIndex: 'planned', key: 'planned', width: 100, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 100, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 100, align: 'center' },
    { title: 'Atrasados', dataIndex: 'delayedProjects', key: 'delayedProjects', width: 100, align: 'center' },
    { title: '%', dataIndex: 'percentDone', key: 'percentDone', width: 120, render: (v) => <Progress percent={Number(v || 0)} size="small" strokeColor="#1677ff" /> },
  ];

  const regionColumns: ColumnsType<ByRegionRow> = [
    { title: 'Região', dataIndex: 'region', key: 'region', width: 120 },
    { title: 'UF', dataIndex: 'uf', key: 'uf', width: 70, align: 'center' },
    { title: 'Cidade', dataIndex: 'city', key: 'city' },
    { title: 'Projetos', dataIndex: 'projects', key: 'projects', width: 90, align: 'center' },
    { title: 'Base', dataIndex: 'planned', key: 'planned', width: 100, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 100, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 100, align: 'center' },
    { title: 'Atrasados', dataIndex: 'delayedProjects', key: 'delayedProjects', width: 100, align: 'center' },
  ];

  const productColumns: ColumnsType<ByProductRow> = [
    { title: 'Produto / Equipamento', dataIndex: 'product', key: 'product' },
    { title: 'Código', dataIndex: 'code', key: 'code', width: 140, render: (v) => v || '-' },
    { title: 'Base', dataIndex: 'planned', key: 'planned', width: 110, align: 'center' },
    { title: 'Realizado', dataIndex: 'done', key: 'done', width: 110, align: 'center' },
    { title: 'Pendente', dataIndex: 'pending', key: 'pending', width: 110, align: 'center' },
    { title: '%', dataIndex: 'percentDone', key: 'percentDone', width: 120, render: (v) => <Progress percent={Number(v || 0)} size="small" strokeColor="#1677ff" /> },
  ];

  const endingSoonColumns: ColumnsType<EndingSoonRow> = [
    { title: 'Projeto', dataIndex: 'title', key: 'title' },
    { title: 'Cliente', dataIndex: 'clientName', key: 'clientName', render: (v) => v || '-' },
    { title: 'Supervisor', dataIndex: 'supervisorName', key: 'supervisorName', render: (v) => v || '-' },
    { title: 'Fim previsto', dataIndex: 'endPlannedAt', key: 'endPlannedAt', width: 120, align: 'center', render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-') },
    { title: 'Dias faltando', dataIndex: 'daysLeft', key: 'daysLeft', width: 120, align: 'center', render: (v) => <span style={{ color: Number(v) <= 2 ? '#cf1322' : Number(v) <= 5 ? '#d48806' : '#1677ff', fontWeight: 700 }}>{v}</span> },
    { title: 'Carros restantes', dataIndex: 'pending', key: 'pending', width: 130, align: 'center', render: (v) => <b>{Number(v || 0)}</b> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (v) => {
        const theme = statusPill(v);
        return <span style={{ padding: '4px 10px', borderRadius: 10, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.color, fontSize: 12, fontWeight: 700 }}>{statusLabel(v)}</span>;
      },
    },
  ];

  const delayedProjectColumns: ColumnsType<DelayedProjectRow> = [
    {
      title: 'Projeto',
      dataIndex: 'title',
      key: 'title',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 800 }}>{row.title}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{row.clientName || '-'} • {row.supervisorName || 'Sem supervisor'}</div>
        </div>
      ),
    },
    {
      title: 'Equipamentos',
      dataIndex: 'equipmentsLabel',
      key: 'equipmentsLabel',
      render: (value) => <div style={{ fontSize: 12, whiteSpace: 'normal', lineHeight: 1.4 }}>{value || '-'}</div>,
    },
    { title: 'Prazo', dataIndex: 'endPlannedAt', key: 'endPlannedAt', width: 120, align: 'center', render: (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '-') },
    { title: 'Dias atraso', dataIndex: 'daysLate', key: 'daysLate', width: 110, align: 'center', render: (value) => <span style={{ color: '#cf1322', fontWeight: 800 }}>{value}</span> },
    { title: 'Carros restantes', dataIndex: 'pending', key: 'pending', width: 130, align: 'center', render: (value) => <b>{value}</b> },
    { title: 'Ações', key: 'open', width: 150, align: 'center', render: (_, row) => <Button type="link" onClick={() => navigate(row.projectUrl)}>Abrir projeto</Button> },
  ];

  return (
    <div style={{ display: 'grid', gap: 18, background: 'linear-gradient(180deg, #f4f8ff 0%, #eef4fb 100%)', padding: isMobile ? 10 : 6, borderRadius: 28 }}>
      <Card
        variant="outlined"
        style={{
          borderRadius: 30,
          background: '#ffffff',
          boxShadow: '0 12px 32px rgba(15,23,42,0.08)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
        styles={{ body: { padding: isMobile ? 18 : 28 } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 16,
            flexDirection: isMobile ? 'column' : 'row'
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
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 14
              }}
            >
              <BarChartOutlined />
              Visão administrativa
            </div>

            <Typography.Title level={2} style={{ margin: 0, color: '#0f172a' }}>
              Dashboard de Instalação
            </Typography.Title>

            <Typography.Paragraph
              style={{
                margin: '10px 0 0',
                color: '#475569',
                maxWidth: 760
              }}
            >
              Acompanhe projetos, base, produção, pendências, prazo, coordenadores,
              supervisores, produtos e regiões com uma visão mais clara e mais forte visualmente.
            </Typography.Paragraph>
          </div>

          <Space wrap>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/projetos-instalacao')}
              style={{
                borderRadius: 14,
                borderColor: '#e2e8f0',
                background: '#fff',
                color: '#0f172a'
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
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontWeight: 600
              }}
            >
              Validar geolocalização
            </Button>

            <Button
              size="large"
              icon={<FilterOutlined />}
              onClick={clearFilters}
              style={{
                borderRadius: 14,
                background: '#ffffff',
                color: '#0f172a',
                borderColor: '#cbd5f5',
                fontWeight: 600
              }}
            >
              Limpar filtros
            </Button>

            <Button
              size="large"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => {
                dashboardQuery.refetch();
                delayedProjectsQuery.refetch();
              }}
              style={{
                borderRadius: 14,
                background: '#2563eb',
                borderColor: '#2563eb',
                fontWeight: 700
              }}
            >
              Atualizar
            </Button>
          </Space>
        </div>

        <div style={{ marginTop: 22 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} xl={6}>
              <HighlightCard
                title="Total projetos"
                value={overview.totalProjects}
                subtitle="Quantidade total de projetos no período"
                icon={<TeamOutlined />}
                gradient="linear-gradient(135deg, #334155 0%, #64748b 100%)"
              />
            </Col>

            <Col xs={24} md={12} xl={6}>
              <HighlightCard
                title="Total base"
                value={totalBase}
                subtitle="Base total prevista para instalação"
                icon={<DatabaseOutlined />}
                gradient="linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)"
              />
            </Col>

            <Col xs={24} md={12} xl={6}>
              <HighlightCard
                title="Total realizado"
                value={overview.done}
                subtitle="Instalações concluídas"
                icon={<CheckCircleOutlined />}
                gradient="linear-gradient(135deg, #16a34a 0%, #4ade80 100%)"
              />
            </Col>

            <Col xs={24} md={12} xl={6}>
              <HighlightCard
                title="Total pendente"
                value={overview.pending}
                subtitle="Volume ainda não concluído"
                icon={<ClockCircleOutlined />}
                gradient="linear-gradient(135deg, #f97316 0%, #fb923c 100%)"
              />
            </Col>
          </Row>
        </div>
      </Card>

      <Card
        variant="outlined"
        style={{
          borderRadius: 24,
          boxShadow: '0 14px 32px rgba(15,23,42,0.06)',
          border: '1px solid #e2e8f0'
        }}
        styles={{ body: { padding: isMobile ? 14 : 20 } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12,
            marginBottom: showFilters ? 18 : 0
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <CalendarOutlined style={{ color: '#2563eb' }} />
              <Typography.Text style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Filtros do dashboard
              </Typography.Text>
            </div>

            <Typography.Text style={{ color: '#64748b', fontSize: 13 }}>
              Período padrão: <strong>01/01/2026 até 31/12/2026</strong>
            </Typography.Text>
          </div>

          <Space wrap>
            <Button
              size="large"
              onClick={() => {
                setRange([dayjs('2026-01-01'), dayjs('2026-12-31')]);
              }}
              style={{ borderRadius: 12 }}
            >
              Ano 2026
            </Button>

            <Button
              size="large"
              icon={showFilters ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setShowFilters((prev) => !prev)}
              style={{ borderRadius: 12, fontWeight: 600 }}
            >
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            </Button>
          </Space>
        </div>

        {showFilters && (
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={10}>
              <RangePicker
                value={range as any}
                onChange={(v) => setRange((v as [Dayjs | null, Dayjs | null]) || null)}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                size="large"
                allowEmpty={[true, true]}
              />
            </Col>

            <Col xs={24} md={12} lg={7}>
              <Select
                allowClear
                showSearch
                size="large"
                placeholder="Cliente"
                style={{ width: '100%' }}
                value={clientId ?? undefined}
                onChange={(v) => setClientId(v ?? null)}
                optionFilterProp="label"
                options={(clientsQuery.data || []).map((c) => ({ value: c.id, label: c.name }))}
              />
            </Col>

            <Col xs={24} md={12} lg={7}>
              <Input
                allowClear
                size="large"
                prefix={<SearchOutlined />}
                placeholder="Buscar por projeto, AF, cliente, coordenador ou supervisor"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </Col>

            <Col xs={24} md={12} lg={6}>
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

            <Col xs={24} md={12} lg={6}>
              <Select
                allowClear
                showSearch
                size="large"
                placeholder="Supervisor"
                style={{ width: '100%' }}
                value={supervisorId ?? undefined}
                onChange={(v) => setSupervisorId(v ?? null)}
                optionFilterProp="label"
                options={supervisors}
              />
            </Col>

            <Col xs={24} md={8} lg={4}>
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
                  { value: 'Sul', label: 'Sul' }
                ]}
              />
            </Col>

            <Col xs={24} md={8} lg={3}>
              <Select
                allowClear
                size="large"
                placeholder="UF"
                style={{ width: '100%' }}
                value={uf ?? undefined}
                onChange={(v) => setUf(v ?? null)}
                options={[
                  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
                  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
                ].map((value) => ({ value, label: value }))}
              />
            </Col>

            <Col xs={24} md={8} lg={4}>
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
                  { value: 'FINALIZADO', label: 'Finalizado' }
                ]}
              />
            </Col>

            <Col xs={24} md={12} lg={7}>
              <Input
                allowClear
                size="large"
                placeholder="Produto / equipamento"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              />
            </Col>
          </Row>
        )}
      </Card>

      {dashboardQuery.isLoading ? (
        <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
        </Card>
      ) : !dashboardQuery.data ? (
        <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}>
          <Empty description="Sem dados do dashboard" />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard title="Total base" value={totalBase} subtitle="Volume total previsto" icon={<DatabaseOutlined />} colors={{ bg: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)', border: '#bfdbfe', iconBg: 'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)', iconColor: '#fff' }} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard title="Total realizado" value={overview.done} subtitle="Instalações já concluídas" icon={<CheckCircleOutlined />} colors={{ bg: 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)', border: '#bbf7d0', iconBg: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)', iconColor: '#fff' }} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard title="Total pendente" value={overview.pending} subtitle="Ainda falta instalar" icon={<ClockCircleOutlined />} colors={{ bg: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)', border: '#fdba74', iconBg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', iconColor: '#fff' }} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard title="% concluído" value={overview.percentDone} suffix="%" subtitle="Percentual geral de execução" icon={<TrophyOutlined />} colors={{ bg: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)', border: '#ddd6fe', iconBg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', iconColor: '#fff' }} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard title="Total projetos" value={overview.totalProjects} subtitle="Quantidade total de projetos" icon={<TeamOutlined />} colors={{ bg: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', border: '#cbd5e1', iconBg: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', iconColor: '#fff' }} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <div onClick={() => setOpenDelayedModal(true)} style={{ cursor: 'pointer' }}>
                <KpiCard
                  title="Projetos atrasados"
                  value={overview.delayedProjects}
                  subtitle="Demandam atenção imediata"
                  icon={<WarningOutlined />}
                  colors={{
                    bg: 'linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)',
                    border: '#fca5a5',
                    iconBg: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
                    iconColor: '#fff',
                  }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard title="Média diária" value={productivity.averageDaily} subtitle="Produção média por dia" icon={<RiseOutlined />} colors={{ bg: 'linear-gradient(180deg, #eefbf3 0%, #ffffff 100%)', border: '#bbf7d0', iconBg: 'linear-gradient(135deg, #059669 0%, #34d399 100%)', iconColor: '#fff' }} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard title="Taxa de sucesso" value={successSummary.successRate} suffix="%" subtitle="Baseada em projetos no prazo" icon={<CheckCircleOutlined />} colors={{ bg: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)', border: '#dbeafe', iconBg: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', iconColor: '#fff' }} />
            </Col>
          </Row>

          <Row gutter={[16, 16]} align="stretch">
            <Col xs={24} xl={12}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }} title={sectionTitle(<RiseOutlined />, 'Produtividade por dia', 'Top 5 períodos com instalações realizadas')} extra={byDayNoFuture.length > 5 ? <Button type="link" icon={<EyeOutlined />} onClick={() => setOpenDayModal(true)}>Ver mais</Button> : null}>
                <SimpleBars data={byDayNoFuture} labelKey="label" valueKey="valor" maxItems={5} color="linear-gradient(90deg, #1677ff 0%, #60a5fa 100%)" />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)', height: '100%' }} title={sectionTitle(<CalendarOutlined />, 'Produtividade por semana', 'Top 5 períodos consolidados')} extra={byWeekNoFuture.length > 5 ? <Button type="link" icon={<EyeOutlined />} onClick={() => setOpenWeekModal(true)}>Ver mais</Button> : null}>
                <SimpleBars data={byWeekNoFuture} labelKey="label" valueKey="valor" maxItems={5} color="linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)" />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }} title={sectionTitle(<CheckCircleOutlined />, 'Status das instalações', 'Distribuição geral por situação')} extra={statusCardsData.length > 3 ? <Button type="link" icon={<EyeOutlined />} onClick={() => setOpenStatusModal(true)}>Ver mais</Button> : null} styles={{ body: { padding: 18 } }}>
                <StatusSummaryCards data={statusCardsData} />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)', background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)' }} title={sectionTitle(<TrophyOutlined />, 'Taxa de sucesso', 'Projetos no prazo x atrasados')} styles={{ body: { padding: 18 } }}>
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} lg={12}><DonutChart data={successDonutData} centerValue={`${successSummary.successRate}%`} centerLabel="No prazo" /></Col>
                  <Col xs={24} lg={12}>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ borderRadius: 20, background: '#ffffff', border: '1px solid #dcfce7', padding: 18 }}>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Taxa de sucesso</div>
                        <div style={{ fontSize: 34, fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{successSummary.successRate}%</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>Baseado em total de projetos x atrasados</div>
                        <Progress percent={Math.min(Number(successSummary.successRate || 0), 100)} strokeColor="#16a34a" showInfo={false} style={{ marginTop: 12 }} />
                      </div>
                      <Row gutter={[12, 12]}>
                        <Col xs={12}><DetailMetricBox label="Total projetos" value={successSummary.totalProjects} bg="#f8fafc" /></Col>
                        <Col xs={12}><DetailMetricBox label="No prazo" value={successSummary.onTimeProjects} bg="#f0fdf4" /></Col>
                        <Col xs={12}><DetailMetricBox label="Atrasados" value={successSummary.delayedProjects} bg="#fef2f2" /></Col>
                        <Col xs={12}><DetailMetricBox label="Taxa" value={`${successSummary.successRate} %`} bg="#eff6ff" /></Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }} title={sectionTitle(<WarningOutlined />, 'Projetos para acabar', 'Prazo próximo com carros ainda pendentes')} extra={endingSoon.length > 5 ? <Button type="link" icon={<EyeOutlined />} onClick={() => setOpenEndingSoonModal(true)}>Ver mais</Button> : null}>
                {!endingSoon.length ? (
                  <Empty description="Nenhum projeto próximo do fim" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <List
                    dataSource={endingSoon.slice(0, 5)}
                    itemLayout="horizontal"
                    renderItem={(item) => (
                      <List.Item
                        style={{ padding: '12px 8px', borderBottom: '1px solid #f0f0f0' }}
                        actions={[
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: item.daysLeft <= 2 ? '#fff1f0' : '#e6f4ff',
                              border: `1px solid ${item.daysLeft <= 2 ? '#ffa39e' : '#91caff'}`,
                              color: item.daysLeft <= 2 ? '#cf1322' : '#0958d9',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {item.daysLeft} dia(s)
                          </span>,
                        ]}
                      >
                        <List.Item.Meta
                          title={<div style={{ fontWeight: 700 }}>{item.title}</div>}
                          description={<div style={{ fontSize: 12, color: '#64748b' }}>{item.clientName || '-'} • {item.supervisorName || 'Sem supervisor'}</div>}
                        />
                        <div style={{ textAlign: 'right', minWidth: 140 }}>
                          <div style={{ fontWeight: 800 }}>{item.pending} carros</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{item.endPlannedAt ? dayjs(item.endPlannedAt).format('DD/MM/YYYY') : '-'}</div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }} title={sectionTitle(<EnvironmentOutlined />, 'Mapa de calor', 'Distribuição geográfica das instalações')} extra={(mapRows.length > 0 || byRegion.length > 0) ? <Button type="link" icon={<EyeOutlined />} onClick={() => setOpenMapModal(true)}>Ver mais</Button> : null}>
                <InstallationHeatMap data={mapRows} fallbackRegions={byRegion} height={430} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }} title={sectionTitle(<FundOutlined />, 'Visão por cliente', 'Total de projetos, base, concluídos, realizado e pendente')}>
                <Table rowKey="clientId" dataSource={byClient} columns={clientColumns} pagination={{ pageSize: 6 }} scroll={{ x: 1000 }} />
              </Card>
            </Col>

            <Col xs={24}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }} title={sectionTitle(<TeamOutlined />, 'Visão por coordenador', 'Performance, base e atrasos')} styles={{ body: { padding: 18 } }}>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} xl={12}><PieAndDetailsCard title="Projetos por coordenador" subtitle="Gráfico à esquerda e detalhamento à direita" data={coordinatorProjectsDonut} centerValue={coordinatorProjectsDonut.reduce((acc, item) => acc + item.value, 0)} centerLabel="Projetos" /></Col>
                  <Col xs={24} xl={12}><PieAndDetailsCard title="Realizado por coordenador" subtitle="Gráfico à esquerda e detalhamento à direita" data={coordinatorDoneDonut} centerValue={coordinatorDoneDonut.reduce((acc, item) => acc + item.value, 0)} centerLabel="Realizado" /></Col>
                </Row>
                <Table rowKey="coordinatorId" dataSource={byCoordinator} columns={coordinatorColumns} pagination={{ pageSize: 6 }} scroll={{ x: 900 }} />
              </Card>
            </Col>

            <Col xs={24}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }} title={sectionTitle(<TeamOutlined />, 'Visão por supervisor', 'Execução, base, pendências e atrasos')} styles={{ body: { padding: 18 } }}>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} xl={12}><PieAndDetailsCard title="Projetos por supervisor" subtitle="Gráfico à esquerda e detalhamento à direita" data={supervisorProjectsDonut} centerValue={supervisorProjectsDonut.reduce((acc, item) => acc + item.value, 0)} centerLabel="Projetos" /></Col>
                  <Col xs={24} xl={12}><PieAndDetailsCard title="Realizado por supervisor" subtitle="Gráfico à esquerda e detalhamento à direita" data={supervisorDoneDonut} centerValue={supervisorDoneDonut.reduce((acc, item) => acc + item.value, 0)} centerLabel="Realizado" /></Col>
                </Row>
                <Table rowKey="supervisorId" dataSource={bySupervisor} columns={supervisorColumns} pagination={{ pageSize: 6 }} scroll={{ x: 1000 }} />
              </Card>
            </Col>

            <Col xs={24}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }} title={sectionTitle(<EnvironmentOutlined />, 'Visão por região', 'Distribuição geográfica, base e atrasos')}>
                <Table rowKey={(r) => `${r.region}_${r.uf}_${r.city}`} dataSource={byRegion} columns={regionColumns} pagination={{ pageSize: 6 }} scroll={{ x: 900 }} />
              </Card>
            </Col>

            <Col xs={24}>
              <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }} title={sectionTitle(<ToolOutlined />, 'Visão por produto', 'Volume por equipamento com base e realizado')} styles={{ body: { padding: 18 } }}>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} xl={12}><PieAndDetailsCard title="Base por produto" subtitle="Gráfico à esquerda e detalhamento à direita" data={productPlannedDonut} centerValue={productPlannedDonut.reduce((acc, item) => acc + item.value, 0)} centerLabel="Base" /></Col>
                  <Col xs={24} xl={12}><PieAndDetailsCard title="Realizado por produto" subtitle="Gráfico à esquerda e detalhamento à direita" data={productDoneDonut} centerValue={productDoneDonut.reduce((acc, item) => acc + item.value, 0)} centerLabel="Realizado" /></Col>
                </Row>
                <Table rowKey={(r) => `${r.code || r.product}`} dataSource={byProduct} columns={productColumns} pagination={{ pageSize: 6 }} scroll={{ x: 900 }} />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Modal title="Projetos atrasados" open={openDelayedModal} onCancel={() => setOpenDelayedModal(false)} footer={null} width={1200} destroyOnHidden>
        <Table
          rowKey="id"
          loading={delayedProjectsQuery.isLoading}
          dataSource={delayedProjects}
          columns={delayedProjectColumns}
          pagination={{ pageSize: 6 }}
          scroll={{ x: 1200 }}
          locale={{ emptyText: 'Nenhum projeto atrasado' }}
        />
      </Modal>

      <Modal title="Projetos para acabar" open={openEndingSoonModal} onCancel={() => setOpenEndingSoonModal(false)} footer={null} width={900}>
        {!endingSoon.length ? (
          <Empty description="Nenhum projeto próximo do fim" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={endingSoon}
            renderItem={(item) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{item.clientName || '-'} • {item.supervisorName || 'Sem supervisor'}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Fim previsto: {item.endPlannedAt ? dayjs(item.endPlannedAt).format('DD/MM/YYYY') : '-'}</div>
                    </div>
                    <Space direction="vertical" size={6} style={{ alignItems: 'flex-end' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 999, background: item.daysLeft <= 2 ? '#fff1f0' : '#e6f4ff', border: `1px solid ${item.daysLeft <= 2 ? '#ffa39e' : '#91caff'}`, color: item.daysLeft <= 2 ? '#cf1322' : '#0958d9', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {item.daysLeft} dia(s)
                      </span>
                      <span style={{ fontWeight: 800 }}>{item.pending} carro(s) restante(s)</span>
                    </Space>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>

      <Modal title="Produtividade por dia" open={openDayModal} onCancel={() => setOpenDayModal(false)} footer={null} width={760}>
        <SimpleBars data={byDayNoFuture} labelKey="label" valueKey="valor" maxItems={999} color="linear-gradient(90deg, #1677ff 0%, #60a5fa 100%)" />
      </Modal>

      <Modal title="Produtividade por semana" open={openWeekModal} onCancel={() => setOpenWeekModal(false)} footer={null} width={760}>
        <SimpleBars data={byWeekNoFuture} labelKey="label" valueKey="valor" maxItems={999} color="linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)" />
      </Modal>

      <Modal title="Status das instalações" open={openStatusModal} onCancel={() => setOpenStatusModal(false)} footer={null} width={720}>
        <StatusSummaryCards data={statusCardsData} />
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
            setTimeout(() => setModalMapKey((prev) => prev + 1), 150);
          }
        }}
        styles={{ body: { padding: 12 } }}
      >
        {openMapModal ? <InstallationHeatMap key={`modal-map-${modalMapKey}`} data={mapRows} fallbackRegions={byRegion} height={650} resizeKey={modalMapKey} /> : null}
      </Modal>
    </div>
  );
}