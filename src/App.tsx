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
import PartRequestsPage from './modules/PartRequests/PartRequests';
import MyPartRequestsPage from './modules/partRequests/MyPartRequestsPage';

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
        <Route index element={<Dashboard />} />

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
            path="users"
            element={
              <RequireRoleLevel minLevel={2}>
                <UsersPage />
              </RequireRoleLevel>
            }
          />
          <Route
            path="part-requests"
            element={
              <RequireRoleLevel minLevel={2}>
                <PartRequestsPage />
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

        <Route
          path="tasks"
          element={
            <RequireRoleLevel minLevel={2}>
              <TasksPage />
            </RequireRoleLevel>
          }
        />

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
          path="part-requests"
          element={
            <RequireRoleLevel minLevel={5}>
              <PartRequestsPage />
            </RequireRoleLevel>
          }
        />
        <Route
          path="my-part-requests"
          element={
            <RequireRoleLevel minLevel={2}>
              <MyPartRequestsPage />
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

        <Route
          path="news"
          element={
            <RequireRoleLevel minLevel={4}>
              <NewsCenterPage />
            </RequireRoleLevel>
          }
        />

        <Route
          path="news-admin"
          element={
            <RequireRoleLevel minLevel={6}>
              <NewsAdminPage />
            </RequireRoleLevel>
          }
        />

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