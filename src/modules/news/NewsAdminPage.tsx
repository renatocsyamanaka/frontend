import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  DatePicker,
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
import { PlusOutlined, ReloadOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

type News = {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const { Text, Paragraph, Title } = Typography;

export default function NewsAdminPage() {
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [imgFile, setImgFile] = useState<File | null>(null);

  // ✅ lista notícias (backend atual)
  const listQ = useQuery<News[]>({
    queryKey: ['news', { admin: true }],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data?.data ?? res.data; // suporta {data: ...} ou array direto
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  // ✅ cria notícia (JSON)
  const createNews = useMutation({
    mutationFn: async (payload: { title: string; content: string; category?: string | null; isActive: boolean }) => {
      // 1) cria notícia
      const created = (await api.post('/news', payload)).data?.data ?? (await api.post('/news', payload)).data;
      // 2) se tiver imagem, faz upload separado
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
      setOpen(false);
      setImgFile(null);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao publicar'),
  });

  // ✅ remove notícia
  const removeNews = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/news/${id}`)).data,
    onSuccess: async () => {
      message.success('Notícia removida');
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao remover'),
  });

  const rows = useMemo(() => listQ.data || [], [listQ.data]);

  // ✅ colunas do PC: inclui RESUMO (texto!)
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
            {String(v || '').length > 140 ? `${String(v).slice(0, 140)}…` : (v || '—')}
          </Text>
        ),
      },
      {
        title: 'Imagem',
        width: 90,
        render: (_: any, r: News) =>
          r.imageUrl ? <Image src={r.imageUrl} width={56} style={{ borderRadius: 6 }} /> : <Text type="secondary">—</Text>,
      },
      {
        title: 'Ações',
        width: 110,
        render: (_: any, r: News) => (
          <Popconfirm title="Remover esta notícia?" onConfirm={() => removeNews.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
      },
    ],
    [removeNews]
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ✅ Header responsivo */}
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} block={isMobile}>
            Nova notícia
          </Button>
        </Space>
      </div>

      <Card bodyStyle={{ padding: isMobile ? 12 : 24 }}>
        {/* ✅ MOBILE: cards (responsivo de verdade) */}
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

                  <Popconfirm title="Remover esta notícia?" onConfirm={() => removeNews.mutate(n.id)}>
                    <Button danger icon={<DeleteOutlined />} block>
                      Excluir
                    </Button>
                  </Popconfirm>
                </Space>
              </Card>
            )}
          />
        ) : (
          // ✅ DESKTOP: tabela normal
          <Table
            rowKey="id"
            loading={listQ.isLoading}
            dataSource={rows}
            columns={columns as any}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* ✅ Modal responsivo */}
      <Modal
        title="Nova notícia"
        open={open}
        onCancel={() => {
          setOpen(false);
          setImgFile(null);
        }}
        onOk={() => form.submit()}
        destroyOnClose
        okText="Publicar"
        width={isMobile ? '96vw' : 720}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        confirmLoading={createNews.isPending}
      >
        <Form
          layout="vertical"
          form={form}
          initialValues={{ isActive: true, category: null }}
          onFinish={(v) => {
            createNews.mutate({
              title: v.title,
              content: v.content,
              category: v.category || null,
              isActive: !!v.isActive,
            });
          }}
        >
          <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Informe o título' }]}>
            <Input maxLength={160} showCount />
          </Form.Item>

          <Form.Item name="content" label="Conteúdo" rules={[{ required: true, message: 'Informe o conteúdo' }]}>
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
          </Form.Item>

          <Form.Item name="isActive" label="Ativa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
