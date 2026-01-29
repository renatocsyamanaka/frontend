import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './modules/auth/RequireAuth';
import { RequireRoleLevel } from './modules/auth/RequireRoleLevel';
import { AppLayout } from './modules/layout/AppLayout';
import InstallationProjectsPage from './modules/installationProjects/InstallationProjectsPage';
import InstallationProjectDetailPage from './modules/installationProjects/InstallationProjectDetailPage';

import { LoginPage } from './modules/auth/LoginPage';
import Dashboard from './modules/dashboard/Dashboard';
import TechsPsoMapPage from './modules/techs/TechsPsoMapPage';
import { OrgPage } from './modules/org/OrgPage';
import LocationsPage from './modules/locations/LocationsPage';
import { ClientsPage } from './modules/clients/ClientsPage';

import TasksPage from './modules/tasks/TasksPage';
import { UsersPage } from './modules/users/UsersPage';
import { TechTypesPage } from './modules/techtypes/TechTypesPage';
import NeedsPage from './modules/needs/NeedsPage';
import NeedsMapPage from './modules/needs/NeedsMapPage';
import AssignmentsMonthPage from './modules/assignments/AssignmentsMonthPage';
import OvertimePage from './modules/overtime/OvertimePage';
import { TimeOffPage } from './modules/timeoff/TimeOffPage';
import NewsCenterPage from './modules/news/NewsCenterPage';
import NewsAdminPage from './modules/news/NewsAdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {/* Dashboard: qualquer logado */}
        <Route index element={<Dashboard />} />

        {/* ✅ Analista+ (2) */}
        <Route
          path="techs-pso"
          element={
            <RequireRoleLevel minLevel={2}>
              <TechsPsoMapPage />
            </RequireRoleLevel>
          }
        />
        <Route
          path="installation-projects"
          element={
            <RequireRoleLevel minLevel={2}>
              <InstallationProjectsPage />
            </RequireRoleLevel>
          }
        />
        <Route
          path="installation-projects/:id"
          element={
            <RequireRoleLevel minLevel={2}>
              <InstallationProjectDetailPage />
            </RequireRoleLevel>
          }
        />
        {/* Se Analista NÃO deve ver Organograma/Locais/Clientes, suba para 3 aqui */}
        <Route
          path="org"
          element={
            <RequireRoleLevel minLevel={2}>
              <OrgPage />
            </RequireRoleLevel>
          }
        />
        <Route
          path="locations"
          element={
            <RequireRoleLevel minLevel={2}>
              <LocationsPage />
            </RequireRoleLevel>
          }
        />
        <Route
          path="clients"
          element={
            <RequireRoleLevel minLevel={2}>
              <ClientsPage />
            </RequireRoleLevel>
          }
        />

        {/* ✅ Demandas: Analista+ (2) */}
        <Route
          path="tasks"
          element={
            <RequireRoleLevel minLevel={2}>
              <TasksPage />
            </RequireRoleLevel>
          }
        />

        {/* ✅ Tipos Técnico / Requisições / Agenda: Analista+ (2) */}
        <Route
          path="tech-types"
          element={
            <RequireRoleLevel minLevel={2}>
              <TechTypesPage />
            </RequireRoleLevel>
          }
        />
        <Route
          path="needs"
          element={
            <RequireRoleLevel minLevel={2}>
              <NeedsPage />
            </RequireRoleLevel>
          }
        />
        <Route
          path="needs/map"
          element={
            <RequireRoleLevel minLevel={2}>
              <NeedsMapPage />
            </RequireRoleLevel>
          }
        />
        <Route
          path="assignments"
          element={
            <RequireRoleLevel minLevel={2}>
              <AssignmentsMonthPage />
            </RequireRoleLevel>
          }
        />

        {/* ✅ Banco de Horas / Folgas: Analista+ (2) */}
        <Route
          path="overtime"
          element={
            <RequireRoleLevel minLevel={3}>
              <OvertimePage />
            </RequireRoleLevel>
          }
        />
        <Route
          path="timeoff"
          element={
            <RequireRoleLevel minLevel={2}>
              <TimeOffPage />
            </RequireRoleLevel>
          }
        />

        {/* ✅ Notícias: Coordenador+ (4) (ajuste se quiser Supervisor+ (3)) */}
        <Route
          path="news"
          element={
            <RequireRoleLevel minLevel={4}>
              <NewsCenterPage />
            </RequireRoleLevel>
          }
        />

        {/* ✅ Notícias (Admin): Admin (6) */}
        <Route
          path="news-admin"
          element={
            <RequireRoleLevel minLevel={6}>
              <NewsAdminPage />
            </RequireRoleLevel>
          }
        />

        {/* ✅ Colaboradores: Coordenador+ (4) (ajuste se quiser Supervisor+ (3)) */}
        <Route
          path="users"
          element={
            <RequireRoleLevel minLevel={4}>
              <UsersPage />
            </RequireRoleLevel>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
