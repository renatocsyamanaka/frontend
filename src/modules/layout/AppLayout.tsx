// src/modules/layout/AppLayout.tsx
import React, { useMemo } from 'react';
import { Layout, Menu } from 'antd';
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

  const level = getUserLevel(user);

  // ✅ Ajuste aqui os níveis conforme sua tabela:
  // Técnico=1, Analista=2, Supervisor=3, Coordenador=4, Gerente/Diretor=5, Admin=6
  const menuConfig: MenuCfg[] = [
    { key: '/', label: 'Dashboard', icon: <HomeOutlined />, minLevel: 1 },
    { key: '/installation-projects', label: 'Projetos de Instalação', icon: <ProjectOutlined />, minLevel: 2 },


    { key: '/techs-pso', label: 'Mapa Técnicos', icon: <ToolOutlined />, minLevel: 2 },
    { key: '/users', label: 'Colaboradores', icon: <TeamOutlined />, minLevel: 3 },
    { key: '/org', label: 'Organograma', icon: <ClusterOutlined />, minLevel: 3 },

    // Se você quiser mostrar "Notícias" para coordenador+ (level>=4)
    { key: '/news', label: 'Notícias', icon: <NotificationOutlined />, minLevel: 4 },

    // E "Notícias (Admin)" só Admin
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
        label: <Link to={m.key}>{m.label}</Link>,
      }));
  }, [level]);

  const selectedKey = useMemo(() => {
    // mantém selecionado mesmo em sub-rotas
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
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} theme="dark">
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
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingInline: 24,
          }}
        >
          <div style={{ fontWeight: 600 }}>
            {user ? `${user.name} • ${user.role?.name ?? 'Sem cargo'}` : '—'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeaderTasksBell />
          </div>
        </Header>

        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
