import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  InputNumber,
  Progress,
  Result,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  SaveOutlined,
  SendOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

const { Title, Text } = Typography;

function getItemType(codigo?: string) {
  const code = String(codigo || '').trim().toUpperCase();

  if (code.startsWith('S000')) {
    return {
      label: 'Serviço',
      color: 'purple',
    };
  }

  if (/^\d/.test(code)) {
    return {
      label: 'Produto',
      color: 'blue',
    };
  }

  return {
    label: 'Item',
    color: 'default',
  };
}

export default function AutoInventoryPublicPage() {
  const { token } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await api.get(`/auto-inventory/public/${token}`);

      setInventory(res.data);

      setItems(
        (res.data.items || []).map((row: any) => ({
          id: row.id,
          itemId: row.itemId,
          codigo: row.item?.codigo,
          nome: row.item?.nome,
          quantidade: row.quantidade,
        }))
      );
    } catch {
      setInventory(null);
    } finally {
      setLoading(false);
    }
  }

  async function save(finalizar = false) {
    try {
      setSaving(true);

      const payload = {
        finalizar,
        items: items.map((item) => ({
          itemId: item.itemId,
          quantidade: item.quantidade,
        })),
      };

      const res = await api.put(`/auto-inventory/public/${token}`, payload);

      if (res.data?.status === 'COMPLETO') {
        message.success('Auto inventário enviado com sucesso.');
      } else if (allFilled) {
        message.warning(
          'Todos os itens foram preenchidos. Clique em “Enviar inventário” para finalizar.'
        );
      } else {
        message.success(res.data?.message || 'Inventário salvo parcialmente.');
      }

      await load();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao salvar inventário.'
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const totalItems = items.length;

  const filledItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.quantidade !== null &&
        item.quantidade !== undefined &&
        item.quantidade !== ''
    ).length;
  }, [items]);

  const progressPercent = totalItems
    ? Math.round((filledItems / totalItems) * 100)
    : 0;

  const allFilled = totalItems > 0 && filledItems === totalItems;
  const isSubmitted = inventory?.status === 'COMPLETO';

  const referenceMonth = inventory?.cycle
    ? `${String(inventory.cycle.month).padStart(2, '0')}/${inventory.cycle.year}`
    : '-';

  if (!loading && !inventory) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f3f7fb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <Card
          style={{
            borderRadius: 24,
            maxWidth: 650,
            width: '100%',
            boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
          }}
        >
          <Result
            status="404"
            title="Link inválido"
            subTitle="Não foi possível localizar o auto inventário."
          />
        </Card>
      </div>
    );
  }

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 160,
      render: (value: string) => {
        const type = getItemType(value);

        return (
          <Space direction="vertical" size={4}>
            <Tag color="blue" style={{ borderRadius: 8, fontWeight: 600 }}>
              {value}
            </Tag>

            <Tag color={type.color} style={{ borderRadius: 8 }}>
              {type.label}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: 'Peça',
      dataIndex: 'nome',
      key: 'nome',
      render: (value: string) => (
        <Space>
          <ToolOutlined style={{ color: '#1677ff' }} />
          <Text strong>{value}</Text>
        </Space>
      ),
    },
    {
      title: 'Quantidade',
      dataIndex: 'quantidade',
      key: 'quantidade',
      width: 180,
      render: (_: any, row: any, index: number) => (
        <InputNumber
          min={0}
          disabled={isSubmitted}
          style={{
            width: 140,
            borderRadius: 12,
          }}
          value={row.quantidade}
          placeholder="Qtd"
          onChange={(value) => {
            const next = [...items];
            next[index].quantidade = value;
            setItems(next);
          }}
        />
      ),
    },
  ];

  function renderMobileItems() {
    return (
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        {items.map((item, index) => {
          const type = getItemType(item.codigo);

          return (
            <Card
              key={item.id}
              style={{
                borderRadius: 18,
                border: '1px solid #edf2f7',
                boxShadow: '0 8px 18px rgba(15,23,42,0.05)',
              }}
              styles={{
                body: {
                  padding: 16,
                },
              }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row justify="space-between" align="middle" gutter={[8, 8]}>
                  <Col>
                    <Tag color="blue" style={{ borderRadius: 8, fontWeight: 700 }}>
                      {item.codigo}
                    </Tag>
                  </Col>

                  <Col>
                    <Tag color={type.color} style={{ borderRadius: 8 }}>
                      {type.label}
                    </Tag>
                  </Col>
                </Row>

                <div>
                  <Text type="secondary">Peça</Text>
                  <br />
                  <Text strong>
                    <ToolOutlined style={{ color: '#1677ff', marginRight: 6 }} />
                    {item.nome}
                  </Text>
                </div>

                <div>
                  <Text type="secondary">Quantidade</Text>
                  <InputNumber
                    min={0}
                    disabled={isSubmitted}
                    style={{
                      width: '100%',
                      marginTop: 6,
                      borderRadius: 12,
                    }}
                    value={item.quantidade}
                    placeholder="Preencha a quantidade"
                    onChange={(value) => {
                      const next = [...items];
                      next[index].quantidade = value;
                      setItems(next);
                    }}
                  />
                </div>
              </Space>
            </Card>
          );
        })}
      </Space>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #eef5fb 0%, #f8fbff 40%, #ffffff 100%)',
        padding: isMobile ? 12 : 24,
      }}
    >
      <Card
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          borderRadius: isMobile ? 20 : 28,
          overflow: 'hidden',
          border: '1px solid #e7eef6',
          boxShadow: '0 20px 45px rgba(15,23,42,0.08)',
        }}
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <div
          style={{
            background:
              'linear-gradient(135deg, #001529 0%, #003566 100%)',
            padding: isMobile ? 20 : '32px 36px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Row justify="space-between" align="middle" gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Space
                align={isMobile ? 'start' : 'center'}
                size={isMobile ? 12 : 22}
                direction={isMobile ? 'vertical' : 'horizontal'}
                style={{ width: '100%' }}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 18,
                    padding: 14,
                    width: isMobile ? 130 : 140,
                    height: isMobile ? 66 : 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="Omnilink"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 48,
                      objectFit: 'contain',
                    }}
                  />
                </div>

                <div style={{ width: '100%' }}>
                  <Title
                    level={isMobile ? 3 : 2}
                    style={{
                      margin: 0,
                      color: '#fff',
                      lineHeight: 1.15,
                      wordBreak: 'break-word',
                    }}
                  >
                    Auto Inventário
                  </Title>

                  <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Prestador: {inventory?.provider?.name || '-'}
                  </Text>

                  <Space wrap style={{ marginTop: 10 }}>
                    <Tag color="blue" style={{ borderRadius: 999 }}>
                      Referência: {referenceMonth}
                    </Tag>

                    {isSubmitted ? (
                      <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 999 }}>
                        Enviado completo
                      </Tag>
                    ) : allFilled ? (
                      <Tag color="warning" icon={<WarningOutlined />} style={{ borderRadius: 999 }}>
                        Pronto para envio
                      </Tag>
                    ) : (
                      <Tag color="processing" icon={<ClockCircleOutlined />} style={{ borderRadius: 999 }}>
                        Em preenchimento
                      </Tag>
                    )}
                  </Space>
                </div>
              </Space>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                style={{
                  borderRadius: 22,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                styles={{
                  body: {
                    padding: isMobile ? 16 : 22,
                  },
                }}
              >
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text style={{ color: '#fff' }}>Itens preenchidos</Text>
                    <Text strong style={{ color: '#fff', fontSize: 16 }}>
                      {filledItems}/{totalItems}
                    </Text>
                  </Row>

                  <Progress
                    percent={progressPercent}
                    strokeColor="#52c41a"
                    trailColor="rgba(255,255,255,0.15)"
                  />

                  <Row justify="space-between">
                    <Space>
                      <InboxOutlined style={{ color: '#fff' }} />
                      <Text style={{ color: '#fff' }}>Total de peças</Text>
                    </Space>

                    <Text style={{ color: '#fff' }}>{totalItems}</Text>
                  </Row>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>

        <div style={{ padding: isMobile ? 16 : 32 }}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Alert
              type={isSubmitted ? 'success' : allFilled ? 'warning' : 'info'}
              showIcon
              style={{ borderRadius: 16 }}
              message={
                isSubmitted
                  ? 'Inventário enviado com sucesso'
                  : allFilled
                  ? 'Todos os itens preenchidos'
                  : 'Preencha o inventário'
              }
              description={
                isSubmitted
                  ? 'O auto inventário foi concluído e registrado no sistema.'
                  : allFilled
                  ? 'Agora clique em “Enviar inventário” para finalizar.'
                  : 'Você pode salvar parcialmente e retornar depois utilizando este mesmo link.'
              }
            />

            {isMobile ? (
              renderMobileItems()
            ) : (
              <Card
                style={{
                  borderRadius: 24,
                  border: '1px solid #edf2f7',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
                }}
                styles={{
                  body: {
                    padding: 0,
                  },
                }}
              >
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={columns}
                  dataSource={items}
                  pagination={false}
                  scroll={{ x: 800 }}
                />
              </Card>
            )}

            <Row justify="space-between" align="middle" gutter={[18, 18]}>
              <Col xs={24} lg={12}>
                <Text type="secondary">
                  As informações enviadas serão utilizadas pela equipe de
                  Operações para controle de estoque e acompanhamento mensal.
                </Text>
              </Col>

              <Col xs={24} lg={12} style={{ textAlign: isMobile ? 'left' : 'right' }}>
                {isSubmitted ? (
                  <Tag
                    color="success"
                    icon={<CheckCircleOutlined />}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 999,
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    Inventário concluído
                  </Tag>
                ) : (
                  <Space wrap style={{ width: isMobile ? '100%' : undefined }}>
                    <Button
                      size="large"
                      icon={<SaveOutlined />}
                      loading={saving}
                      block={isMobile}
                      style={{
                        borderRadius: 14,
                        height: 48,
                        fontWeight: 600,
                      }}
                      onClick={() => save(false)}
                    >
                      Salvar parcial
                    </Button>

                    <Button
                      size="large"
                      type="primary"
                      icon={<SendOutlined />}
                      loading={saving}
                      disabled={!allFilled}
                      block={isMobile}
                      style={{
                        borderRadius: 14,
                        height: 48,
                        fontWeight: 700,
                        boxShadow: '0 10px 24px rgba(22,119,255,0.28)',
                      }}
                      onClick={() => save(true)}
                    >
                      Enviar inventário
                    </Button>
                  </Space>
                )}
              </Col>
            </Row>
          </Space>
        </div>
      </Card>
    </div>
  );
}