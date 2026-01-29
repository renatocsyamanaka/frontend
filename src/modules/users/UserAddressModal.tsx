import { Modal, Form, Input, Switch, message, Button, Space, List, Typography, InputNumber, Divider } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

const { Text } = Typography;

type UserAddress = {
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  autoGeocode?: boolean;

  lat?: number | null;
  lng?: number | null;
};

type GeoItem = {
  label?: string;
  street?: string;
  district?: string;
  city?: string;
  uf?: string;
  state?: string;
  zip?: string;
  postcode?: string;
  country?: string;
  lat?: number;
  lng?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  userId: number;
  initial?: Partial<UserAddress>;
};

export default function UserAddressModal({ open, onClose, userId, initial }: Props) {
  const [form] = Form.useForm<UserAddress>();
  const [loading, setLoading] = useState(false);

  // busca endereço (geocode)
  const [q, setQ] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [results, setResults] = useState<GeoItem[]>([]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        autoGeocode: true,
        addressCountry: 'Brasil',
        lat: null,
        lng: null,
        ...(initial || {}),
      });
      setQ('');
      setResults([]);
    }
  }, [open, initial, form]);

  const canSearch = useMemo(() => q.trim().length >= 3, [q]);

  const searchGeo = async () => {
    const query = q.trim();
    if (!query) return;

    setGeoLoading(true);
    try {
      const items = (await api.get('/geocode', { params: { q: query } })).data as GeoItem[];
      setResults(Array.isArray(items) ? items : []);
      if (!items || items.length === 0) message.info('Nenhum resultado encontrado.');
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Falha ao buscar endereço');
      setResults([]);
    } finally {
      setGeoLoading(false);
    }
  };

  const applyGeo = (it: GeoItem) => {
    // tenta mapear o máximo possível, sem quebrar caso algo não venha
    const patch: Partial<UserAddress> = {
      addressStreet: it.street ?? undefined,
      addressDistrict: it.district ?? undefined,
      addressCity: it.city ?? undefined,
      addressState: (it.uf ?? it.state) ?? undefined,
      addressZip: (it.zip ?? it.postcode) ?? undefined,
      addressCountry: it.country ?? undefined,
      lat: typeof it.lat === 'number' ? it.lat : null,
      lng: typeof it.lng === 'number' ? it.lng : null,
    };

    // mantém o que usuário já digitou (ex: número/complemento) e só sobrescreve os que vieram
    form.setFieldsValue(patch);
    message.success('Endereço aplicado nos campos');
  };

  return (
    <Modal
      open={open}
      title="Endereço do técnico"
      okText="Salvar"
      onCancel={onClose}
      confirmLoading={loading}
      onOk={async () => {
        const values = await form.validateFields();

        // normaliza lat/lng
        const payload: UserAddress = {
          ...values,
          lat: values.lat === undefined || values.lat === null ? null : Number(values.lat),
          lng: values.lng === undefined || values.lng === null ? null : Number(values.lng),
        };

        setLoading(true);
        try {
          await api.patch(`/users/${userId}/address`, payload);
          message.success('Endereço atualizado');
          onClose();
        } catch (e: any) {
          message.error(e?.response?.data?.error || 'Falha ao salvar endereço');
        } finally {
          setLoading(false);
        }
      }}
      destroyOnHidden
      width={900}
    >
      {/* ===== Busca (igual ao anterior) ===== */}
      <Text type="secondary">
        Digite um endereço (rua + cidade/UF) e selecione um resultado para preencher automaticamente.
      </Text>

      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex.: Rua XV de Novembro, Curitiba"
          onPressEnter={searchGeo}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          loading={geoLoading}
          disabled={!canSearch}
          onClick={searchGeo}
        >
          Buscar
        </Button>
      </Space.Compact>

      <div style={{ marginTop: 10 }}>
        <List
          bordered
          size="small"
          loading={geoLoading}
          dataSource={results}
          locale={{ emptyText: 'Nenhum resultado' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => applyGeo(item)}>
                  Usar
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={item.label || 'Endereço'}
                description={
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div>
                      <b>lat/lng:</b> {item.lat ?? '—'}, {item.lng ?? '—'}
                    </div>
                    <div>
                      <b>cidade/UF:</b> {item.city || '—'} / {(item.uf || item.state) || '—'} •{' '}
                      <b>CEP:</b> {(item.zip || item.postcode) || '—'}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* ===== Form do endereço ===== */}
      <Form form={form} layout="vertical">
        <Form.Item name="addressStreet" label="Logradouro" rules={[{ required: true }]}>
          <Input placeholder="Rua/Avenida" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12 }}>
          <Form.Item name="addressNumber" label="Número">
            <Input />
          </Form.Item>
          <Form.Item name="addressComplement" label="Complemento">
            <Input />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: 12 }}>
          <Form.Item name="addressDistrict" label="Bairro">
            <Input />
          </Form.Item>
          <Form.Item name="addressCity" label="Cidade" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="addressState" label="UF" rules={[{ required: true }]}>
            <Input placeholder="SP, RJ..." />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12 }}>
          <Form.Item name="addressZip" label="CEP">
            <Input />
          </Form.Item>
          <Form.Item name="addressCountry" label="País">
            <Input />
          </Form.Item>
        </div>

        {/* lat/lng */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="lat" label="Latitude">
            <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-22.90" />
          </Form.Item>
          <Form.Item name="lng" label="Longitude">
            <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-43.17" />
          </Form.Item>
        </div>

        <Form.Item name="autoGeocode" label="Geocodificar automaticamente?" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
