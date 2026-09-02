import { storage } from './storage';
import { simulateDelay } from './apiClient';

export const INITIAL_WORKSPACE_SETTINGS = {
  profile: {
    companyName: 'Hyperdrive Creative Agency',
    logoUrl: null,
    email: 'contact@hyperdriveagency.com',
    phone: '+1 (555) 234-5678',
    address: '100 Innovation Way, Suite 400, San Francisco, CA',
  },

  team: {
    defaultTaskPriority: 'Medium',
    autoAssignCreatorOnTaskCreate: true,
    allowTeamInviteByEmail: true,
    maxActiveTasksPerDesigner: 6,
  },
  client: {
    portalBrandingTitle: 'Lumina Client Guest Portal',
    allowClientDirectComments: true,
    autoNotifyClientOnInternalApproval: true,
    guestCredentialsExpiryDays: 30,
  },
  notifications: {
    emailDigestFrequency: 'Daily',
    notifyOnTaskAssigned: true,
    notifyOnApprovalRequested: true,
    notifyOnRevisionRequested: true,
    notifyOnCommentMention: true,
  },
  workflow: {
    enforceInternalReviewBeforeClient: true,
    autoScheduleOnClientApproval: true,
    maxRevisionAttemptsPerPost: 3,
    requireReasonOnRejection: true,
  },
};

export const settingsService = {
  async getSettings() {
    await simulateDelay(150);
    const db = storage.getMockDatabase();
    return db.workspaceSettings || INITIAL_WORKSPACE_SETTINGS;
  },

  async updateProfile(profileData) {
    await simulateDelay(200);
    let updated = null;

    storage.updateMockDatabase((db) => {
      const current = db.workspaceSettings || INITIAL_WORKSPACE_SETTINGS;
      updated = { ...current, profile: { ...current.profile, ...profileData } };
      return { ...db, workspaceSettings: updated };
    });

    return updated;
  },

  async updateTeamSettings(teamData) {
    await simulateDelay(200);
    let updated = null;

    storage.updateMockDatabase((db) => {
      const current = db.workspaceSettings || INITIAL_WORKSPACE_SETTINGS;
      updated = { ...current, team: { ...current.team, ...teamData } };
      return { ...db, workspaceSettings: updated };
    });

    return updated;
  },

  async updateClientSettings(clientData) {
    await simulateDelay(200);
    let updated = null;

    storage.updateMockDatabase((db) => {
      const current = db.workspaceSettings || INITIAL_WORKSPACE_SETTINGS;
      updated = { ...current, client: { ...current.client, ...clientData } };
      return { ...db, workspaceSettings: updated };
    });

    return updated;
  },

  async updateNotificationSettings(notifData) {
    await simulateDelay(200);
    let updated = null;

    storage.updateMockDatabase((db) => {
      const current = db.workspaceSettings || INITIAL_WORKSPACE_SETTINGS;
      updated = { ...current, notifications: { ...current.notifications, ...notifData } };
      return { ...db, workspaceSettings: updated };
    });

    return updated;
  },

  async updateWorkflowSettings(workflowData) {
    await simulateDelay(200);
    let updated = null;

    storage.updateMockDatabase((db) => {
      const current = db.workspaceSettings || INITIAL_WORKSPACE_SETTINGS;
      updated = { ...current, workflow: { ...current.workflow, ...workflowData } };
      return { ...db, workspaceSettings: updated };
    });

    return updated;
  },
};
