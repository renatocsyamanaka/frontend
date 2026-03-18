import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './modules/auth/RequireAuth';
import { RequireAccess } from './modules/auth/RequireAccess';
import { AppLayout } from './modules/layout/AppLayout';

import { LoginPage } from './modules/auth/LoginPage';
import Dashboard from './modules/dashboard/Dashboard';

import InstallationProjectsPage from './modules/installationProjects/InstallationProjectsPage';
import InstallationProjectDetailPage from './modules/installationProjects/InstallationProjectDetailPage';

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

import PartRequestsPage from './modules/PartRequests/PartRequests';
import MyPartRequestsPage from './modules/PartRequests/MyPartRequestsPage';
import PublicPartRequestPage from './modules/PartRequests/PublicPartRequestPage';

export default function App() {
  return (
    <Routes>
      {/* rotas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/solicitar-peca" element={<PublicPartRequestPage />} />

      {/* rotas protegidas */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />

        <Route
          path="techs-pso"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES']}>
              <TechsPsoMapPage />
            </RequireAccess>
          }
        />

        <Route
          path="installation-projects"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES']}>
              <InstallationProjectsPage />
            </RequireAccess>
          }
        />

        <Route
          path="installation-projects/:id"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES']}>
              <InstallationProjectDetailPage />
            </RequireAccess>
          }
        />

        <Route
          path="part-requests"
          element={
            <RequireAccess minLevel={2} sectors={['LOGISTICA', 'OPERACOES']}>
              <PartRequestsPage />
            </RequireAccess>
          }
        />

        <Route
          path="my-part-requests"
          element={
            <RequireAccess minLevel={2}>
              <MyPartRequestsPage />
            </RequireAccess>
          }
        />

        <Route
          path="users"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES', 'SISTEMAS']}>
              <UsersPage />
            </RequireAccess>
          }
        />

        <Route
          path="org"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES']}>
              <OrgPage />
            </RequireAccess>
          }
        />

        <Route
          path="locations"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES']}>
              <LocationsPage />
            </RequireAccess>
          }
        />

        <Route
          path="clients"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES', 'ATENDIMENTO']}>
              <ClientsPage />
            </RequireAccess>
          }
        />

        <Route
          path="tasks"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES', 'SISTEMAS']}>
              <TasksPage />
            </RequireAccess>
          }
        />

        <Route
          path="tech-types"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES', 'SISTEMAS']}>
              <TechTypesPage />
            </RequireAccess>
          }
        />

        <Route
          path="needs"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES']}>
              <NeedsPage />
            </RequireAccess>
          }
        />

        <Route
          path="needs/map"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES']}>
              <NeedsMapPage />
            </RequireAccess>
          }
        />

        <Route
          path="assignments"
          element={
            <RequireAccess minLevel={2}>
              <AssignmentsMonthPage />
            </RequireAccess>
          }
        />

        <Route
          path="overtime"
          element={
            <RequireAccess minLevel={3} sectors={['OPERACOES']}>
              <OvertimePage />
            </RequireAccess>
          }
        />

        <Route
          path="timeoff"
          element={
            <RequireAccess minLevel={2} sectors={['OPERACOES', 'ATENDIMENTO']}>
              <TimeOffPage />
            </RequireAccess>
          }
        />

        <Route
          path="news"
          element={
            <RequireAccess minLevel={4}>
              <NewsCenterPage />
            </RequireAccess>
          }
        />

        <Route
          path="news-admin"
          element={
            <RequireAccess minLevel={6}>
              <NewsAdminPage />
            </RequireAccess>
          }
        />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}