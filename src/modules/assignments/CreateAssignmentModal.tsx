// src/modules/assignments/CreateAssignmentModal.tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, DatePicker, Form, Input, Modal, Select, Space, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

type User = { id: number; name: string };
type Client = { id: number; name: string };
type Location = { id: number; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultDate?: Dayjs;
};

export default function CreateAssignmentModal({ open, onClose, onCreated, defaultDate }: Props) {
  const [form] = Form.useForm();

  // listas
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
  });
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => (await api.get('/locations')).data,
  });

  // ⬇️ agora usa TODOS os usuários (ordenados por nome)
  const listUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/assignments', payload)).data,
    onSuccess: () => { message.success('Compromisso criado'); onCreated(); form.resetFields(); },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao criar'),
  });

  const initialStart = (defaultDate ?? dayjs()).hour(9).minute(0).second(0);
  const initialEnd   = (defaultDate ?? dayjs()).hour(18).minute(0).second(0);

  return (
    <Modal
      title="Novo compromisso"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={() => form.submit()}
      okText="Salvar"
      destroyOnClose
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={{ type: 'CLIENT', start: initialStart, end: initialEnd }}
        onFinish={(v) => {
          const payload = {
            userId: v.userId,
            clientId: v.clientId ?? null,
            locationId: v.locationId ?? null,
            start: (v.start as Dayjs).toISOString(),
            end:   (v.end as Dayjs).toISOString(),
            description: v.description || '',
            type: v.type,
          };
          if (dayjs(payload.end).isBefore(dayjs(payload.start))) {
            message.error('Fim não pode ser antes do início');
            return;
          }
          create.mutate(payload);
        }}
      >
        <Form.Item name="userId" label="Colaborador" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Selecione o colaborador"
            options={listUsers.map(u => ({ value: u.id, label: u.name }))}
          />
        </Form.Item>

        <Space style={{ width: '100%' }} size="middle">
          <Form.Item name="start" label="Início" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="end" label="Fim" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'CLIENT', label: 'Cliente' },
              { value: 'INTERNAL', label: 'Interno' },
              { value: 'TRAVEL', label: 'Deslocamento' },
            ]}
          />
        </Form.Item>

        <Space style={{ width: '100%' }} size="middle">
          <Form.Item name="clientId" label="Cliente" style={{ flex: 1 }}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              placeholder="(opcional)"
            />
          </Form.Item>
          <Form.Item name="locationId" label="Local" style={{ flex: 1 }}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={locations.map(l => ({ value: l.id, label: l.name }))}
              placeholder="(opcional)"
            />
          </Form.Item>
        </Space>

        <Form.Item name="description" label="Descrição">
          <Input.TextArea rows={3} placeholder="Ex.: Visita, reunião, plantão…" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
