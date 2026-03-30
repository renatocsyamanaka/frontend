import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './modules/auth/RequireAuth';
import { RequireAccess } from './modules/auth/RequireAccess';
import { AppLayout } from './modules/layout/AppLayout';

import { LoginPage } from './modules/auth/LoginPage';
import Dashboard from './modules/dashboard/Dashboard';
import DemandsPage from './modules/demands/DemandsPage';
import InstallationProjectsPage from './modules/installationProjects/InstallationProjectsPage';
import InstallationProjectDetailPage from './modules/installationProjects/InstallationProjectDetailPage';
import InstallationProjectsDashboardPage from './modules/installationProjects/InstallationProjectsDashboardPage';
import InstallationProjectsGeolocationAuditPage from './modules/installationProjects/InstallationProjectsGeolocationAuditPage';
import TechsPsoMapPage from './modules/techs/TechsPsoMapPage';
import { OrgPage } from './modules/org/OrgPage';
import LocationsPage from './modules/locations/LocationsPage';
import { ClientsPage } from './modules/clients/ClientsPage';
import TechnicianRegistrationPage from './modules/needs/TechnicianRegistrationPage';
import TasksPage from './modules/tasks/TasksPage';
import { UsersPage } from './modules/users/UsersPage';
import { TechTypesPage } from './modules/techtypes/TechTypesPage';
import NeedsPage from './modules/needs/NeedsPage';
import NeedHomologationPage from './modules/needs/NeedHomologationPage';
import NeedsMapPage from './modules/needs/NeedsMapPage';
import AssignmentsMonthPage from './modules/assignments/AssignmentsMonthPage';
import OvertimePage from './modules/overtime/OvertimePage';
import { TimeOffPage } from './modules/timeoff/TimeOffPage';
import NewsCenterPage from './modules/news/NewsCenterPage';
import NewsAdminPage from './modules/news/NewsAdminPage';
import NeedAtaPage from './modules/needs/NeedAtaPage';
import PartRequestsPage from './modules/PartRequests/PartRequests';
import MyPartRequestsPage from './modules/PartRequests/MyPartRequestsPage';
import PublicPartRequestPage from './modules/PartRequests/PublicPartRequestPage';
import DeliveryReportsPage from './modules/deliveryReports/DeliveryReportsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/solicitar-peca" element={<PublicPartRequestPage />} />
      <Route path="/cadastro-tecnico/:token" element={<TechnicianRegistrationPage />} />

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
          path="mapa-tecnicos"
          element={
            <RequireAccess permission="TECHS_MAP_VIEW">
              <TechsPsoMapPage />
            </RequireAccess>
          }
        />

        <Route
          path="projetos-instalacao"
          element={
            <RequireAccess permission="INSTALLATION_PROJECTS_VIEW">
              <InstallationProjectsPage />
            </RequireAccess>
          }
        />

        <Route
          path="projetos-instalacao/dashboard"
          element={
            <RequireAccess permission="INSTALLATION_PROJECTS_VIEW">
              <InstallationProjectsDashboardPage />
            </RequireAccess>
          }
        />

        <Route
          path="projetos-instalacao/geolocalizacao"
          element={
            <RequireAccess permission="INSTALLATION_PROJECTS_VIEW">
              <InstallationProjectsGeolocationAuditPage />
            </RequireAccess>
          }
        />

        <Route
          path="projetos-instalacao/:id"
          element={
            <RequireAccess permission="INSTALLATION_PROJECTS_VIEW">
              <InstallationProjectDetailPage />
            </RequireAccess>
          }
        />

        <Route
          path="relatorios-entrega"
          element={
            <RequireAccess permission="DELIVERY_REPORTS_VIEW">
              <DeliveryReportsPage />
            </RequireAccess>
          }
        />

        <Route
          path="pedidos-pecas"
          element={
            <RequireAccess permission="PART_REQUESTS_VIEW">
              <PartRequestsPage />
            </RequireAccess>
          }
        />

        <Route
          path="planejamento-cia"
          element={
            <RequireAccess permission="DASHBOARD_ACTIVITY_VIEW">
              <DemandsPage />
            </RequireAccess>
          }
        />

        <Route
          path="meus-pedidos-pecas"
          element={
            <RequireAccess permission="MY_PART_REQUESTS_VIEW">
              <MyPartRequestsPage />
            </RequireAccess>
          }
        />

        <Route
          path="colaboradores"
          element={
            <RequireAccess permission="USERS_VIEW">
              <UsersPage />
            </RequireAccess>
          }
        />

        <Route
          path="organograma"
          element={
            <RequireAccess permission="ORG_VIEW">
              <OrgPage />
            </RequireAccess>
          }
        />

        <Route
          path="requisicoes/:id/ata"
          element={
            <RequireAccess>
              <NeedAtaPage />
            </RequireAccess>
          }
        />

        <Route
          path="localizacoes"
          element={
            <RequireAccess permission="LOCATIONS_VIEW">
              <LocationsPage />
            </RequireAccess>
          }
        />

        <Route
          path="clientes"
          element={
            <RequireAccess permission="CLIENTS_VIEW">
              <ClientsPage />
            </RequireAccess>
          }
        />

        <Route
          path="demandas"
          element={
            <RequireAccess permission="TASKS_VIEW">
              <TasksPage />
            </RequireAccess>
          }
        />

        <Route
          path="tipos-tecnicos"
          element={
            <RequireAccess permission="TECH_TYPES_VIEW">
              <TechTypesPage />
            </RequireAccess>
          }
        />

        <Route
          path="requisicoes"
          element={
            <RequireAccess permission="NEEDS_VIEW">
              <NeedsPage />
            </RequireAccess>
          }
        />

        <Route
          path="requisicoes/:id/homologacao"
          element={
            <RequireAccess permission="NEEDS_VIEW">
              <NeedHomologationPage />
            </RequireAccess>
          }
        />

        <Route
          path="requisicoes/mapa"
          element={
            <RequireAccess permission="NEEDS_MAP_VIEW">
              <NeedsMapPage />
            </RequireAccess>
          }
        />

        <Route
          path="agenda"
          element={
            <RequireAccess permission="ASSIGNMENTS_VIEW">
              <AssignmentsMonthPage />
            </RequireAccess>
          }
        />

        <Route
          path="banco-de-horas"
          element={
            <RequireAccess permission="OVERTIME_VIEW">
              <OvertimePage />
            </RequireAccess>
          }
        />

        <Route
          path="folgas-ausencias"
          element={
            <RequireAccess permission="TIMEOFF_VIEW">
              <TimeOffPage />
            </RequireAccess>
          }
        />

        <Route
          path="noticias"
          element={
            <RequireAccess permission="NEWS_VIEW">
              <NewsCenterPage />
            </RequireAccess>
          }
        />

        <Route
          path="noticias-admin"
          element={
            <RequireAccess permission="NEWS_ADMIN_VIEW">
              <NewsAdminPage />
            </RequireAccess>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}