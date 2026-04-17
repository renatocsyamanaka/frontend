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

function getQuickLinkTheme(key: string) {
  const themes: Record<
    string,
    {
      bg: string;
      border: string;
      iconBg: string;
      iconColor: string;
      accent: string;
    }
  > = {
    'installation-projects': {
      bg: '#eef6ff',
      border: '#bfdbfe',
      iconBg: '#dbeafe',
      iconColor: '#1565c0',
      accent: '#1565c0',
    },
    'delivery-reports': {
      bg: '#eef8ff',
      border: '#cfe8fb',
      iconBg: '#d9efff',
      iconColor: '#0277bd',
      accent: '#0277bd',
    },
    needs: {
      bg: '#f3efff',
      border: '#ddd6fe',
      iconBg: '#ede9fe',
      iconColor: '#6d28d9',
      accent: '#6d28d9',
    },
    'tech-map': {
      bg: '#eefbf4',
      border: '#bbf7d0',
      iconBg: '#dcfce7',
      iconColor: '#059669',
      accent: '#059669',
    },
    users: {
      bg: '#fff4ec',
      border: '#fed7aa',
      iconBg: '#ffedd5',
      iconColor: '#ea580c',
      accent: '#ea580c',
    },
    clients: {
      bg: '#eef3ff',
      border: '#c7d2fe',
      iconBg: '#e0e7ff',
      iconColor: '#3949ab',
      accent: '#3949ab',
    },
    news: {
      bg: '#fff1f7',
      border: '#fbcfe8',
      iconBg: '#fce7f3',
      iconColor: '#db2777',
      accent: '#db2777',
    },
    planning: {
      bg: '#eef4ff',
      border: '#c7d2fe',
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      accent: '#2563eb',
    },
  };

  return (
    themes[key] || {
      bg: '#f8fafc',
      border: '#e2e8f0',
      iconBg: '#e2e8f0',
      iconColor: '#334155',
      accent: '#334155',
    }
  );
}

function ScrollArea({
  children,
  height,
}: {
  children: React.ReactNode;
  height: number | string;
}) {
  return (
    <div
      style={{
        height,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: 4,
      }}
    >
      {children}
    </div>
  );
}

export default function Dashboard() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const { user } = useAuth() as { user: any };

  const [openUpdatesModal, setOpenUpdatesModal] = useState(false);
  const [updatesPage, setUpdatesPage] = useState(1);
  const updatesPageSize = 5;

  const sidePanelHeight = isMobile ? 'auto' : 420;
  const quickNewsHeight = isMobile ? 'auto' : 520;

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
      .sort(
        (a, b) =>
          dayjs(b.publishedAt || b.createdAt).valueOf() -
          dayjs(a.publishedAt || a.createdAt).valueOf()
      );
  }, [updatesQuery.data]);

  const updates = useMemo(() => {
    return allUpdates.slice(0, 6);
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
        path: '/projetos-instalacao',
        icon: <ProjectOutlined />,
        permission: 'INSTALLATION_PROJECTS_VIEW',
      },
      {
        key: 'delivery-reports',
        label: 'Relatório de Entregas',
        path: '/relatorios-entrega',
        icon: <DatabaseOutlined />,
        permission: 'DELIVERY_REPORTS_VIEW',
      },
      {
        key: 'needs',
        label: 'Prospecção / Homologação',
        path: '/requisicoes',
        icon: <FileSearchOutlined />,
        permission: 'NEEDS_VIEW',
      },
      {
        key: 'tech-map',
        label: 'Mapa de Técnicos',
        path: '/mapa-tecnicos',
        icon: <EnvironmentOutlined />,
        permission: 'TECHS_MAP_VIEW',
      },
      {
        key: 'users',
        label: 'Usuários',
        path: '/colaboradores',
        icon: <TeamOutlined />,
        permission: 'USERS_VIEW',
      },
      {
        key: 'clients',
        label: 'Clientes',
        path: '/clientes',
        icon: <ToolOutlined />,
        permission: 'CLIENTS_VIEW',
      },
      {
        key: 'news',
        label: 'Notícias',
        path: '/noticias',
        icon: <NotificationOutlined />,
        permission: 'NEWS_VIEW',
      },
      {
        key: 'planning',
        label: 'Planejamento CIA',
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
          <Title level={2} style={{ margin: 0, fontSize: isMobile ? 24 : 28 }}>
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

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={16}>
          <Card
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              height: sidePanelHeight,
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            styles={{ body: { padding: 0, height: '100%' } }}
          >
            {bannersQuery.isLoading ? (
              <Skeleton.Image style={{ width: '100%', height: '100%' }} active />
            ) : banners.length === 0 ? (
              <div
                style={{
                  height: '100%',
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
                  <Title level={isMobile ? 4 : 3} style={{ color: '#fff', marginBottom: 8 }}>
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
                        height: sidePanelHeight,
                        overflow: 'hidden',
                        background: '#0f172a',
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
                          transform: 'scale(1.02)',
                        }}
                      />

                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'linear-gradient(100deg, rgba(2, 18, 35, 0.92) 0%, rgba(8, 47, 89, 0.76) 40%, rgba(15, 118, 200, 0.18) 100%)',
                        }}
                      />

                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 28%)',
                        }}
                      />

                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: isMobile ? 18 : 28,
                          gap: 24,
                        }}
                      >
                        <div style={{ maxWidth: isMobile ? '100%' : '58%' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 12px',
                              borderRadius: 999,
                              background: 'rgba(255,255,255,0.12)',
                              border: '1px solid rgba(255,255,255,0.18)',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 700,
                              marginBottom: 14,
                            }}
                          >
                            Portal corporativo
                          </div>

                          <Title
                            level={isMobile ? 4 : 2}
                            style={{
                              color: '#fff',
                              margin: 0,
                              lineHeight: 1.1,
                              fontSize: isMobile ? 28 : 34,
                            }}
                          >
                            {banner.title}
                          </Title>

                          {banner.subtitle ? (
                            <Paragraph
                              style={{
                                color: 'rgba(255,255,255,0.92)',
                                marginTop: 12,
                                marginBottom: 18,
                                fontSize: isMobile ? 14 : 16,
                                lineHeight: 1.55,
                                maxWidth: 720,
                              }}
                            >
                              {truncateText(banner.subtitle, isMobile ? 130 : 220)}
                            </Paragraph>
                          ) : null}

                          {banner.buttonLabel && banner.buttonUrl ? (
                            <Button
                              type="primary"
                              size="large"
                              style={{
                                borderRadius: 12,
                                height: 42,
                                paddingInline: 18,
                                fontWeight: 700,
                                boxShadow: '0 10px 24px rgba(37, 99, 235, 0.28)',
                              }}
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

                        {!isMobile ? (
                          <div
                            style={{
                              width: 260,
                              minWidth: 260,
                              height: 300,
                              borderRadius: 24,
                              background: 'rgba(255,255,255,0.14)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              backdropFilter: 'blur(14px)',
                              boxShadow: '0 18px 42px rgba(2, 12, 27, 0.28)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 16,
                            }}
                          >
                            <img
                              src={banner.imageUrl || ''}
                              alt={banner.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: 18,
                                opacity: 0.95,
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </Carousel>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title="Atualizações recentes"
            extra={
              allUpdates.length > 0 ? (
                <Button
                  type="link"
                  style={{ paddingInline: 0, fontWeight: 600 }}
                  onClick={() => {
                    setUpdatesPage(1);
                    setOpenUpdatesModal(true);
                  }}
                >
                  Ver todas
                </Button>
              ) : null
            }
            style={{
              borderRadius: 24,
              height: sidePanelHeight,
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            styles={{
              body: {
                padding: isMobile ? 12 : 16,
                height: isMobile ? 'auto' : sidePanelHeight - 58,
              },
            }}
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
              <ScrollArea height="100%">
                <List
                  dataSource={updates}
                  split
                  renderItem={(item) => (
                    <List.Item key={item.id} style={{ paddingBlock: 12 }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap size={[6, 6]}>
                          {item.type ? (
                            <Tag color={updateTagColor(item.type)} style={{ marginInlineEnd: 0 }}>
                              {item.type}
                            </Tag>
                          ) : null}

                          {item.module ? (
                            <Tag style={{ marginInlineEnd: 0 }}>{item.module}</Tag>
                          ) : null}
                        </Space>

                        <Text
                          strong
                          style={{
                            fontSize: 15,
                            lineHeight: 1.35,
                            color: '#0f172a',
                          }}
                        >
                          {item.title}
                        </Text>

                        {item.description ? (
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 12,
                              lineHeight: 1.55,
                            }}
                          >
                            {truncateText(item.description, 140)}
                          </Text>
                        ) : null}

                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(item.publishedAt || item.createdAt).format('DD/MM/YYYY HH:mm')}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </ScrollArea>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={12}>
          <Card
            title="Acesso rápido"
            style={{
              borderRadius: 24,
              height: '100%',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            styles={{
              body: {
                padding: isMobile ? 12 : 16,
              },
            }}
          >
            {quickLinks.length === 0 ? (
              <Empty description="Nenhum acesso disponível para este perfil." />
            ) : (
              <Row gutter={[12, 12]}>
                {quickLinks.map((item) => {
                  const theme = getQuickLinkTheme(item.key);

                  return (
                    <Col xs={24} md={12} key={item.key}>
                      <Card
                        hoverable
                        onClick={() => navigate(item.path)}
                        style={{
                          borderRadius: 18,
                          height: '100%',
                          border: `1px solid ${theme.border}`,
                          background: theme.bg,
                          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                        styles={{
                          body: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 14,
                            minHeight: 92,
                            padding: '14px 16px',
                            position: 'relative',
                            zIndex: 1,
                          },
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 4,
                            height: '100%',
                            background: theme.accent,
                          }}
                        />

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: theme.iconBg,
                              color: theme.iconColor,
                              fontSize: 18,
                              flexShrink: 0,
                              boxShadow: `0 8px 18px ${theme.iconColor}22`,
                            }}
                          >
                            {item.icon}
                          </div>

                          <div
                            style={{
                              minWidth: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                            }}
                          >
                            <Text
                              strong
                              style={{
                                fontSize: 15,
                                lineHeight: 1.25,
                                color: '#0f172a',
                              }}
                            >
                              {item.label}
                            </Text>

                            <Button
                              type="link"
                              size="small"
                              style={{
                                padding: 0,
                                height: 'auto',
                                justifyContent: 'flex-start',
                                fontSize: 13,
                                fontWeight: 700,
                                color: theme.accent,
                              }}
                            >
                              Acessar <ArrowRightOutlined />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title="Notícias recentes"
            extra={<Link to="/noticias">Ver todas</Link>}
            style={{
              borderRadius: 24,
              height: quickNewsHeight,
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            styles={{
              body: {
                padding: isMobile ? 12 : 16,
                height: isMobile ? 'auto' : quickNewsHeight - 58,
              },
            }}
          >
            {newsQuery.isLoading ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Skeleton active paragraph={{ rows: 2 }} />
                <Skeleton active paragraph={{ rows: 2 }} />
                <Skeleton active paragraph={{ rows: 2 }} />
              </Space>
            ) : news.length === 0 ? (
              <Empty description="Nenhuma notícia disponível." />
            ) : (
              <ScrollArea height="100%">
                <List
                  dataSource={news}
                  split
                  renderItem={(item) => (
                    <List.Item key={item.id} style={{ paddingBlock: 12 }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: item.imageUrl ? '84px 1fr' : '1fr',
                          gap: 12,
                          width: '100%',
                          alignItems: 'flex-start',
                        }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            style={{
                              width: 84,
                              height: 84,
                              objectFit: 'cover',
                              borderRadius: 14,
                              border: '1px solid #e5e7eb',
                              display: 'block',
                              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                            }}
                          />
                        ) : null}

                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space wrap size={[6, 6]}>
                            {item.category ? (
                              <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                                {item.category}
                              </Tag>
                            ) : null}

                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                            </Text>
                          </Space>

                          <Text
                            strong
                            style={{
                              fontSize: 15,
                              lineHeight: 1.35,
                              color: '#0f172a',
                            }}
                          >
                            {item.title}
                          </Text>

                          <Text
                            type="secondary"
                            style={{
                              fontSize: 12,
                              lineHeight: 1.55,
                            }}
                          >
                            {truncateText(item.content, 140)}
                          </Text>
                        </Space>
                      </div>
                    </List.Item>
                  )}
                />
              </ScrollArea>
            )}
          </Card>
        </Col>
      </Row>

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
                        {dayjs(item.publishedAt || item.createdAt).format('DD/MM/YYYY HH:mm')}
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
    </div>
  );
}