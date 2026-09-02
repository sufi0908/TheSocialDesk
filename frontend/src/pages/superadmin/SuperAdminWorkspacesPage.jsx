import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Dropdown, DropdownItem, DropdownDivider } from '../../components/ui/Dropdown';
import { Input } from '../../components/forms/Input';
import { SearchFilterBar } from '../../components/common/SearchFilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingState } from '../../components/common/LoadingState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { FileUpload } from '../../components/common/FileUpload';
import { Avatar } from '../../components/ui/Avatar';
import { superAdminService } from '../../services/superAdminService';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
import {
  Building2,
  Plus,
  Eye,
  Edit2,
  Power,
  Mail,
  Phone,
  MapPin,
  UserCheck,
  Users,
  Calendar,
  AlertTriangle,
  Trash2,
  MoreVertical,
  Layers,
  FolderKanban,
  FileText,
  CheckSquare,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';

export const SuperAdminWorkspacesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals & Drawers State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Confirmation Modals State
  const [toggleConfirmWorkspace, setToggleConfirmWorkspace] = useState(null);
  const [deleteConfirmWorkspace, setDeleteConfirmWorkspace] = useState(null);
  const [deleteInputName, setDeleteInputName] = useState('');

  // Action Loading State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState(''); // 'create' | 'edit' | 'suspend' | 'activate' | 'delete'

  // Create Form State
  const [createName, setCreateName] = useState('');
  const [createLogoUrl, setCreateLogoUrl] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createManagerName, setCreateManagerName] = useState('');
  const [createManagerEmail, setCreateManagerEmail] = useState('');
  const [createManagerPassword, setCreateManagerPassword] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setIsCreateModalOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const data = await superAdminService.getWorkspaces({
        search,
        status: statusFilter,
      });
      setWorkspaces(data);
    } catch (err) {
      toast.error('Error', err.message || 'Failed to load workspaces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, [search, statusFilter]);

  const resetCreateForm = () => {
    setCreateName('');
    setCreateLogoUrl('');
    setCreateEmail('');
    setCreatePhone('');
    setCreateAddress('');
    setCreateManagerName('');
    setCreateManagerEmail('');
    setCreateManagerPassword('');
  };

  // --- CREATE WORKSPACE ---
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!createName || !createManagerEmail || !createManagerPassword) {
      toast.error('Required Fields', 'Please enter workspace name, manager email, and manager password.');
      return;
    }

    setIsSubmitting(true);
    setActionType('create');
    try {
      await superAdminService.createWorkspace({
        name: createName,
        companyName: createName,
        logoUrl: createLogoUrl || '',
        email: createEmail || 'contact@company.com',
        phone: createPhone || '+1 (555) 000-0000',
        address: createAddress || '100 Main St, Suite 100',
        managerName: createManagerName || 'Workspace Manager',
        managerEmail: createManagerEmail,
        managerPassword: createManagerPassword,
      });

      toast.success('Workspace Created', `Successfully created workspace "${createName}".`);
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadWorkspaces();
    } catch (err) {
      toast.error('Creation Failed', err.message || 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
      setActionType('');
    }
  };

  // --- EDIT WORKSPACE ---
  const openEditModal = (ws) => {
    setSelectedWorkspace(ws);
    setEditName(ws.companyName || ws.name || '');
    setEditLogoUrl(ws.logoUrl || '');
    setEditEmail(ws.email || '');
    setEditPhone(ws.phone || '');
    setEditAddress(ws.address || '');
    setIsEditModalOpen(true);
  };

  const handleEditWorkspace = async (e) => {
    e.preventDefault();
    if (!selectedWorkspace) return;
    if (!editName.trim()) {
      toast.error('Required Field', 'Workspace name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setActionType('edit');
    try {
      const updated = await superAdminService.updateWorkspace(selectedWorkspace.id, {
        name: editName.trim(),
        companyName: editName.trim(),
        logoUrl: editLogoUrl,
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
      });

      toast.success('Workspace Updated', `Saved changes for "${editName}".`);
      setIsEditModalOpen(false);

      // Update local state without full reload
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === selectedWorkspace.id ? { ...w, ...updated } : w))
      );
      if (selectedWorkspace?.id === updated.id) {
        setSelectedWorkspace((prev) => ({ ...prev, ...updated }));
      }
    } catch (err) {
      toast.error('Update Failed', err.message || 'Failed to update workspace.');
    } finally {
      setIsSubmitting(false);
      setActionType('');
    }
  };

  // --- VIEW WORKSPACE DRAWER ---
  const openViewDrawer = async (ws) => {
    setSelectedWorkspace(ws);
    setIsViewDrawerOpen(true);
    try {
      const fullDetails = await superAdminService.getWorkspace(ws.id);
      setSelectedWorkspace(fullDetails);
    } catch (err) {
      console.warn('Could not fetch fresh workspace details:', err.message);
    }
  };

  // --- MANAGE TEAM MODAL ---
  const openTeamModal = async (ws) => {
    setSelectedWorkspace(ws);
    setIsTeamModalOpen(true);
    setTeamLoading(true);
    try {
      const data = await superAdminService.getWorkspaceTeam(ws.id);
      setTeamMembers(data.team || []);
    } catch (err) {
      toast.error('Error', err.message || 'Failed to load workspace team.');
      setTeamMembers([]);
    } finally {
      setTeamLoading(false);
    }
  };

  // --- SUSPEND / ACTIVATE WORKSPACE ---
  const handleToggleStatus = async () => {
    if (!toggleConfirmWorkspace) return;
    const isSuspending = toggleConfirmWorkspace.status === 'Active';
    const newStatus = isSuspending ? 'Suspended' : 'Active';

    setIsSubmitting(true);
    setActionType(isSuspending ? 'suspend' : 'activate');
    try {
      await superAdminService.updateWorkspaceStatus(toggleConfirmWorkspace.id, newStatus);
      toast.success(
        isSuspending ? 'Workspace Suspended' : 'Workspace Activated',
        isSuspending
          ? `"${toggleConfirmWorkspace.companyName}" suspended. Team access is now disabled.`
          : `"${toggleConfirmWorkspace.companyName}" activated. Team access has been restored.`
      );

      setWorkspaces((prev) =>
        prev.map((w) => (w.id === toggleConfirmWorkspace.id ? { ...w, status: newStatus } : w))
      );

      if (selectedWorkspace?.id === toggleConfirmWorkspace.id) {
        setSelectedWorkspace((prev) => ({ ...prev, status: newStatus }));
      }

      setToggleConfirmWorkspace(null);
    } catch (err) {
      toast.error('Action Failed', err.message || 'Failed to update workspace status.');
    } finally {
      setIsSubmitting(false);
      setActionType('');
    }
  };

  // --- DELETE WORKSPACE ---
  const openDeleteModal = (ws) => {
    setDeleteConfirmWorkspace(ws);
    setDeleteInputName('');
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteConfirmWorkspace) return;
    const expectedName = deleteConfirmWorkspace.companyName || deleteConfirmWorkspace.name;
    if (deleteInputName.trim() !== expectedName.trim()) {
      toast.error('Verification Error', 'Typed workspace name does not match.');
      return;
    }

    setIsSubmitting(true);
    setActionType('delete');
    try {
      await superAdminService.deleteWorkspace(deleteConfirmWorkspace.id);
      toast.success(
        'Workspace Deleted',
        `"${expectedName}" and all associated data permanently removed.`
      );

      setWorkspaces((prev) => prev.filter((w) => w.id !== deleteConfirmWorkspace.id));
      if (selectedWorkspace?.id === deleteConfirmWorkspace.id) {
        setIsViewDrawerOpen(false);
        setIsTeamModalOpen(false);
        setSelectedWorkspace(null);
      }
      setDeleteConfirmWorkspace(null);
      setDeleteInputName('');
    } catch (err) {
      toast.error('Deletion Failed', err.message || 'Failed to delete workspace.');
    } finally {
      setIsSubmitting(false);
      setActionType('');
    }
  };

  // Pagination Math
  const totalItems = workspaces.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedWorkspaces = workspaces.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'SuperAdmin', path: '/superadmin/dashboard' }, { label: 'Workspaces' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Workspaces Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company workspaces, managers, status enforcement, and database records.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={Plus}
          onClick={() => {
            resetCreateForm();
            setIsCreateModalOpen(true);
          }}
          className="bg-purple-600 hover:bg-purple-700 shadow-sm"
        >
          Create Workspace
        </Button>
      </div>

      {/* Search & Status Filter */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setCurrentPage(1);
        }}
        statusOptions={[
          { label: 'All Statuses', value: 'All' },
          { label: 'Active', value: 'Active' },
          { label: 'Suspended', value: 'Suspended' },
        ]}
        placeholder="Search by workspace name, manager name or email..."
      />

      {/* Workspace List Table */}
      <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <LoadingState type="skeleton-table" />
          ) : paginatedWorkspaces.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No workspaces found matching your search criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">Workspace</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">Manager</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider text-center">Team</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">Created</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase tracking-wider pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWorkspaces.map((ws) => (
                  <TableRow key={ws.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Workspace Column */}
                    <TableCell className="font-semibold text-slate-900 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-base font-bold border border-purple-100/80 shrink-0 shadow-2xs">
                          {ws.logoUrl ? (
                            <img src={ws.logoUrl} alt={ws.companyName} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span>⚡</span>
                          )}
                        </div>
                        <div>
                          <p
                            onClick={() => openViewDrawer(ws)}
                            className="font-bold text-slate-900 text-sm hover:text-purple-700 cursor-pointer transition-colors leading-tight"
                          >
                            {ws.companyName || ws.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                            {ws.email || ws.address || 'Standard Agency Workspace'}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Manager Column */}
                    <TableCell className="py-3.5">
                      <p className="font-semibold text-slate-800 text-xs">{ws.managerName}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{ws.managerEmail}</p>
                    </TableCell>

                    {/* Team Column */}
                    <TableCell className="text-center py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                        <Users className="w-3 h-3 text-slate-400" />
                        {ws.teamCount || 0}
                      </span>
                    </TableCell>

                    {/* Status Column */}
                    <TableCell className="py-3.5">
                      <Badge variant={ws.status === 'Active' ? 'success' : 'danger'} dot>
                        {ws.status}
                      </Badge>
                    </TableCell>

                    {/* Created Column */}
                    <TableCell className="text-slate-500 text-xs py-3.5">
                      {formatDate(ws.createdAt)}
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell className="text-right py-3.5 pr-4">
                      <Dropdown
                        align="right"
                        trigger={
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                            title="Workspace Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                      >
                        <DropdownItem icon={Eye} onClick={() => openViewDrawer(ws)}>
                          View Workspace
                        </DropdownItem>
                        <DropdownItem icon={Edit2} onClick={() => openEditModal(ws)}>
                          Edit Workspace
                        </DropdownItem>
                        <DropdownItem icon={Users} onClick={() => openTeamModal(ws)}>
                          Manage Team
                        </DropdownItem>
                        <DropdownItem
                          icon={Power}
                          onClick={() => setToggleConfirmWorkspace(ws)}
                          className={
                            ws.status === 'Active'
                              ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }
                        >
                          {ws.status === 'Active' ? 'Suspend Workspace' : 'Activate Workspace'}
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem icon={Trash2} danger onClick={() => openDeleteModal(ws)}>
                          Delete Workspace
                        </DropdownItem>
                      </Dropdown>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      {/* CREATE WORKSPACE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Company Workspace"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <Input
            label="Workspace / Company Name"
            placeholder="e.g. Acme Media Agency"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Logo / Brand Asset</label>
            <FileUpload
              accept="image/*"
              maxSizeMB={5}
              onFileSelect={(files) => {
                const file = Array.isArray(files) ? files[0] : files;
                if (file) {
                  const url = URL.createObjectURL(file);
                  setCreateLogoUrl(url);
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Email"
              type="email"
              placeholder="contact@company.com"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />
            <Input
              label="Company Phone"
              placeholder="+1 (555) 000-0000"
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
            />
          </div>

          <Input
            label="Address"
            placeholder="742 Market St, San Francisco, CA"
            value={createAddress}
            onChange={(e) => setCreateAddress(e.target.value)}
          />

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-800">Primary Workspace Manager</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Manager Full Name"
                placeholder="Alex Vance"
                value={createManagerName}
                onChange={(e) => setCreateManagerName(e.target.value)}
              />
              <Input
                label="Manager Email"
                type="email"
                placeholder="alex@company.com"
                value={createManagerEmail}
                onChange={(e) => setCreateManagerEmail(e.target.value)}
                required
              />
            </div>
            <Input
              label="Manager Password"
              type="password"
              placeholder="••••••••"
              value={createManagerPassword}
              onChange={(e) => setCreateManagerPassword(e.target.value)}
              required
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting && actionType === 'create'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT WORKSPACE MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Workspace: ${selectedWorkspace?.companyName || selectedWorkspace?.name}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleEditWorkspace} className="space-y-4">
          <Input
            label="Workspace / Company Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Logo / Brand Asset</label>
            <FileUpload
              accept="image/*"
              maxSizeMB={5}
              onFileSelect={(files) => {
                const file = Array.isArray(files) ? files[0] : files;
                if (file) {
                  const url = URL.createObjectURL(file);
                  setEditLogoUrl(url);
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
            <Input
              label="Company Phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </div>

          <Input
            label="Address"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
          />

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting && actionType === 'edit'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting && actionType === 'edit' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW WORKSPACE DRAWER (Real Database Statistics & Overview) */}
      <Drawer
        isOpen={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title="Workspace Overview"
        size="max-w-lg"
      >
        {selectedWorkspace && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50/70 border border-purple-100">
              <div className="w-12 h-12 rounded-2xl bg-white text-purple-700 flex items-center justify-center text-2xl font-bold shadow-2xs border border-purple-100 shrink-0">
                {selectedWorkspace.logoUrl ? (
                  <img src={selectedWorkspace.logoUrl} alt={selectedWorkspace.companyName} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>⚡</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 truncate">
                  {selectedWorkspace.companyName || selectedWorkspace.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={selectedWorkspace.status === 'Active' ? 'success' : 'danger'} dot>
                    {selectedWorkspace.status}
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    Created {formatDate(selectedWorkspace.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Real Statistics Grid (Real DB values) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Workspace Database Metrics</h4>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-1">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-lg font-extrabold text-slate-900">{selectedWorkspace.teamCount || 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight font-semibold">Team Members</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-1">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-lg font-extrabold text-slate-900">{selectedWorkspace.clientCount || 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight font-semibold">Clients</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-1">
                    <FolderKanban className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-lg font-extrabold text-slate-900">{selectedWorkspace.projectCount || 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight font-semibold">Projects</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-lg font-extrabold text-slate-900">{selectedWorkspace.contentCount || 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight font-semibold">Content Posts</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center shadow-2xs col-span-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-1">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-lg font-extrabold text-slate-900">{selectedWorkspace.taskCount || 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight font-semibold">Workflow Tasks</p>
                </div>
              </div>
            </div>

            {/* Manager Details Box */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Workspace Manager</h4>
              <div className="flex items-center gap-3">
                <Avatar name={selectedWorkspace.managerName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">{selectedWorkspace.managerName}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{selectedWorkspace.managerEmail}</p>
                  {selectedWorkspace.managerPhone && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedWorkspace.managerPhone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Company Info Box */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Company Information</h4>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedWorkspace.email || 'None'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedWorkspace.phone || 'None'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedWorkspace.address || 'None'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Onboarded: {formatDate(selectedWorkspace.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={Edit2}
                onClick={() => {
                  setIsViewDrawerOpen(false);
                  openEditModal(selectedWorkspace);
                }}
                className="flex-1"
              >
                Manage Workspace
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Users}
                onClick={() => {
                  setIsViewDrawerOpen(false);
                  openTeamModal(selectedWorkspace);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Manage Team
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* MANAGE TEAM MODAL / DRAWER */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title={`${selectedWorkspace?.companyName || selectedWorkspace?.name} — Team Members`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Suspended Notice Banner */}
          {selectedWorkspace?.status === 'Suspended' && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Workspace suspended — team access is currently disabled.</p>
                <p className="text-rose-600 mt-0.5">
                  Members belonging to this workspace are temporarily blocked from logging in and accessing workspace resources.
                </p>
              </div>
            </div>
          )}

          {teamLoading ? (
            <LoadingState type="skeleton-table" />
          ) : teamMembers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No team members assigned to this workspace.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-bold text-slate-700">Member</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Email & Phone</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Role</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((m) => (
                    <TableRow key={m.membershipId || m.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} size="sm" />
                          <span className="font-semibold text-slate-900 text-xs">{m.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-700 font-mono">{m.email}</p>
                        {m.phone && <p className="text-[10px] text-slate-400">{m.phone}</p>}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                          {m.workspaceRole || m.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.userStatus === 'ACTIVE' ? 'success' : 'danger'} dot>
                          {m.userStatus || 'ACTIVE'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(m.joinedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="pt-3 flex justify-end border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setIsTeamModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* SUSPEND / ACTIVATE CONFIRM DIALOG */}
      <Modal
        isOpen={!!toggleConfirmWorkspace}
        onClose={() => setToggleConfirmWorkspace(null)}
        title={toggleConfirmWorkspace?.status === 'Active' ? 'Suspend Workspace?' : 'Activate Workspace?'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 border ${
                toggleConfirmWorkspace?.status === 'Active'
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
            >
              <Power className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-600 leading-relaxed space-y-1.5">
              {toggleConfirmWorkspace?.status === 'Active' ? (
                <>
                  <p>
                    Are you sure you want to suspend{' '}
                    <strong className="text-slate-900">{toggleConfirmWorkspace?.companyName || toggleConfirmWorkspace?.name}</strong>?
                  </p>
                  <p className="text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    All workspace members will immediately lose workspace access. Superadmin management remains active.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Re-activate{' '}
                    <strong className="text-slate-900">{toggleConfirmWorkspace?.companyName || toggleConfirmWorkspace?.name}</strong> for full agency access?
                  </p>
                  <p className="text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    Workspace team members will regain access according to their existing account status.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setToggleConfirmWorkspace(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={toggleConfirmWorkspace?.status === 'Active' ? 'danger' : 'primary'}
              size="sm"
              onClick={handleToggleStatus}
              isLoading={isSubmitting && (actionType === 'suspend' || actionType === 'activate')}
              className={toggleConfirmWorkspace?.status !== 'Active' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {isSubmitting
                ? toggleConfirmWorkspace?.status === 'Active'
                  ? 'Suspending...'
                  : 'Activating...'
                : toggleConfirmWorkspace?.status === 'Active'
                ? 'Suspend Workspace'
                : 'Activate Workspace'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* STRICT DELETE WORKSPACE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteConfirmWorkspace}
        onClose={() => {
          setDeleteConfirmWorkspace(null);
          setDeleteInputName('');
        }}
        title="DELETE WORKSPACE?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0 border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                You are about to permanently delete:{' '}
                <strong className="text-slate-900 text-sm">
                  {deleteConfirmWorkspace?.companyName || deleteConfirmWorkspace?.name}
                </strong>
              </p>
              <p className="text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 leading-normal">
                This will permanently remove all associated users, projects, tasks, content, comments, files, and other workspace data. <strong>This action cannot be undone.</strong>
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              Type <span className="font-bold text-slate-900">"{deleteConfirmWorkspace?.companyName || deleteConfirmWorkspace?.name}"</span> to confirm:
            </label>
            <Input
              value={deleteInputName}
              onChange={(e) => setDeleteInputName(e.target.value)}
              placeholder={deleteConfirmWorkspace?.companyName || deleteConfirmWorkspace?.name}
              autoFocus
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeleteConfirmWorkspace(null);
                setDeleteInputName('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteWorkspace}
              disabled={
                deleteInputName.trim() !== (deleteConfirmWorkspace?.companyName || deleteConfirmWorkspace?.name)?.trim() ||
                isSubmitting
              }
              isLoading={isSubmitting && actionType === 'delete'}
            >
              {isSubmitting && actionType === 'delete' ? 'Deleting...' : 'Delete Workspace'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
