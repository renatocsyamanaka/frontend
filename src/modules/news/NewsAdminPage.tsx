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
  Tabs,
  InputNumber,
  DatePicker,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
  NotificationOutlined,
  PictureOutlined,
  HistoryOutlined,
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

type DashboardBanner = {
  id: number;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  sortOrder?: number | null;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type SystemUpdate = {
  id: number;
  title: string;
  description?: string | null;
  type: 'NOVO' | 'MELHORIA' | 'CORRECAO' | 'AVISO';
  module?: string | null;
  isActive: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type NewsFormValues = {
  title: string;
  content: string;
  category?: string | null;
  isActive: boolean;
  targetAllSectors: boolean;
  sectorIds: number[];
};

type BannerFormValues = {
  title: string;
  subtitle?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  sortOrder?: number | null;
  isActive: boolean;
  startsAt?: dayjs.Dayjs | null;
  endsAt?: dayjs.Dayjs | null;
};

type UpdateFormValues = {
  title: string;
  description?: string | null;
  type: 'NOVO' | 'MELHORIA' | 'CORRECAO' | 'AVISO';
  module?: string | null;
  isActive: boolean;
  publishedAt?: dayjs.Dayjs | null;
};

const { Text, Paragraph, Title } = Typography;

export default function NewsAdminPage() {
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [activeTab, setActiveTab] = useState<'news' | 'banners' | 'updates'>('news');

  const [openNewsModal, setOpenNewsModal] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [newsForm] = Form.useForm<NewsFormValues>();
  const [newsImgFile, setNewsImgFile] = useState<File | null>(null);

  const [openBannerModal, setOpenBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<DashboardBanner | null>(null);
  const [bannerForm] = Form.useForm<BannerFormValues>();
  const [bannerImgFile, setBannerImgFile] = useState<File | null>(null);

  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<SystemUpdate | null>(null);
  const [updateForm] = Form.useForm<UpdateFormValues>();

  const isEditingNews = !!editingNews;
  const isEditingBanner = !!editingBanner;
  const isEditingUpdate = !!editingUpdate;

  const targetAllSectors = Form.useWatch('targetAllSectors', newsForm);

  const newsQ = useQuery<News[]>({
    queryKey: ['news', { admin: true }],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data?.data ?? res.data ?? [];
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const bannersQ = useQuery<DashboardBanner[]>({
    queryKey: ['dashboard-banners', { admin: true }],
    queryFn: async () => {
      const res = await api.get('/dashboard-banners');
      return res.data?.data ?? res.data ?? [];
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const updatesQ = useQuery<SystemUpdate[]>({
    queryKey: ['system-updates', { admin: true }],
    queryFn: async () => {
      const res = await api.get('/system-updates');
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

      if (newsImgFile && created?.id) {
        const fd = new FormData();
        fd.append('image', newsImgFile);
        await api.post(`/news/${created.id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return created as News;
    },
    onSuccess: async () => {
      message.success('Notícia publicada');
      handleCloseNewsModal();
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao publicar notícia');
    },
  });

  const updateNews = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: NewsFormValues }) => {
      const res = await api.patch(`/news/${id}`, payload);
      const updated = res.data?.data ?? res.data;

      if (newsImgFile) {
        const fd = new FormData();
        fd.append('image', newsImgFile);
        await api.post(`/news/${id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return updated as News;
    },
    onSuccess: async () => {
      message.success('Notícia atualizada');
      handleCloseNewsModal();
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao atualizar notícia');
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
      message.error(e?.response?.data?.error || 'Falha ao remover notícia');
    },
  });

  const createBanner = useMutation({
    mutationFn: async (payload: BannerFormValues) => {
      const body = {
        title: payload.title,
        subtitle: payload.subtitle || null,
        buttonLabel: payload.buttonLabel || null,
        buttonUrl: payload.buttonUrl || null,
        sortOrder: payload.sortOrder ?? 0,
        isActive: !!payload.isActive,
        startsAt: payload.startsAt ? payload.startsAt.toISOString() : null,
        endsAt: payload.endsAt ? payload.endsAt.toISOString() : null,
      };

      const res = await api.post('/dashboard-banners', body);
      const created = res.data?.data ?? res.data;

      if (bannerImgFile && created?.id) {
        const fd = new FormData();
        fd.append('image', bannerImgFile);
        await api.post(`/dashboard-banners/${created.id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return created as DashboardBanner;
    },
    onSuccess: async () => {
      message.success('Banner criado');
      handleCloseBannerModal();
      await qc.invalidateQueries({ queryKey: ['dashboard-banners'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao criar banner');
    },
  });

  const updateBanner = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: BannerFormValues }) => {
      const body = {
        title: payload.title,
        subtitle: payload.subtitle || null,
        buttonLabel: payload.buttonLabel || null,
        buttonUrl: payload.buttonUrl || null,
        sortOrder: payload.sortOrder ?? 0,
        isActive: !!payload.isActive,
        startsAt: payload.startsAt ? payload.startsAt.toISOString() : null,
        endsAt: payload.endsAt ? payload.endsAt.toISOString() : null,
      };

      const res = await api.patch(`/dashboard-banners/${id}`, body);
      const updated = res.data?.data ?? res.data;

      if (bannerImgFile) {
        const fd = new FormData();
        fd.append('image', bannerImgFile);
        await api.post(`/dashboard-banners/${id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return updated as DashboardBanner;
    },
    onSuccess: async () => {
      message.success('Banner atualizado');
      handleCloseBannerModal();
      await qc.invalidateQueries({ queryKey: ['dashboard-banners'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao atualizar banner');
    },
  });

  const removeBanner = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/dashboard-banners/${id}`);
      return res.data;
    },
    onSuccess: async () => {
      message.success('Banner removido');
      await qc.invalidateQueries({ queryKey: ['dashboard-banners'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao remover banner');
    },
  });

  const createUpdate = useMutation({
    mutationFn: async (payload: UpdateFormValues) => {
      const body = {
        title: payload.title,
        description: payload.description || null,
        type: payload.type,
        module: payload.module || null,
        isActive: !!payload.isActive,
        publishedAt: payload.publishedAt ? payload.publishedAt.toISOString() : null,
      };

      const res = await api.post('/system-updates', body);
      return (res.data?.data ?? res.data) as SystemUpdate;
    },
    onSuccess: async () => {
      message.success('Atualização publicada');
      handleCloseUpdateModal();
      await qc.invalidateQueries({ queryKey: ['system-updates'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao publicar atualização');
    },
  });

  const updateUpdate = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateFormValues }) => {
      const body = {
        title: payload.title,
        description: payload.description || null,
        type: payload.type,
        module: payload.module || null,
        isActive: !!payload.isActive,
        publishedAt: payload.publishedAt ? payload.publishedAt.toISOString() : null,
      };

      const res = await api.patch(`/system-updates/${id}`, body);
      return (res.data?.data ?? res.data) as SystemUpdate;
    },
    onSuccess: async () => {
      message.success('Atualização atualizada');
      handleCloseUpdateModal();
      await qc.invalidateQueries({ queryKey: ['system-updates'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao atualizar atualização');
    },
  });

  const removeUpdate = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/system-updates/${id}`);
      return res.data;
    },
    onSuccess: async () => {
      message.success('Atualização removida');
      await qc.invalidateQueries({ queryKey: ['system-updates'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao remover atualização');
    },
  });

  const newsRows = useMemo(() => newsQ.data || [], [newsQ.data]);

  const bannerRows = useMemo(() => {
    return [...(bannersQ.data || [])].sort(
      (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
    );
  }, [bannersQ.data]);

  const updateRows = useMemo(() => {
    return [...(updatesQ.data || [])].sort(
      (a, b) =>
        dayjs(b.publishedAt || b.createdAt).valueOf() - dayjs(a.publishedAt || a.createdAt).valueOf()
    );
  }, [updatesQ.data]);

  function updateTypeTag(type: SystemUpdate['type']) {
    if (type === 'NOVO') return <Tag color="green">Novo</Tag>;
    if (type === 'MELHORIA') return <Tag color="blue">Melhoria</Tag>;
    if (type === 'CORRECAO') return <Tag color="orange">Correção</Tag>;
    return <Tag color="purple">Aviso</Tag>;
  }

  function handleCloseNewsModal() {
    setOpenNewsModal(false);
    setEditingNews(null);
    setNewsImgFile(null);
    newsForm.resetFields();
  }

  function handleOpenCreateNews() {
    setEditingNews(null);
    setNewsImgFile(null);
    setOpenNewsModal(true);

    newsForm.setFieldsValue({
      title: '',
      content: '',
      category: null,
      isActive: true,
      targetAllSectors: true,
      sectorIds: [],
    });
  }

  function handleOpenEditNews(news: News) {
    setEditingNews(news);
    setNewsImgFile(null);
    setOpenNewsModal(true);

    newsForm.setFieldsValue({
      title: news.title,
      content: news.content,
      category: news.category || null,
      isActive: !!news.isActive,
      targetAllSectors: news.targetAllSectors ?? true,
      sectorIds: (news.sectors || []).map((s) => Number(s.id)),
    });
  }

  function handleCloseBannerModal() {
    setOpenBannerModal(false);
    setEditingBanner(null);
    setBannerImgFile(null);
    bannerForm.resetFields();
  }

  function handleOpenCreateBanner() {
    setEditingBanner(null);
    setBannerImgFile(null);
    setOpenBannerModal(true);

    bannerForm.setFieldsValue({
      title: '',
      subtitle: '',
      buttonLabel: '',
      buttonUrl: '',
      sortOrder: 0,
      isActive: true,
      startsAt: null,
      endsAt: null,
    });
  }

  function handleOpenEditBanner(banner: DashboardBanner) {
    setEditingBanner(banner);
    setBannerImgFile(null);
    setOpenBannerModal(true);

    bannerForm.setFieldsValue({
      title: banner.title,
      subtitle: banner.subtitle || '',
      buttonLabel: banner.buttonLabel || '',
      buttonUrl: banner.buttonUrl || '',
      sortOrder: banner.sortOrder ?? 0,
      isActive: !!banner.isActive,
      startsAt: banner.startsAt ? dayjs(banner.startsAt) : null,
      endsAt: banner.endsAt ? dayjs(banner.endsAt) : null,
    });
  }

  function handleCloseUpdateModal() {
    setOpenUpdateModal(false);
    setEditingUpdate(null);
    updateForm.resetFields();
  }

  function handleOpenCreateUpdate() {
    setEditingUpdate(null);
    setOpenUpdateModal(true);

    updateForm.setFieldsValue({
      title: '',
      description: '',
      type: 'MELHORIA',
      module: '',
      isActive: true,
      publishedAt: dayjs(),
    });
  }

  function handleOpenEditUpdate(item: SystemUpdate) {
    setEditingUpdate(item);
    setOpenUpdateModal(true);

    updateForm.setFieldsValue({
      title: item.title,
      description: item.description || '',
      type: item.type,
      module: item.module || '',
      isActive: !!item.isActive,
      publishedAt: item.publishedAt ? dayjs(item.publishedAt) : null,
    });
  }

  useEffect(() => {
    if (targetAllSectors) {
      newsForm.setFieldValue('sectorIds', []);
    }
  }, [targetAllSectors, newsForm]);

  const newsColumns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 70 },
      {
        title: 'Título',
        dataIndex: 'title',
        width: 280,
        ellipsis: true,
        render: (v: string, r: News) => (
          <Space direction="vertical" size={2}>
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
        width: 100,
        render: (_: any, r: News) =>
          r.imageUrl ? (
            <Image src={r.imageUrl} width={60} style={{ borderRadius: 8 }} />
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: 'Ações',
        width: 140,
        render: (_: any, r: News) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditNews(r)} />
            <Popconfirm title="Remover esta notícia?" onConfirm={() => removeNews.mutate(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [removeNews]
  );

  const bannerColumns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 70 },
      {
        title: 'Banner',
        dataIndex: 'title',
        render: (v: string, r: DashboardBanner) => (
          <Space direction="vertical" size={2}>
            <Space wrap>
              {!r.isActive && <Tag color="red">Inativo</Tag>}
              <Tag color="geekblue">Ordem {r.sortOrder ?? 0}</Tag>
              {r.startsAt && <Tag color="cyan">Início {dayjs(r.startsAt).format('DD/MM/YYYY')}</Tag>}
              {r.endsAt && <Tag color="orange">Fim {dayjs(r.endsAt).format('DD/MM/YYYY')}</Tag>}
            </Space>
            <Text strong>{v}</Text>
            {r.subtitle ? <Text type="secondary">{r.subtitle}</Text> : null}
          </Space>
        ),
      },
      {
        title: 'Imagem',
        width: 110,
        render: (_: any, r: DashboardBanner) =>
          r.imageUrl ? (
            <Image src={r.imageUrl} width={72} style={{ borderRadius: 8 }} />
          ) : (
            <Text type="secondary">Sem imagem</Text>
          ),
      },
      {
        title: 'Botão / link',
        render: (_: any, r: DashboardBanner) => (
          <Space direction="vertical" size={0}>
            <Text>{r.buttonLabel || '—'}</Text>
            <Text type="secondary">{r.buttonUrl || '—'}</Text>
          </Space>
        ),
      },
      {
        title: 'Ações',
        width: 140,
        render: (_: any, r: DashboardBanner) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditBanner(r)} />
            <Popconfirm title="Remover este banner?" onConfirm={() => removeBanner.mutate(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [removeBanner]
  );

  const updateColumns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 70 },
      {
        title: 'Atualização',
        dataIndex: 'title',
        render: (v: string, r: SystemUpdate) => (
          <Space direction="vertical" size={2}>
            <Space wrap>
              {updateTypeTag(r.type)}
              {!r.isActive && <Tag color="red">Inativa</Tag>}
              {r.module ? <Tag>{r.module}</Tag> : null}
            </Space>
            <Text strong>{v}</Text>
            <Text type="secondary">
              {dayjs(r.publishedAt || r.createdAt).format('DD/MM/YYYY HH:mm')}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Descrição',
        dataIndex: 'description',
        render: (v: string) => (
          <Text type="secondary">
            {String(v || '').length > 160 ? `${String(v).slice(0, 160)}…` : v || '—'}
          </Text>
        ),
      },
      {
        title: 'Ações',
        width: 140,
        render: (_: any, r: SystemUpdate) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditUpdate(r)} />
            <Popconfirm title="Remover esta atualização?" onConfirm={() => removeUpdate.mutate(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [removeUpdate]
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
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Central de conteúdo
          </Title>
          <Text type="secondary">
            Gerencie notícias, banners e atualizações do dashboard em um só lugar.
          </Text>
        </div>

        <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              newsQ.refetch();
              bannersQ.refetch();
              updatesQ.refetch();
            }}
            block={isMobile}
          >
            Atualizar
          </Button>

          {activeTab === 'news' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateNews}
              block={isMobile}
            >
              Nova notícia
            </Button>
          )}

          {activeTab === 'banners' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateBanner}
              block={isMobile}
            >
              Novo banner
            </Button>
          )}

          {activeTab === 'updates' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateUpdate}
              block={isMobile}
            >
              Nova atualização
            </Button>
          )}
        </Space>
      </div>

      <Card
        style={{ borderRadius: 20 }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'news' | 'banners' | 'updates')}
          items={[
            {
              key: 'news',
              label: (
                <Space>
                  <NotificationOutlined />
                  Notícias
                  <Tag>{newsRows.length}</Tag>
                </Space>
              ),
              children: (
                <>
                  {isMobile ? (
                    <List
                      dataSource={newsRows}
                      locale={{ emptyText: 'Sem notícias cadastradas.' }}
                      renderItem={(n) => (
                        <Card key={n.id} style={{ marginBottom: 12 }}>
                          <Space direction="vertical" style={{ width: '100%' }} size={10}>
                            <Space wrap>
                              <Text strong>{n.title}</Text>
                              {!n.isActive && <Tag color="red">Inativa</Tag>}
                              {n.category && <Tag>{n.category}</Tag>}
                            </Space>

                            <Text type="secondary">
                              {dayjs(n.createdAt).format('DD/MM/YYYY HH:mm')}
                            </Text>

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
                              <Button icon={<EditOutlined />} block onClick={() => handleOpenEditNews(n)}>
                                Editar
                              </Button>

                              <Popconfirm
                                title="Remover esta notícia?"
                                onConfirm={() => removeNews.mutate(n.id)}
                              >
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
                      loading={newsQ.isLoading}
                      dataSource={newsRows}
                      columns={newsColumns as any}
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </>
              ),
            },
            {
              key: 'banners',
              label: (
                <Space>
                  <PictureOutlined />
                  Banners do dashboard
                  <Tag>{bannerRows.length}</Tag>
                </Space>
              ),
              children:
                bannerRows.length === 0 && !bannersQ.isLoading ? (
                  <Empty description="Nenhum banner cadastrado" />
                ) : isMobile ? (
                  <List
                    dataSource={bannerRows}
                    locale={{ emptyText: 'Sem banners cadastrados.' }}
                    renderItem={(banner) => (
                      <Card key={banner.id} style={{ marginBottom: 12 }}>
                        <Space direction="vertical" style={{ width: '100%' }} size={10}>
                          <Space wrap>
                            <Text strong>{banner.title}</Text>
                            {!banner.isActive && <Tag color="red">Inativo</Tag>}
                            <Tag color="geekblue">Ordem {banner.sortOrder ?? 0}</Tag>
                          </Space>

                          {banner.imageUrl ? (
                            <Image
                              src={banner.imageUrl}
                              width="100%"
                              style={{ borderRadius: 12, objectFit: 'cover' }}
                              preview={false}
                            />
                          ) : (
                            <Text type="secondary">Sem imagem</Text>
                          )}

                          {banner.subtitle ? (
                            <Paragraph style={{ margin: 0 }}>{banner.subtitle}</Paragraph>
                          ) : null}

                          <Text type="secondary">
                            Botão: {banner.buttonLabel || '—'} | Link: {banner.buttonUrl || '—'}
                          </Text>

                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Button
                              icon={<EditOutlined />}
                              block
                              onClick={() => handleOpenEditBanner(banner)}
                            >
                              Editar
                            </Button>

                            <Popconfirm
                              title="Remover este banner?"
                              onConfirm={() => removeBanner.mutate(banner.id)}
                            >
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
                    loading={bannersQ.isLoading}
                    dataSource={bannerRows}
                    columns={bannerColumns as any}
                    pagination={{ pageSize: 10 }}
                  />
                ),
            },
            {
              key: 'updates',
              label: (
                <Space>
                  <HistoryOutlined />
                  Atualizações
                  <Tag>{updateRows.length}</Tag>
                </Space>
              ),
              children:
                updateRows.length === 0 && !updatesQ.isLoading ? (
                  <Empty description="Nenhuma atualização cadastrada" />
                ) : isMobile ? (
                  <List
                    dataSource={updateRows}
                    locale={{ emptyText: 'Sem atualizações cadastradas.' }}
                    renderItem={(item) => (
                      <Card key={item.id} style={{ marginBottom: 12 }}>
                        <Space direction="vertical" style={{ width: '100%' }} size={10}>
                          <Space wrap>
                            <Text strong>{item.title}</Text>
                            {updateTypeTag(item.type)}
                            {!item.isActive && <Tag color="red">Inativa</Tag>}
                            {item.module ? <Tag>{item.module}</Tag> : null}
                          </Space>

                          <Text type="secondary">
                            {dayjs(item.publishedAt || item.createdAt).format('DD/MM/YYYY HH:mm')}
                          </Text>

                          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {item.description || <Text type="secondary">Sem descrição</Text>}
                          </Paragraph>

                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Button icon={<EditOutlined />} block onClick={() => handleOpenEditUpdate(item)}>
                              Editar
                            </Button>

                            <Popconfirm
                              title="Remover esta atualização?"
                              onConfirm={() => removeUpdate.mutate(item.id)}
                            >
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
                    loading={updatesQ.isLoading}
                    dataSource={updateRows}
                    columns={updateColumns as any}
                    pagination={{ pageSize: 10 }}
                  />
                ),
            },
          ]}
        />
      </Card>

      <Modal
        title={isEditingNews ? 'Editar notícia' : 'Nova notícia'}
        open={openNewsModal}
        onCancel={handleCloseNewsModal}
        onOk={() => newsForm.submit()}
        destroyOnHidden
        okText={isEditingNews ? 'Salvar' : 'Publicar'}
        width={isMobile ? '96vw' : 720}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        confirmLoading={createNews.isPending || updateNews.isPending}
      >
        <Form
          layout="vertical"
          form={newsForm}
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

            if (isEditingNews && editingNews?.id) {
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
                setNewsImgFile(file);
                return false;
              }}
              onRemove={() => setNewsImgFile(null)}
              listType="picture"
            >
              <Button icon={<UploadOutlined />} block={isMobile}>
                Selecionar imagem
              </Button>
            </Upload>

            {isEditingNews && editingNews?.imageUrl && !newsImgFile && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Imagem atual:</Text>
                <div style={{ marginTop: 8 }}>
                  <Image src={editingNews.imageUrl} width={140} style={{ borderRadius: 8 }} />
                </div>
              </div>
            )}
          </Form.Item>

          <Form.Item name="isActive" label="Ativa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={isEditingBanner ? 'Editar banner' : 'Novo banner'}
        open={openBannerModal}
        onCancel={handleCloseBannerModal}
        onOk={() => bannerForm.submit()}
        destroyOnHidden
        okText={isEditingBanner ? 'Salvar' : 'Criar'}
        width={isMobile ? '96vw' : 720}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        confirmLoading={createBanner.isPending || updateBanner.isPending}
      >
        <Form
          layout="vertical"
          form={bannerForm}
          initialValues={{
            title: '',
            subtitle: '',
            buttonLabel: '',
            buttonUrl: '',
            sortOrder: 0,
            isActive: true,
            startsAt: null,
            endsAt: null,
          }}
          onFinish={(v) => {
            if (isEditingBanner && editingBanner?.id) {
              updateBanner.mutate({ id: editingBanner.id, payload: v });
            } else {
              createBanner.mutate(v);
            }
          }}
        >
          <Form.Item
            name="title"
            label="Título"
            rules={[{ required: true, message: 'Informe o título do banner' }]}
          >
            <Input maxLength={140} showCount />
          </Form.Item>

          <Form.Item name="subtitle" label="Subtítulo">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item name="sortOrder" label="Ordem de exibição">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>

          <Form.Item name="buttonLabel" label="Texto do botão">
            <Input placeholder="Ex: Saiba mais" />
          </Form.Item>

          <Form.Item name="buttonUrl" label="Link do botão">
            <Input placeholder="Ex: /noticias ou https://..." />
          </Form.Item>

          <Space
            style={{ width: '100%', display: 'flex', marginBottom: 8 }}
            direction={isMobile ? 'vertical' : 'horizontal'}
          >
            <Form.Item name="startsAt" label="Início de exibição" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item name="endsAt" label="Fim de exibição" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>

          <Form.Item label="Imagem do banner">
            <Upload
              accept="image/*"
              maxCount={1}
              beforeUpload={(file) => {
                setBannerImgFile(file);
                return false;
              }}
              onRemove={() => setBannerImgFile(null)}
              listType="picture"
            >
              <Button icon={<UploadOutlined />} block={isMobile}>
                Selecionar imagem
              </Button>
            </Upload>

            {isEditingBanner && editingBanner?.imageUrl && !bannerImgFile && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Imagem atual:</Text>
                <div style={{ marginTop: 8 }}>
                  <Image src={editingBanner.imageUrl} width={180} style={{ borderRadius: 10 }} />
                </div>
              </div>
            )}
          </Form.Item>

          <Form.Item name="isActive" label="Ativo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={isEditingUpdate ? 'Editar atualização' : 'Nova atualização'}
        open={openUpdateModal}
        onCancel={handleCloseUpdateModal}
        onOk={() => updateForm.submit()}
        destroyOnHidden
        okText={isEditingUpdate ? 'Salvar' : 'Publicar'}
        width={isMobile ? '96vw' : 720}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        confirmLoading={createUpdate.isPending || updateUpdate.isPending}
      >
        <Form
          layout="vertical"
          form={updateForm}
          initialValues={{
            title: '',
            description: '',
            type: 'MELHORIA',
            module: '',
            isActive: true,
            publishedAt: dayjs(),
          }}
          onFinish={(v) => {
            if (isEditingUpdate && editingUpdate?.id) {
              updateUpdate.mutate({ id: editingUpdate.id, payload: v });
            } else {
              createUpdate.mutate(v);
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
            name="description"
            label="Descrição"
            rules={[{ required: true, message: 'Informe a descrição' }]}
          >
            <Input.TextArea rows={5} />
          </Form.Item>

          <Space
            style={{ width: '100%', display: 'flex', marginBottom: 8 }}
            direction={isMobile ? 'vertical' : 'horizontal'}
          >
            <Form.Item
              name="type"
              label="Tipo"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Selecione o tipo' }]}
            >
              <Select
                options={[
                  { value: 'NOVO', label: 'Novo' },
                  { value: 'MELHORIA', label: 'Melhoria' },
                  { value: 'CORRECAO', label: 'Correção' },
                  { value: 'AVISO', label: 'Aviso' },
                ]}
              />
            </Form.Item>

            <Form.Item name="module" label="Módulo" style={{ flex: 1 }}>
              <Input placeholder="Ex: Dashboard, Entregas, Projetos..." />
            </Form.Item>
          </Space>

          <Form.Item name="publishedAt" label="Data de publicação">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="DD/MM/YYYY HH:mm"
            />
          </Form.Item>

          <Form.Item name="isActive" label="Ativa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}