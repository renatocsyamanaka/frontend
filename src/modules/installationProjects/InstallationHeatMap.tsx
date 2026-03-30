import React, { useEffect, useMemo } from 'react';
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

function getMarkerStyle(value: number, maxValue: number) {
  const ratio = maxValue > 0 ? value / maxValue : 0;

  if (ratio >= 0.75) {
    return {
      radius: 18,
      fillColor: '#ef4444',
      color: '#ffffff',
      fillOpacity: 0.72,
      weight: 2,
    };
  }

  if (ratio >= 0.5) {
    return {
      radius: 14,
      fillColor: '#f97316',
      color: '#ffffff',
      fillOpacity: 0.7,
      weight: 2,
    };
  }

  if (ratio >= 0.25) {
    return {
      radius: 10,
      fillColor: '#fde047',
      color: '#ffffff',
      fillOpacity: 0.68,
      weight: 2,
    };
  }

  if (ratio > 0) {
    return {
      radius: 7,
      fillColor: '#22c55e',
      color: '#ffffff',
      fillOpacity: 0.65,
      weight: 2,
    };
  }

  return {
    radius: 6,
    fillColor: '#3b82f6',
    color: '#ffffff',
    fillOpacity: 0.65,
    weight: 2,
  };
}

function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        top: 16,
        zIndex: 500,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        boxShadow: '0 12px 28px rgba(15,23,42,0.16)',
        padding: 14,
        minWidth: 180,
      }}
    >
      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Intensidade</div>

      <div style={{ display: 'grid', gap: 8, fontSize: 12, color: '#334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#22c55e',
              display: 'inline-block',
            }}
          />
          Baixa
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#fde047',
              display: 'inline-block',
            }}
          />
          Média
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#f97316',
              display: 'inline-block',
            }}
          />
          Alta
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#ef4444',
              display: 'inline-block',
            }}
          />
          Muito alta
        </div>
      </div>
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

        <FitBounds rows={rows} />
        <InvalidateMapSize trigger={resizeKey} />

        {rows.map((item, index) => {
          const intensity = getIntensityValue(item);
          const style = getMarkerStyle(intensity, maxValue);

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
                <div style={{ minWidth: 220 }}>
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

                  <div style={{ fontSize: 13, color: '#334155', display: 'grid', gap: 4 }}>
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
                    <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                      <b>Clientes:</b> {item.clients.slice(0, 3).join(', ')}
                      {item.clients.length > 3 ? '...' : ''}
                    </div>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <Legend />
    </div>
  );
}