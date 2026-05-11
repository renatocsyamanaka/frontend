import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { api } from '../../lib/api';

const { Title, Text } = Typography;

export default function AutoInventoryProvidersPage() {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  async function loadProviders(q = '') {
    try {
      setLoading(true);

      const res = await api.get('/users/providers', {
        params: q ? { q } : {},
      });

      setProviders(res.data?.data || res.data || []);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Erro ao carregar prestadores.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleAutoInventory(userId: number, checked: boolean) {
    try {
      setSavingId(userId);

    await api.patch(`/users/${userId}`, {
    autoInventoryEnabled: checked,
    });

      message.success(
        checked
          ? 'Prestador habilitado para auto inventário.'
          : 'Prestador removido do auto inventário.'
      );

      setProviders((prev) =>
        prev.map((item) =>
          item.id === userId
            ? { ...item, autoInventoryEnabled: checked }
            : item
        )
      );
    } catch (err: any) {
      message.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Erro ao atualizar prestador.'
      );
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);

  const columns = [
    {
      title: 'Prestador',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: any) => (
        <div>
          <b>{record.name}</b>
          <br />
          <Text type="secondary">{record.email || 'Sem e-mail'}</Text>
        </div>
      ),
    },
    {
      title: 'Auto Inventário',
      dataIndex: 'autoInventoryEnabled',
      key: 'autoInventoryEnabled',
      render: (enabled: boolean) =>
        enabled ? (
          <Tag color="green">Habilitado</Tag>
        ) : (
          <Tag color="default">Desabilitado</Tag>
        ),
    },
    {
      title: 'Ação',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Switch
          checked={!!record.autoInventoryEnabled}
          loading={savingId === record.id}
          checkedChildren="Sim"
          unCheckedChildren="Não"
          onChange={(checked) =>
            toggleAutoInventory(record.id, checked)
          }
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <Card>
          <Space align="start">
            <UserSwitchOutlined
              style={{
                fontSize: 30,
                color: '#1677ff',
                marginTop: 4,
              }}
            />

            <div>
              <Title level={3} style={{ margin: 0 }}>
                Prestadores do Auto Inventário
              </Title>

              <Text type="secondary">
                Habilite ou desabilite quais prestadores devem receber o
                auto inventário mensal de peças.
              </Text>
            </div>
          </Space>
        </Card>

        <Card>
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              allowClear
              placeholder="Pesquisar prestador"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => loadProviders(search)}
              style={{ width: 300 }}
            />

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => loadProviders(search)}
            >
              Pesquisar
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearch('');
                loadProviders();
              }}
            >
              Atualizar
            </Button>
          </Space>

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={providers}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `${total} prestadores`,
            }}
          />
        </Card>
      </Space>
    </div>
  );
}