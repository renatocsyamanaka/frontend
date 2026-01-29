import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button, Card, Form, Input, Modal, Space, Table, message, InputNumber, Tag, List, Select
} from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, AimOutlined } from '@ant-design/icons';

type Location = {
  id: number;
  name: string;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  uf?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type GeoItem = {
  label: string;
  lat: number;
  lng: number;
  city?: string | null;
  state?: string | null;
  uf?: string | null;
  raw?: any;
};

/* === Regiões e mapeamento UF -> Região === */
const REGION_OPTS = [
  { value: 'Norte', label: 'Norte' },
  { value: 'Nordeste', label: 'Nordeste' },
  { value: 'Centro-Oeste', label: 'Centro-Oeste' },
  { value: 'Sudeste', label: 'Sudeste' },
  { value: 'Sul', label: 'Sul' },
] as const;

const UF_TO_REGION: Record<string, (typeof REGION_OPTS)[number]['value']> = {
  // Norte
  AC: 'Norte', AP: 'Norte', AM: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  // Nordeste
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste',
  PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  // Centro-Oeste
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
  // Sudeste
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  // Sul
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
};

function regionFromUF(uf?: string | null) {
  if (!uf) return undefined;
  return UF_TO_REGION[uf.toUpperCase()];
}

/* === helpers geocode === */
function extractCity(addr: any): string | undefined {
  return (
    addr?.city ||
    addr?.town ||
    addr?.village ||
    addr?.municipality ||
    addr?.county ||
    undefined
  );
}

function extractUF(addr: any): string | undefined {
  const code = addr?.state_code as string | undefined;
  if (code && /^[A-Z]{2}$/.test(code)) return code;
  const isoKey = Object.keys(addr || {}).find(k => String(k).startsWith('ISO3166-2-'));
  const isoVal = isoKey ? (addr as any)[isoKey] : undefined;
  if (typeof isoVal === 'string' && isoVal.includes('-')) {
    const maybeUF = isoVal.split('-').pop();
    if (maybeUF && maybeUF.length <= 3) return maybeUF.toUpperCase();
  }
  return undefined;
}

export default function LocationsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => (await api.get('/locations')).data,
  });

  // criar
  const [openNew, setOpenNew] = useState(false);
  const [formNew] = Form.useForm();

  const createLoc = useMutation({
    mutationFn: async (payload: any) => (await api.post('/locations', payload)).data,
    onSuccess: async () => {
      message.success('Local criado');
      setOpenNew(false);
      formNew.resetFields();
      qc.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Erro ao criar local'),
  });

  // editar
  const [editing, setEditing] = useState<Location | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [formEdit] = Form.useForm();

  const updateLoc = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) =>
      (await api.patch(`/locations/${id}`, payload)).data,
    onSuccess: async () => {
      message.success('Local atualizado');
      setOpenEdit(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Erro ao atualizar local'),
  });

  // geocode (modal)
  const [geoOpen, setGeoOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoResults, setGeoResults] = useState<GeoItem[]>([]);
  const [geoForForm, setGeoForForm] = useState<'new' | 'edit'>('new');
  const [geoQuery, setGeoQuery] = useState('');

  const searchGeo = async () => {
    if (!geoQuery.trim()) return;
    setGeoLoading(true);
    try {
      const items = (await api.get('/geocode', { params: { q: geoQuery } })).data as any[];
      const mapped: GeoItem[] = (items || []).map((d: any) => {
        const addr = d.raw?.address || {};
        const uf = extractUF(addr) || null;
        return {
          label: d.label,
          lat: Number(d.lat),
          lng: Number(d.lng),
          city: extractCity(addr) || null,
          state: (addr?.state as string) || null,
          uf,
          raw: d.raw,
        };
      });
      setGeoResults(mapped);
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Falha na busca geográfica');
    } finally {
      setGeoLoading(false);
    }
  };

  const applyGeo = (it: GeoItem) => {
    const nextArea = regionFromUF(it.uf) || undefined;
    const patch = {
      city: it.city || undefined,
      state: it.state || undefined,
      uf: it.uf || undefined,
      lat: it.lat,
      lng: it.lng,
      area: nextArea,
    };
    if (geoForForm === 'new') formNew.setFieldsValue(patch);
    else formEdit.setFieldsValue(patch);
    setGeoOpen(false);
  };

  const columns = useMemo(
    () => [
      { title: 'Nome', dataIndex: 'name' },
      { title: 'Área', dataIndex: 'area' },
      { title: 'Cidade', dataIndex: 'city' },
      { title: 'UF', dataIndex: 'uf' },
      {
        title: 'Coordenadas',
        render: (_: any, r: Location) =>
          r.lat != null && r.lng != null ? (
            <Tag color="green">{r.lat}, {r.lng}</Tag>
          ) : (
            <Tag>—</Tag>
          ),
      },
      {
        title: 'Ações',
        render: (_: any, r: Location) => (
          <Space>
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setEditing(r);
                formEdit.setFieldsValue(r);
                setOpenEdit(true);
              }}
            >
              Editar
            </Button>
          </Space>
        ),
      },
    ],
    [formEdit]
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Locais</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenNew(true)}>
          Novo
        </Button>
      </div>

      <Card>
        <Table rowKey="id" loading={isLoading} dataSource={data} columns={columns as any} />
      </Card>

      {/* Novo */}
      <Modal
        title="Novo local"
        open={openNew}
        onCancel={() => setOpenNew(false)}
        onOk={() => formNew.submit()}
        destroyOnClose
      >
        <Form
          layout="vertical"
          form={formNew}
          onValuesChange={(changed) => {
            if (changed.uf) {
              const uf = String(changed.uf).toUpperCase();
              const area = regionFromUF(uf);
              formNew.setFieldsValue({ uf, area });
            }
          }}
          onFinish={(v) => {
            const payload = { ...v, uf: v.uf ? String(v.uf).toUpperCase() : undefined };
            createLoc.mutate(payload);
          }}
        >
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>

          {/* Área como Select com regiões */}
          <Form.Item name="area" label="Área">
            <Select
              allowClear
              placeholder="Selecione a região"
              options={REGION_OPTS as any}
            />
          </Form.Item>

          <Form.Item name="city" label="Cidade"><Input /></Form.Item>
          <Form.Item name="state" label="Estado"><Input /></Form.Item>
          <Form.Item name="uf" label="UF"><Input maxLength={2} /></Form.Item>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Form.Item name="lat" label="Latitude" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-22.90" />
            </Form.Item>
            <Form.Item name="lng" label="Longitude" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-43.17" />
            </Form.Item>
            <Button
              icon={<SearchOutlined />}
              onClick={() => { setGeoForForm('new'); setGeoOpen(true); setGeoResults([]); setGeoQuery(''); }}
            >
              Buscar
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Editar */}
      <Modal
        title={`Editar: ${editing?.name || ''}`}
        open={openEdit}
        onCancel={() => { setOpenEdit(false); setEditing(null); }}
        onOk={() => formEdit.submit()}
        destroyOnClose
      >
        <Form
          layout="vertical"
          form={formEdit}
          onValuesChange={(changed) => {
            if (changed.uf) {
              const uf = String(changed.uf).toUpperCase();
              const area = regionFromUF(uf);
              formEdit.setFieldsValue({ uf, area });
            }
          }}
          onFinish={(v) => {
            const payload = { ...v, uf: v.uf ? String(v.uf).toUpperCase() : undefined };
            updateLoc.mutate({ id: editing!.id, payload });
          }}
        >
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>

          {/* Área como Select com regiões */}
          <Form.Item name="area" label="Área">
            <Select
              allowClear
              placeholder="Selecione a região"
              options={REGION_OPTS as any}
            />
          </Form.Item>

          <Form.Item name="city" label="Cidade"><Input /></Form.Item>
          <Form.Item name="state" label="Estado"><Input /></Form.Item>
          <Form.Item name="uf" label="UF"><Input maxLength={2} /></Form.Item>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Form.Item name="lat" label="Latitude" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} step={0.000001} />
            </Form.Item>
            <Form.Item name="lng" label="Longitude" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} step={0.000001} />
            </Form.Item>
            <Button
              icon={<AimOutlined />}
              onClick={() => { setGeoForForm('edit'); setGeoOpen(true); setGeoResults([]); setGeoQuery(''); }}
            >
              Buscar
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal de busca geográfica */}
      <Modal
        title="Buscar coordenadas (Nominatim)"
        open={geoOpen}
        onCancel={() => setGeoOpen(false)}
        onOk={() => setGeoOpen(false)}
        okButtonProps={{ style: { display: 'none' } }}
      >
        <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
          <Input
            placeholder="Ex.: Rio de Janeiro"
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
          locale={{ emptyText: 'Nenhum resultado' }}
          dataSource={geoResults}
          renderItem={(item: GeoItem) => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => applyGeo(item)}>Usar</Button>
              ]}
            >
              <List.Item.Meta
                title={item.label}
                description={
                  <>
                    <div><b>lat/lng:</b> {item.lat}, {item.lng}</div>
                    <div><b>cidade:</b> {item.city || '—'} • <b>UF:</b> {item.uf || '—'} • <b>estado:</b> {item.state || '—'}</div>
                    {regionFromUF(item.uf) && <div><b>região sugerida:</b> {regionFromUF(item.uf)}</div>}
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
