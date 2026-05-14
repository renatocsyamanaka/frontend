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
  Row,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
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
    hasSerialNumber: boolean;
    serialNumberRequired: boolean;
  };
  serials?: { id?: number; serialNumber: string }[];
};

export default function AutoInventoryPublicPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState<any>(null);
  const [form] = Form.useForm();

  const items = useMemo(() => inventory?.items || [], [inventory]);

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
      .map((serial) => serial.trim())
      .filter(Boolean);
  }

  function buildPayload(values: any, finalizar: boolean) {
    const payloadItems = (inventory?.items || []).map((row: PublicItem) => ({
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
    for (const row of items) {
      const item = row.item || {};

      const quantidade = Number(values[`quantidade_${row.itemId}`] || 0);

      const serials = parseSerials(values[`serials_${row.itemId}`]);

      if (
        item.hasSerialNumber &&
        item.serialNumberRequired &&
        quantidade > 0 &&
        serials.length !== quantidade
      ) {
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
    }
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
        style={{
          maxWidth: 980,
          margin: '0 auto',
          borderRadius: 18,
        }}
      >
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              Auto Inventário
            </Title>

            <Text type="secondary">
              {inventory?.provider?.name || '-'}
            </Text>
          </div>

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
            message="Preencha o inventário"
            description="Você pode salvar parcialmente e retornar depois utilizando este mesmo link."
          />

          <Form form={form} layout="vertical">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {items.map((row: PublicItem) => {
                const item = row.item || {};
                const hasSerial = !!item.hasSerialNumber;
                const required = !!item.serialNumberRequired;

                return (
                  <Card
                    key={row.id}
                    size="small"
                    style={{ borderRadius: 14 }}
                  >
                    <Row gutter={[14, 10]} align="top">
                      <Col xs={24} md={10}>
                        <b>{item.nome}</b>
                        <br />

                        <Text type="secondary">{item.codigo}</Text>
                        <br />

                        {hasSerial ? (
                          required ? (
                            <Tag color="red">Serial obrigatório</Tag>
                          ) : (
                            <Tag color="blue">Controla serial</Tag>
                          )
                        ) : (
                          <Tag>Sem serial</Tag>
                        )}
                      </Col>

                      <Col xs={24} md={4}>
                        <Form.Item
                          label="Quantidade"
                          name={`quantidade_${row.itemId}`}
                        >
                          <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>

                      {hasSerial && (
                        <Col xs={24} md={10}>
                          <Form.Item
                            label={
                              required
                                ? 'Números de série obrigatórios'
                                : 'Números de série opcionais'
                            }
                            name={`serials_${row.itemId}`}
                            extra="Informe um serial por linha, ou separe por vírgula."
                          >
                            <Input.TextArea
                              rows={3}
                              placeholder={'Ex:\n123456\n123457'}
                              onKeyDown={(e) => {
                                const allowed = [
                                  'Backspace',
                                  'Delete',
                                  'ArrowLeft',
                                  'ArrowRight',
                                  'ArrowUp',
                                  'ArrowDown',
                                  'Tab',
                                  'Enter'
                                ];

                                if (
                                  !/[0-9]/.test(e.key) &&
                                  !allowed.includes(e.key)
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              onPaste={(e) => {
                                const text = e.clipboardData.getData('text');

                                // aceita apenas números, quebra de linha e vírgula
                                if (!/^[0-9,\n\r; ]*$/.test(text)) {
                                  e.preventDefault();

                                  message.warning(
                                    'Número de série aceita apenas números.'
                                  );
                                }
                              }}
                            />
                          </Form.Item>
                        </Col>
                      )}
                    </Row>
                  </Card>
                );
              })}
            </Space>
          </Form>

          <Space
            wrap
            style={{
              justifyContent: 'flex-end',
              width: '100%',
            }}
          >
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
            onClick={() => {
              Modal.confirm({
                title: 'Confirmar envio do inventário?',
                content:
                  'Ao confirmar, o inventário será enviado e essa ação não poderá ser desfeita. Caso ainda queira editar depois, clique em "Salvar parcial" em vez de enviar.',
                okText: 'Confirmar envio',
                cancelText: 'Cancelar',
                onOk: () => save(true),
              });
            }}
          >
            Enviar inventário
          </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}