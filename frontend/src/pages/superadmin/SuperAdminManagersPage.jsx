import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/forms/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { LoadingState } from '../../components/common/LoadingState';
import { superAdminService } from '../../services/superAdminService';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
import { UserCheck, Mail, Phone, Building2, Key, ShieldCheck, Copy } from 'lucide-react';

export const SuperAdminManagersPage = () => {
  const toast = useToast();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reset Password Modal State
  const [selectedManager, setSelectedManager] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const loadManagers = async () => {
    setLoading(true);
    try {
      const data = await superAdminService.getManagers();
      setManagers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagers();
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedManager) return;
    setIsResetting(true);
    try {
      const res = await superAdminService.resetManagerPassword(selectedManager.id, newPassword);
      toast.success('Password Reset Successful!', `Updated password for ${res.userName} (${res.userEmail}).`);
      if (res.newPassword) {
        navigator.clipboard.writeText(res.newPassword).catch(() => {});
        toast.info('Credentials Copied', `New Password: ${res.newPassword}`);
      }
      setSelectedManager(null);
      setNewPassword('');
    } catch (err) {
      toast.error('Reset Failed', err.message || 'Could not reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'SuperAdmin', path: '/superadmin/dashboard' }, { label: 'Workspace Managers' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Workspace Managers Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of primary administrator contacts assigned to company workspaces.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState type="skeleton-table" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manager Name</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Assigned Workspace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((mgr) => (
                  <TableRow key={mgr.id}>
                    <TableCell className="font-semibold text-slate-900">
                      <div className="flex items-center gap-3">
                        <Avatar name={mgr.name} size="sm" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{mgr.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">Primary Admin</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{mgr.email}</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-semibold text-purple-700">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>{mgr.companyName}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={mgr.status === 'Active' ? 'success' : 'danger'} dot>
                        {mgr.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-slate-500">{formatDate(mgr.joinedAt)}</TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        leftIcon={Key}
                        onClick={() => {
                          setSelectedManager(mgr);
                          setNewPassword('');
                        }}
                        className="text-purple-700 border-purple-200 hover:bg-purple-50"
                      >
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={Boolean(selectedManager)}
        onClose={() => setSelectedManager(null)}
        title={`Reset Password for ${selectedManager?.name}`}
        size="md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900">
              <p className="font-bold">Manager Account Credentials</p>
              <p className="mt-0.5">Email: <strong>{selectedManager?.email}</strong></p>
              <p>Workspace: <strong>{selectedManager?.companyName}</strong></p>
            </div>
          </div>

          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password (or leave blank to auto-generate)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="If left empty, a secure temporary password will be automatically generated."
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setSelectedManager(null)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isResetting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Reset Login Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
