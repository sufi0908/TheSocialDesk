import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES } from '../../../utils/constants';
import { ManagerDashboardView } from './ManagerDashboardView';
import { SocialMediaManagerDashboardView } from './SocialMediaManagerDashboardView';
import { GraphicTeamHeadDashboardView } from './GraphicTeamHeadDashboardView';
import { GraphicDesignerDashboardView } from './GraphicDesignerDashboardView';
import { VideoEditorDashboardView } from './VideoEditorDashboardView';

export const DashboardPage = () => {
  const { role } = useAuth();

  // Role-specific dashboard selection
  if (role === ROLES.SOCIAL_MEDIA_MANAGER) {
    return <SocialMediaManagerDashboardView />;
  }

  if (role === ROLES.GRAPHIC_TEAM_HEAD) {
    return <GraphicTeamHeadDashboardView />;
  }

  if (role === ROLES.GRAPHIC_DESIGNER || role === ROLES.CONTENT_WRITER) {
    return <GraphicDesignerDashboardView />;
  }

  if (role === ROLES.VIDEO_EDITOR) {
    return <VideoEditorDashboardView />;
  }

  if (role === ROLES.REVIEWER) {
    return <SocialMediaManagerDashboardView />;
  }

  // Default for Workspace Manager / SuperAdmin
  return <ManagerDashboardView />;
};
