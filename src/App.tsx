import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './modules/auth/RequireAuth';
import { RequireAccess } from './modules/auth/RequireAccess';
import { AppLayout } from './modules/layout/AppLayout';

import { LoginPage } from './modules/auth/LoginPage';
import Dashboard from './modules/dashboard/Dashboard';
import DemandsPage from './modules/demands/DemandsPage';
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
import DeliveryReportsPage from './modules/deliveryReports/DeliveryReportsPage';

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
            <RequireAccess permission="TECHS_MAP_VIEW">
              <TechsPsoMapPage />
            </RequireAccess>
          }
        />

        <Route
          path="installation-projects"
          element={
            <RequireAccess permission="INSTALLATION_PROJECTS_VIEW">
              <InstallationProjectsPage />
            </RequireAccess>
          }
        />

        <Route
          path="installation-projects/:id"
          element={
            <RequireAccess permission="INSTALLATION_PROJECTS_VIEW">
              <InstallationProjectDetailPage />
            </RequireAccess>
          }
        />

        <Route
          path="delivery-reports"
          element={
            <RequireAccess permission="DELIVERY_REPORTS_VIEW">
              <DeliveryReportsPage />
            </RequireAccess>
          }
        />

        <Route
          path="part-requests"
          element={
            <RequireAccess permission="PART_REQUESTS_VIEW">
              <PartRequestsPage />
            </RequireAccess>
          }
        />

        <Route
          path="demands"
          element={
            <RequireAccess permission="DASHBOARD_ACTIVITY_VIEW">
              <DemandsPage />
            </RequireAccess>
          }
        />

        <Route
          path="my-part-requests"
          element={
            <RequireAccess permission="MY_PART_REQUESTS_VIEW">
              <MyPartRequestsPage />
            </RequireAccess>
          }
        />

        <Route
          path="users"
          element={
            <RequireAccess permission="USERS_VIEW">
              <UsersPage />
            </RequireAccess>
          }
        />

        <Route
          path="org"
          element={
            <RequireAccess permission="ORG_VIEW">
              <OrgPage />
            </RequireAccess>
          }
        />

        <Route
          path="locations"
          element={
            <RequireAccess permission="LOCATIONS_VIEW">
              <LocationsPage />
            </RequireAccess>
          }
        />

        <Route
          path="clients"
          element={
            <RequireAccess permission="CLIENTS_VIEW">
              <ClientsPage />
            </RequireAccess>
          }
        />

        <Route
          path="tasks"
          element={
            <RequireAccess permission="TASKS_VIEW">
              <TasksPage />
            </RequireAccess>
          }
        />

        <Route
          path="tech-types"
          element={
            <RequireAccess permission="TECH_TYPES_VIEW">
              <TechTypesPage />
            </RequireAccess>
          }
        />

        <Route
          path="needs"
          element={
            <RequireAccess permission="NEEDS_VIEW">
              <NeedsPage />
            </RequireAccess>
          }
        />

        <Route
          path="needs/map"
          element={
            <RequireAccess permission="NEEDS_MAP_VIEW">
              <NeedsMapPage />
            </RequireAccess>
          }
        />

        <Route
          path="assignments"
          element={
            <RequireAccess permission="ASSIGNMENTS_VIEW">
              <AssignmentsMonthPage />
            </RequireAccess>
          }
        />

        <Route
          path="overtime"
          element={
            <RequireAccess permission="OVERTIME_VIEW">
              <OvertimePage />
            </RequireAccess>
          }
        />

        <Route
          path="timeoff"
          element={
            <RequireAccess permission="TIMEOFF_VIEW">
              <TimeOffPage />
            </RequireAccess>
          }
        />

        <Route
          path="news"
          element={
            <RequireAccess permission="NEWS_VIEW">
              <NewsCenterPage />
            </RequireAccess>
          }
        />

        <Route
          path="news-admin"
          element={
            <RequireAccess permission="NEWS_ADMIN_VIEW">
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