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
  SaveOutlined,
  SendOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

const { Title, Text } = Typography;

export default function AutoInventoryPublicPage() {
  const { token } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

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

  const isComplete = totalItems > 0 && filledItems === totalItems;

  const referenceMonth = inventory?.cycle
    ? `${String(inventory.cycle.month).padStart(2, '0')}/${inventory.cycle.year}`
    : '-';

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
        message.success('Auto inventário enviado completo com sucesso.');
      } else {
        message.warning(
          res.data?.message ||
            'Inventário salvo parcialmente. Ainda existem itens sem preenchimento.'
        );
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

  if (!loading && !inventory) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f7fb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Card style={{ borderRadius: 18, maxWidth: 620, width: '100%' }}>
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
      width: 180,
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: 'Peça',
      dataIndex: 'nome',
      key: 'nome',
      render: (value: string) => (
        <Space>
          <ToolOutlined style={{ color: '#1677ff' }} />
          <span>{value}</span>
        </Space>
      ),
    },
    {
      title: 'Quantidade',
      dataIndex: 'quantidade',
      key: 'quantidade',
      width: 190,
      render: (_: any, row: any, index: number) => (
        <InputNumber
          min={0}
          style={{ width: 150 }}
          value={row.quantidade}
          placeholder="Preencha qtd"
          onChange={(value) => {
            const next = [...items];
            next[index].quantidade = value;
            setItems(next);
          }}
        />
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: 24,
      }}
    >
      <Card
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          borderRadius: 22,
          border: '1px solid #e5edf5',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #eef2f7',
            background:
              'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
          }}
        >
          <Row justify="space-between" align="middle" gutter={[18, 18]}>
            <Col xs={24} md={16}>
              <Space size={16} align="center">
                <div
                  style={{
                    width: 118,
                    height: 58,
                    borderRadius: 16,
                    background: '#fff',
                    border: '1px solid #e8eef5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 10,
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="Omnilink"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 42,
                      objectFit: 'contain',
                    }}
                  />
                </div>

                <div>
                  <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                    Auto Inventário de Peças
                  </Title>

                  <Text type="secondary">
                    Prestador: {inventory?.provider?.name || '-'}
                  </Text>

                  <br />

                  <Tag color="blue">
                    Referência: {referenceMonth}
                  </Tag>
                </div>
              </Space>
            </Col>

            <Col xs={24} md={8}>
              <Space
                direction="vertical"
                size={6}
                style={{ width: '100%' }}
              >
                <Row justify="space-between">
                  <Text type="secondary">Progresso</Text>

                  <Text strong>
                    {filledItems}/{totalItems} itens
                  </Text>
                </Row>

                <Progress
                  percent={progressPercent}
                  status={isComplete ? 'success' : 'active'}
                />

                {isComplete ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Completo
                  </Tag>
                ) : (
                  <Tag color="orange" icon={<ClockCircleOutlined />}>
                    Pendente de preenchimento
                  </Tag>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <div style={{ padding: 28 }}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Alert
              type={isComplete ? 'success' : 'info'}
              showIcon
              message={
                isComplete
                  ? `Auto inventário completo - referência ${referenceMonth}`
                  : `Preencha seu auto inventário - referência ${referenceMonth}`
              }
              description={
                isComplete
                  ? 'Todos os itens foram preenchidos e enviados com sucesso.'
                  : 'Você pode salvar parcialmente e retornar depois pelo mesmo link.'
              }
            />

            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={items}
              pagination={false}
              scroll={{ x: 800 }}
            />

            <Row justify="space-between" align="middle" gutter={[12, 12]}>
              <Col>
                <Text type="secondary">
                  Ao enviar, as informações serão registradas no sistema de
                  Operações.
                </Text>
              </Col>

              <Col>
                {isComplete ? (
                  <Tag
                    color="green"
                    icon={<CheckCircleOutlined />}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 12,
                      fontSize: 14,
                    }}
                  >
                    Inventário enviado completo
                  </Tag>
                ) : (
                  <Space wrap>
                    <Button
                      size="large"
                      icon={<SaveOutlined />}
                      loading={saving}
                      onClick={() => save(false)}
                    >
                      Salvar parcial
                    </Button>

                    <Button
                      size="large"
                      type="primary"
                      icon={<SendOutlined />}
                      loading={saving}
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