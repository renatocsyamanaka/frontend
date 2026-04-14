import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Carousel,
  Col,
  Empty,
  Grid,
  List,
  Modal,
  Pagination,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  FileSearchOutlined,
  NotificationOutlined,
  ProfileOutlined,
  ProjectOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../auth/AuthProvider';
import { hasPermission } from '../auth/access';

type News = {
  id: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  category?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
};

type SystemUpdate = {
  id: number;
  title: string;
  description?: string | null;
  type?: string | null;
  module?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  isActive?: boolean;
};

const { Title, Text, Paragraph } = Typography;

function isBannerVisible(banner: DashboardBanner) {
  if (!banner?.isActive) return false;

  const now = dayjs();
  const afterStart =
    !banner.startsAt ||
    dayjs(banner.startsAt).isBefore(now) ||
    dayjs(banner.startsAt).isSame(now);
  const beforeEnd =
    !banner.endsAt ||
    dayjs(banner.endsAt).isAfter(now) ||
    dayjs(banner.endsAt).isSame(now);

  return afterStart && beforeEnd;
}

function truncateText(text?: string | null, max = 140) {
  const value = String(text || '').trim();
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function updateTagColor(type?: string | null) {
  if (type === 'NOVO') return 'green';
  if (type === 'MELHORIA') return 'blue';
  if (type === 'CORRECAO') return 'orange';
  if (type === 'AVISO') return 'purple';
  return 'default';
}

export default function Dashboard() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const { user } = useAuth() as { user: any };

  const [openUpdatesModal, setOpenUpdatesModal] = useState(false);
  const [updatesPage, setUpdatesPage] = useState(1);
  const updatesPageSize = 5;

  const newsQuery = useQuery<News[]>({
    queryKey: ['news', 'dashboard-home'],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data?.data ?? res.data ?? [];
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const bannersQuery = useQuery<DashboardBanner[]>({
    queryKey: ['dashboard-banners', 'dashboard-home'],
    queryFn: async () => {
      const res = await api.get('/dashboard-banners', {
        params: { onlyActive: true },
      });
      return res.data?.data ?? res.data ?? [];
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const updatesQuery = useQuery<SystemUpdate[]>({
    queryKey: ['system-updates', 'dashboard-home'],
    queryFn: async () => {
      const res = await api.get('/system-updates', {
        params: { onlyActive: true },
      });
      return res.data?.data ?? res.data ?? [];
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const banners = useMemo(() => {
    return [...(bannersQuery.data || [])]
      .filter(isBannerVisible)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }, [bannersQuery.data]);

  const news = useMemo(() => {
    return [...(newsQuery.data || [])]
      .filter((n) => n.isActive !== false)
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
      .slice(0, 6);
  }, [newsQuery.data]);

  const allUpdates = useMemo(() => {
    return [...(updatesQuery.data || [])]
      .filter((item) => item.isActive !== false)
      .sort((a, b) =>
        dayjs(b.publishedAt || b.createdAt).valueOf() -
        dayjs(a.publishedAt || a.createdAt).valueOf()
      );
  }, [updatesQuery.data]);

  const updates = useMemo(() => {
    return allUpdates.slice(0, 3);
  }, [allUpdates]);

  const paginatedUpdates = useMemo(() => {
    const start = (updatesPage - 1) * updatesPageSize;
    const end = start + updatesPageSize;
    return allUpdates.slice(start, end);
  }, [allUpdates, updatesPage]);

  const quickLinks = useMemo(() => {
    const items = [
      {
        key: 'installation-projects',
        label: 'Projetos de Instalação',
        description: 'Acompanhe projetos, progresso e produtividade.',
        path: '/projetos-instalacao',
        icon: <ProjectOutlined />,
        permission: 'INSTALLATION_PROJECTS_VIEW',
      },
      {
        key: 'delivery-reports',
        label: 'Relatório de Entregas',
        description: 'Consulte CTEs, SLA, regiões e indicadores.',
        path: '/relatorios-entrega',
        icon: <DatabaseOutlined />,
        permission: 'DELIVERY_REPORTS_VIEW',
      },
      {
        key: 'needs',
        label: 'Prospecção / Homologação',
        description: 'Gerencie solicitações e homologações.',
        path: '/requisicoes',
        icon: <FileSearchOutlined />,
        permission: 'NEEDS_VIEW',
      },
      {
        key: 'tech-map',
        label: 'Mapa de Técnicos',
        description: 'Visualize localizações de prestadores.',
        path: '/mapa-tecnicos',
        icon: <EnvironmentOutlined />,
        permission: 'TECHS_MAP_VIEW',
      },
      {
        key: 'users',
        label: 'Usuários',
        description: 'Acesse cadastros e estrutura organizacional.',
        path: '/colaboradores',
        icon: <TeamOutlined />,
        permission: 'USERS_VIEW',
      },
      {
        key: 'clients',
        label: 'Clientes',
        description: 'Consulte a base de clientes do portal.',
        path: '/clientes',
        icon: <ToolOutlined />,
        permission: 'CLIENTS_VIEW',
      },
      {
        key: 'news',
        label: 'Notícias',
        description: 'Veja comunicados e novidades internas.',
        path: '/noticias',
        icon: <NotificationOutlined />,
        permission: 'NEWS_VIEW',
      },
      {
        key: 'planning',
        label: 'Planejamento CIA',
        description: 'Acesse o planejamento operacional.',
        path: '/planejamento-cia',
        icon: <ProfileOutlined />,
        permission: 'DASHBOARD_ACTIVITY_VIEW',
      },
    ];

    return items.filter((item) => hasPermission(user, item.permission));
  }, [user]);

  return (
    <div style={{ display: 'grid', gap: isMobile ? 12 : 16 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Dashboard
          </Title>
          <Text type="secondary">
            Acompanhe notícias, banners, atualizações e acessos rápidos.
          </Text>
        </div>

        <Space wrap>
          {hasPermission(user, 'NEWS_ADMIN_VIEW') && (
            <Link to="/noticias-admin">Gerenciar conteúdo</Link>
          )}
        </Space>
      </div>

      <Card
        style={{ borderRadius: 24, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        {bannersQuery.isLoading ? (
          <Skeleton.Image style={{ width: '100%', height: isMobile ? 220 : 360 }} active />
        ) : banners.length === 0 ? (
          <div
            style={{
              minHeight: isMobile ? 220 : 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1F71B8 100%)',
              color: '#fff',
              textAlign: 'center',
              padding: 24,
            }}
          >
            <div>
              <Title
                level={isMobile ? 4 : 2}
                style={{ color: '#fff', marginBottom: 8 }}
              >
                Bem-vindo ao Portal
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.88)' }}>
                Cadastre banners na central de conteúdo para exibir aqui.
              </Text>
            </div>
          </div>
        ) : (
          <Carousel autoplay dots>
            {banners.map((banner) => (
              <div key={banner.id}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: isMobile ? 240 : 360,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={banner.imageUrl || ''}
                    alt={banner.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(90deg, rgba(3,27,49,0.85) 0%, rgba(3,27,49,0.55) 45%, rgba(3,27,49,0.16) 100%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        padding: isMobile ? 18 : 30,
                        maxWidth: isMobile ? '100%' : '58%',
                      }}
                    >
                      <Title
                        level={isMobile ? 4 : 2}
                        style={{ color: '#fff', margin: 0 }}
                      >
                        {banner.title}
                      </Title>

                      {banner.subtitle ? (
                        <Paragraph
                          style={{
                            color: 'rgba(255,255,255,0.92)',
                            marginTop: 10,
                            marginBottom: 16,
                            fontSize: isMobile ? 14 : 16,
                          }}
                        >
                          {banner.subtitle}
                        </Paragraph>
                      ) : null}

                      {banner.buttonLabel && banner.buttonUrl ? (
                        <Button
                          type="primary"
                          size={isMobile ? 'middle' : 'large'}
                          onClick={() => {
                            if (!banner.buttonUrl) return;
                            if (/^https?:\/\//i.test(banner.buttonUrl)) {
                              window.open(banner.buttonUrl, '_blank');
                              return;
                            }
                            navigate(banner.buttonUrl);
                          }}
                        >
                          {banner.buttonLabel}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
        )}
      </Card>

      <Card
        title="Acesso rápido"
        style={{ borderRadius: 24 }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        {quickLinks.length === 0 ? (
          <Empty description="Nenhum acesso disponível para este perfil." />
        ) : (
          <Row gutter={[12, 12]}>
            {quickLinks.map((item) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={item.key}>
                <Card
                  hoverable
                  onClick={() => navigate(item.path)}
                  style={{
                    borderRadius: 18,
                    height: '100%',
                    border: '1px solid #e5e7eb',
                  }}
                  styles={{
                    body: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      minHeight: 170,
                    },
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      color: '#1F71B8',
                      fontSize: 20,
                    }}
                  >
                    {item.icon}
                  </div>

                  <Title level={5} style={{ margin: 0 }}>
                    {item.label}
                  </Title>

                  <Text type="secondary">{item.description}</Text>

                  <div style={{ marginTop: 'auto' }}>
                    <Button type="link" style={{ paddingLeft: 0 }}>
                      Acessar <ArrowRightOutlined />
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title="Notícias recentes"
            extra={<Link to="/noticias">Ver todas</Link>}
            style={{ borderRadius: 24, height: '100%' }}
            styles={{ body: { padding: isMobile ? 12 : 20 } }}
          >
            {newsQuery.isLoading ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Skeleton active paragraph={{ rows: 3 }} />
                <Skeleton active paragraph={{ rows: 3 }} />
              </Space>
            ) : news.length === 0 ? (
              <Empty description="Nenhuma notícia disponível." />
            ) : (
              <List
                itemLayout="vertical"
                dataSource={news}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          item.imageUrl && !isMobile ? '140px 1fr' : '1fr',
                        gap: 14,
                      }}
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          style={{
                            width: '100%',
                            maxWidth: isMobile ? '100%' : 140,
                            height: isMobile ? 180 : 96,
                            objectFit: 'cover',
                            borderRadius: 12,
                          }}
                        />
                      )}

                      <div>
                        <Space wrap style={{ marginBottom: 6 }}>
                          {item.category ? <Tag color="blue">{item.category}</Tag> : null}
                          <Text type="secondary">
                            {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </Space>

                        <Title level={5} style={{ marginTop: 0, marginBottom: 6 }}>
                          {item.title}
                        </Title>

                        <Paragraph style={{ marginBottom: 0 }}>
                          {String(item.content || '').length > 180
                            ? `${String(item.content).slice(0, 180)}…`
                            : item.content}
                        </Paragraph>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title="Atualizações recentes"
            extra={
              allUpdates.length > 0 ? (
                <Button
                  type="link"
                  style={{ paddingInline: 0 }}
                  onClick={() => {
                    setUpdatesPage(1);
                    setOpenUpdatesModal(true);
                  }}
                >
                  Ver todas
                </Button>
              ) : null
            }
            style={{ borderRadius: 24, height: '100%' }}
            styles={{ body: { padding: isMobile ? 12 : 20 } }}
          >
            {updatesQuery.isLoading ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Skeleton active paragraph={{ rows: 2 }} />
                <Skeleton active paragraph={{ rows: 2 }} />
                <Skeleton active paragraph={{ rows: 2 }} />
              </Space>
            ) : updates.length === 0 ? (
              <Empty description="Nenhuma atualização publicada." />
            ) : (
              <List
                dataSource={updates}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        {item.type ? (
                          <Tag color={updateTagColor(item.type)}>{item.type}</Tag>
                        ) : null}
                        {item.module ? <Tag>{item.module}</Tag> : null}
                        <Text type="secondary">
                          {dayjs(item.publishedAt || item.createdAt).format(
                            'DD/MM/YYYY HH:mm'
                          )}
                        </Text>
                      </Space>

                      <Text strong>{item.title}</Text>

                      {item.description ? (
                        <Text type="secondary">
                          {truncateText(item.description, 140)}
                        </Text>
                      ) : null}
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Modal
            title="Todas as atualizações"
            open={openUpdatesModal}
            onCancel={() => setOpenUpdatesModal(false)}
            footer={null}
            width={isMobile ? '96vw' : 860}
            destroyOnHidden
          >
            {allUpdates.length === 0 ? (
              <Empty description="Nenhuma atualização encontrada." />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <List
                  dataSource={paginatedUpdates}
                  renderItem={(item) => (
                    <List.Item key={item.id}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          {item.type ? (
                            <Tag color={updateTagColor(item.type)}>{item.type}</Tag>
                          ) : null}
                          {item.module ? <Tag>{item.module}</Tag> : null}
                          <Text type="secondary">
                            {dayjs(item.publishedAt || item.createdAt).format(
                              'DD/MM/YYYY HH:mm'
                            )}
                          </Text>
                        </Space>

                        <Title level={5} style={{ margin: 0 }}>
                          {item.title}
                        </Title>

                        {item.description ? (
                          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                            {item.description}
                          </Paragraph>
                        ) : null}
                      </Space>
                    </List.Item>
                  )}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Pagination
                    current={updatesPage}
                    pageSize={updatesPageSize}
                    total={allUpdates.length}
                    onChange={(page) => setUpdatesPage(page)}
                    size={isMobile ? 'small' : 'default'}
                    showSizeChanger={false}
                  />
                </div>
              </Space>
            )}
          </Modal>
        </Col>
      </Row>
    </div>
  );
}