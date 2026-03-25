import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Typography,
  Modal,
  Avatar,
  Descriptions,
  Tag,
  Row,
  Col,
  Image,
  Tooltip,
  Switch,
  Grid,
  Drawer,
  Pagination,
  Empty,
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { avatarDivIcon } from './leafletAvatarIcon';

type Role = { id: number; name: string; level: number };
type SimpleUser = { id: number; name: string; role?: Role | null; managerId?: number | null };

type User = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;

  avatarUrl?: string | null;
  role?: Role | null;

  manager?: SimpleUser | null;
  managerId?: number | null;

  serviceAreaName?: string | null;
  vendorCode?: string | null;
  serviceAreaCode?: string | null;
  tipoAtendimento?: 'FX' | 'VL' | 'FV' | null;
  tipoAtendimentoDescricao?: string | null;

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

  isActive?: boolean;

  estoqueAvancado?: boolean | null;
};

const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as const;
const { Title, Text } = Typography;

/** ===== Helpers globais (ABS URL) ===== */
const RAW_API_URL = import.meta.env.VITE_API_URL?.trim();

if (!RAW_API_URL) {
  throw new Error('VITE_API_URL não definida no arquivo .env');
}

const API_URL = RAW_API_URL.replace(/\/+$/, '');

const abs = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}/${String(url).replace(/^\/+/, '')}`;
};

const initial = (s?: string | null) => (s?.trim()?.[0]?.toUpperCase() ?? '?');

/** ===== Tipos de prestador ===== */
const PRESTADOR_TYPES = ['TECNICO', 'PSO', 'SPOT', 'PRP'] as const;
type PrestadorType = (typeof PRESTADOR_TYPES)[number];

const getPrestadorType = (u: User): PrestadorType | 'OUTROS' => {
  const roleName = (u.role?.name || '').toLowerCase();

  if (roleName.includes('pso')) return 'PSO';
  if (roleName.includes('spot')) return 'SPOT';
  if (roleName === 'prp' || roleName.includes('prp')) return 'PRP';

  if (u.role?.level === 1 || roleName.includes('técnic') || roleName.includes('tecnic')) return 'TECNICO';

  return 'OUTROS';
};

const getTipoAtendimentoLabel = (u?: User | null) => {
  const v = u?.tipoAtendimento;
  if (v === 'FX') return 'Ponto Fixo';
  if (v === 'VL') return 'Volante';
  if (v === 'FV') return 'Fixo e Volante';
  return u?.tipoAtendimentoDescricao || '—';
};

const getTipoAtendimentoTagColor = (u?: User | null) => {
  const v = u?.tipoAtendimento;
  if (v === 'FX') return 'blue';
  if (v === 'VL') return 'orange';
  if (v === 'FV') return 'purple';
  return 'default';
};

/** Ajusta o tamanho do mapa quando o layout muda (sider/resize) */
function MapResizeWatcher() {
  const map = useMap();
  const invalidate = () => setTimeout(() => map.invalidateSize(), 220);

  React.useEffect(() => {
    window.addEventListener('resize', invalidate);
    window.addEventListener('app-sider-toggle', invalidate);
    return () => {
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('app-sider-toggle', invalidate);
    };
  }, [map]);

  return null;
}

/** Centraliza/voa para um ponto quando solicitado */
function FocusOn({ lat, lng, zoom = 12 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.flyTo([lat, lng], zoom, { animate: true, duration: 0.6 });
  }, [lat, lng, zoom, map]);
  return null;
}

/** Enquadra o mapa a uma lista de pontos quando `signal` muda */
function FitToPoints({
  points,
  signal,
  fallback,
}: {
  points: [number, number][];
  signal: number;
  fallback: [number, number];
}) {
  const map = useMap();
  React.useEffect(() => {
    if (signal === 0) return;
    if (points.length > 0) {
      const b = L.latLngBounds(points);
      map.fitBounds(b.pad(0.2), { animate: true });
    } else {
      map.setView(fallback, 5, { animate: true });
    }
  }, [signal, points, fallback, map]);
  return null;
}

export default function TechsPsoMapPage() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: users = [], isFetching, refetch } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    staleTime: 60_000,
  });

  const byId = useMemo(() => {
    const m = new Map<number, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const supervisorOf = (u: User | undefined | null): User | null => {
    if (!u?.managerId) return null;
    const sup = byId.get(u.managerId);
    if (!sup) return null;
    if (sup.role?.level === 2 || /supervisor/i.test(sup.role?.name || '')) return sup;
    return null;
  };

  const coordinatorOf = (u: User | undefined | null): User | null => {
    const sup = supervisorOf(u);
    const coord = sup?.managerId ? byId.get(sup.managerId) : null;
    if (coord && (coord.role?.level === 3 || /coordenador/i.test(coord.role?.name || ''))) return coord;
    return null;
  };

  const techsPso = useMemo(
    () =>
      users.filter((u) => {
        const t = getPrestadorType(u);
        return t === 'TECNICO' || t === 'PSO' || t === 'SPOT' || t === 'PRP';
      }),
    [users]
  );

  const [q, setQ] = useState('');
  const [regiao, setRegiao] = useState<string | undefined>(undefined);
  const [coordId, setCoordId] = useState<number | undefined>(undefined);
  const [supId, setSupId] = useState<number | undefined>(undefined);
  const [tipo, setTipo] = useState<PrestadorType | undefined>(undefined);
  const [onlyEA, setOnlyEA] = useState(false);

  const coordOptions = useMemo(() => {
    const set = new Map<number, string>();
    techsPso.forEach((t) => {
      const c = coordinatorOf(t);
      if (c) set.set(c.id, c.name);
    });
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [techsPso]);

  const supOptions = useMemo(() => {
    const set = new Map<number, string>();
    techsPso.forEach((t) => {
      const s = supervisorOf(t);
      if (s) set.set(s.id, s.name);
    });
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [techsPso]);

  const filtered = useMemo(() => {
    return techsPso.filter((t) => {
      if (q) {
        const qq = q.toLowerCase();
        const inName = t.name.toLowerCase().includes(qq);
        const inType = String(getPrestadorType(t)).toLowerCase().includes(qq);
        const inAtendimento = getTipoAtendimentoLabel(t).toLowerCase().includes(qq);
        if (!inName && !inType && !inAtendimento) return false;
      }

      if (regiao && (t.serviceAreaName || '').toLowerCase() !== regiao.toLowerCase()) return false;

      if (tipo) {
        const tt = getPrestadorType(t);
        if (tt !== tipo) return false;
      }

      if (onlyEA && !t.estoqueAvancado) return false;

      if (coordId) {
        const c = coordinatorOf(t);
        if (!c || c.id !== coordId) return false;
      }

      if (supId) {
        const s = supervisorOf(t);
        if (!s || s.id !== supId) return false;
      }

      return true;
    });
  }, [techsPso, q, regiao, tipo, onlyEA, coordId, supId]);

  const withCoords = filtered.filter((t) => t.lat != null && t.lng != null);
  const allWithCoords = useMemo(() => techsPso.filter((t) => t.lat != null && t.lng != null), [techsPso]);

  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);

  const [fitAllSignal, setFitAllSignal] = useState(0);
  const [fitFilteredSignal, setFitFilteredSignal] = useState(0);

  /** lista resumida do painel + modal de ver mais */
  const SIDEBAR_PREVIEW_COUNT = 3;
  const MODAL_PAGE_SIZE = 9;

  const [listModalOpen, setListModalOpen] = useState(false);
  const [listPage, setListPage] = useState(1);

  const sidebarPreviewUsers = useMemo(() => withCoords.slice(0, SIDEBAR_PREVIEW_COUNT), [withCoords]);

  const paginatedUsers = useMemo(() => {
    const start = (listPage - 1) * MODAL_PAGE_SIZE;
    const end = start + MODAL_PAGE_SIZE;
    return withCoords.slice(start, end);
  }, [withCoords, listPage]);

  useEffect(() => {
    setListPage(1);
  }, [q, regiao, tipo, onlyEA, coordId, supId, users]);

  useEffect(() => {
    setFocus(null);
    const id = setTimeout(() => setFitFilteredSignal((s) => s + 1), 0);
    return () => clearTimeout(id);
  }, [q, regiao, tipo, onlyEA, coordId, supId, users]);

  const defaultCenter: [number, number] = [-23.55, -46.633];

  const handleClear = () => {
    setQ('');
    setRegiao(undefined);
    setTipo(undefined);
    setOnlyEA(false);
    setCoordId(undefined);
    setSupId(undefined);
    setFocus(null);
    setListPage(1);
    if (!isMobile) setSidebarOpen(true);
    setTimeout(() => setFitAllSignal((s) => s + 1), 0);
  };

  /** ===== Modal detalhes ===== */
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);

  const openDetails = (u: User) => {
    setDetailsUser(u);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsUser(null);
  };

  /** ===== Street View no MODAL ===== */
  const [svOpen, setSvOpen] = useState(false);
  const [svTarget, setSvTarget] = useState<{ lat: number; lng: number; name?: string } | null>(null);

  const streetViewEmbedUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`;

  const streetViewExternalUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0`;

  const openStreetViewModal = (lat?: number | null, lng?: number | null, name?: string) => {
    if (lat == null || lng == null) return;
    setSvTarget({ lat, lng, name });
    setSvOpen(true);
  };

  const closeStreetViewModal = () => {
    setSvOpen(false);
    setSvTarget(null);
  };

  const avatarUrlAbs = abs(detailsUser?.avatarUrl);

  const labelStyle: React.CSSProperties = {
    width: 140,
    fontWeight: 600,
    color: '#475569',
    whiteSpace: 'nowrap',
  };

  const contentStyle: React.CSSProperties = {
    minWidth: 0,
    color: '#111827',
    wordBreak: 'break-word',
  };

  const renderPrestadorItem = (t: User, compact = false) => {
    const s = supervisorOf(t);
    const c = coordinatorOf(t);
    const tipoPrest = getPrestadorType(t);

    return (
      <div
        key={t.id}
        style={{
          padding: compact ? '10px 0' : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: compact ? 220 : '100%',
            }}
          >
            {t.name}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <Tag>{tipoPrest}</Tag>
            {t.tipoAtendimento && (
              <Tag color={getTipoAtendimentoTagColor(t)}>{getTipoAtendimentoLabel(t)}</Tag>
            )}
            {t.estoqueAvancado && <Tag color="purple">Estoque Avançado</Tag>}
          </div>

          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            Sup.: {s?.name || '—'}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>
            Coord.: {c?.name || '—'}
          </div>
        </div>

        <Space direction="vertical" size={6}>
          <Button size="small" onClick={() => openDetails(t)}>
            Detalhes
          </Button>
          <Button
            size="small"
            disabled={!(t.lat && t.lng)}
            onClick={() => {
              setFocus({ lat: t.lat!, lng: t.lng! });
              setListModalOpen(false);
              if (isMobile) setDrawerOpen(false);
            }}
          >
            Ver no mapa
          </Button>
        </Space>
      </div>
    );
  };

  const FiltersPanel = (
    <Card variant={false} style={{ boxShadow: 'none' }}>
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Mapa Prestadores
          </Title>

          {!isMobile && (
            <Button size="small" icon={<EyeInvisibleOutlined />} onClick={() => setSidebarOpen(false)}>
              Ocultar painel
            </Button>
          )}
        </div>

        <div style={{ color: '#64748b' }}>{withCoords.length} prestador(es) com localização</div>

      <div
        style={{
          display: 'grid',
          gap: 10,
          padding: 12,
          border: '1px solid #f1f5f9',
          borderRadius: 14,
          background: '#fafcff',
        }}
      >
        <div>
          <Text
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
            }}
          >
            Buscar
          </Text>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Buscar por nome, tipo ou atendimento"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="large"
            style={{
              width: '100%',
              borderRadius: 10,
            }}
          />
        </div>

        <div>
          <Text
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
            }}
          >
            Tipo
          </Text>
          <Select
            allowClear
            size="large"
            placeholder="Selecione o tipo"
            value={tipo}
            onChange={(v) => setTipo(v)}
            options={[
              { value: 'TECNICO', label: 'Técnico' },
              { value: 'PSO', label: 'PSO' },
              { value: 'SPOT', label: 'SPOT' },
              { value: 'PRP', label: 'PRP' },
            ]}
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <Text
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
            }}
          >
            Região
          </Text>
          <Select
            allowClear
            size="large"
            placeholder="Selecione a região"
            value={regiao}
            onChange={(v) => setRegiao(v)}
            options={REGIOES.map((r) => ({ value: r, label: r }))}
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <Text
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
            }}
          >
            Coordenador
          </Text>
          <Select
            allowClear
            size="large"
            placeholder="Selecione o coordenador"
            options={coordOptions}
            value={coordId}
            onChange={(v) => setCoordId(v)}
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <Text
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
            }}
          >
            Supervisor
          </Text>
          <Select
            allowClear
            size="large"
            placeholder="Selecione o supervisor"
            options={supOptions}
            value={supId}
            onChange={(v) => setSupId(v)}
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 4,
          }}
        >
          <Text style={{ color: '#475569', fontWeight: 500 }}>Somente Estoque Avançado</Text>
          <Switch checked={onlyEA} onChange={setOnlyEA} />
        </div>

        <Space wrap style={{ width: '100%' }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
            style={{ borderRadius: 10 }}
          >
            Atualizar
          </Button>
          <Button
            icon={<CloseCircleOutlined />}
            onClick={handleClear}
            style={{ borderRadius: 10 }}
          >
            Limpar
          </Button>
        </Space>
      </div>

        <div style={{ borderTop: '1px solid #eee', marginTop: 8, paddingTop: 8 }}>
          {sidebarPreviewUsers.map((t) => (
            <div key={t.id}>{renderPrestadorItem(t, true)}</div>
          ))}

          {withCoords.length > SIDEBAR_PREVIEW_COUNT && (
            <div style={{ marginTop: 12 }}>
              <Button block type="default" onClick={() => setListModalOpen(true)}>
                Ver mais ({withCoords.length - SIDEBAR_PREVIEW_COUNT} restantes)
              </Button>
            </div>
          )}

          {withCoords.length === 0 && <div style={{ color: '#94a3b8' }}>Nenhum prestador com coordenadas</div>}
        </div>
      </Space>
    </Card>
  );

  const gridTemplateColumns = !isMobile && sidebarOpen ? '380px 1fr' : '1fr';
  const mapHeight = isMobile ? '90vh' : '78vh';

  return (
    <div style={{ display: 'grid', gridTemplateColumns, gap: 16 }}>
      {!isMobile && sidebarOpen && <Card>{FiltersPanel}</Card>}

      {isMobile && (
        <Card styles={{ body: { padding: 12 } }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'grid' }}>
              <Text strong>Mapa Prestadores</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {withCoords.length} com localização
              </Text>
            </div>

            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching} />
              <Button type="primary" icon={<FilterOutlined />} onClick={() => setDrawerOpen(true)}>
                Filtros
              </Button>
            </Space>
          </Space>
        </Card>
      )}

      {!isMobile && !sidebarOpen && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSidebarOpen(true)} style={{ marginBottom: 8 }}>
            Mostrar painel
          </Button>
        </div>
      )}

      <Card styles={{ body: { padding: 0 } }} style={{ overflow: 'hidden' }}>
        <MapContainer
          center={withCoords[0]?.lat ? [withCoords[0].lat!, withCoords[0].lng!] : defaultCenter}
          zoom={6}
          style={{ height: mapHeight, width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <MapResizeWatcher />

          <FitToPoints
            points={allWithCoords.map((t) => [t.lat!, t.lng!] as [number, number])}
            signal={fitAllSignal}
            fallback={defaultCenter}
          />
          <FitToPoints
            points={withCoords.map((t) => [t.lat!, t.lng!] as [number, number])}
            signal={fitFilteredSignal}
            fallback={defaultCenter}
          />

          {!!focus && <FocusOn lat={focus.lat} lng={focus.lng} />}

          {withCoords.map((t) => {
            const s = supervisorOf(t);
            const c = coordinatorOf(t);
            const avatarUrlAbsMarker = abs(t.avatarUrl);
            const tipoPrest = getPrestadorType(t);

            return (
              <Marker
                key={t.id}
                position={[t.lat!, t.lng!]}
                icon={avatarDivIcon({ name: t.name, avatarUrl: avatarUrlAbsMarker }, 44)}
              >
                <Popup>
                  <div style={{ minWidth: isMobile ? 240 : 320 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Avatar src={avatarUrlAbsMarker} size={42}>
                        {initial(t.name)}
                      </Avatar>
                      <div style={{ minWidth: 0 }}>
                        <Title level={5} style={{ margin: 0 }}>
                          {t.name}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t.role?.name || '—'}
                        </Text>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                          <Tag>{tipoPrest}</Tag>
                          {t.tipoAtendimento && (
                            <Tag color={getTipoAtendimentoTagColor(t)}>{getTipoAtendimentoLabel(t)}</Tag>
                          )}
                          {t.estoqueAvancado && <Tag color="purple">Estoque Avançado</Tag>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Text type="secondary">Supervisor:&nbsp;</Text>
                      {s?.name || '—'}
                    </div>
                    <div>
                      <Text type="secondary">Coordenador:&nbsp;</Text>
                      {c?.name || '—'}
                    </div>
                    <div>
                      <Text type="secondary">Atendimento:&nbsp;</Text>
                      {getTipoAtendimentoLabel(t)}
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <Button
                        type="primary"
                        style={{ height: 36, padding: '0 14px', fontSize: 14 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDetails(t);
                        }}
                      >
                        Ver detalhes
                      </Button>

                      <Button
                        style={{ height: 36, padding: '0 14px', fontSize: 14 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFocus({ lat: t.lat!, lng: t.lng! });
                        }}
                      >
                        Focar
                      </Button>

                      <Tooltip title={!t.lat || !t.lng ? 'Sem coordenadas' : 'Abrir Street View'}>
                        <Button
                          icon={<EnvironmentOutlined />}
                          style={{ height: 36, padding: '0 14px', fontSize: 14 }}
                          disabled={t.lat == null || t.lng == null}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openStreetViewModal(t.lat, t.lng, t.name);
                          }}
                        >
                          Street View
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Card>

      <Drawer
        title="Filtros"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width="92vw"
        destroyOnHidden
        styles={{ body: { padding: 12 } }}
      >
        {FiltersPanel}
      </Drawer>

      <Modal
        open={listModalOpen}
        onCancel={() => setListModalOpen(false)}
        footer={null}
        width={isMobile ? '96vw' : 1100}
        style={isMobile ? { top: 16, maxWidth: '96vw' } : { top: 50 }}
        destroyOnHidden={false}
        title={`Prestadores com localização (${withCoords.length})`}
      >
        {withCoords.length === 0 ? (
          <Empty description="Nenhum prestador encontrado" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Row gutter={[16, 16]}>
              {paginatedUsers.map((t) => {
                const s = supervisorOf(t);
                const c = coordinatorOf(t);
                const tipoPrest = getPrestadorType(t);
                const avatar = abs(t.avatarUrl);

                return (
                  <Col xs={24} md={12} lg={8} key={t.id}>
                    <Card
                      size="small"
                      style={{ height: '100%', borderRadius: 12 }}
                      styles={{ body: { padding: 14 } }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <Avatar src={avatar} size={48}>
                          {initial(t.name)}
                        </Avatar>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              lineHeight: 1.3,
                              wordBreak: 'break-word',
                            }}
                          >
                            {t.name}
                          </div>

                          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Tag>{tipoPrest}</Tag>
                            {t.tipoAtendimento && (
                              <Tag color={getTipoAtendimentoTagColor(t)}>
                                {getTipoAtendimentoLabel(t)}
                              </Tag>
                            )}
                            {t.estoqueAvancado && <Tag color="purple">Estoque Avançado</Tag>}
                          </div>

                          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                            Sup.: {s?.name || '—'}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            Coord.: {c?.name || '—'}
                          </div>

                          <Space wrap style={{ marginTop: 12 }}>
                            <Button size="small" onClick={() => openDetails(t)}>
                              Detalhes
                            </Button>
                            <Button
                              size="small"
                              disabled={!(t.lat && t.lng)}
                              onClick={() => {
                                setFocus({ lat: t.lat!, lng: t.lng! });
                                setListModalOpen(false);
                                if (isMobile) setDrawerOpen(false);
                              }}
                            >
                              Ver no mapa
                            </Button>
                          </Space>
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                current={listPage}
                pageSize={MODAL_PAGE_SIZE}
                total={withCoords.length}
                onChange={(page) => setListPage(page)}
                showSizeChanger={false}
              />
            </div>
          </Space>
        )}
      </Modal>

      <Modal
        open={detailsOpen}
        onCancel={closeDetails}
        footer={
          <Button onClick={closeDetails} block={isMobile}>
            Fechar
          </Button>
        }
        width={isMobile ? '96vw' : 1200}
        style={isMobile ? { top: 16, maxWidth: '96vw' } : { top: 140 }}
        destroyOnHidden
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {avatarUrlAbs ? (
              <Image
                src={avatarUrlAbs}
                width={48}
                height={48}
                style={{ borderRadius: '50%', objectFit: 'cover', cursor: 'zoom-in' }}
                preview={{ mask: 'Ampliar' }}
              />
            ) : (
              <Avatar size={48}>{initial(detailsUser?.name)}</Avatar>
            )}

            <div>
              <div style={{ fontWeight: 700 }}>{detailsUser?.name || ''}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{detailsUser?.role?.name || '—'}</div>
            </div>
          </div>
        }
      >
        {detailsUser && (
          <Row gutter={[18, 18]}>
            <Col xs={24} lg={8}>
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Card size="small" title="Profissional" styles={{ body: { paddingTop: 12 } }}>
                  <Descriptions column={1} size="middle" labelStyle={labelStyle} contentStyle={contentStyle}>
                    <Descriptions.Item label="Cargo">{detailsUser.role?.name || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Tipo">{getPrestadorType(detailsUser)}</Descriptions.Item>
                    <Descriptions.Item label="Atendimento">
                      {detailsUser.tipoAtendimento ? (
                        <Tag color={getTipoAtendimentoTagColor(detailsUser)}>
                          {getTipoAtendimentoLabel(detailsUser)}
                        </Tag>
                      ) : (
                        '—'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Estoque Avançado">
                      {detailsUser.estoqueAvancado ? <Tag color="purple">Sim</Tag> : 'Não'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Supervisor">{supervisorOf(detailsUser)?.name || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Coordenador">{coordinatorOf(detailsUser)?.name || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Região">{detailsUser.serviceAreaName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      {detailsUser.isActive == null ? '—' : detailsUser.isActive ? 'Ativo' : 'Inativo'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card size="small" title="Contato" styles={{ body: { paddingTop: 12 } }}>
                  <Descriptions column={1} size="middle" labelStyle={labelStyle} contentStyle={contentStyle}>
                    <Descriptions.Item label="E-mail">{detailsUser.email || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Telefone">{detailsUser.phone || '—'}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Space>
            </Col>

            <Col xs={24} lg={8}>
              <Card size="small" title="Área de atendimento" styles={{ body: { paddingTop: 12 } }}>
                <Descriptions column={1} size="middle" labelStyle={labelStyle} contentStyle={contentStyle}>
                  <Descriptions.Item label="Código fornecedor">{detailsUser.vendorCode || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Código da área">{detailsUser.serviceAreaCode || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Nome da área">{detailsUser.serviceAreaName || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Tipo de atendimento">{getTipoAtendimentoLabel(detailsUser)}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card size="small" title="Endereço" styles={{ body: { paddingTop: 12 } }}>
                <Descriptions column={1} size="middle" labelStyle={labelStyle} contentStyle={contentStyle}>
                  <Descriptions.Item label="Logradouro">
                    {detailsUser.addressStreet || '—'} {detailsUser.addressNumber || ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="Complemento">{detailsUser.addressComplement || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Bairro">{detailsUser.addressDistrict || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Cidade/UF">
                    {detailsUser.addressCity || '—'}
                    {detailsUser.addressState ? ` / ${detailsUser.addressState}` : ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="CEP">{detailsUser.addressZip || '—'}</Descriptions.Item>
                  <Descriptions.Item label="País">{detailsUser.addressCountry || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Coordenadas">
                    {detailsUser.lat != null && detailsUser.lng != null ? (
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
                        {detailsUser.lat}, {detailsUser.lng}
                      </Tag>
                    ) : (
                      <Tag>Sem coordenadas</Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        )}
      </Modal>

      <Modal
        open={svOpen}
        onCancel={closeStreetViewModal}
        width={isMobile ? '96vw' : 1100}
        style={isMobile ? { top: 16, maxWidth: '96vw' } : { top: 80 }}
        destroyOnHidden
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <EnvironmentOutlined />
            <div style={{ fontWeight: 700 }}>Street View{svTarget?.name ? ` — ${svTarget.name}` : ''}</div>
          </div>
        }
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
            {svTarget && (
              <Button
                onClick={() =>
                  window.open(streetViewExternalUrl(svTarget.lat, svTarget.lng), '_blank', 'noopener,noreferrer')
                }
              >
                Abrir no Google Maps
              </Button>
            )}
            <Button type="primary" onClick={closeStreetViewModal}>
              Fechar
            </Button>
          </Space>
        }
      >
        {svTarget ? (
          <div
            style={{
              width: '100%',
              height: isMobile ? '55vh' : '70vh',
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid #f0f0f0',
            }}
          >
            <iframe
              title="Street View"
              src={streetViewEmbedUrl(svTarget.lat, svTarget.lng)}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}