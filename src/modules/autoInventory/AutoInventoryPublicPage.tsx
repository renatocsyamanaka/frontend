import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

const { Title, Text } = Typography;

type PublicItem = {
  id: number;
  itemId: number;
  quantidade: number | null;
  item: {
    id: number;
    codigo: string;
    nome: string;
    hasSerialNumber?: boolean;
    serialNumberRequired?: boolean;
    has_serial_number?: boolean;
    serial_number_required?: boolean;
    controlaSeriais?: boolean;
    seriaisObrigatorios?: boolean;
  };
  serials?: { id?: number; serialNumber: string }[];
};

function itemHasSerial(item: PublicItem['item']) {
  return (
    !!item?.hasSerialNumber ||
    !!item?.has_serial_number ||
    !!item?.controlaSeriais
  );
}

function itemSerialRequired(item: PublicItem['item']) {
  return (
    !!item?.serialNumberRequired ||
    !!item?.serial_number_required ||
    !!item?.seriaisObrigatorios
  );
}

export default function AutoInventoryPublicPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState<any>(null);
  const [form] = Form.useForm();

  const items: PublicItem[] = useMemo(
    () => inventory?.items || [],
    [inventory]
  );

  const totalItems = items.length;
  const filledItems = Form.useWatch([], form)
    ? items.filter((row) => {
        const value = form.getFieldValue(`quantidade_${row.itemId}`);
        return value !== null && value !== undefined && value !== '';
      }).length
    : items.filter(
        (row) => row.quantidade !== null && row.quantidade !== undefined
      ).length;

  const progressPercent = totalItems
    ? Math.round((filledItems / totalItems) * 100)
    : 0;

  async function loadInventory() {
    try {
      setLoading(true);

      const res = await api.get(`/auto-inventory/public/${token}`);
      setInventory(res.data);

      const values: any = {};

      (res.data?.items || []).forEach((row: PublicItem) => {
        values[`quantidade_${row.itemId}`] = row.quantidade;

        values[`serials_${row.itemId}`] = (row.serials || [])
          .map((serial) => serial.serialNumber)
          .join('\n');
      });

      form.setFieldsValue(values);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao abrir inventário.'
      );
    } finally {
      setLoading(false);
    }
  }

  function parseSerials(value: any) {
    return String(value || '')
      .split(/[\n,;]+/g)
      .map((serial) => serial.replace(/\D/g, '').trim())
      .filter(Boolean);
  }

  function buildPayload(values: any, finalizar: boolean) {
    const payloadItems = items.map((row) => ({
      itemId: row.itemId,
      quantidade: values[`quantidade_${row.itemId}`],
      serials: parseSerials(values[`serials_${row.itemId}`]),
    }));

    return {
      finalizar,
      items: payloadItems,
    };
  }

  function validateSerialsBeforeSubmit(values: any) {
    items.forEach((row) => {
      const item = row.item || {};
      const hasSerial = itemHasSerial(item);
      const required = itemSerialRequired(item);
      const quantidade = Number(values[`quantidade_${row.itemId}`] || 0);
      const serials = parseSerials(values[`serials_${row.itemId}`]);

      if (hasSerial && required && quantidade > 0 && serials.length !== quantidade) {
        const diferenca = quantidade - serials.length;

        if (diferenca > 0) {
          message.warning(
            `${item.nome}: falta(m) ${diferenca} número(s) de série.`
          );
        } else {
          message.warning(
            `${item.nome}: há ${Math.abs(diferenca)} número(s) de série a mais.`
          );
        }
      }
    });
  }

  async function save(finalizar = false) {
    try {
      const values = await form.validateFields();

      if (finalizar) {
        validateSerialsBeforeSubmit(values);
      }

      setSaving(true);

      await api.put(
        `/auto-inventory/public/${token}`,
        buildPayload(values, finalizar)
      );

      message.success(
        finalizar
          ? 'Inventário enviado com sucesso.'
          : 'Inventário salvo com sucesso.'
      );

      await loadInventory();
    } catch (err: any) {
      if (err?.errorFields) return;

      message.error(
        err?.response?.data?.error || 'Erro ao salvar inventário.'
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmSendInventory() {
    Modal.confirm({
      title: 'Confirmar envio do inventário?',
      content:
        'Ao confirmar, o inventário será enviado e essa ação não poderá ser desfeita. Caso ainda queira editar depois, clique em "Salvar parcial" em vez de enviar.',
      okText: 'Confirmar envio',
      cancelText: 'Cancelar',
      onOk: () => save(true),
    });
  }

  useEffect(() => {
    loadInventory();
  }, [token]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: 20,
      }}
    >
      <Card
        loading={loading}
        styles={{ body: { padding: 0 } }}
        style={{
          maxWidth: 1328,
          margin: '0 auto',
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            background: '#002b4f',
            padding: '36px 40px',
            color: '#fff',
          }}
        >
          <Row gutter={[24, 24]} align="middle" justify="space-between">
            <Col xs={24} lg={16}>
              <Space align="center" size={24} wrap>
                      <img
                        src="/logo_branca.png"
                        alt="Omnilink"
                        onError={(e) => {
                          e.currentTarget.src = '/logo_branca.png';
                        }}
                        style={{
                          width: 150,
                          maxHeight: 70,
                          objectFit: 'contain',
                        }}
                      />

                <div>
                  <Title level={2} style={{ color: '#fff', margin: 0 }}>
                    Auto Inventário
                  </Title>

                  <Space size={8} wrap style={{ marginTop: 8 }}>
                    <Text style={{ color: '#fff' }}>
                      Prestador: {inventory?.provider?.name || '-'}
                    </Text>

                    {inventory?.cycle && (
                      <Tag color="blue">
                        Referência: {String(inventory.cycle.month).padStart(2, '0')}/
                        {inventory.cycle.year}
                      </Tag>
                    )}

                    <Tag color={inventory?.status === 'COMPLETO' ? 'green' : 'blue'}>
                      {inventory?.status === 'COMPLETO'
                        ? 'Enviado'
                        : 'Em preenchimento'}
                    </Tag>
                  </Space>
                </div>
              </Space>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                bordered={false}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 22,
                  color: '#fff',
                }}
              >
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text strong style={{ color: '#fff' }}>
                      Itens preenchidos
                    </Text>
                    <Text strong style={{ color: '#fff' }}>
                      {filledItems}/{totalItems}
                    </Text>
                  </Row>

                  <Progress
                    percent={progressPercent}
                    showInfo
                    strokeColor="#52c41a"
                    trailColor="rgba(255,255,255,0.2)"
                  />

                  <Row justify="space-between">
                    <Text style={{ color: '#fff' }}>Total de peças</Text>
                    <Text style={{ color: '#fff' }}>{totalItems}</Text>
                  </Row>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>

        <div style={{ padding: 36 }}>
          <Space direction="vertical" size={26} style={{ width: '100%' }}>
            {inventory?.status === 'COMPLETO' && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="Inventário enviado"
                description="Você ainda pode revisar, mas o inventário já foi enviado."
              />
            )}

            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message="Preencha o inventário"
              description="Você pode salvar parcialmente e retornar depois utilizando este mesmo link. Ao enviar, o inventário será finalizado."
              style={{ borderRadius: 14 }}
            />

            <Form form={form} layout="vertical">
              <div
                style={{
                  border: '1px solid #eef2f7',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <Row
                  style={{
                    background: '#fafafa',
                    borderBottom: '1px solid #eef2f7',
                    padding: '14px 18px',
                    fontWeight: 700,
                  }}
                  align="middle"
                >
                  <Col xs={24} md={4}>Código</Col>
                  <Col xs={24} md={10}>Peça</Col>
                  <Col xs={24} md={4}>Quantidade</Col>
                  <Col xs={24} md={6}>Número de série</Col>
                </Row>

                {items.map((row) => {
                  const item = row.item || {};
                  const hasSerial = itemHasSerial(item);
                  const required = itemSerialRequired(item);

                  return (
                    <Row
                      key={row.id}
                      gutter={[14, 10]}
                      align="top"
                      style={{
                        padding: '18px',
                        borderBottom: '1px solid #eef2f7',
                      }}
                    >
                      <Col xs={24} md={4}>
                        <Space direction="vertical" size={4}>
                          <Tag color="blue">{item.codigo}</Tag>
                          <Tag>Produto</Tag>
                        </Space>
                      </Col>

                      <Col xs={24} md={10}>
                        <Space direction="vertical" size={6}>
                          <Text strong>{item.nome}</Text>
                          {hasSerial ? (
                            required ? (
                              <Tag color="red">Serial obrigatório</Tag>
                            ) : (
                              <Tag color="blue">Controla serial</Tag>
                            )
                          ) : (
                            <Tag>Sem serial</Tag>
                          )}
                        </Space>
                      </Col>

                      <Col xs={24} md={4}>
                        <Form.Item
                          name={`quantidade_${row.itemId}`}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={0}
                            placeholder="Qtd"
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={6}>
                        {hasSerial ? (
                          <Form.Item
                            name={`serials_${row.itemId}`}
                            extra={
                              required
                                ? 'Informe os seriais. Aceita um por linha ou separados por vírgula.'
                                : 'Opcional. Aceita um por linha ou separados por vírgula.'
                            }
                            style={{ marginBottom: 0 }}
                          >
                            <Input.TextArea
                              rows={3}
                              placeholder="Ex:\n123456\n123457"
                              onKeyDown={(e) => {
                                const allowed = [
                                  'Backspace',
                                  'Delete',
                                  'ArrowLeft',
                                  'ArrowRight',
                                  'ArrowUp',
                                  'ArrowDown',
                                  'Tab',
                                  'Enter',
                                  ',',
                                  ';',
                                  ' ',
                                ];

                                if (!/[0-9]/.test(e.key) && !allowed.includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              onPaste={(e) => {
                                const text = e.clipboardData.getData('text');

                                if (!/^[0-9,\n\r; ]*$/.test(text)) {
                                  e.preventDefault();
                                  message.warning('Número de série aceita apenas números.');
                                }
                              }}
                            />
                          </Form.Item>
                        ) : (
                          <Text type="secondary">Não se aplica</Text>
                        )}
                      </Col>
                    </Row>
                  );
                })}
              </div>
            </Form>

            <Row justify="space-between" gutter={[16, 16]} align="middle">
              <Col xs={24} md={14}>

                      <Tag color="blue">
                  As informações enviadas serão utilizadas pela equipe de Logistica
                  para controle de estoque e acompanhamento mensal.
                </Tag>
              </Col>

              <Col xs={24} md={10}>
                <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
                  <Button
                    icon={<SaveOutlined />}
                    onClick={() => save(false)}
                    loading={saving}
                  >
                    Salvar parcial
                  </Button>

                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={saving}
                    onClick={confirmSendInventory}
                  >
                    Enviar inventário
                  </Button>
                </Space>
              </Col>
            </Row>
          </Space>
        </div>
      </Card>
    </div>
  );
}
