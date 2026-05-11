import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';

const { Text } = Typography;

export default function AutoInventoryItemsManager() {
  const [form] = Form.useForm();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadItems() {
    try {
      setLoading(true);
      const res = await api.get('/auto-inventory/items');
      setItems(res.data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Erro ao carregar peças.');
    } finally {
      setLoading(false);
    }
  }

  async function createItem(values: any) {
    try {
      setSaving(true);

      await api.post('/auto-inventory/items', {
        codigo: values.codigo,
        nome: values.nome,
      });

      message.success('Peça cadastrada com sucesso.');
      form.resetFields();
      await loadItems();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Erro ao cadastrar peça.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(id: number, ativo: boolean) {
    try {
      await api.patch(`/auto-inventory/items/${id}`, {
        ativo,
      });

      message.success(
        ativo ? 'Peça ativada com sucesso.' : 'Peça desativada com sucesso.'
      );

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ativo } : item
        )
      );
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Erro ao atualizar peça.');
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 180,
    },
    {
      title: 'Peça',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Status',
      dataIndex: 'ativo',
      key: 'ativo',
      width: 140,
      render: (ativo: boolean) =>
        ativo ? <Tag color="green">Ativa</Tag> : <Tag>Inativa</Tag>,
    },
    {
      title: 'Usar nos ciclos',
      dataIndex: 'ativo',
      key: 'acao',
      width: 160,
      render: (ativo: boolean, record: any) => (
        <Switch
          checked={ativo}
          checkedChildren="Sim"
          unCheckedChildren="Não"
          onChange={(checked) => toggleItem(record.id, checked)}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Text type="secondary">
          Esta lista é fixa e global. Toda peça ativa será enviada para todos os
          prestadores habilitados no auto inventário.
        </Text>

        <Form
          form={form}
          layout="inline"
          onFinish={createItem}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="codigo"
            rules={[{ required: true, message: 'Informe o código' }]}
          >
            <Input placeholder="Código da peça" style={{ width: 180 }} />
          </Form.Item>

          <Form.Item
            name="nome"
            rules={[{ required: true, message: 'Informe o nome' }]}
          >
            <Input placeholder="Nome da peça" style={{ width: 320 }} />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={saving}
          >
            Adicionar peça
          </Button>

          <Button icon={<ReloadOutlined />} onClick={loadItems}>
            Atualizar
          </Button>
        </Form>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{
            pageSize: 8,
            showTotal: (total) => `${total} peças`,
          }}
        />
      </Card>
    </Space>
  );
}