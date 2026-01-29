// src/modules/techs/TechsMapPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Card,
  Select,
  Space,
  Typography,
  Input,
  Tag,
  Divider,
  Empty,
  Button,
} from 'antd';
import { UserOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

type Role = { id: number; name: string; level: number };
type SimpleUser = { id: number; name: string; id?: number };
type Location = { id: number; name: string; uf?: string | null; area?: string | null };
type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role?: Role;
  managerId?: number | null;
  manager?: SimpleUser | null;
  location?: Location | null;

  // endereço
  addressState?: string | null; // e.g. "São Paulo"
  lat?: number | null;
  lng?: number | null;
};

const { Title, Text } = Typography;

// UF → Região
const UF_TO_REGION: Record<string, 'Norte'|'Nordeste'|'Centro-Oeste'|'Sudeste'|'Sul'> = {
  AC:'Norte', AP:'Norte', AM:'Norte', PA:'Norte', RO:'Norte', RR:'Norte', TO:'Norte',
  AL:'Nordeste', BA:'Nordeste', CE:'Nordeste', MA:'Nordeste', PB:'Nordeste',
  PE:'Nordeste', PI:'Nordeste', RN:'Nordeste', SE:'Nordeste',
  DF:'Centro-Oeste', GO:'Centro-Oeste', MT:'Centro-Oeste', MS:'Centro-Oeste',
  ES:'Sudeste', MG:'Sudeste', RJ:'Sudeste', SP:'Sudeste',
  PR:'Sul', RS:'Sul', SC:'Sul',
};

// Nome do estado → UF (pra quando addressState vem por extenso)
const STATE_NAME_TO_UF: Record<string,string> = {
  'Acre':'AC','Amapá':'AP','Amazonas':'AM','Pará':'PA','Rondônia':'RO','Roraima':'RR','Tocantins':'TO',
  'Alagoas':'AL','Bahia':'BA','Ceará':'CE','Maranhão':'MA','Paraíba':'PB',
  'Pernambuco':'PE','Piauí':'PI','Rio Grande do Norte':'RN','Sergipe':'SE',
  'Distrito Federal':'DF','Goiás':'GO','Mato Grosso':'MT','Mato Grosso do Sul':'MS',
  'Espírito Santo':'ES','Minas Gerais':'MG','Rio de Janeiro':'RJ','São Paulo':'SP',
  'Paraná':'PR','Rio Grande do Sul':'RS','Santa Catarina':'SC',
};

function getRegion(u: User): string | undefined {
  // prioridade: área do local (se você usa isso como região), depois UF do local, depois estado do endereço
  const ufFromLoc = u.location?.uf?.toUpperCase();
  const ufFromAddr =
    (u.addressState && (STATE_NAME_TO_UF[u.addressState] || u.addressState.toUpperCase().slice(0,2))) || undefined;
  const uf = ufFromLoc || ufFromAddr;
  if (uf && UF_TO_REGION[uf]) return UF_TO_REGION[uf];
  // fallback: area do local já com o nome da região
  if (u.location?.area && ['Sul','Sudeste','Centro-Oeste','Nordeste','Norte'].includes(u.location.area))
    return u.location.area;
  return undefined;
}

function isTechOrPSO(u: User) {
  const name = (u.role?.name || '').toLowerCase();
  return u.role?.level === 1 || name.includes('pso') || name.includes('técnico') || name.includes('tecnico');
}

function isSupervisor(u: User) { return u.role?.level === 2; }
function isCoordinator(u: User) { return u.role?.level === 3; }

function FlyTo({ center, zoom }: { center: [number,number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom ?? 11, { animate: true }); }, [center, zoom, map]);
  return null;
}

const defaultCenter: [number, number] = [-23.55, -46.63]; // SP

export default function TechsMapPage() {
  // === dados base
  const { data: users = [], isLoading, refetch, isFetching } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    staleTime: 60_000,
  });

  // mapeamentos
  const byMgr = useMemo(() => {
    const m = new Map<number, User[]>();
    users.forEach(u => {
      const key = u.managerId ?? 0;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(u);
    });
    return m;
  }, [users]);

  const coordsTechs = useMemo(() => users.filter(u => isTechOrPSO(u) && u.lat != null && u.lng != null), [users]);
  const coordinators = useMemo(() => users.filter(isCoordinator), [users]);
  const supervisorsAll = useMemo(() => users.filter(isSupervisor), [users]);

  // === filtros
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [coordId, setCoordId] = useState<number | undefined>(undefined);
  const [supId, setSupId] = useState<number | undefined>(undefined);
  const [q, setQ] = useState('');

  // Supervisores abaixo do coordenador (quando selecionado)
  const supOptionsFiltered = useMemo(() => {
    if (!coordId) return supervisorsAll;
    // BFS a partir do coordenador para achar todos supervisores descendentes
    const stack = [coordId];
    const supSet = new Set<number>();
    const seen = new Set<number>();
    while (stack.length) {
      const cur = stack.pop()!;
      const kids = byMgr.get(cur) || [];
      for (const k of kids) {
        if (seen.has(k.id)) continue;
        seen.add(k.id);
        if (isSupervisor(k)) supSet.add(k.id);
        stack.push(k.id);
      }
    }
    return supervisorsAll.filter(s => supSet.has(s.id));
  }, [coordId, supervisorsAll, byMgr]);

  // aplica filtros nos techs
  const filtered = useMemo(() => {
    let arr = coordsTechs;
    if (region) arr = arr.filter(u => getRegion(u) === region);
    if (coordId) {
      // pega toda a subárvore do coordenador (todos técnicos abaixo)
      const allowed = new Set<number>();
      const stack = [coordId];
      const seen = new Set<number>(stack);
      while (stack.length) {
        const cur = stack.pop()!;
        const kids = byMgr.get(cur) || [];
        for (const k of kids) {
          if (seen.has(k.id)) continue;
          seen.add(k.id);
          stack.push(k.id);
          if (isTechOrPSO(k)) allowed.add(k.id);
        }
      }
      arr = arr.filter(t => allowed.has(t.id));
    }
    if (supId) {
      const allowed = new Set<number>();
      const stack = [supId];
      const seen = new Set<number>(stack);
      while (stack.length) {
        const cur = stack.pop()!;
        const kids = byMgr.get(cur) || [];
        for (const k of kids) {
          if (seen.has(k.id)) continue;
          seen.add(k.id);
          stack.push(k.id);
          if (isTechOrPSO(k)) allowed.add(k.id);
        }
      }
      arr = arr.filter(t => allowed.has(t.id));
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter(t => t.name.toLowerCase().includes(s));
    }
    return arr;
  }, [coordsTechs, region, coordId, supId, q, byMgr]);

  // centralização
  const bounds = useMemo(() => {
    if (!filtered.length) return null;
    const latlngs = filtered.map(t => [Number(t.lat), Number(t.lng)] as [number, number]);
    const b = L.latLngBounds(latlngs);
    return b;
  }, [filtered]);

  // guardamos um foco quando o usuário procura por nome
  const [focus, setFocus] = useState<[number,number] | null>(null);

  // ajusta foco quando filtros mudam
  useEffect(() => {
    setFocus(null);
  }, [region, coordId, supId]);

  // marcador ícone padrão (evita warning do Leaflet no Vite)
  const defaultIcon = useMemo(
    () => L.icon({
      iconUrl: '/marker-icon.png',
      iconRetinaUrl: '/marker-icon-2x.png',
      shadowUrl: '/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    }),
    []
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Title level={4} style={{ margin: 0 }}>Técnicos geolocalizados</Title>
          <Text type="secondary">{filtered.length} técnico(s) com localização</Text>

          <Space.Compact block>
            <Input
              allowClear
              prefix={<SearchOutlined/>}
              placeholder="Buscar técnico por nome"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Space.Compact>

          <Select
            allowClear
            value={region}
            onChange={setRegion}
            placeholder="Filtrar por região"
            options={[
              { value:'Sul', label:'Sul' },
              { value:'Sudeste', label:'Sudeste' },
              { value:'Centro-Oeste', label:'Centro-Oeste' },
              { value:'Nordeste', label:'Nordeste' },
              { value:'Norte', label:'Norte' },
            ]}
          />

          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            value={coordId}
            onChange={(v) => { setCoordId(v as number | undefined); setSupId(undefined); }}
            placeholder="Filtrar por coordenador"
            options={coordinators
              .map(c => ({ value: c.id, label: c.name }))
              .sort((a,b)=>a.label.localeCompare(b.label))}
          />

          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            value={supId}
            onChange={(v) => setSupId(v as number | undefined)}
            placeholder="Filtrar por supervisor"
            options={supOptionsFiltered
              .map(s => ({ value: s.id, label: s.name }))
              .sort((a,b)=>a.label.localeCompare(b.label))}
            disabled={!coordId && supOptionsFiltered.length === 0}
          />

          <Space>
            <Button icon={<ReloadOutlined/>} loading={isFetching} onClick={() => refetch()}>Atualizar</Button>
            {(region || coordId || supId || q) && (
              <Button onClick={() => { setRegion(undefined); setCoordId(undefined); setSupId(undefined); setQ(''); }}>
                Limpar filtros
              </Button>
            )}
          </Space>

          <Divider style={{ margin: '12px 0' }} />

          {filtered.length === 0 ? (
            <Empty description="Sem técnicos para os filtros" />
          ) : (
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              {filtered
                .slice()
                .sort((a,b)=>a.name.localeCompare(b.name))
                .map(t => (
                  <div
                    key={t.id}
                    style={{ padding: '8px 6px', borderBottom: '1px solid #f0f0f0', cursor:'pointer' }}
                    onClick={() => setFocus([Number(t.lat), Number(t.lng)])}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <Space>
                        <UserOutlined />
                        <b>{t.name}</b>
                      </Space>
                      <Tag color="blue">{getRegion(t) || '—'}</Tag>
                    </div>
                    <div style={{ color:'#64748b' }}>
                      {t.manager?.name ? <>Sup.: {t.manager?.name}</> : 'Sem supervisor'}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }} loading={isLoading}>
        <MapContainer
          center={defaultCenter}
          zoom={5}
          style={{ height: '80vh', width: '100%' }}
          scrollWheelZoom
          whenReady={(m) => {
            // fit bounds inicial
            if (bounds) m.target.fitBounds(bounds.pad(0.2));
          }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Foco quando o usuário escolhe um item na lista */}
          <FlyTo center={focus} zoom={12} />

          {/* Se mudou o filtro, ajusta bounds */}
          {bounds && !focus && <FitBounds bounds={bounds} />}

          {filtered.map(t => (
            <Marker
              key={t.id}
              position={[Number(t.lat), Number(t.lng)]}
              icon={defaultIcon}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <Title level={5} style={{ marginBottom: 4 }}>{t.name}</Title>
                  <div><Text type="secondary">Cargo: </Text>{t.role?.name || '—'}</div>
                  <div><Text type="secondary">Supervisor: </Text>{t.manager?.name || '—'}</div>
                  <div><Text type="secondary">Coordenador: </Text>{findCoordinatorName(users, t) || '—'}</div>
                  <div><Text type="secondary">Região: </Text>{getRegion(t) || '—'}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Card>
    </div>
  );
}

// Componente para ajustar o mapa aos bounds sempre que mudarem
function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  const ref = useRef(bounds);
  useEffect(() => {
    if (!bounds.equals(ref.current)) {
      ref.current = bounds;
      map.fitBounds(bounds.pad(0.2));
    }
  }, [bounds, map]);
  return null;
}

function findCoordinatorName(all: User[], tech: User): string | undefined {
  // sobe a cadeia de gestores até achar level 3
  let cur = all.find(u => u.id === (tech.managerId ?? tech.manager?.id));
  const guard = new Set<number>([tech.id]);
  while (cur && !guard.has(cur.id)) {
    if (cur.role?.level === 3) return cur.name;
    guard.add(cur.id);
    cur = all.find(u => u.id === (cur!.managerId ?? cur!.manager?.id));
  }
  return undefined;
}
