import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Layout, Menu, Grid, Drawer, Button, Avatar, Typography, Space } from 'antd';
import {
  HomeOutlined,
  ToolOutlined,
  TeamOutlined,
  ClusterOutlined,
  NotificationOutlined,
  ProfileOutlined,
  ScheduleOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  ProjectOutlined,
  MenuOutlined,
  EnvironmentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import HeaderTasksBell from '../tasks/HeaderTasksBell';
import ProfileModal from '../tasks/ProfileModal';
import { hasPermission, getUserLevel } from '../auth/access';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const BRAND = '#1F71B8';
const SIDEBAR_BG = '#031B31';
const SIDEBAR_BG_2 = '#052542';
const HEADER_BG = '#FFFFFF';
const ACTIVE_BG = '#1F71B8';
const HOVER_BG = 'rgba(31, 113, 184, 0.18)';
const TEXT_PRIMARY = '#EAF4FF';
const TEXT_SECONDARY = '#A9C3DA';

const SECTOR_LABELS: Record<string, string> = {
  OPERACOES: 'Operações',
  LOGISTICA: 'Logística',
  SISTEMAS: 'Sistemas',
  ATENDIMENTO: 'Atendimento',
  GESTAO: 'Gestão',
};

const abs = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  return base ? `${base}/${String(url).replace(/^\/+/, '')}` : url;
};

function getSectorLabel(sector?: string) {
  if (!sector) return '';
  return SECTOR_LABELS[sector] || sector;
}

function getUserSectors(user: any) {
  if (!Array.isArray(user?.sectors) || user.sectors.length === 0) {
    return ['GESTAO'];
  }

  const arr = user.sectors
    .map((sector: string) => String(sector || '').trim().toUpperCase())
    .filter(Boolean);

  return arr.length ? arr : ['GESTAO'];
}

export function AppLayout() {
  const { user, logout, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const contentRef = useRef<HTMLDivElement | null>(null);
  const bellWrapRef = useRef<HTMLDivElement | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  getUserLevel(user);

  const sectors = getUserSectors(user);
  const sectorsLabel =
    sectors.length > 0 ? sectors.map(getSectorLabel).join(' • ') : 'Gestão';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const pageBody = document.querySelector('.app-layout-content-scroll');
    if (pageBody instanceof HTMLElement) {
      pageBody.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [location.pathname, isMobile]);

  const menuConfig = [
    {
      key: '/',
      label: 'Painel',
      icon: <HomeOutlined />,
      permission: 'DASHBOARD_VIEW',
    },
    {
      key: '/projetos-instalacao',
      label: 'Projetos de Instalação',
      icon: <ProjectOutlined />,
      permission: 'INSTALLATION_PROJECTS_VIEW',
    },
    {
      key: '/pedidos-pecas',
      label: 'Pedidos de Peças',
      icon: <DatabaseOutlined />,
      permission: 'PART_REQUESTS_VIEW',
    },
    {
      key: '/planejamento-cia',
      label: 'Planejamento CIA',
      icon: <ProfileOutlined />,
      permission: 'DASHBOARD_ACTIVITY_VIEW',
    },
    {
      key: '/relatorios-entrega',
      label: 'Relatório de Entregas',
      icon: <DatabaseOutlined />,
      permission: 'DELIVERY_REPORTS_VIEW',
    },
    {
      key: '/meus-pedidos-pecas',
      label: 'Meus Pedidos de Peças',
      icon: <ProfileOutlined />,
      permission: 'MY_PART_REQUESTS_VIEW',
    },
    {
      key: '/mapa-tecnicos',
      label: 'Mapa de Técnicos',
      icon: <ToolOutlined />,
      permission: 'TECHS_MAP_VIEW',
    },
    {
      key: '/colaboradores',
      label: 'Colaboradores',
      icon: <TeamOutlined />,
      permission: 'USERS_VIEW',
    },
    {
      key: '/organograma',
      label: 'Organograma',
      icon: <ClusterOutlined />,
      permission: 'ORG_VIEW',
    },
    {
      key: '/clientes',
      label: 'Clientes',
      icon: <ProfileOutlined />,
      permission: 'CLIENTS_VIEW',
    },
    {
      key: '/demandas',
      label: 'Demandas',
      icon: <ProfileOutlined />,
      permission: 'TASKS_VIEW',
    },
    {
      key: '/tipos-tecnicos',
      label: 'Tipos de Técnicos',
      icon: <ToolOutlined />,
      permission: 'TECH_TYPES_VIEW',
    },
    {
      key: '/requisicoes',
      label: 'Prospecções Operação',
      icon: <DatabaseOutlined />,
      permission: 'NEEDS_VIEW',
    },
    {
      key: '/requisicoes/mapa',
      label: 'Mapa de solicitações',
      icon: <EnvironmentOutlined />,
      permission: 'NEEDS_MAP_VIEW',
    },
    {
      key: '/agenda',
      label: 'Agenda',
      icon: <ScheduleOutlined />,
      permission: 'ASSIGNMENTS_VIEW',
    },
    {
      key: '/noticias',
      label: 'Notícias',
      icon: <NotificationOutlined />,
      permission: 'NEWS_VIEW',
    },
    {
      key: '/noticias-admin',
      label: 'Administração de Notícias',
      icon: <NotificationOutlined />,
      permission: 'NEWS_ADMIN_VIEW',
    },
  ];

  const visibleMenuConfig = useMemo(() => {
    return menuConfig.filter((item) => hasPermission(user, item.permission));
  }, [user]);

  const menuItems = useMemo(() => {
    return visibleMenuConfig.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: (
        <Link
          to={item.key}
          onClick={() => {
            if (isMobile) setDrawerOpen(false);
          }}
        >
          {item.label}
        </Link>
      ),
    }));
  }, [visibleMenuConfig, isMobile]);

  const selectedKey = useMemo(() => {
    const pathname = location.pathname;

    const found = visibleMenuConfig
      .map((item) => item.key)
      .sort((a, b) => b.length - a.length)
      .find((key) => (key === '/' ? pathname === '/' : pathname.startsWith(key)));

    return found ? [found] : [];
  }, [location.pathname, visibleMenuConfig]);

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    navigate('/login');
  };

  const handleActivityClick = () => {
    if (!bellWrapRef.current) return;

    const internalButton =
      bellWrapRef.current.querySelector('button') ||
      bellWrapRef.current.querySelector('[role="button"]') ||
      bellWrapRef.current.querySelector('.ant-btn');

    if (internalButton instanceof HTMLElement) {
      internalButton.click();
    }
  };

  const sidebarStyles = `
    .brand-sidebar {
      background: linear-gradient(180deg, ${SIDEBAR_BG} 0%, ${SIDEBAR_BG_2} 100%);
      color: ${TEXT_PRIMARY};
      height: 100%;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255,255,255,0.06);
      overflow: hidden;
    }

    .brand-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 6px 8px 10px 8px;
      scrollbar-width: thin;
      scrollbar-color: rgba(31, 113, 184, 0.75) transparent;
    }

    .brand-scroll::-webkit-scrollbar {
      width: 8px;
    }

    .brand-scroll::-webkit-scrollbar-track {
      background: transparent;
      margin: 10px 0;
    }

    .brand-scroll::-webkit-scrollbar-thumb {
      background: linear-gradient(
        180deg,
        rgba(31, 113, 184, 0.85),
        rgba(31, 113, 184, 0.45)
      );
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.08);
    }

    .brand-scroll::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(
        180deg,
        rgba(31, 113, 184, 1),
        rgba(31, 113, 184, 0.65)
      );
    }

    .brand-menu.ant-menu {
      background: transparent !important;
      border-inline-end: none !important;
      color: ${TEXT_SECONDARY} !important;
      padding: 0 !important;
    }

    .brand-menu .ant-menu-item {
      height: 48px;
      line-height: 48px;
      margin: 7px 0 !important;
      border-radius: 14px !important;
      color: ${TEXT_SECONDARY} !important;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.2s ease;
      padding-inline: 14px !important;
    }

    .brand-menu .ant-menu-item .ant-menu-title-content a {
      color: inherit !important;
    }

    .brand-menu .ant-menu-item .ant-menu-item-icon,
    .brand-menu .ant-menu-submenu-title .ant-menu-item-icon {
      color: ${TEXT_SECONDARY} !important;
      font-size: 18px;
    }

    .brand-menu .ant-menu-item:hover {
      background: ${HOVER_BG} !important;
      color: ${TEXT_PRIMARY} !important;
    }

    .brand-menu .ant-menu-item:hover .ant-menu-item-icon {
      color: ${TEXT_PRIMARY} !important;
    }

    .brand-menu .ant-menu-item-selected {
      background: ${ACTIVE_BG} !important;
      color: #ffffff !important;
      box-shadow: 0 10px 24px rgba(31, 113, 184, 0.28);
    }

    .brand-menu .ant-menu-item-selected .ant-menu-item-icon,
    .brand-menu .ant-menu-item-selected .ant-menu-title-content a {
      color: #ffffff !important;
    }

    .brand-menu .ant-menu-item::after {
      display: none !important;
    }

    .logout-menu.ant-menu {
      background: transparent !important;
      border-inline-end: none !important;
      padding: 0 8px 8px 8px;
    }

    .logout-menu .ant-menu-item {
      height: 46px;
      line-height: 46px;
      margin: 6px 0 !important;
      border-radius: 12px !important;
      color: ${TEXT_SECONDARY} !important;
      font-weight: 500;
    }

    .logout-menu .ant-menu-item:hover {
      background: rgba(255,255,255,0.08) !important;
      color: #ffffff !important;
    }

    .logout-menu .ant-menu-item .ant-menu-item-icon {
      color: inherit !important;
    }

    .header-profile-btn,
    .header-logout-btn {
      height: 44px !important;
      border-radius: 14px !important;
      padding: 0 16px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
      line-height: 1 !important;
    }

    .header-profile-btn {
      border: 1px solid #E6EEF7 !important;
      background: #fff !important;
    }

    .header-profile-btn:hover {
      border-color: ${BRAND} !important;
      color: ${BRAND} !important;
    }

    .header-logout-btn.ant-btn {
      height: 44px !important;
      border-radius: 14px !important;
      padding: 0 16px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }

    .header-logout-btn .anticon,
    .header-profile-btn .anticon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      line-height: 1 !important;
    }

    .header-bell-wrap {
      height: 44px;
      min-width: 44px;
      padding: 0 14px;
      border: 1px solid #E6EEF7;
      background: #fff;
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .header-bell-wrap:hover {
      border-color: ${BRAND};
    }

    .header-bell-wrap .header-bell-text {
      color: #16324F;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      user-select: none;
    }

    .header-bell-wrap .ant-btn,
    .header-bell-wrap button {
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      background: transparent !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: auto !important;
    }

    .header-bell-wrap * {
      pointer-events: none;
    }

    .header-bell-wrap .ant-badge,
    .header-bell-wrap .anticon {
      pointer-events: none;
    }
  `;

  const MenuBlock = (
    <>
      <style>{sidebarStyles}</style>

      <div className="brand-sidebar">
        <div
          style={{
            padding: '20px 18px 14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 6,
          }}
        >
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'transparent',
              border: 'none',
              width: '100%',
              padding: 0,
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <Avatar
              src={abs(user?.avatarUrl)}
              size={56}
              icon={<UserOutlined />}
              style={{
                background: BRAND,
                boxShadow: '0 6px 18px rgba(31,113,184,0.35)',
                flexShrink: 0,
              }}
            />

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 170,
                }}
              >
                {user?.name || 'Usuário'}
              </div>

              <Text
                style={{
                  color: '#D9ECFF',
                  fontSize: 12,
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 185,
                  marginTop: 4,
                }}
              >
                {sectorsLabel}
              </Text>
            </div>
          </button>
        </div>

        <div className="brand-scroll">
          <Menu
            className="brand-menu"
            theme="dark"
            mode="inline"
            selectedKeys={selectedKey}
            items={menuItems}
          />
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 8,
            marginTop: 'auto',
          }}
        >
          <Menu
            className="logout-menu"
            theme="dark"
            mode="inline"
            selectable={false}
            items={[
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Sair',
                onClick: handleLogout,
              },
            ]}
          />
        </div>
      </div>
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#F5F8FC' }}>
      {!isMobile && (
        <Sider
          width={280}
          theme="dark"
          style={{
            background: SIDEBAR_BG,
            boxShadow: '2px 0 16px rgba(3, 27, 49, 0.18)',
          }}
        >
          {MenuBlock}
        </Sider>
      )}

      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={300}
          styles={{
            body: { padding: 0, background: SIDEBAR_BG },
            header: { display: 'none' },
          }}
        >
          {MenuBlock}
        </Drawer>
      )}

      <Layout>
        <Header
          style={{
            background: HEADER_BG,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingInline: isMobile ? 12 : 24,
            gap: 12,
            borderBottom: '1px solid #E6EEF7',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ color: BRAND, fontSize: 18 }} />}
                onClick={() => setDrawerOpen(true)}
              />
            )}
          </div>

          <Space size={8} align="center">
            <div
              ref={bellWrapRef}
              className="header-bell-wrap"
              onClick={handleActivityClick}
              aria-label="Abrir atividades"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleActivityClick();
                }
              }}
            >
              <HeaderTasksBell />
              {!isMobile && <span className="header-bell-text">Atividade</span>}
            </div>

            <Button
              className="header-profile-btn"
              onClick={() => setProfileOpen(true)}
            >
              <Space size={8} align="center">
                <Avatar
                  size={30}
                  src={abs(user?.avatarUrl)}
                  icon={<UserOutlined />}
                  style={{ background: BRAND, flexShrink: 0 }}
                />
                {!isMobile && (
                  <Text strong style={{ color: '#16324F', lineHeight: 1 }}>
                    Meu Perfil
                  </Text>
                )}
              </Space>
            </Button>

            <Button
              danger
              className="header-logout-btn"
              icon={<LogoutOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Sair do sistema',
                  content: 'Deseja realmente sair?',
                  okText: 'Sair',
                  okButtonProps: { danger: true },
                  cancelText: 'Cancelar',
                  onOk: handleLogout,
                });
              }}
            >
              {!isMobile && 'Sair'}
            </Button>
          </Space>
        </Header>

        <Content
          ref={contentRef}
          className="app-layout-content-scroll"
          style={{
            margin: isMobile ? 12 : 20,
            background: 'transparent',
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUser={user}
        onUpdated={(updated) => {
          if (setUser) setUser(updated);
        }}
      />
    </Layout>
  );
}