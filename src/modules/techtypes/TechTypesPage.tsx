import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Form, Input, Modal, Table, message } from 'antd';
import { useState } from 'react';

type TechType = { id: number; name: string; description?: string };

export function TechTypesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<TechType[]>({
    queryKey: ['techtypes'],
    queryFn: async () => (await api.get('/techtypes')).data,
  });

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/techtypes', payload)).data,
    onSuccess: () => { message.success('Tipo criado'); qc.invalidateQueries({ queryKey: ['techtypes'] }); setOpen(false); form.resetFields(); },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Erro'),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Tipos de Técnico</h2><Button type="primary" onClick={() => setOpen(true)}>Novo</Button>
      </div>
      <Table rowKey="id" dataSource={data || []} loading={isLoading} columns={[
        { title: 'Nome', dataIndex: 'name' },
        { title: 'Descrição', dataIndex: 'description' },
      ]}/>
      <Modal title="Novo tipo" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form layout="vertical" form={form} onFinish={(v) => create.mutate(v)}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input/></Form.Item>
          <Form.Item name="description" label="Descrição"><Input/></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}