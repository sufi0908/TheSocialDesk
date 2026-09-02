/**
 * Application Constants, Enums & Unified Status System
 */

export const ROLES = {
  SUPERADMIN: 'superadmin',
  WORKSPACE_MANAGER: 'workspace_manager',
  SOCIAL_MEDIA_MANAGER: 'social_media_manager',
  GRAPHIC_TEAM_HEAD: 'graphic_team_head',
  GRAPHIC_DESIGNER: 'graphic_designer',
  VIDEO_EDITOR: 'video_editor',
  CONTENT_WRITER: 'content_writer',
  REVIEWER: 'reviewer',
  CLIENT: 'client',

  // Legacy aliases
  SUPER_ADMIN: 'superadmin',
  AGENCY_ADMIN: 'workspace_manager',
  TEAM_MEMBER: 'social_media_manager',
};

export const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: 'Super Admin',
  [ROLES.WORKSPACE_MANAGER]: 'Workspace Manager',
  [ROLES.SOCIAL_MEDIA_MANAGER]: 'Social Media Manager',
  [ROLES.GRAPHIC_TEAM_HEAD]: 'Graphic Team Head',
  [ROLES.GRAPHIC_DESIGNER]: 'Graphic Designer',
  [ROLES.VIDEO_EDITOR]: 'Video Editor',
  [ROLES.CONTENT_WRITER]: 'Content Writer',
  [ROLES.REVIEWER]: 'Content Reviewer',
  [ROLES.CLIENT]: 'Client Guest',
};

/**
 * Role Redirect Map Helper
 */
export function getRoleRedirectPath(role) {
  if (role === ROLES.SUPERADMIN) {
    return '/superadmin';
  }
  if (role === ROLES.CLIENT) {
    return '/client';
  }
  // All workspace management and agency team members go to /workspace
  return '/workspace';
}

/**
 * Role Navigation Schema Items across 9 Roles
 */
export const NAV_KEYS = {
  DASHBOARD: 'Dashboard',
  CHAT: 'Chat',
  CLIENTS: 'Clients',
  TEAM: 'Team',
  PROJECTS: 'Projects',
  TASKS: 'All Tasks',
  MY_TASKS: 'My Tasks',
  TODO: 'Personal To-Do',
  CONTENT: 'Content',
  APPROVALS: 'Approvals',
  CALENDAR: 'Calendar',
  ASSETS: 'Assets',
  NOTIFICATIONS: 'Notifications',
  WORKLOAD: 'My Work & Workload',
  REPORTS: 'Reports',
  SETTINGS: 'Settings',

  // Client Portal specific keys
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REVISION_REQUIRED: 'Revision Required',
  REJECTED: 'Rejected',
  SCHEDULED: 'Scheduled',

  // SuperAdmin specific keys
  SUPERADMIN_DASHBOARD: 'Superadmin Dashboard',
  WORKSPACES: 'Workspaces',
  WORKSPACE_MANAGERS: 'Workspace Managers',
  SYSTEM_ACTIVITY: 'System Activity',
};

export const ROLE_NAV_CONFIG = {
  [ROLES.SUPERADMIN]: [
    { label: NAV_KEYS.SUPERADMIN_DASHBOARD, path: '/superadmin/dashboard' },
    { label: NAV_KEYS.WORKSPACES, path: '/superadmin/workspaces' },
    { label: NAV_KEYS.WORKSPACE_MANAGERS, path: '/superadmin/managers' },
    { label: NAV_KEYS.TODO, path: '/superadmin/todo' },
    { label: NAV_KEYS.SYSTEM_ACTIVITY, path: '/superadmin/activity' },
    { label: NAV_KEYS.SETTINGS, path: '/superadmin/settings' },
  ],

  [ROLES.WORKSPACE_MANAGER]: [
    { label: NAV_KEYS.DASHBOARD, path: '/workspace/dashboard' },
    { label: NAV_KEYS.CHAT, path: '/workspace/chat' },
    { label: NAV_KEYS.CLIENTS, path: '/workspace/clients' },
    { label: NAV_KEYS.TEAM, path: '/workspace/team' },
    { label: NAV_KEYS.PROJECTS, path: '/workspace/projects' },
    { label: NAV_KEYS.TASKS, path: '/workspace/tasks' },
    { label: NAV_KEYS.MY_TASKS, path: '/workspace/tasks/my' },
    { label: NAV_KEYS.TODO, path: '/workspace/todo' },
    { label: NAV_KEYS.CONTENT, path: '/workspace/content' },
    { label: NAV_KEYS.APPROVALS, path: '/workspace/approvals', highlight: true },
    { label: NAV_KEYS.CALENDAR, path: '/workspace/calendar' },
    { label: NAV_KEYS.ASSETS, path: '/workspace/assets' },
    { label: NAV_KEYS.NOTIFICATIONS, path: '/workspace/notifications' },
    { label: NAV_KEYS.WORKLOAD, path: '/workspace/workload' },
    { label: NAV_KEYS.REPORTS, path: '/workspace/reports' },
    { label: NAV_KEYS.SETTINGS, path: '/workspace/settings' },
  ],

  [ROLES.SOCIAL_MEDIA_MANAGER]: [
    { label: NAV_KEYS.DASHBOARD, path: '/workspace/dashboard' },
    { label: NAV_KEYS.CHAT, path: '/workspace/chat' },
    { label: NAV_KEYS.CLIENTS, path: '/workspace/clients' },
    { label: NAV_KEYS.CONTENT, path: '/workspace/content' },
    { label: NAV_KEYS.TASKS, path: '/workspace/tasks' },
    { label: NAV_KEYS.MY_TASKS, path: '/workspace/tasks/my' },
    { label: NAV_KEYS.TODO, path: '/workspace/todo' },
    { label: NAV_KEYS.APPROVALS, path: '/workspace/approvals', highlight: true },
    { label: NAV_KEYS.CALENDAR, path: '/workspace/calendar' },
    { label: NAV_KEYS.ASSETS, path: '/workspace/assets' },
    { label: NAV_KEYS.NOTIFICATIONS, path: '/workspace/notifications' },
  ],

  [ROLES.GRAPHIC_TEAM_HEAD]: [
    { label: NAV_KEYS.DASHBOARD, path: '/workspace/dashboard' },
    { label: NAV_KEYS.CHAT, path: '/workspace/chat' },
    { label: NAV_KEYS.TASKS, path: '/workspace/tasks' },
    { label: NAV_KEYS.MY_TASKS, path: '/workspace/tasks/my' },
    { label: NAV_KEYS.TODO, path: '/workspace/todo' },
    { label: NAV_KEYS.CONTENT, path: '/workspace/content' },
    { label: NAV_KEYS.ASSETS, path: '/workspace/assets' },
    { label: NAV_KEYS.TEAM, path: '/workspace/team' },
    { label: NAV_KEYS.NOTIFICATIONS, path: '/workspace/notifications' },
  ],

  [ROLES.GRAPHIC_DESIGNER]: [
    { label: NAV_KEYS.DASHBOARD, path: '/workspace/dashboard' },
    { label: NAV_KEYS.CHAT, path: '/workspace/chat' },
    { label: NAV_KEYS.MY_TASKS, path: '/workspace/tasks/my' },
    { label: NAV_KEYS.TASKS, path: '/workspace/tasks' },
    { label: NAV_KEYS.TODO, path: '/workspace/todo' },
    { label: NAV_KEYS.CONTENT, path: '/workspace/content' },
    { label: NAV_KEYS.ASSETS, path: '/workspace/assets' },
    { label: NAV_KEYS.NOTIFICATIONS, path: '/workspace/notifications' },
  ],

  [ROLES.VIDEO_EDITOR]: [
    { label: NAV_KEYS.DASHBOARD, path: '/workspace/dashboard' },
    { label: NAV_KEYS.CHAT, path: '/workspace/chat' },
    { label: NAV_KEYS.MY_TASKS, path: '/workspace/tasks/my' },
    { label: NAV_KEYS.TASKS, path: '/workspace/tasks' },
    { label: NAV_KEYS.TODO, path: '/workspace/todo' },
    { label: NAV_KEYS.CONTENT, path: '/workspace/content' },
    { label: NAV_KEYS.ASSETS, path: '/workspace/assets' },
    { label: NAV_KEYS.NOTIFICATIONS, path: '/workspace/notifications' },
  ],

  [ROLES.CONTENT_WRITER]: [
    { label: NAV_KEYS.DASHBOARD, path: '/workspace/dashboard' },
    { label: NAV_KEYS.CHAT, path: '/workspace/chat' },
    { label: NAV_KEYS.MY_TASKS, path: '/workspace/tasks/my' },
    { label: NAV_KEYS.TASKS, path: '/workspace/tasks' },
    { label: NAV_KEYS.TODO, path: '/workspace/todo' },
    { label: NAV_KEYS.CONTENT, path: '/workspace/content' },
    { label: NAV_KEYS.ASSETS, path: '/workspace/assets' },
    { label: NAV_KEYS.NOTIFICATIONS, path: '/workspace/notifications' },
  ],

  [ROLES.REVIEWER]: [
    { label: NAV_KEYS.DASHBOARD, path: '/workspace/dashboard' },
    { label: NAV_KEYS.CHAT, path: '/workspace/chat' },
    { label: NAV_KEYS.CONTENT, path: '/workspace/content' },
    { label: NAV_KEYS.TODO, path: '/workspace/todo' },
    { label: NAV_KEYS.APPROVALS, path: '/workspace/approvals', highlight: true },
    { label: NAV_KEYS.CALENDAR, path: '/workspace/calendar' },
    { label: NAV_KEYS.NOTIFICATIONS, path: '/workspace/notifications' },
  ],

  [ROLES.CLIENT]: [
    { label: NAV_KEYS.DASHBOARD, path: '/client/dashboard' },
    { label: NAV_KEYS.CHAT, path: '/client/chat' },
    { label: NAV_KEYS.CONTENT, path: '/client/content' },
    { label: NAV_KEYS.PENDING_APPROVAL, path: '/client/approvals', highlight: true },
    { label: NAV_KEYS.APPROVED, path: '/client/approved' },
    { label: NAV_KEYS.REVISION_REQUIRED, path: '/client/revisions' },
    { label: NAV_KEYS.REJECTED, path: '/client/rejected' },
    { label: NAV_KEYS.SCHEDULED, path: '/client/scheduled' },
    { label: NAV_KEYS.TODO, path: '/client/todo' },
    { label: NAV_KEYS.NOTIFICATIONS, path: '/client/notifications' },
  ],
};

export const PLATFORMS = {
  INSTAGRAM: { id: 'instagram', name: 'Instagram', color: 'bg-pink-500', textColor: 'text-pink-600', badgeBg: 'bg-pink-50 border-pink-200 text-pink-700' },
  LINKEDIN: { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-600', textColor: 'text-blue-600', badgeBg: 'bg-blue-50 border-blue-200 text-blue-700' },
  TWITTER: { id: 'twitter', name: 'X / Twitter', color: 'bg-slate-900', textColor: 'text-slate-900', badgeBg: 'bg-slate-100 border-slate-300 text-slate-800' },
  FACEBOOK: { id: 'facebook', name: 'Facebook', color: 'bg-indigo-600', textColor: 'text-indigo-600', badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  TIKTOK: { id: 'tiktok', name: 'TikTok', color: 'bg-slate-950', textColor: 'text-slate-900', badgeBg: 'bg-slate-100 border-slate-300 text-slate-900' },
  YOUTUBE: { id: 'youtube', name: 'YouTube', color: 'bg-red-600', textColor: 'text-red-600', badgeBg: 'bg-red-50 border-red-200 text-red-700' },
};

export const STATUS_TYPES = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  INTERNAL_REVIEW: 'internal_review',
  CLIENT_REVIEW: 'client_review',
  REVISION_REQUIRED: 'revision_required',
  APPROVED: 'approved',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
};

export const STATUS_CONFIG = {
  [STATUS_TYPES.DRAFT]: { label: 'Draft', badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200', dotColor: 'bg-slate-400' },
  [STATUS_TYPES.IN_PROGRESS]: { label: 'In Progress', badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' },
  [STATUS_TYPES.INTERNAL_REVIEW]: { label: 'Internal Review', badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200', dotColor: 'bg-indigo-500' },
  [STATUS_TYPES.CLIENT_REVIEW]: { label: 'Client Review', badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  [STATUS_TYPES.REVISION_REQUIRED]: { label: 'Revision Required', badgeStyle: 'bg-orange-50 text-orange-700 border-orange-200', dotColor: 'bg-orange-500' },
  [STATUS_TYPES.APPROVED]: { label: 'Approved', badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  [STATUS_TYPES.SCHEDULED]: { label: 'Scheduled', badgeStyle: 'bg-cyan-50 text-cyan-700 border-cyan-200', dotColor: 'bg-cyan-500' },
  [STATUS_TYPES.PUBLISHED]: { label: 'Published', badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200', dotColor: 'bg-purple-500' },
  [STATUS_TYPES.REJECTED]: { label: 'Rejected', badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
  [STATUS_TYPES.COMPLETED]: { label: 'Completed', badgeStyle: 'bg-teal-50 text-teal-700 border-teal-200', dotColor: 'bg-teal-500' },
  [STATUS_TYPES.OVERDUE]: { label: 'Overdue', badgeStyle: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-500' },
};

export const POST_STATUS = STATUS_TYPES;
export const POST_STATUS_CONFIG = STATUS_CONFIG;

export const LOCAL_STORAGE_KEYS = {
  AUTH_USER: 'socialdesk_auth_user',
  AUTH_TOKEN: 'socialdesk_auth_token',
  ACTIVE_WORKSPACE: 'socialdesk_active_workspace',
  MOCK_DB: 'socialdesk_mock_db',
};
