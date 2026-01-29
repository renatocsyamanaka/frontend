import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Select, Space, Typography } from 'antd';
import { LeftOutlined, SearchOutlined } from '@ant-design/icons';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

type TechType = { id: number; name: string };
type SimpleUser = { id: number; name: string };

type Need = {
  id: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED';
  requestedName: string;
  notes?: string | null;
  createdAt: string;

  requestedLocationText: string;
  requestedCity?: string | null;
  requestedState?: string | null;
  requestedCep?: string | null;

  // ✅ coords (podem vir number OU string por ser DECIMAL no MySQL)
  requestedLat?: number | string | null;
  requestedLng?: number | string | null;

  techType?: TechType | null;
  requestedBy?: SimpleUser | null;
};

type Requester = { id: number; name: string; count?: number };

const { Title, Text } = Typography;

/** ===== helpers ===== */
function toNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function getCoords(n: Need): [number, number] | null {
  const lat = toNumber(n.requestedLat);
  const lng = toNumber(n.requestedLng);
  if (lat === null || lng === null) return null;
  return [lat, lng];
}

function hasCoords(n: Need) {
  return getCoords(n) !== null;
}

function displayCityUF(n: Need) {
  const city = (n.requestedCity || '').trim();
  const uf = (n.requestedState || '').trim().toUpperCase();

  if (city && uf) return `${city}/${uf}`;
  if (city) return city;
  if (uf) return uf;

  // fallback caso não tenha city/uf
  return '—';
}

function FocusOn({ lat, lng, zoom = 12 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
}

/** Ajusta a viewport para conter todos os pontos filtrados */
function FitToMarkers({
  points,
  fallbackCenter,
}: {
  points: Array<[number, number]>;
  fallbackCenter: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (points.length === 0) {
      map.setView(fallbackCenter, 11, { animate: true });
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, fallbackCenter, points]);

  return null;
}

/** ===== Colors ===== */
const REQUESTER_COLORS = [
  '#2563eb', // azul
  '#16a34a', // verde
  '#dc2626', // vermelho
  '#7c3aed', // roxo
  '#ea580c', // laranja
  '#0891b2', // ciano
  '#ca8a04', // amarelo
  '#be123c', // rosa
  '#0f766e', // teal
];

function colorByRequester(requesterId: number | undefined, requesterIndexMap: Map<number, number>) {
  if (!requesterId) return '#6b7280'; // cinza fallback
  const idx = requesterIndexMap.get(requesterId) ?? 0;
  return REQUESTER_COLORS[idx % REQUESTER_COLORS.length];
}

function markerIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        background:${color};
        width:14px;
        height:14px;
        border-radius:50%;
        border:2px solid white;
        box-shadow:0 0 4px rgba(0,0,0,.6);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function NeedsMapPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const initialRequesterId = params.get('requesterId') ? Number(params.get('requesterId')) : undefined;
  const [requesterId, setRequesterId] = useState<number | undefined>(initialRequesterId);

  const { data: needs = [], isLoading } = useQuery<Need[]>({
    queryKey: ['needs-map'],
    queryFn: async () => (await api.get('/needs')).data,
    keepPreviousData: true,
  });

  const { data: serverRequesters = [] } = useQuery<Requester[]>({
    queryKey: ['needs-requesters'],
    queryFn: async () => (await api.get('/needs/requesters')).data,
    retry: 0,
    staleTime: 5 * 60 * 1000,
  });

  const derivedRequesters: Requester[] = useMemo(() => {
    const map = new Map<number, Requester>();
    needs.forEach((n) => {
      const u = n.requestedBy;
      if (u?.id) {
        const cur = map.get(u.id) || { id: u.id, name: u.name, count: 0 };
        cur.count = (cur.count || 0) + 1;
        map.set(u.id, cur);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [needs]);

  const requesters: Requester[] = serverRequesters.length ? serverRequesters : derivedRequesters;

  const requesterIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    requesters.forEach((r, idx) => map.set(r.id, idx));
    return map;
  }, [requesters]);

  const filtered = useMemo(
    () => (requesterId ? needs.filter((n) => n.requestedBy?.id === requesterId) : needs),
    [needs, requesterId]
  );

  const withCoords = useMemo(() => filtered.filter((n) => hasCoords(n)), [filtered]);
  const withoutCoords = filtered.length - withCoords.length;

  const points: Array<[number, number]> = useMemo(() => {
    return withCoords
      .map((n) => getCoords(n))
      .filter(Boolean) as Array<[number, number]>;
  }, [withCoords]);

  const focusId = params.get('focus') ? Number(params.get('focus')) : undefined;
  const focusNeed = useMemo(() => withCoords.find((n) => n.id === focusId), [withCoords, focusId]);
  const focusCoords = focusNeed ? getCoords(focusNeed) : null;

  // mantém requesterId na URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (requesterId) next.set('requesterId', String(requesterId));
    else next.delete('requesterId');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requesterId]);

  const defaultCenter: [number, number] = [-23.5505, -46.6333];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '370px 1fr', gap: 16 }}>
      <Card style={{ height: 'fit-content' }}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Button icon={<LeftOutlined />} onClick={() => navigate('/needs')}>
            Voltar
          </Button>

          <Title level={3} style={{ margin: 0 }}>
            Mapa de solicitações
          </Title>

          <div>
            <div style={{ color: '#64748b' }}>Total</div>
            <Title level={2} style={{ margin: 0 }}>
              {filtered.length}
            </Title>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ color: '#64748b' }}>Com coordenadas</div>
              <Title level={4} style={{ margin: 0 }}>
                {withCoords.length}
              </Title>
            </div>
            <div>
              <div style={{ color: '#64748b' }}>Sem coordenadas</div>
              <Title level={4} style={{ margin: 0 }}>
                {withoutCoords}
              </Title>
            </div>
          </div>

          {/* Filtro solicitante */}
          <div>
            <div style={{ color: '#64748b', marginBottom: 6 }}>Solicitante</div>
            <Select
              allowClear
              showSearch
              style={{ width: '100%' }}
              placeholder="Filtrar por solicitante"
              suffixIcon={<SearchOutlined />}
              value={requesterId}
              onChange={(v) => setRequesterId(v as number | undefined)}
              options={requesters.map((r) => ({
                value: r.id,
                label: r.count ? `${r.name} (${r.count})` : r.name,
              }))}
              optionFilterProp="label"
            />
          </div>

          {/* ✅ Legenda */}
          <div>
            <div style={{ color: '#64748b', marginBottom: 6 }}>Legenda</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {requesters.map((r) => {
                const color = colorByRequester(r.id, requesterIndexMap);
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: color,
                        display: 'inline-block',
                        border: '2px solid white',
                        boxShadow: '0 0 3px rgba(0,0,0,.35)',
                      }}
                    />
                    <span>{r.count ? `${r.name} (${r.count})` : r.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Space>
      </Card>

      <Card loading={isLoading} bodyStyle={{ padding: 0 }}>
        <MapContainer
          center={focusCoords ? focusCoords : defaultCenter}
          zoom={11}
          style={{ height: '78vh', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* foco ou fit */}
          {focusCoords ? (
            <FocusOn lat={focusCoords[0]} lng={focusCoords[1]} />
          ) : (
            <FitToMarkers points={points} fallbackCenter={defaultCenter} />
          )}

          {withCoords.map((n) => {
            const coords = getCoords(n);
            if (!coords) return null;

            const color = colorByRequester(n.requestedBy?.id, requesterIndexMap);

            return (
              <Marker key={n.id} position={coords} icon={markerIcon(color)}>
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    {/* ✅ Você pediu: não precisa endereço completo -> só cidade/UF */}
                    <Title level={5} style={{ marginBottom: 4, color }}>
                      {displayCityUF(n)}
                    </Title>

                    <div>
                      <Text type="secondary">Solicitante: </Text>
                      {n.requestedBy?.name || '—'}
                    </div>

                    <div>
                      <Text type="secondary">Técnico (livre): </Text>
                      {n.requestedName}
                    </div>

                    <div>
                      <Text type="secondary">Tipo: </Text>
                      {n.techType?.name || '-'}
                    </div>

                    <div>
                      <Text type="secondary">Status: </Text>
                      {n.status}
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <Text type="secondary">Coords: </Text>
                      {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <Button size="small" onClick={() => navigate(`/needs?focus=${n.id}`)}>
                        Abrir na lista
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Card>
    </div>
  );
}
