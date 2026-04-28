import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Layout, Menu, Grid, Drawer, Button, Avatar, Typography, Space } from 'antd';
import type { MenuProps } from 'antd';
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
  WhatsAppOutlined,
  EnvironmentOutlined,
  UserOutlined,
  FileSearchOutlined,
  FundOutlined,
  LinkOutlined,
  SettingOutlined,
  FileImageOutlined,
  HistoryOutlined,
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

type AppUser = {
  id?: number;
  name?: string;
  avatarUrl?: string | null;
  sectors?: string[];
};

type MenuConfigItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  permission: string;
};

type MenuConfigGroup = {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: MenuConfigItem[];
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

function getUserSectors(user: AppUser | null | undefined) {
  if (!Array.isArray(user?.sectors) || user.sectors.length === 0) {
    return ['GESTAO'];
  }

  const arr = user.sectors
    .map((sector: string) => String(sector || '').trim().toUpperCase())
    .filter(Boolean);

  return arr.length ? arr : ['GESTAO'];
}

export function AppLayout() {
  const { user, logout, setUser } = useAuth() as {
    user: AppUser | null;
    logout: () => void;
    setUser?: (next: AppUser | null) => void;
  };

  const location = useLocation();
  const navigate = useNavigate();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const contentRef = useRef<HTMLDivElement | null>(null);
  const bellWrapRef = useRef<HTMLDivElement | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [openMenuKeys, setOpenMenuKeys] = useState<string[]>([]);

  const siderWidth = 280;
  const siderCollapsedWidth = 84;

  const collapsedSidebar = !isMobile && !sidebarHovered;

  getUserLevel(user);

  const sectors = getUserSectors(user);
  const sectorsLabel = sectors.length > 0 ? sectors.map(getSectorLabel).join(' • ') : 'Gestão';

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

  const menuConfig: MenuConfigGroup[] = [
    {
      key: 'group-operacoes',
      label: 'Operações',
      icon: <DatabaseOutlined />,
      children: [
        {
          key: '/projetos-instalacao',
          label: 'Projetos de Instalação',
          icon: <ProjectOutlined />,
          permission: 'INSTALLATION_PROJECTS_VIEW',
        },
        {
          key: '/projetos-instalacao/visao-cliente',
          label: 'Visão por Cliente',
          icon: <FundOutlined />,
          permission: 'INSTALLATION_PROJECTS_VIEW',
        },
        {
          key: '/pedidos-pecas',
          label: 'Pedidos de Peças',
          icon: <DatabaseOutlined />,
          permission: 'PART_REQUESTS_VIEW',
        },
        {
          key: '/meus-pedidos-pecas',
          label: 'Meus Pedidos de Peças',
          icon: <ProfileOutlined />,
          permission: 'MY_PART_REQUESTS_VIEW',
        },
      ],
    },
    {
      key: 'group-whatsapp',
      label: 'WhatsApp',
      icon: <WhatsAppOutlined />,
      children: [
        {
          key: '/whatsapp/conexao',
          label: 'Conexão',
          icon: <LinkOutlined />,
          permission: 'WHATSAPP_VIEW',
        },
        {
          key: '/whatsapp/conversas',
          label: 'Conversas',
          icon: <WhatsAppOutlined />,
          permission: 'WHATSAPP_VIEW',
        },
      ],
    },
    {
      key: 'group-prospeccao',
      label: 'Prospecção',
      icon: <FileSearchOutlined />,
      children: [
        {
          key: '/requisicoes',
          label: 'Prospecção / Homologação',
          icon: <FileSearchOutlined />,
          permission: 'NEEDS_VIEW',
        },
      ],
    },
    {
      key: 'group-planejamento',
      label: 'Planejamento',
      icon: <ProfileOutlined />,
      children: [
        {
          key: '/planejamento-cia',
          label: 'Planejamento CIA',
          icon: <ProfileOutlined />,
          permission: 'DASHBOARD_ACTIVITY_VIEW',
        },
        {
          key: '/demandas',
          label: 'Demandas',
          icon: <ProfileOutlined />,
          permission: 'TASKS_VIEW',
        },
      ],
    },
    {
      key: 'group-pessoas',
      label: 'Pessoas',
      icon: <TeamOutlined />,
      children: [
        {
          key: '/colaboradores',
          label: 'Usuários',
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
          key: '/agenda',
          label: 'Agenda',
          icon: <ScheduleOutlined />,
          permission: 'ASSIGNMENTS_VIEW',
        },
        {
          key: '/clientes',
          label: 'Clientes',
          icon: <ToolOutlined />,
          permission: 'CLIENTS_VIEW',
        },
      ],
    },
    {
      key: 'group-localizacao',
      label: 'Localização',
      icon: <EnvironmentOutlined />,
      children: [
        {
          key: '/mapa-tecnicos',
          label: 'Mapa de Técnicos',
          icon: <EnvironmentOutlined />,
          permission: 'TECHS_MAP_VIEW',
        },
        {
          key: '/projetos-instalacao/geolocalizacao',
          label: 'Validar geolocalização',
          icon: <EnvironmentOutlined />,
          permission: 'INSTALLATION_PROJECTS_VIEW',
        },
      ],
    },
    {
      key: 'group-relatorios',
      label: 'Relatórios e Comunicação',
      icon: <NotificationOutlined />,
      children: [
        {
          key: '/relatorios-entrega',
          label: 'Relatório de Entregas',
          icon: <DatabaseOutlined />,
          permission: 'DELIVERY_REPORTS_VIEW',
        },
        {
          key: '/noticias',
          label: 'Notícias',
          icon: <NotificationOutlined />,
          permission: 'NEWS_VIEW',
        },
        {
          key: '/noticias-admin',
          label: 'Central de Conteúdo',
          icon: <NotificationOutlined />,
          permission: 'NEWS_ADMIN_VIEW',
        },
      ],
    },
 {
  key: 'admin',
  icon: <SettingOutlined />,
  label: 'Administração',
  children: [
    {
      key: '/gerenciador-imagens',
      label: 'Gerenciador de Imagens',
      icon: <FileImageOutlined />,
      permission: 'MEDIA_VIEW',
    },
    {
      key: '/logs-auditoria',
      label: 'Logs do Sistema',
      icon: <HistoryOutlined />,
      permission: 'ACTIVITY_LOGS_VIEW',
    },
  ],
}
  ];

  const visibleMenuConfig = useMemo(() => {
    return menuConfig
      .map((group) => ({
        ...group,
        children: (group.children || []).filter((item) => hasPermission(user, item.permission)),
      }))
      .filter((group) => group.children.length > 0);
  }, [user]);

  const groupKeys = useMemo(() => visibleMenuConfig.map((group) => group.key), [visibleMenuConfig]);

  const selectedKey = useMemo(() => {
    const pathname = location.pathname;
    const childKeys = visibleMenuConfig.flatMap((group) => group.children.map((item) => item.key));
    const dashboardKeys = hasPermission(user, 'DASHBOARD_VIEW') ? ['/'] : [];
    const allKeys = [...dashboardKeys, ...childKeys];

    const found = allKeys
      .sort((a, b) => b.length - a.length)
      .find((key) => (key === '/' ? pathname === '/' : pathname.startsWith(key)));

    return found ? [found] : [];
  }, [location.pathname, visibleMenuConfig, user]);

  const parentGroupKey = useMemo(() => {
    const pathname = location.pathname;

    const foundGroup = visibleMenuConfig.find((group) =>
      group.children.some((item) => (item.key === '/' ? pathname === '/' : pathname.startsWith(item.key)))
    );

    return foundGroup?.key ? [foundGroup.key] : [];
  }, [location.pathname, visibleMenuConfig]);

  useEffect(() => {
    if (isMobile) {
      setOpenMenuKeys(parentGroupKey);
      return;
    }

    if (collapsedSidebar) {
      setOpenMenuKeys([]);
      return;
    }

    setOpenMenuKeys((prev) => {
      if (prev.length > 0) return prev;
      return parentGroupKey;
    });
  }, [isMobile, collapsedSidebar, parentGroupKey]);

  const menuItems = useMemo<MenuProps['items']>(() => {
    const dashboardItem = hasPermission(user, 'DASHBOARD_VIEW')
      ? [
          {
            key: '/',
            icon: <HomeOutlined />,
            label: (
              <Link
                to="/"
                onClick={() => {
                  if (isMobile) setDrawerOpen(false);
                }}
              >
                Painel
              </Link>
            ),
          },
        ]
      : [];

    const groupedItems = visibleMenuConfig.map((group) => ({
      key: group.key,
      icon: group.icon,
      label: group.label,
      children: group.children.map((item) => ({
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
      })),
    }));

    return [...dashboardItem, ...groupedItems];
  }, [visibleMenuConfig, isMobile, user]);

  const handleMenuOpenChange: MenuProps['onOpenChange'] = (keys) => {
    const normalizedKeys = keys.map(String);

    if (!isMobile && collapsedSidebar) {
      return;
    }

    if (isMobile) {
      setOpenMenuKeys(normalizedKeys);
      return;
    }

    const latest = normalizedKeys.find((key) => !openMenuKeys.includes(key));

    if (!latest) {
      setOpenMenuKeys(normalizedKeys);
      return;
    }

    if (groupKeys.includes(latest)) {
      setOpenMenuKeys([latest]);
    } else {
      setOpenMenuKeys(normalizedKeys);
    }
  };

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
      transition: all 0.22s ease;
    }

    .brand-sidebar.is-collapsed .brand-sidebar-logo-text,
    .brand-sidebar.is-collapsed .brand-sidebar-section-title,
    .brand-sidebar.is-collapsed .brand-sidebar-footer-text {
      display: none !important;
    }

    .brand-sidebar.is-collapsed .brand-sidebar-header {
      justify-content: center !important;
      padding-inline: 10px !important;
    }

    .brand-sidebar.is-collapsed .brand-scroll {
      padding-left: 6px;
      padding-right: 6px;
    }

    .brand-sidebar.is-collapsed .brand-menu .ant-menu-submenu-title,
    .brand-sidebar.is-collapsed .brand-menu .ant-menu-item {
      padding-inline: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .brand-sidebar.is-collapsed .brand-menu .ant-menu-title-content {
      opacity: 0;
      width: 0;
      overflow: hidden;
      display: none !important;
    }

    .brand-sidebar.is-collapsed .brand-menu .ant-menu-submenu-arrow {
      display: none !important;
    }

    .brand-sidebar.is-collapsed .logout-menu .ant-menu-item {
      padding-inline: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .brand-sidebar.is-collapsed .logout-menu .ant-menu-title-content {
      display: none !important;
    }

    .brand-sidebar.is-collapsed .logout-menu .ant-menu-item .ant-menu-item-icon,
    .brand-sidebar.is-collapsed .brand-menu .ant-menu-item .ant-menu-item-icon,
    .brand-sidebar.is-collapsed .brand-menu .ant-menu-submenu-title .ant-menu-item-icon {
      margin-inline-end: 0 !important;
      font-size: 20px !important;
    }

    .brand-menu .ant-menu-submenu {
      margin: 6px 0 !important;
    }

    .brand-menu .ant-menu-submenu-title {
      height: 48px !important;
      line-height: 48px !important;
      border-radius: 14px !important;
      color: ${TEXT_PRIMARY} !important;
      font-weight: 700;
      font-size: 15px;
      padding-inline: 14px !important;
      transition: all 0.2s ease;
    }

    .brand-menu .ant-menu-submenu-title:hover {
      background: ${HOVER_BG} !important;
      color: #ffffff !important;
    }

    .brand-menu .ant-menu-sub {
      background: transparent !important;
    }

    .brand-menu .ant-menu-sub .ant-menu-item {
      height: 42px !important;
      line-height: 42px !important;
      margin: 4px 0 4px 10px !important;
      border-radius: 12px !important;
      font-size: 14px;
      font-weight: 600;
    }

    .brand-menu .ant-menu-submenu-arrow {
      color: ${TEXT_SECONDARY} !important;
    }

    .brand-menu .ant-menu-submenu-open > .ant-menu-submenu-title {
      background: rgba(255,255,255,0.05) !important;
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
      background: linear-gradient(180deg, rgba(31, 113, 184, 0.85), rgba(31, 113, 184, 0.45));
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.08);
    }

    .brand-scroll::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(31, 113, 184, 1), rgba(31, 113, 184, 0.65));
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

    .brand-menu .ant-menu-item:hover .ant-menu-item-icon,
    .brand-menu .ant-menu-submenu-title:hover .ant-menu-item-icon {
      color: #ffffff !important;
    }

    .brand-menu .ant-menu-item-selected {
      background: linear-gradient(135deg, ${ACTIVE_BG} 0%, #2f89d8 100%) !important;
      color: #ffffff !important;
      box-shadow: 0 10px 24px rgba(31, 113, 184, 0.32);
    }

    .brand-menu .ant-menu-item-selected .ant-menu-item-icon {
      color: #ffffff !important;
    }

    .logout-menu.ant-menu {
      background: transparent !important;
      border-inline-end: none !important;
    }

    .logout-menu .ant-menu-item {
      height: 48px;
      line-height: 48px;
      margin: 0 !important;
      border-radius: 14px !important;
      color: #fecaca !important;
      font-weight: 700;
      padding-inline: 14px !important;
    }

    .logout-menu .ant-menu-item:hover {
      background: rgba(239, 68, 68, 0.16) !important;
      color: #ffffff !important;
    }

    .logout-menu .ant-menu-item .ant-menu-item-icon {
      color: inherit !important;
    }

    .header-bell-wrap {
      height: 40px;
      padding: 0 12px;
      border-radius: 999px;
      background: #f0f7ff;
      border: 1px solid #d6e8fb;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
    }

    .header-bell-wrap:hover {
      background: #e5f1ff;
      border-color: #bdd8f7;
    }

    .header-bell-text {
      font-size: 13px;
      font-weight: 700;
      color: #16324F;
    }

    .header-profile-btn {
      height: 40px !important;
      border-radius: 999px !important;
      border: 1px solid #dbe7f3 !important;
      background: #ffffff !important;
      box-shadow: 0 6px 14px rgba(15, 23, 42, 0.04);
    }

    .header-profile-btn:hover {
      border-color: #c5d9ec !important;
      background: #f9fcff !important;
    }

    .header-logout-btn {
      height: 40px !important;
      border-radius: 999px !important;
      box-shadow: 0 6px 14px rgba(239, 68, 68, 0.12);
    }

    .app-layout-content-scroll {
      min-height: 0;
    }
  `;

  const MenuBlock = (
    <>
      <style>{sidebarStyles}</style>

      <div className={`brand-sidebar ${collapsedSidebar ? 'is-collapsed' : ''}`}>
        <div
          className="brand-sidebar-header"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Avatar
            size={42}
            src={abs(user?.avatarUrl)}
            icon={<UserOutlined />}
            style={{ background: BRAND, flexShrink: 0 }}
          />

          <div className="brand-sidebar-logo-text" style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 800, lineHeight: 1.1 }}>Operações</div>
            <div style={{ color: TEXT_SECONDARY, fontSize: 12, marginTop: 2 }}>{sectorsLabel}</div>
          </div>
        </div>

        <div className="brand-scroll">
          <div
            className="brand-sidebar-section-title"
            style={{
              color: TEXT_SECONDARY,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '4px 10px 6px',
            }}
          >
            Navegação
          </div>

          <Menu
            className="brand-menu"
            theme="dark"
            mode="inline"
            selectedKeys={selectedKey}
            openKeys={collapsedSidebar ? [] : openMenuKeys}
            onOpenChange={handleMenuOpenChange}
            inlineCollapsed={collapsedSidebar}
            items={menuItems}
          />
        </div>

        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="brand-sidebar-footer-text"
            style={{
              color: TEXT_SECONDARY,
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 8,
              paddingInline: 4,
            }}
          >
            Sessão
          </div>

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
          width={siderWidth}
          collapsedWidth={siderCollapsedWidth}
          collapsed={collapsedSidebar}
          trigger={null}
          theme="dark"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          style={{
            background: SIDEBAR_BG,
            boxShadow: '2px 0 16px rgba(3, 27, 49, 0.18)',
            transition: 'all 0.22s ease',
            overflow: 'hidden',
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
          maskClosable
          closable={false}
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

            <Button className="header-profile-btn" onClick={() => setProfileOpen(true)}>
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
                  cancelText: 'Cancelar',
                  okButtonProps: { danger: true },
                  onOk: handleLogout,
                });
              }}
            >
              {!isMobile ? 'Sair' : null}
            </Button>
          </Space>
        </Header>

        <Content
          ref={contentRef}
          className="app-layout-content-scroll"
          style={{ padding: isMobile ? 12 : 20, overflow: 'auto' }}
        >
          <Outlet />
        </Content>
      </Layout>

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        setUser={setUser}
      />
    </Layout>
  );
}

export default AppLayout;