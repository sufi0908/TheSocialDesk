import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/forms/Input';
import { Select } from '../../../components/forms/Select';
import { Checkbox } from '../../../components/forms/Checkbox';
import { Tabs } from '../../../components/ui/Tabs';
import { LoadingState } from '../../../components/common/LoadingState';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { settingsService } from '../../../services/settingsService';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { ROLES, ROLE_LABELS } from '../../../utils/constants';
import { useNotifications } from '../../../context/NotificationContext';
import { testNotificationSound } from '../../../utils/NotificationSound';
import {
  Building2,
  Users2,
  Globe,
  Bell,
  Sliders,
  Save,
  ShieldCheck,
  Sparkles,
  Lock,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const SettingsPage = () => {
  const { role: userRole, user } = useAuth();
  const toast = useToast();
  const { soundEnabled, popupsEnabled, toggleSound, togglePopups } = useNotifications();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('profile');

  // Form States
  // 1. Profile
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // 2. Team
  const [defaultTaskPriority, setDefaultTaskPriority] = useState('Medium');
  const [autoAssignCreator, setAutoAssignCreator] = useState(true);
  const [allowTeamInvite, setAllowTeamInvite] = useState(true);

  // 3. Client Portal
  const [portalBrandingTitle, setPortalBrandingTitle] = useState('');
  const [allowClientDirectComments, setAllowClientDirectComments] = useState(true);
  const [autoNotifyClient, setAutoNotifyClient] = useState(true);

  // 4. Notifications
  const [emailDigestFrequency, setEmailDigestFrequency] = useState('Daily');
  const [notifyTaskAssigned, setNotifyTaskAssigned] = useState(true);
  const [notifyApprovalRequested, setNotifyApprovalRequested] = useState(true);
  const [notifyRevisionRequested, setNotifyRevisionRequested] = useState(true);
  const [notifyCommentAdded, setNotifyCommentAdded] = useState(true);
  const [notifyCalendarScheduled, setNotifyCalendarScheduled] = useState(true);
  const [notifyChatMessages, setNotifyChatMessages] = useState(true);

  // 5. Workflow
  const [enforceInternalReview, setEnforceInternalReview] = useState(true);
  const [autoScheduleOnApproval, setAutoScheduleOnApproval] = useState(true);
  const [requireReasonOnRejection, setRequireReasonOnRejection] = useState(true);

  const isManagerOrAdmin = userRole === ROLES.WORKSPACE_MANAGER || userRole === ROLES.SUPERADMIN;
  const isTeamLead = userRole === ROLES.GRAPHIC_TEAM_HEAD || userRole === ROLES.SOCIAL_MEDIA_MANAGER;

  useEffect(() => {
    const loadSettingsData = async () => {
      setLoading(true);
      try {
        const data = await settingsService.getSettings();
        setSettings(data);

        // Populate Forms
        setCompanyName(data.profile?.companyName || '');
        setLogoUrl(data.profile?.logoUrl || '');
        setEmail(data.profile?.email || '');
        setPhone(data.profile?.phone || '');

        setDefaultTaskPriority(data.team?.defaultTaskPriority || 'Medium');
        setAutoAssignCreator(data.team?.autoAssignCreatorOnTaskCreate ?? true);
        setAllowTeamInvite(data.team?.allowTeamInviteByEmail ?? true);

        setPortalBrandingTitle(data.client?.portalBrandingTitle || '');
        setAllowClientDirectComments(data.client?.allowClientDirectComments ?? true);
        setAutoNotifyClient(data.client?.autoNotifyClientOnInternalApproval ?? true);

        setEmailDigestFrequency(data.notifications?.emailDigestFrequency || 'Daily');
        setNotifyTaskAssigned(data.notifications?.notifyOnTaskAssigned ?? true);
        setNotifyApprovalRequested(data.notifications?.notifyOnApprovalRequested ?? true);
        setNotifyRevisionRequested(data.notifications?.notifyOnRevisionRequested ?? true);

        setEnforceInternalReview(data.workflow?.enforceInternalReviewBeforeClient ?? true);
        setAutoScheduleOnApproval(data.workflow?.autoScheduleOnClientApproval ?? true);
        setRequireReasonOnRejection(data.workflow?.requireReasonOnRejection ?? true);
      } finally {
        setLoading(false);
      }
    };

    loadSettingsData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await settingsService.updateProfile({ companyName, logoUrl, email, phone });
      toast.success('Workspace Profile Saved', 'Updated company profile details.');
    } catch (err) {
      toast.error('Error', 'Failed to save workspace profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTeamSettings = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await settingsService.updateTeamSettings({
        defaultTaskPriority,
        autoAssignCreatorOnTaskCreate: autoAssignCreator,
        allowTeamInviteByEmail: allowTeamInvite,
      });
      toast.success('Team Settings Saved', 'Updated team assignment rules.');
    } catch (err) {
      toast.error('Error', 'Failed to save team settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveClientSettings = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await settingsService.updateClientSettings({
        portalBrandingTitle,
        allowClientDirectComments,
        autoNotifyClientOnInternalApproval: autoNotifyClient,
      });
      toast.success('Client Portal Settings Saved', 'Updated client guest portal defaults.');
    } catch (err) {
      toast.error('Error', 'Failed to save client settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotificationSettings = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await settingsService.updateNotificationSettings({
        emailDigestFrequency,
        notifyOnTaskAssigned: notifyTaskAssigned,
        notifyOnApprovalRequested: notifyApprovalRequested,
        notifyOnRevisionRequested: notifyRevisionRequested,
      });
      toast.success('Notification Preferences Saved', 'Updated alert preferences.');
    } catch (err) {
      toast.error('Error', 'Failed to save notification preferences.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWorkflowSettings = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await settingsService.updateWorkflowSettings({
        enforceInternalReviewBeforeClient: enforceInternalReview,
        autoScheduleOnClientApproval: autoScheduleOnApproval,
        requireReasonOnRejection: requireReasonOnRejection,
      });
      toast.success('Workflow Rules Saved', 'Updated approval progression rules.');
    } catch (err) {
      toast.error('Error', 'Failed to save workflow settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState type="skeleton-cards" count={3} />;
  }

  // Filter Tabs Based on Role Relevance
  const allTabs = [
    { id: 'profile', label: 'Workspace Profile', icon: Building2, show: isManagerOrAdmin },
    { id: 'team', label: 'Team Settings', icon: Users2, show: isManagerOrAdmin },
    { id: 'client', label: 'Client Portal Settings', icon: Globe, show: isManagerOrAdmin },
    { id: 'workflow', label: 'Workflow Rules', icon: Sliders, show: isManagerOrAdmin || isTeamLead },
    { id: 'notifications', label: 'Notification Preferences', icon: Bell, show: true },
  ];

  const visibleTabs = allTabs.filter((t) => t.show);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace/dashboard' }, { label: 'Settings' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> {ROLE_LABELS[userRole] || 'Role'} Scoped Preferences
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Workspace & Role Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure agency branding, default team assignments, client portal rules, and notification preferences.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t)}
        tabs={visibleTabs}
      />

      {/* TAB 1: WORKSPACE PROFILE (Manager / Admin Only) */}
      {activeTab === 'profile' && isManagerOrAdmin && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Workspace & Agency Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
              <Input
                label="Company / Agency Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Logo / Brand Asset</label>
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base border border-indigo-200">
                      {(companyName || 'W')[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">{companyName || 'Workspace Logo'}</p>
                    <p className="text-[10px] text-slate-400">Upload square or horizontal SVG/PNG (max 5MB)</p>
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-xs text-rose-600 font-semibold hover:text-rose-800 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Contact Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>


              <div className="pt-3 flex justify-end">
                <Button type="submit" variant="primary" leftIcon={Save} isLoading={isSubmitting}>
                  Save Workspace Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: TEAM SETTINGS (Manager / Admin Only) */}
      {activeTab === 'team' && isManagerOrAdmin && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users2 className="w-4 h-4 text-indigo-600" />
              <span>Team & Task Assignment Defaults</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveTeamSettings} className="space-y-4 max-w-xl">
              <Select
                label="Default Task Priority"
                value={defaultTaskPriority}
                onChange={(e) => setDefaultTaskPriority(e.target.value)}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Urgent', label: 'Urgent' },
                ]}
              />

              <div className="space-y-3 pt-2">
                <Checkbox
                  label="Auto-assign task creator when no assignee is selected"
                  checked={autoAssignCreator}
                  onChange={(checked) => setAutoAssignCreator(checked)}
                />

                <Checkbox
                  label="Allow team members to invite external agency freelancers by email"
                  checked={allowTeamInvite}
                  onChange={(checked) => setAllowTeamInvite(checked)}
                />
              </div>

              <div className="pt-3 flex justify-end">
                <Button type="submit" variant="primary" leftIcon={Save} isLoading={isSubmitting}>
                  Save Team Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: CLIENT PORTAL SETTINGS (Manager / Admin Only) */}
      {activeTab === 'client' && isManagerOrAdmin && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>White-Label Client Portal Defaults</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveClientSettings} className="space-y-4 max-w-xl">
              <Input
                label="Client Portal Guest Header Title"
                placeholder="Lumina Client Guest Portal"
                value={portalBrandingTitle}
                onChange={(e) => setPortalBrandingTitle(e.target.value)}
              />

              <div className="space-y-3 pt-2">
                <Checkbox
                  label="Allow client guest users to post comments directly on posts"
                  checked={allowClientDirectComments}
                  onChange={(checked) => setAllowClientDirectComments(checked)}
                />

                <Checkbox
                  label="Automatically notify client via email when a post passes internal review"
                  checked={autoNotifyClient}
                  onChange={(checked) => setAutoNotifyClient(checked)}
                />
              </div>

              <div className="pt-3 flex justify-end">
                <Button type="submit" variant="primary" leftIcon={Save} isLoading={isSubmitting}>
                  Save Client Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: WORKFLOW RULES (Manager & Team Leads) */}
      {activeTab === 'workflow' && (isManagerOrAdmin || isTeamLead) && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Approval Progression & Workflow Rules</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveWorkflowSettings} className="space-y-4 max-w-xl">
              <div className="space-y-3">
                <Checkbox
                  label="Enforce Internal Review phase before content can be submitted to client"
                  checked={enforceInternalReview}
                  onChange={(checked) => setEnforceInternalReview(checked)}
                />

                <Checkbox
                  label="Automatically mark content ready for scheduling upon client approval"
                  checked={autoScheduleOnApproval}
                  onChange={(checked) => setAutoScheduleOnApproval(checked)}
                />

                <Checkbox
                  label="Require explicit revision feedback reason when rejecting or requesting revisions"
                  checked={requireReasonOnRejection}
                  onChange={(checked) => setRequireReasonOnRejection(checked)}
                />
              </div>

              <div className="pt-3 flex justify-end">
                <Button type="submit" variant="primary" leftIcon={Save} isLoading={isSubmitting}>
                  Save Workflow Rules
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: NOTIFICATION PREFERENCES (Available to All Team Members) */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <span>Global Alert & Sound Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveNotificationSettings} className="space-y-6 max-w-xl">
              {/* REAL-TIME AUDIO & POPUP CONTROLS */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Real-Time Popup & Audio Alerts
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Notification Sound</p>
                      <p className="text-[11px] text-slate-500">Play a clean audio chime when a new notification arrives</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        leftIcon={Volume2}
                        onClick={testNotificationSound}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        Test Sound
                      </Button>
                      <input
                        type="checkbox"
                        checked={soundEnabled}
                        onChange={(e) => toggleSound(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">In-App Toast Popups</p>
                      <p className="text-[11px] text-slate-500">Display floating popup cards for incoming events</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={popupsEnabled}
                      onChange={(e) => togglePopups(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* EMAIL DIGEST FREQUENCY */}
              <Select
                label="Email Digest Summary"
                value={emailDigestFrequency}
                onChange={(e) => setEmailDigestFrequency(e.target.value)}
                options={[
                  { value: 'Realtime', label: 'Realtime (Immediate)' },
                  { value: 'Daily', label: 'Daily Digest' },
                  { value: 'Weekly', label: 'Weekly Summary' },
                  { value: 'Off', label: 'Turn Off Email Digest' },
                ]}
              />

              {/* CATEGORY ALERTS */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Event Category Subscriptions
                </h4>

                <Checkbox
                  label="Task & Assignment alerts (Assigned, status changed, completed)"
                  checked={notifyTaskAssigned}
                  onChange={(checked) => setNotifyTaskAssigned(checked)}
                />

                <Checkbox
                  label="Content & Approval alerts (Submitted, approved, published)"
                  checked={notifyApprovalRequested}
                  onChange={(checked) => setNotifyApprovalRequested(checked)}
                />

                <Checkbox
                  label="Revision & Changes alerts (Feedback notes, resubmissions)"
                  checked={notifyRevisionRequested}
                  onChange={(checked) => setNotifyRevisionRequested(checked)}
                />

                <Checkbox
                  label="Comments & Mentions alerts (Task discussions, @mentions)"
                  checked={notifyCommentAdded}
                  onChange={(checked) => setNotifyCommentAdded(checked)}
                />

                <Checkbox
                  label="Calendar & Schedule alerts (Post scheduled, date/time updated)"
                  checked={notifyCalendarScheduled}
                  onChange={(checked) => setNotifyCalendarScheduled(checked)}
                />

                <Checkbox
                  label="Chat & Team message alerts (Group messages, voice notes)"
                  checked={notifyChatMessages}
                  onChange={(checked) => setNotifyChatMessages(checked)}
                />
              </div>

              <div className="pt-3 flex justify-end">
                <Button type="submit" variant="primary" leftIcon={Save} isLoading={isSubmitting}>
                  Save Preferences
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
