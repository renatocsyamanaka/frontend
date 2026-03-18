import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Upload,
  Typography,
  message,
  Grid,
  List,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

type Sector = {
  id: number;
  name: string;
};

type News = {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  targetAllSectors?: boolean;
  sectors?: Sector[];
};

type NewsFormValues = {
  title: string;
  content: string;
  category?: string | null;
  isActive: boolean;
  targetAllSectors: boolean;
  sectorIds: number[];
};

const { Text, Paragraph, Title } = Typography;

export default function NewsAdminPage() {
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [open, setOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [form] = Form.useForm<NewsFormValues>();
  const [imgFile, setImgFile] = useState<File | null>(null);

  const isEditing = !!editingNews;
  const targetAllSectors = Form.useWatch('targetAllSectors', form);

  const listQ = useQuery<News[]>({
    queryKey: ['news', { admin: true }],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data?.data ?? res.data ?? [];
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const sectorsQ = useQuery<Sector[]>({
    queryKey: ['sectors', 'select-news'],
    queryFn: async () => {
      const res = await api.get('/sectors');
      return res.data?.data ?? res.data ?? [];
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const createNews = useMutation({
    mutationFn: async (payload: NewsFormValues) => {
      const res = await api.post('/news', payload);
      const created = res.data?.data ?? res.data;

      if (imgFile && created?.id) {
        const fd = new FormData();
        fd.append('image', imgFile);
        await api.post(`/news/${created.id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return created as News;
    },
    onSuccess: async () => {
      message.success('Notícia publicada');
      handleCloseModal();
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao publicar');
    },
  });

  const updateNews = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: NewsFormValues }) => {
      const res = await api.patch(`/news/${id}`, payload);
      const updated = res.data?.data ?? res.data;

      if (imgFile) {
        const fd = new FormData();
        fd.append('image', imgFile);
        await api.post(`/news/${id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return updated as News;
    },
    onSuccess: async () => {
      message.success('Notícia atualizada');
      handleCloseModal();
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao atualizar');
    },
  });

  const removeNews = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/news/${id}`);
      return res.data;
    },
    onSuccess: async () => {
      message.success('Notícia removida');
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao remover');
    },
  });

  const rows = useMemo(() => listQ.data || [], [listQ.data]);

  function handleCloseModal() {
    setOpen(false);
    setEditingNews(null);
    setImgFile(null);
    form.resetFields();
  }

  function handleOpenCreate() {
    setEditingNews(null);
    setImgFile(null);
    setOpen(true);

    form.setFieldsValue({
      title: '',
      content: '',
      category: null,
      isActive: true,
      targetAllSectors: true,
      sectorIds: [],
    });
  }

  function handleOpenEdit(news: News) {
    setEditingNews(news);
    setImgFile(null);
    setOpen(true);

    form.setFieldsValue({
      title: news.title,
      content: news.content,
      category: news.category || null,
      isActive: !!news.isActive,
      targetAllSectors: news.targetAllSectors ?? true,
      sectorIds: (news.sectors || []).map((s) => Number(s.id)),
    });
  }

  useEffect(() => {
    if (targetAllSectors) {
      form.setFieldValue('sectorIds', []);
    }
  }, [targetAllSectors, form]);

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 70 },
      {
        title: 'Título',
        dataIndex: 'title',
        width: 260,
        ellipsis: true,
        render: (v: string, r: News) => (
          <Space direction="vertical" size={0}>
            <Space wrap>
              {!r.isActive && <Tag color="red">Inativa</Tag>}
              {r.category && <Tag>{r.category}</Tag>}
              {r.targetAllSectors ? (
                <Tag color="blue">Todos os setores</Tag>
              ) : (
                (r.sectors || []).map((s) => (
                  <Tag key={s.id} color="purple">
                    {s.name}
                  </Tag>
                ))
              )}
            </Space>
            <Text strong>{v}</Text>
            <Text type="secondary">{dayjs(r.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
          </Space>
        ),
      },
      {
        title: 'Resumo',
        dataIndex: 'content',
        render: (v: string) => (
          <Text type="secondary">
            {String(v || '').length > 140 ? `${String(v).slice(0, 140)}…` : v || '—'}
          </Text>
        ),
      },
      {
        title: 'Imagem',
        width: 90,
        render: (_: any, r: News) =>
          r.imageUrl ? (
            <Image src={r.imageUrl} width={56} style={{ borderRadius: 6 }} />
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: 'Ações',
        width: 140,
        render: (_: any, r: News) => (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(r)}
            />
            <Popconfirm title="Remover esta notícia?" onConfirm={() => removeNews.mutate(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [removeNews]
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Gerenciar notícias
        </Title>

        <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
          <Button icon={<ReloadOutlined />} onClick={() => listQ.refetch()} block={isMobile}>
            Atualizar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate} block={isMobile}>
            Nova notícia
          </Button>
        </Space>
      </div>

      <Card bodyStyle={{ padding: isMobile ? 12 : 24 }}>
        {isMobile ? (
          <List
            dataSource={rows}
            locale={{ emptyText: 'Sem notícias.' }}
            renderItem={(n) => (
              <Card key={n.id} style={{ marginBottom: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <Space wrap>
                    <Text strong>{n.title}</Text>
                    {!n.isActive && <Tag color="red">Inativa</Tag>}
                    {n.category && <Tag>{n.category}</Tag>}
                    {n.targetAllSectors ? (
                      <Tag color="blue">Todos os setores</Tag>
                    ) : (
                      (n.sectors || []).map((s) => (
                        <Tag key={s.id} color="purple">
                          {s.name}
                        </Tag>
                      ))
                    )}
                  </Space>

                  <Text type="secondary">{dayjs(n.createdAt).format('DD/MM/YYYY HH:mm')}</Text>

                  {n.imageUrl && (
                    <Image
                      src={n.imageUrl}
                      width="100%"
                      style={{ borderRadius: 10, objectFit: 'cover' }}
                      preview={false}
                    />
                  )}

                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {n.content || <Text type="secondary">Sem conteúdo</Text>}
                  </Paragraph>

                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button icon={<EditOutlined />} block onClick={() => handleOpenEdit(n)}>
                      Editar
                    </Button>

                    <Popconfirm title="Remover esta notícia?" onConfirm={() => removeNews.mutate(n.id)}>
                      <Button danger icon={<DeleteOutlined />} block>
                        Excluir
                      </Button>
                    </Popconfirm>
                  </Space>
                </Space>
              </Card>
            )}
          />
        ) : (
          <Table
            rowKey="id"
            loading={listQ.isLoading}
            dataSource={rows}
            columns={columns as any}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        title={isEditing ? 'Editar notícia' : 'Nova notícia'}
        open={open}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        destroyOnClose
        okText={isEditing ? 'Salvar' : 'Publicar'}
        width={isMobile ? '96vw' : 720}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        confirmLoading={createNews.isPending || updateNews.isPending}
      >
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            isActive: true,
            category: null,
            targetAllSectors: true,
            sectorIds: [],
          }}
          onFinish={(v) => {
            const payload: NewsFormValues = {
              title: v.title,
              content: v.content,
              category: v.category || null,
              isActive: !!v.isActive,
              targetAllSectors: !!v.targetAllSectors,
              sectorIds: v.targetAllSectors ? [] : (v.sectorIds || []).map(Number),
            };

            if (!payload.targetAllSectors && (!payload.sectorIds || payload.sectorIds.length === 0)) {
              message.warning('Selecione ao menos um setor ou marque "Todos os setores".');
              return;
            }

            if (isEditing && editingNews?.id) {
              updateNews.mutate({ id: editingNews.id, payload });
            } else {
              createNews.mutate(payload);
            }
          }}
        >
          <Form.Item
            name="title"
            label="Título"
            rules={[{ required: true, message: 'Informe o título' }]}
          >
            <Input maxLength={160} showCount />
          </Form.Item>

          <Form.Item
            name="content"
            label="Conteúdo"
            rules={[{ required: true, message: 'Informe o conteúdo' }]}
          >
            <Input.TextArea rows={isMobile ? 5 : 7} />
          </Form.Item>

          <Form.Item name="category" label="Categoria (opcional)">
            <Select
              allowClear
              placeholder="Ex: Portal, Operações, Aviso..."
              options={[
                { value: 'Portal', label: 'Portal' },
                { value: 'Operações', label: 'Operações' },
                { value: 'Aviso', label: 'Aviso' },
                { value: 'Atualização', label: 'Atualização' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="targetAllSectors"
            label="Disponível para todos os setores"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="sectorIds"
            label="Setores"
            rules={
              targetAllSectors
                ? []
                : [{ required: true, message: 'Selecione ao menos um setor' }]
            }
          >
            <Select
              mode="multiple"
              placeholder="Selecione os setores"
              disabled={!!targetAllSectors}
              loading={sectorsQ.isLoading}
              options={(sectorsQ.data || []).map((sector) => ({
                value: sector.id,
                label: sector.name,
              }))}
              optionFilterProp="label"
              showSearch
            />
          </Form.Item>

          <Form.Item label="Imagem (opcional)">
            <Upload
              accept="image/*"
              maxCount={1}
              beforeUpload={(file) => {
                setImgFile(file);
                return false;
              }}
              onRemove={() => setImgFile(null)}
              listType="picture"
            >
              <Button icon={<UploadOutlined />} block={isMobile}>
                Selecionar imagem
              </Button>
            </Upload>

            {isEditing && editingNews?.imageUrl && !imgFile && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Imagem atual:</Text>
                <div style={{ marginTop: 8 }}>
                  <Image
                    src={editingNews.imageUrl}
                    width={140}
                    style={{ borderRadius: 8 }}
                  />
                </div>
              </div>
            )}
          </Form.Item>

          <Form.Item name="isActive" label="Ativa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}