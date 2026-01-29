import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button, Card, DatePicker, Form, Image, Input, Modal, Popconfirm,
  Select, Space, Switch, Table, Tag, Upload, message
} from 'antd';
import { PlusOutlined, ReloadOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

type User = { id: number; name: string; role?: { id: number; name: string; level: number } | null };

type News = {
  id: number;
  title: string;
  body: string;
  audience: 'ALL'|'ROLE'|'USER';
  targetRoleLevel?: number | null;
  targetUserId?: number | null;
  pinned: boolean;
  publishedAt: string;
  expiresAt?: string | null;
  imageUrl?: string | null;
};

const ROLE_LEVEL_OPTIONS = [
  { value: 1, label: '>= Técnico (1)' },
  { value: 2, label: '>= Supervisor (2)' },
  { value: 3, label: '>= Coordenador (3)' },
  { value: 4, label: '>= Gerente (4)' },
  { value: 5, label: '>= Admin (5)' },
];

export default function NewsAdminPage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [imgFile, setImgFile] = useState<File | null>(null);

  const usersQ = useQuery<User[]>({
    queryKey: ['users-min'],
    queryFn: async () => (await api.get('/users')).data as User[],
    staleTime: 5 * 60_000,
    select: (rows) => rows.map(u => ({ id: u.id, name: u.name })),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const listQ = useQuery<News[]>({
    queryKey: ['news', { admin: true }],
    queryFn: async () => (await api.get('/news', { params: { includeExpired: true } })).data,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createNews = useMutation({
    mutationFn: async (payload: any) => {
      const fd = new FormData();
      fd.append('title', payload.title);
      fd.append('body', payload.body);
      fd.append('audience', payload.audience);
      if (payload.targetRoleLevel != null) fd.append('targetRoleLevel', String(payload.targetRoleLevel));
      if (payload.targetUserId != null) fd.append('targetUserId', String(payload.targetUserId));
      fd.append('pinned', String(!!payload.pinned));
      if (payload.publishedAt) fd.append('publishedAt', payload.publishedAt);
      if (payload.expiresAt) fd.append('expiresAt', payload.expiresAt);
      if (imgFile) fd.append('image', imgFile);

      const res = await api.post('/news', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as News;
    },
    onSuccess: async () => {
      message.success('Notícia publicada');
      setOpen(false);
      setImgFile(null);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao publicar'),
  });

  const removeNews = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/news/${id}`)).data,
    onSuccess: async () => {
      message.success('Notícia removida');
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao remover'),
  });

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 80 },
      {
        title: 'Título',
        render: (_: any, r: News) => (
          <Space>
            {r.pinned && <Tag color="gold">Fixada</Tag>}
            <span>{r.title}</span>
          </Space>
        ),
      },
      {
        title: 'Meta',
        render: (_: any, r: News) => (
          <Space direction="vertical" size={0}>
            <div>
              {r.audience === 'ALL' && <Tag>Todos</Tag>}
              {r.audience === 'ROLE' && <Tag>{`Nível >= ${r.targetRoleLevel}`}</Tag>}
              {r.audience === 'USER' && <Tag color="blue">Usuário específico</Tag>}
              {r.expiresAt && <Tag>Expira {dayjs(r.expiresAt).format('DD/MM')}</Tag>}
            </div>
            <div style={{ color: '#94a3b8' }}>
              {dayjs(r.publishedAt).format('DD/MM/YYYY HH:mm')}
            </div>
          </Space>
        ),
      },
      {
        title: 'Ações',
        render: (_: any, r: News) => (
          <Space>
            {r.imageUrl && <Image src={r.imageUrl} width={56} style={{ borderRadius: 6 }} />}
            <Popconfirm title="Remover esta notícia?" onConfirm={() => removeNews.mutate(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />}>Excluir</Button>
            </Popconfirm>
          </Space>
        ),
        width: 220,
      },
    ],
    [removeNews]
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Gerenciar notícias</h2>
        <Space>
          <span style={{ color: '#94a3b8' }}>{listQ.isFetching ? 'Atualizando…' : ''}</span>
          <Button icon={<ReloadOutlined />} onClick={() => listQ.refetch()} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Nova notícia
          </Button>
        </Space>
      </div>

      <Card>
        {listQ.isError && (
          <Typography.Text type="danger">
            Falha ao carregar notícias. {(listQ.error as any)?.message || ''}
          </Typography.Text>
        )}
        <Table
          rowKey="id"
          loading={listQ.isLoading}
          dataSource={listQ.data || []}
          columns={columns as any}
        />
      </Card>

      <Modal
        title="Nova notícia"
        open={open}
        onCancel={() => { setOpen(false); setImgFile(null); }}
        onOk={() => form.submit()}
        destroyOnClose
        okText="Publicar"
      >
        <Form
          layout="vertical"
          form={form}
          initialValues={{ pinned: false, audience: 'ALL' }}
          onFinish={(v) => {
            const payload = {
              title: v.title,
              body: v.body,
              audience: v.audience,
              targetRoleLevel: v.audience === 'ROLE' ? v.targetRoleLevel : null,
              targetUserId: v.audience === 'USER' ? v.targetUserId : null,
              pinned: v.pinned || false,
              publishedAt: new Date().toISOString(),
              expiresAt: v.expiresAt ? (v.expiresAt as dayjs.Dayjs).toISOString() : null,
            };
            createNews.mutate(payload);
          }}
        >
          <Form.Item name="title" label="Título" rules={[{ required: true }]}>
            <Input maxLength={140} showCount />
          </Form.Item>

          <Form.Item name="body" label="Conteúdo" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>

          <Form.Item label="Imagem (opcional)">
            <Upload
              accept="image/*"
              maxCount={1}
              beforeUpload={(file) => { setImgFile(file); return false; }}
              onRemove={() => setImgFile(null)}
              listType="picture"
            >
              <Button icon={<UploadOutlined />}>Selecionar imagem</Button>
            </Upload>
          </Form.Item>

          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Space wrap>
              <Form.Item name="pinned" label="Fixar no topo" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Form.Item name="expiresAt" label="Expira em">
                <DatePicker style={{ width: 220 }} format="DD/MM/YYYY" />
              </Form.Item>
            </Space>

            <Space wrap style={{ width: '100%' }}>
              <Form.Item name="audience" label="Público" style={{ minWidth: 220 }}>
                <Select
                  options={[
                    { value: 'ALL', label: 'Todos' },
                    { value: 'ROLE', label: 'Por nível de cargo' },
                    { value: 'USER', label: 'Usuário específico' },
                  ]}
                />
              </Form.Item>

              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => {
                  const a = getFieldValue('audience');
                  if (a === 'ROLE') {
                    return (
                      <Form.Item
                        name="targetRoleLevel"
                        label="Nível mínimo"
                        rules={[{ required: true, message: 'Selecione o nível' }]}
                      >
                        <Select style={{ minWidth: 240 }} options={ROLE_LEVEL_OPTIONS} />
                      </Form.Item>
                    );
                  }
                  if (a === 'USER') {
                    return (
                      <Form.Item
                        name="targetUserId"
                        label="Usuário"
                        rules={[{ required: true, message: 'Selecione o usuário' }]}
                      >
                        <Select
                          showSearch
                          style={{ minWidth: 280 }}
                          options={(usersQ.data || []).map(u => ({ value: u.id, label: u.name }))}
                          optionFilterProp="label"
                          placeholder="Quem verá esta notícia"
                          loading={usersQ.isLoading}
                        />
                      </Form.Item>
                    );
                  }
                  return null;
                }}
              </Form.Item>
            </Space>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
