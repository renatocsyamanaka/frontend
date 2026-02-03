// src/modules/layout/AppLayout.tsx
import React, { useMemo, useState } from 'react';
import { Layout, Menu, Grid, Drawer, Button } from 'antd';
import {
  HomeOutlined,
  ToolOutlined,
  TeamOutlined,
  ClusterOutlined,
  NotificationOutlined,
  EnvironmentOutlined,
  ProfileOutlined,
  ScheduleOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  ProjectOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import HeaderTasksBell from '../tasks/HeaderTasksBell';

const { Sider, Content, Header } = Layout;

type MenuCfg = {
  key: string;
  label: string;
  icon: React.ReactNode;
  minLevel: number;
};

function getUserLevel(user: any) {
  return user?.role?.level ?? 0;
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // md+ = layout atual (PC)

  const [drawerOpen, setDrawerOpen] = useState(false);

  const level = getUserLevel(user);

  const menuConfig: MenuCfg[] = [
    { key: '/', label: 'Dashboard', icon: <HomeOutlined />, minLevel: 1 },
    { key: '/installation-projects', label: 'Projetos de Instalação', icon: <ProjectOutlined />, minLevel: 2 },

    { key: '/techs-pso', label: 'Mapa Técnicos', icon: <ToolOutlined />, minLevel: 2 },
    { key: '/users', label: 'Colaboradores', icon: <TeamOutlined />, minLevel: 3 },
    { key: '/org', label: 'Organograma', icon: <ClusterOutlined />, minLevel: 3 },

    { key: '/news', label: 'Notícias', icon: <NotificationOutlined />, minLevel: 4 },
    { key: '/news-admin', label: 'Notícias (Admin)', icon: <NotificationOutlined />, minLevel: 6 },

    { key: '/locations', label: 'Locais', icon: <EnvironmentOutlined />, minLevel: 3 },
    { key: '/clients', label: 'Clientes', icon: <ProfileOutlined />, minLevel: 2 },
    { key: '/tech-types', label: 'Tipos Técnico', icon: <ToolOutlined />, minLevel: 2 },
    { key: '/needs', label: 'Requisições', icon: <DatabaseOutlined />, minLevel: 2 },

    { key: '/tasks', label: 'Demandas', icon: <ProfileOutlined />, minLevel: 2 },
    { key: '/assignments', label: 'Agenda', icon: <ScheduleOutlined />, minLevel: 1 },

    { key: '/overtime', label: 'Banco de Horas', icon: <CalendarOutlined />, minLevel: 3 },
    { key: '/timeoff', label: 'Folgas', icon: <CalendarOutlined />, minLevel: 3 },
  ];

  const menuItems = useMemo(() => {
    return menuConfig
      .filter((m) => level >= m.minLevel)
      .map((m) => ({
        key: m.key,
        icon: m.icon,
        // no mobile vamos fechar o Drawer ao clicar
        label: (
          <Link
            to={m.key}
            onClick={() => {
              if (isMobile) setDrawerOpen(false);
            }}
          >
            {m.label}
          </Link>
        ),
      }));
  }, [level, isMobile]);

  const selectedKey = useMemo(() => {
    const p = location.pathname;
    const found = menuConfig
      .filter((m) => level >= m.minLevel)
      .map((m) => m.key)
      .sort((a, b) => b.length - a.length)
      .find((k) => (k === '/' ? p === '/' : p.startsWith(k)));
    return found ? [found] : [];
  }, [location.pathname, level]);

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    navigate('/login');
  };

  // bloco do menu reutilizável (serve pro Sider e pro Drawer)
  const MenuBlock = (
    <>
      <div style={{ padding: 16, color: '#fff', fontWeight: 700 }}>
        Operações
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKey}
        items={menuItems}
      />

      <div style={{ padding: 12 }}>
        <Menu
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
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ✅ PC: Sider normal (layout igual o seu) */}
      {!isMobile && (
        <Sider width={240} theme="dark">
          {MenuBlock}
        </Sider>
      )}

      {/* ✅ Mobile: Drawer com o mesmo menu */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={280}
          bodyStyle={{ padding: 0, background: '#001529' }} // dark padrão do sider
          headerStyle={{ display: 'none' }}
        >
          {MenuBlock}
        </Drawer>
      )}

      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingInline: isMobile ? 12 : 24,
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
              />
            )}

            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? `${user.name} • ${user.role?.name ?? 'Sem cargo'}` : '—'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeaderTasksBell />
          </div>
        </Header>

        <Content style={{ margin: isMobile ? 12 : 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
