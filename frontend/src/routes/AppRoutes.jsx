import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import { SuperAdminLayout } from '../components/layout/SuperAdminLayout';
import { ClientPortalLayout } from '../components/layout/ClientPortalLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { DashboardPage } from '../pages/workspace/dashboard/DashboardPage';
import { TeamPage } from '../pages/workspace/team/TeamPage';
import { ClientsPage } from '../pages/workspace/clients/ClientsPage';
import { ClientDetailsPage } from '../pages/workspace/clients/ClientDetailsPage';
import { ProjectsPage } from '../pages/workspace/projects/ProjectsPage';
import { TasksPage } from '../pages/workspace/tasks/TasksPage';
import { MyTasksPage } from '../pages/workspace/tasks/MyTasksPage';
import { TaskDetailsPage } from '../pages/workspace/tasks/TaskDetailsPage';
import { ContentPage } from '../pages/workspace/content/ContentPage';
import { ApprovalsPage } from '../pages/workspace/approvals/ApprovalsPage';
import { CalendarPage } from '../pages/workspace/calendar/CalendarPage';
import { AssetsPage } from '../pages/workspace/assets/AssetsPage';
import { NotificationsPage } from '../pages/workspace/notifications/NotificationsPage';
import { ReportsPage } from '../pages/workspace/reports/ReportsPage';
import { SettingsPage } from '../pages/workspace/settings/SettingsPage';
import { SuperAdminDashboardPage } from '../pages/superadmin/SuperAdminDashboardPage';
import { SuperAdminWorkspacesPage } from '../pages/superadmin/SuperAdminWorkspacesPage';
import { SuperAdminManagersPage } from '../pages/superadmin/SuperAdminManagersPage';
import { ClientDashboardPage } from '../pages/client/ClientDashboardPage';
import { ClientContentPage } from '../pages/client/ClientContentPage';
import { ClientCalendarPage } from '../pages/client/ClientCalendarPage';
import { ClientNotificationsPage } from '../pages/client/ClientNotificationsPage';
import { SuperAdminActivityPage } from '../pages/superadmin/SuperAdminActivityPage';
import { SuperAdminSettingsPage } from '../pages/superadmin/SuperAdminSettingsPage';
import { TodoPage } from '../pages/todo/TodoPage';
import { ChatPage } from '../pages/workspace/chat/ChatPage';
import { WorkloadPage } from '../pages/workspace/workload/WorkloadPage';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { ROLES, STATUS_TYPES, getRoleRedirectPath } from '../utils/constants';

const AGENCY_ROLES = [
  ROLES.WORKSPACE_MANAGER,
  ROLES.SOCIAL_MEDIA_MANAGER,
  ROLES.GRAPHIC_TEAM_HEAD,
  ROLES.GRAPHIC_DESIGNER,
  ROLES.VIDEO_EDITOR,
  ROLES.CONTENT_WRITER,
  ROLES.REVIEWER,
];

const RootRedirector = () => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-xs text-slate-400 font-medium">Loading SocialDesk Workspace...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getRoleRedirectPath(role)} replace />;
  }

  return <Navigate to="/login" replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirector />} />
      
      {/* Auth Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Main Agency Workspace Routes */}
      <Route
        path="/workspace"
        element={
          <ProtectedRoute allowedRoles={AGENCY_ROLES}>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/workspace/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:clientId" element={<ClientDetailsPage />} />
        <Route path="clients/:clientId/:section" element={<ClientDetailsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/my" element={<MyTasksPage />} />
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="tasks/:id" element={<TaskDetailsPage />} />
        <Route path="todo" element={<TodoPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="workload" element={<WorkloadPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* SUPERADMIN DEDICATED PORTAL */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN]}>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="workspaces" element={<SuperAdminWorkspacesPage />} />
        <Route path="managers" element={<SuperAdminManagersPage />} />
        <Route path="todo" element={<TodoPage />} />
        <Route path="activity" element={<SuperAdminActivityPage />} />
        <Route path="settings" element={<SuperAdminSettingsPage />} />
      </Route>

      {/* DEDICATED CLIENT PORTAL (8 SIDEBAR ITEMS & STRICT CLIENT RESTRICTIONS) */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CLIENT]}>
            <ClientPortalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/client/dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboardPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="content" element={<ClientContentPage defaultStatusFilter="All" />} />
        <Route path="approvals" element={<ClientContentPage defaultStatusFilter={STATUS_TYPES.CLIENT_REVIEW} />} />
        <Route path="approved" element={<ClientContentPage defaultStatusFilter={STATUS_TYPES.APPROVED} />} />
        <Route path="revisions" element={<ClientContentPage defaultStatusFilter={STATUS_TYPES.REVISION_REQUIRED} />} />
        <Route path="rejected" element={<ClientContentPage defaultStatusFilter={STATUS_TYPES.REJECTED} />} />
        <Route path="scheduled" element={<ClientCalendarPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="todo" element={<TodoPage />} />
        <Route path="notifications" element={<ClientNotificationsPage />} />
      </Route>

      {/* Direct /clients top-level alias */}
      <Route
        path="/clients"
        element={
          <ProtectedRoute allowedRoles={AGENCY_ROLES}>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/workspace/clients" replace />} />
        <Route path=":clientId" element={<ClientDetailsPage />} />
        <Route path=":clientId/:section" element={<ClientDetailsPage />} />
      </Route>

      {/* Alias /todo to /workspace/todo */}
      <Route path="/todo" element={<Navigate to="/workspace/todo" replace />} />

      {/* Fallback Redirect */}
      <Route path="*" element={<RootRedirector />} />
    </Routes>
  );
};
