import {
  Modal,
  Form,
  Input,
  Row,
  Col,
  Button,
  message,
  Space,
} from 'antd';
import { SearchOutlined, AimOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
  project: any;
  onUpdated?: () => void;
};

export default function ProjectLocationModal({
  open,
  onClose,
  project,
  onUpdated,
}: Props) {
  const [form] = Form.useForm();
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==============================
  // Preencher dados ao abrir
  // ==============================
  useEffect(() => {
    if (project && open) {
      form.setFieldsValue({
        endereco:
          project.locationText ||
          project.requestedLocationText ||
          '',
        cidade: project.city || project.requestedCity || '',
        uf: project.uf || project.requestedState || '',
        cep: project.cep || project.requestedCep || '',
        lat: project.lat || project.requestedLat || '',
        lng: project.lng || project.requestedLng || '',
      });
    }
  }, [project, open, form]);

  // ==============================
  // Buscar CEP (ViaCEP)
  // ==============================
  
    const handleBuscarCep = async () => {
    const cepRaw = form.getFieldValue('cep');
    const cep = String(cepRaw || '').replace(/\D/g, '');

    if (cep.length !== 8) {
        message.warning('Informe um CEP válido');
        return;
    }

    try {
        setLoadingCep(true);

        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();

        if (data?.erro) {
        message.warning('CEP não encontrado');
        return;
        }

        const endereco = [data.logradouro, data.bairro].filter(Boolean).join(', ');

        form.setFieldsValue({
        endereco,
        cidade: data.localidade || '',
        uf: data.uf || '',
        cep: data.cep || cepRaw,
        });

        // buscar latitude/longitude automaticamente depois do CEP
        const enderecoCompleto = [
        endereco,
        data.localidade,
        data.uf,
        data.cep,
        'Brasil',
        ]
        .filter(Boolean)
        .join(', ');

        const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(
            enderecoCompleto
        )}`
        );

        const geoData = await geoRes.json();

        if (Array.isArray(geoData) && geoData.length > 0) {
        form.setFieldsValue({
            lat: geoData[0].lat,
            lng: geoData[0].lon,
        });

        message.success('Endereço e coordenadas preenchidos pelo CEP');
        } else {
        message.warning('Endereço preenchido, mas coordenadas não encontradas');
        }
    } catch (err) {
        message.error('Erro ao buscar CEP');
    } finally {
        setLoadingCep(false);
    }
    };

  // ==============================
  // Buscar coordenadas (OpenStreetMap)
  // ==============================

    const handleBuscarCoordenadas = async () => {
    const values = form.getFieldsValue();

    const enderecoCompleto = [
        values.endereco,
        values.cidade,
        values.uf,
        values.cep,
        'Brasil',
    ]
        .filter(Boolean)
        .join(', ');

    if (!values.endereco && !values.cidade && !values.cep) {
        message.warning('Preencha endereço, cidade ou CEP para buscar coordenadas');
        return;
    }

    try {
        setLoadingCoords(true);

        const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(
            enderecoCompleto
        )}`
        );

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
        message.warning('Coordenadas não encontradas');
        return;
        }

        const item = data[0];
        const address = item.address || {};

        const displayParts = String(item.display_name || '')
        .split(',')
        .map((p) => p.trim());

        const cidade =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        displayParts.find((p) =>
            ['São Bernardo do Campo', 'Santo André', 'São Paulo'].includes(p)
        ) ||
        values.cidade ||
        '';

        const uf =
        address.state_code ||
        (address.state === 'São Paulo' ? 'SP' : '') ||
        values.uf ||
        '';

        const cep =
        address.postcode ||
        displayParts.find((p) => /^\d{5}-?\d{3}$/.test(p)) ||
        values.cep ||
        '';

        form.setFieldsValue({
        lat: item.lat,
        lng: item.lon,
        cidade,
        uf,
        cep,
        });

        message.success('Coordenadas e endereço preenchidos automaticamente');
    } catch (err) {
        message.error('Erro ao buscar coordenadas');
    } finally {
        setLoadingCoords(false);
    }
    };

  // ==============================
  // Salvar
  // ==============================
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      setSaving(true);

      await api.patch(
        `/installation-projects/${project.projectId}`,
        {
          requestedLocationText: values.endereco,
          requestedCity: values.cidade,
          requestedState: values.uf,
          requestedCep: values.cep,
          requestedLat: values.lat,
          requestedLng: values.lng,
        }
      );

      message.success('Localização atualizada');

      if (onUpdated) await onUpdated();

      // NÃO FECHA O MODAL 👇
    } catch (err) {
      message.error('Erro ao salvar localização');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Editar localização do projeto"
      open={open}
      onCancel={onClose}
      footer={null}
      width={650}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {/* ENDEREÇO + BOTÃO COORDENADAS */}
        <Row gutter={12}>
          <Col xs={24} md={16}>
            <Form.Item label="Endereço" name="endereco">
              <Input placeholder="Rua, bairro..." />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label=" " colon={false}>
              <Button
                block
                icon={<AimOutlined />}
                loading={loadingCoords}
                onClick={handleBuscarCoordenadas}
              >
                Buscar coordenadas
              </Button>
            </Form.Item>
          </Col>
        </Row>

        {/* CIDADE / UF */}
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="Cidade" name="cidade">
              <Input placeholder="Cidade" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="UF" name="uf">
              <Input maxLength={2} placeholder="SP" />
            </Form.Item>
          </Col>
        </Row>

        {/* CEP */}
        <Row gutter={12}>
          <Col xs={24} md={16}>
            <Form.Item label="CEP" name="cep">
              <Input
                placeholder="00000-000"
                onPressEnter={handleBuscarCep}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label=" " colon={false}>
              <Button
                block
                icon={<SearchOutlined />}
                loading={loadingCep}
                onClick={handleBuscarCep}
              >
                Buscar CEP
              </Button>
            </Form.Item>
          </Col>
        </Row>

        {/* LAT / LNG */}
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="Latitude" name="lat">
              <Input placeholder="-23.550520" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Longitude" name="lng">
              <Input placeholder="-46.633308" />
            </Form.Item>
          </Col>
        </Row>

        {/* BOTÕES */}
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Fechar</Button>

          <Button type="primary" loading={saving} onClick={handleSave}>
            Salvar
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}