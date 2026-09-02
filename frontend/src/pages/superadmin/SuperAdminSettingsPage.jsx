import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/forms/Input';
import { Switch } from '../../components/forms/Switch';
import { Button } from '../../components/ui/Button';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { useToast } from '../../hooks/useToast';
import { Settings, ShieldCheck, Globe, Save } from 'lucide-react';

export const SuperAdminSettingsPage = () => {
  const toast = useToast();

  const [platformName, setPlatformName] = useState('SocialDesk Platform');
  const [supportEmail, setSupportEmail] = useState('support@socialdesk.io');
  const [autoApproveWorkspaces, setAutoApproveWorkspaces] = useState(false);
  const [enableMaintenanceMode, setEnableMaintenanceMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Platform Settings Saved', 'SuperAdmin global configurations updated.');
    }, 300);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'SuperAdmin', path: '/superadmin/dashboard' }, { label: 'Settings' }]} />

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">SuperAdmin Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Global SaaS platform configuration, support email, and operational flags.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-600" />
              <span>General SaaS Branding</span>
            </CardTitle>
            <CardDescription>Global application name and support contact info.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Platform Name"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
            />
            <Input
              label="System Support Email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Operational Controls</span>
            </CardTitle>
            <CardDescription>System-wide policy toggles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Switch
              label="Auto-Approve New Workspaces"
              description="Automatically activate new self-service agency signups without manual SuperAdmin review."
              checked={autoApproveWorkspaces}
              onChange={(c) => setAutoApproveWorkspaces(c)}
            />
            <Switch
              label="Platform Maintenance Mode"
              description="Temporarily restrict non-admin access for scheduled platform upgrades."
              checked={enableMaintenanceMode}
              onChange={(c) => setEnableMaintenanceMode(c)}
            />
          </CardContent>

          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              leftIcon={Save}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Save SuperAdmin Settings
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};
