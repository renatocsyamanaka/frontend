// src/layout/menuConfig.tsx
import React from 'react';
import {
  DashboardOutlined,
  ToolOutlined,
  UserOutlined,
  ApartmentOutlined,
  NotificationOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

export type MenuItemCfg = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  minLevel: number; // ✅ regra principal
};

export const MENU_ITEMS: MenuItemCfg[] = [
  { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined />, minLevel: 1 },

  { key: '/techs', label: 'Mapa Técnicos', icon: <ToolOutlined />, minLevel: 2 },
  { key: '/users', label: 'Colaboradores', icon: <UserOutlined />, minLevel: 3 },
  { key: '/org', label: 'Organograma', icon: <ApartmentOutlined />, minLevel: 3 },

  { key: '/news', label: 'Notícias (Admin)', icon: <NotificationOutlined />, minLevel: 6 },

  { key: '/clients', label: 'Clientes', icon: <TeamOutlined />, minLevel: 2 },
  { key: '/needs', label: 'Requisições', icon: <FileTextOutlined />, minLevel: 2 },

  { key: '/tasks', label: 'Demandas', icon: <FileTextOutlined />, minLevel: 2 },
  { key: '/agenda', label: 'Agenda', icon: <CalendarOutlined />, minLevel: 1 },

  { key: '/overtime', label: 'Banco de Horas', icon: <FieldTimeOutlined />, minLevel: 2 },
];
