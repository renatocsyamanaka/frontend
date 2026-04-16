import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, CircleMarker, Popup, TileLayer, useMap } from 'react-leaflet';

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

type Props = {
  data: MapRow[];
  fallbackRegions?: ByRegionRow[];
  height?: number;
  resizeKey?: string | number | boolean;
};

type IntensityKey = 'baixa' | 'media' | 'alta' | 'muitoAlta';

const INTENSITY_META: Record<
  IntensityKey,
  {
    label: string;
    color: string;
    radius: number;
    fillOpacity: number;
    borderColor: string;
  }
> = {
  baixa: {
    label: 'Baixa',
    color: '#22c55e',
    radius: 7,
    fillOpacity: 0.68,
    borderColor: '#ffffff',
  },
  media: {
    label: 'Média',
    color: '#facc15',
    radius: 10,
    fillOpacity: 0.72,
    borderColor: '#ffffff',
  },
  alta: {
    label: 'Alta',
    color: '#f97316',
    radius: 14,
    fillOpacity: 0.76,
    borderColor: '#ffffff',
  },
  muitoAlta: {
    label: 'Muito alta',
    color: '#ef4444',
    radius: 18,
    fillOpacity: 0.8,
    borderColor: '#ffffff',
  },
};

function normalizeRows(data: MapRow[]) {
  return data.filter((item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);

    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat !== 0 &&
      lng !== 0 &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  });
}

function FitBounds({ rows }: { rows: MapRow[] }) {
  const map = useMap();

  useEffect(() => {
    if (!rows.length) {
      map.setView([-14.235, -51.9253], 4, { animate: true });
      return;
    }

    if (rows.length === 1) {
      map.setView([Number(rows[0].lat), Number(rows[0].lng)], 8, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(
      rows.map((item) => [Number(item.lat), Number(item.lng)] as [number, number])
    );

    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, rows]);

  return null;
}

function InvalidateMapSize({ trigger }: { trigger: string | number | boolean | undefined }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [map, trigger]);

  return null;
}

function getIntensityValue(item: MapRow) {
  return Number(item.heat || item.planned || item.projects || 0);
}

function getIntensityKey(value: number, maxValue: number): IntensityKey {
  const ratio = maxValue > 0 ? value / maxValue : 0;

  if (ratio >= 0.75) return 'muitoAlta';
  if (ratio >= 0.5) return 'alta';
  if (ratio >= 0.25) return 'media';
  return 'baixa';
}

function getMarkerStyle(value: number, maxValue: number) {
  const key = getIntensityKey(value, maxValue);
  const meta = INTENSITY_META[key];

  return {
    intensityKey: key,
    radius: meta.radius,
    fillColor: meta.color,
    color: meta.borderColor,
    fillOpacity: meta.fillOpacity,
    weight: 2,
  };
}

function Legend({
  filters,
  counts,
  visibleCount,
  totalCount,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  filters: Record<IntensityKey, boolean>;
  counts: Record<IntensityKey, number>;
  visibleCount: number;
  totalCount: number;
  onToggle: (key: IntensityKey) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        top: 16,
        zIndex: 500,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #e5e7eb',
        borderRadius: 18,
        boxShadow: '0 14px 32px rgba(15,23,42,0.18)',
        padding: 14,
        minWidth: 220,
      }}
    >
      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 16 }}>Intensidade</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {visibleCount} de {totalCount} pontos visíveis
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onSelectAll}
            style={{
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#0f172a',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Todas
          </button>

          <button
            type="button"
            onClick={onClearAll}
            style={{
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Limpar
          </button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {(Object.keys(INTENSITY_META) as IntensityKey[]).map((key) => {
            const item = INTENSITY_META[key];
            const active = filters[key];

            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggle(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  width: '100%',
                  border: active ? `1px solid ${item.color}` : '1px solid #e2e8f0',
                  background: active ? `${item.color}14` : '#ffffff',
                  borderRadius: 14,
                  padding: '9px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: active ? 1 : 0.55,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: item.color,
                      display: 'inline-block',
                      boxShadow: active ? `0 0 0 4px ${item.color}22` : 'none',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {item.label}
                  </span>
                </div>

                <span
                  style={{
                    minWidth: 28,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    color: active ? '#0f172a' : '#64748b',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 999,
                    padding: '2px 8px',
                  }}
                >
                  {counts[key] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyFilterNotice() {
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        zIndex: 500,
        background: 'rgba(15,23,42,0.88)',
        color: '#fff',
        borderRadius: 14,
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 10px 24px rgba(15,23,42,0.24)',
      }}
    >
      Nenhuma intensidade selecionada.
    </div>
  );
}

function FallbackPanel({ fallbackRegions }: { fallbackRegions?: ByRegionRow[] }) {
  const rows = [...(fallbackRegions || [])]
    .sort((a, b) => b.planned - a.planned || b.projects - a.projects)
    .slice(0, 8);

  return (
    <div
      style={{
        height: '100%',
        borderRadius: 20,
        background: 'linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%)',
        border: '1px solid #dbeafe',
        padding: 20,
        display: 'grid',
        gap: 12,
        alignContent: 'start',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
        Sem coordenadas suficientes para o mapa
      </div>

      <div style={{ color: '#64748b', fontSize: 13 }}>
        Exibindo os principais locais por volume enquanto faltam latitude e longitude válidas.
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((item, index) => (
          <div
            key={`${item.region}_${item.uf}_${item.city}_${index}`}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 700, color: '#0f172a' }}>
              {[item.city, item.uf, item.region].filter(Boolean).join(' • ')}
            </div>

            <div style={{ marginTop: 6, color: '#475569', fontSize: 13 }}>
              Projetos: {item.projects} | Planejado: {item.planned} | Realizado: {item.done} | Pendente:{' '}
              {item.pending}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InstallationHeatMap({
  data,
  fallbackRegions = [],
  height = 460,
  resizeKey,
}: Props) {
  const rows = useMemo(() => normalizeRows(data), [data]);

  const maxValue = useMemo(() => {
    return Math.max(...rows.map((item) => getIntensityValue(item)), 1);
  }, [rows]);

  const [filters, setFilters] = useState<Record<IntensityKey, boolean>>({
    baixa: true,
    media: true,
    alta: true,
    muitoAlta: true,
  });

  const counts = useMemo(() => {
    const initial: Record<IntensityKey, number> = {
      baixa: 0,
      media: 0,
      alta: 0,
      muitoAlta: 0,
    };

    rows.forEach((item) => {
      const value = getIntensityValue(item);
      const key = getIntensityKey(value, maxValue);
      initial[key] += 1;
    });

    return initial;
  }, [rows, maxValue]);

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      const value = getIntensityValue(item);
      const key = getIntensityKey(value, maxValue);
      return filters[key];
    });
  }, [rows, maxValue, filters]);

  const totalVisibleProjects = useMemo(() => {
    return filteredRows.reduce((acc, item) => acc + Number(item.projects || 0), 0);
  }, [filteredRows]);

  const totalVisiblePlanned = useMemo(() => {
    return filteredRows.reduce((acc, item) => acc + Number(item.planned || 0), 0);
  }, [filteredRows]);

  const totalVisibleDone = useMemo(() => {
    return filteredRows.reduce((acc, item) => acc + Number(item.done || 0), 0);
  }, [filteredRows]);

  const hasAnyFilterActive = useMemo(() => {
    return Object.values(filters).some(Boolean);
  }, [filters]);

  const toggleFilter = (key: IntensityKey) => {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = () => {
    setFilters({
      baixa: true,
      media: true,
      alta: true,
      muitoAlta: true,
    });
  };

  const handleClearAll = () => {
    setFilters({
      baixa: false,
      media: false,
      alta: false,
      muitoAlta: false,
    });
  };

  if (!rows.length) {
    return <FallbackPanel fallbackRegions={fallbackRegions} />;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid #dbeafe',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
        background: '#f8fafc',
      }}
    >
      <MapContainer
        center={[-14.235, -51.9253]}
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds rows={hasAnyFilterActive ? filteredRows : rows} />
        <InvalidateMapSize trigger={resizeKey} />

        {filteredRows.map((item, index) => {
          const intensity = getIntensityValue(item);
          const style = getMarkerStyle(intensity, maxValue);
          const label = INTENSITY_META[style.intensityKey].label;

          return (
            <CircleMarker
              key={`${item.lat}_${item.lng}_${index}`}
              center={[Number(item.lat), Number(item.lng)]}
              radius={style.radius}
              pathOptions={{
                color: style.color,
                weight: style.weight,
                fillColor: style.fillColor,
                fillOpacity: style.fillOpacity,
              }}
            >
              <Popup>
                <div style={{ minWidth: 245 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      color: '#0f172a',
                      marginBottom: 8,
                    }}
                  >
                    {[item.city, item.uf, item.region].filter(Boolean).join(' • ') || 'Local'}
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: `${style.fillColor}16`,
                      color: '#0f172a',
                      border: `1px solid ${style.fillColor}55`,
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: style.fillColor,
                        display: 'inline-block',
                      }}
                    />
                    {label}
                  </div>

                  <div style={{ fontSize: 13, color: '#334155', display: 'grid', gap: 5 }}>
                    <div>
                      <b>Projetos:</b> {item.projects}
                    </div>
                    <div>
                      <b>Planejado:</b> {item.planned}
                    </div>
                    <div>
                      <b>Realizado:</b> {item.done}
                    </div>
                    <div>
                      <b>Pendente:</b> {item.pending}
                    </div>
                    <div>
                      <b>Atrasados:</b> {item.delayedProjects}
                    </div>
                    <div>
                      <b>Heat:</b> {item.heat}
                    </div>
                  </div>

                  {item.clients?.length ? (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                      <b>Clientes:</b> {item.clients.slice(0, 4).join(', ')}
                      {item.clients.length > 4 ? '...' : ''}
                    </div>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <Legend
        filters={filters}
        counts={counts}
        visibleCount={filteredRows.length}
        totalCount={rows.length}
        onToggle={toggleFilter}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
      />

      {!hasAnyFilterActive ? <EmptyFilterNotice /> : null}

      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
          zIndex: 500,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          maxWidth: 'calc(100% - 280px)',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '10px 12px',
            boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Pontos visíveis</div>
          <div style={{ fontSize: 18, color: '#0f172a', fontWeight: 800 }}>{filteredRows.length}</div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '10px 12px',
            boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Projetos</div>
          <div style={{ fontSize: 18, color: '#0f172a', fontWeight: 800 }}>{totalVisibleProjects}</div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '10px 12px',
            boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Planejado</div>
          <div style={{ fontSize: 18, color: '#0f172a', fontWeight: 800 }}>{totalVisiblePlanned}</div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '10px 12px',
            boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Realizado</div>
          <div style={{ fontSize: 18, color: '#0f172a', fontWeight: 800 }}>{totalVisibleDone}</div>
        </div>
      </div>
    </div>
  );
}