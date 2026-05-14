import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';

const { Text } = Typography;

type AutoInventoryItem = {
  id: number;
  codigo: string;
  nome: string;
  ativo: boolean;
  hasSerialNumber?: boolean;
  serialNumberRequired?: boolean;
  has_serial_number?: boolean;
  serial_number_required?: boolean;
};

function hasSerial(row: AutoInventoryItem) {
  return !!(row.hasSerialNumber ?? row.has_serial_number);
}

function serialRequired(row: AutoInventoryItem) {
  return !!(row.serialNumberRequired ?? row.serial_number_required);
}

export default function AutoInventoryItemsManager() {
  const [items, setItems] = useState<AutoInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AutoInventoryItem | null>(null);
  const [form] = Form.useForm();

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

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      ativo: true,
      hasSerialNumber: false,
      serialNumberRequired: false,
    });
    setModalOpen(true);
  }

  function openEdit(row: AutoInventoryItem) {
    setEditing(row);
    form.setFieldsValue({
      codigo: row.codigo,
      nome: row.nome,
      ativo: !!row.ativo,
      hasSerialNumber: hasSerial(row),
      serialNumberRequired: serialRequired(row),
    });
    setModalOpen(true);
  }

  async function save(values: any) {
    try {
      setSaving(true);

      const payload = {
        codigo: values.codigo,
        nome: values.nome,
        ativo: !!values.ativo,
        hasSerialNumber: !!values.hasSerialNumber,
        serialNumberRequired: !!values.hasSerialNumber && !!values.serialNumberRequired,
      };

      if (editing) {
        await api.patch(`/auto-inventory/items/${editing.id}`, payload);
        message.success('Peça atualizada com sucesso.');
      } else {
        await api.post('/auto-inventory/items', payload);
        message.success('Peça cadastrada com sucesso.');
      }

      setModalOpen(false);
      await loadItems();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Erro ao salvar peça.');
    } finally {
      setSaving(false);
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
      width: 150,
    },
    {
      title: 'Peça',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Ativo',
      dataIndex: 'ativo',
      key: 'ativo',
      width: 110,
      render: (value: boolean) =>
        value ? <Tag color="green">Ativo</Tag> : <Tag color="red">Inativo</Tag>,
    },
    {
      title: 'Controla seriais',
      key: 'hasSerialNumber',
      width: 150,
      render: (_value: boolean, row: AutoInventoryItem) =>
        hasSerial(row) ? <Tag color="blue">Sim</Tag> : <Tag>Não</Tag>,
    },
    {
      title: 'Seriais obrigatórios',
      key: 'serialNumberRequired',
      width: 170,
      render: (_value: boolean, row: AutoInventoryItem) => {
        if (!hasSerial(row)) return <Tag>Não se aplica</Tag>;
        return serialRequired(row) ? <Tag color="red">Sim</Tag> : <Tag color="orange">Não</Tag>;
      },
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 120,
      render: (_: any, row: AutoInventoryItem) => (
        <Button icon={<EditOutlined />} onClick={() => openEdit(row)}>
          Editar
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Text type="secondary">
          Marque quais peças controlam número de série e se o preenchimento será obrigatório.
        </Text>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadItems} loading={loading}>
            Atualizar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nova peça
          </Button>
        </Space>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        size="small"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editing ? 'Editar peça' : 'Nova peça'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item
            label="Código"
            name="codigo"
            rules={[{ required: true, message: 'Informe o código.' }]}
          >
            <Input placeholder="Ex: MODULO-001" />
          </Form.Item>

          <Form.Item
            label="Nome"
            name="nome"
            rules={[{ required: true, message: 'Informe o nome da peça.' }]}
          >
            <Input placeholder="Ex: Módulo" />
          </Form.Item>

          <Form.Item label="Ativo" name="ativo" valuePropName="checked">
            <Switch checkedChildren="Sim" unCheckedChildren="Não" />
          </Form.Item>

          <Form.Item
            label="Controla números de série?"
            name="hasSerialNumber"
            valuePropName="checked"
            extra="Quando ativado, o prestador poderá informar os números de série desse item."
          >
            <Switch checkedChildren="Sim" unCheckedChildren="Não" />
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const hasSerialNumber = !!getFieldValue('hasSerialNumber');

              if (!hasSerialNumber && getFieldValue('serialNumberRequired')) {
                form.setFieldValue('serialNumberRequired', false);
              }

              return (
                <Form.Item
                  label="Obrigatório informar seriais?"
                  name="serialNumberRequired"
                  valuePropName="checked"
                  extra="Se estiver obrigatório, a quantidade de seriais deve bater com a quantidade informada."
                >
                  <Switch
                    disabled={!hasSerialNumber}
                    checkedChildren="Sim"
                    unCheckedChildren="Não"
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
