import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Modal } from '../../../components/ui/Modal';
import { Drawer } from '../../../components/ui/Drawer';
import { Tabs } from '../../../components/ui/Tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { Input } from '../../../components/forms/Input';
import { Select } from '../../../components/forms/Select';
import { Textarea } from '../../../components/forms/Textarea';
import { Pagination } from '../../../components/ui/Pagination';
import { LoadingState } from '../../../components/common/LoadingState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { teamService } from '../../../services/teamService';
import { useToast } from '../../../hooks/useToast';
import { ROLE_LABELS, ROLES } from '../../../utils/constants';
import { formatDate } from '../../../utils/formatters';
import { getMediaUrl } from '../../../utils/mediaUtils';
import {
  Activity,
  Briefcase,
  CheckCircle2,
  Edit2,
  Eye,
  FileText,
  ImagePlus,
  KeyRound,
  ListChecks,
  Plus,
  Search,
  Shield,
  Upload,
  Users,
  X,
} from 'lucide-react';

const TEAM_ROLE_OPTIONS = [
  { value: ROLES.SOCIAL_MEDIA_MANAGER, label: 'Social Media Manager' },
  { value: ROLES.GRAPHIC_TEAM_HEAD, label: 'Graphic Team Head' },
  { value: ROLES.GRAPHIC_DESIGNER, label: 'Graphic Designer' },
  { value: ROLES.VIDEO_EDITOR, label: 'Video Editor' },
  { value: ROLES.CONTENT_WRITER, label: 'Content Writer' },
  { value: ROLES.REVIEWER, label: 'Content Reviewer' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: ROLES.GRAPHIC_DESIGNER,
  phone: '',
  jobTitle: '',
  department: '',
  status: 'ACTIVE',
  bio: '',
  profileImage: null,
};

const PASSWORD_MESSAGE = 'Use at least 12 characters with uppercase, lowercase, and a number.';

const statusBadgeVariant = (status) => {
  if (status === 'Active' || status === 'ACTIVE') return 'success';
  if (status === 'Suspended' || status === 'SUSPENDED') return 'danger';
  return 'warning';
};

const validateProfileImage = (file) => {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Use a JPG, PNG, or WEBP image.';
  }
  if (file.size > 10 * 1024 * 1024) {
    return 'Profile image must be 10 MB or smaller.';
  }
  return '';
};

const validatePassword = (password) => (
  typeof password === 'string'
  && password.length >= 12
  && /[A-Z]/.test(password)
  && /[a-z]/.test(password)
  && /[0-9]/.test(password)
);

const validatePhone = (phone) => !phone || /^[+()\-\s0-9]{7,30}$/.test(phone.trim());

const ProfileImagePicker = ({ file, existingUrl, name, error, onChange }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : getMediaUrl(existingUrl) || ''), [file, existingUrl]);

  useEffect(() => () => {
    if (file && previewUrl) URL.revokeObjectURL(previewUrl);
  }, [file, previewUrl]);

  const handleFiles = (files) => {
    const selected = files?.[0];
    if (selected) onChange(selected);
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-bold text-slate-700">Profile Image</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          'w-full rounded-xl border border-dashed p-4 text-left transition-colors cursor-pointer',
          isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-white',
          error ? 'border-rose-500' : '',
        ].join(' ')}
      >
        <div className="flex items-center gap-4">
          {previewUrl ? (
            <img src={previewUrl} alt={name || 'Profile preview'} className="w-16 h-16 rounded-full object-cover border border-slate-200 bg-white" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
              <ImagePlus className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-800">
              <Upload className="w-4 h-4 text-indigo-600" />
              Click to upload or drag and drop
            </div>
            <p className="text-[11px] text-slate-500 mt-1">JPG, PNG, or WEBP. Stored in SocialDesk profile storage.</p>
            {file && <p className="text-[11px] font-bold text-indigo-700 mt-1 truncate">{file.name}</p>}
          </div>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
};

const TeamMemberForm = ({ mode, value, errors, onChange, onSubmit, onCancel, isSubmitting }) => {
  const isEdit = mode === 'edit';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <ProfileImagePicker
        file={value.profileImage}
        existingUrl={value.avatar}
        name={value.name}
        error={errors.profileImage}
        onChange={(file) => onChange({ profileImage: file })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Full Name" value={value.name} error={errors.name} onChange={(e) => onChange({ name: e.target.value })} required />
        {!isEdit && (
          <Input label="Email Address" type="email" value={value.email} error={errors.email} onChange={(e) => onChange({ email: e.target.value })} required />
        )}
        {!isEdit && (
          <Input label="Password" type="password" value={value.password} error={errors.password} helperText={PASSWORD_MESSAGE} onChange={(e) => onChange({ password: e.target.value })} required />
        )}
        {!isEdit && (
          <Input label="Confirm Password" type="password" value={value.confirmPassword} error={errors.confirmPassword} onChange={(e) => onChange({ confirmPassword: e.target.value })} required />
        )}
        <Select label="Role" value={value.role} error={errors.role} onChange={(e) => onChange({ role: e.target.value })} options={TEAM_ROLE_OPTIONS} />
        <Input label="Phone Number" value={value.phone} error={errors.phone} onChange={(e) => onChange({ phone: e.target.value })} />
        <Input label="Job Title" value={value.jobTitle} onChange={(e) => onChange({ jobTitle: e.target.value })} />
        <Input label="Department" value={value.department} onChange={(e) => onChange({ department: e.target.value })} />
        <Select label="Status" value={value.status} error={errors.status} onChange={(e) => onChange({ status: e.target.value })} options={STATUS_OPTIONS} />
      </div>

      <Textarea label="Bio" value={value.bio} maxLength={500} rows={3} onChange={(e) => onChange({ bio: e.target.value })} />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" leftIcon={isEdit ? CheckCircle2 : Plus} isLoading={isSubmitting}>
          {isEdit ? 'Save Changes' : '+ Add Team Member'}
        </Button>
      </div>
    </form>
  );
};

export const TeamPage = () => {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('profile');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetErrors, setResetErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageSize = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await teamService.getTeamMembers({
        search: search || undefined,
        role: roleFilter !== 'All' ? roleFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      });
      setMembers(data);
    } catch (error) {
      toast.error('Team Load Failed', error.message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, roleFilter, statusFilter]);

  const paginatedMembers = members.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(members.length / pageSize) || 1;

  const updateForm = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    Object.keys(patch).forEach((key) => {
      if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }));
    });
  };

  const validateForm = (isEdit = false) => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required.';
    if (!isEdit && !/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!isEdit && !form.password) nextErrors.password = 'Password is required.';
    if (!isEdit && form.password && !validatePassword(form.password)) nextErrors.password = PASSWORD_MESSAGE;
    if (!isEdit && form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    if (!TEAM_ROLE_OPTIONS.some((option) => option.value === form.role)) nextErrors.role = 'Choose a valid role.';
    if (!STATUS_OPTIONS.some((option) => option.value === form.status)) nextErrors.status = 'Choose a valid status.';
    if (!validatePhone(form.phone)) nextErrors.phone = 'Enter a valid phone number.';

    const imageError = validateProfileImage(form.profileImage);
    if (imageError) nextErrors.profileImage = imageError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setForm({
      ...EMPTY_FORM,
      name: member.name || '',
      email: member.email || '',
      role: member.role || ROLES.GRAPHIC_DESIGNER,
      phone: member.phone || '',
      jobTitle: member.jobTitle || '',
      department: member.department || '',
      status: member.statusValue || member.status?.toUpperCase() || 'ACTIVE',
      bio: member.bio || '',
      avatar: member.avatar || '',
      profileImage: null,
    });
    setErrors({});
    setIsEditModalOpen(true);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    setIsSubmitting(true);
    try {
      await teamService.createTeamMember(form);
      toast.success('Account Created', `${form.name} can now log in through /login.`);
      setIsAddModalOpen(false);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (error) {
      toast.error('Account Creation Failed', error.message);
      if (error.message === 'This email is already registered.') {
        setErrors((current) => ({ ...current, email: error.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMember = async (e) => {
    e.preventDefault();
    if (!selectedMember || !validateForm(true)) return;

    setIsSubmitting(true);
    try {
      const updated = await teamService.updateTeamMember(selectedMember.id, form);
      toast.success('Team Member Updated', `Saved ${updated.name}.`);
      setIsEditModalOpen(false);
      setSelectedMember(updated);
      await loadData();
    } catch (error) {
      toast.error('Update Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResetModal = (member) => {
    setSelectedMember(member);
    setResetForm({ newPassword: '', confirmPassword: '' });
    setResetErrors({});
    setIsResetModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!validatePassword(resetForm.newPassword)) nextErrors.newPassword = PASSWORD_MESSAGE;
    if (resetForm.newPassword !== resetForm.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setResetErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await teamService.resetMemberPassword(selectedMember.id, resetForm.newPassword, resetForm.confirmPassword);
      toast.success('Password Reset', `${selectedMember.name} can use the new password on /login.`);
      setIsResetModalOpen(false);
    } catch (error) {
      toast.error('Password Reset Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (member, status) => {
    try {
      await teamService.updateMemberStatus(member.id, status);
      await loadData();
      toast.success('Status Updated', `${member.name} is now ${status.toLowerCase()}.`);
    } catch (error) {
      toast.error('Status Update Failed', error.message);
    }
  };

  const openDrawer = async (member) => {
    setSelectedMember(member);
    setActiveDrawerTab('profile');
    setIsDrawerOpen(true);

    try {
      const profile = await teamService.getMemberProfile(member.id);
      if (profile) setSelectedMember(profile);
    } catch (error) {
      toast.error('Profile Load Failed', error.message);
    }
  };

  const drawerTabs = [
    { id: 'profile', label: 'Profile', icon: Shield },
    { id: 'tasks', label: 'Tasks', icon: ListChecks, badge: selectedMember?.assignedTasksCount || 0 },
    { id: 'content', label: 'Content', icon: FileText, badge: selectedMember?.assignedContentCount || 0 },
    { id: 'clients', label: 'Clients', icon: Briefcase, badge: selectedMember?.assignedClientsCount || 0 },
    { id: 'activity', label: 'Activity', icon: Activity, badge: selectedMember?.activityCount || 0 },
    { id: 'permissions', label: 'Permissions', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace/dashboard' }, { label: 'Team' }]} />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold text-indigo-700 uppercase">TEAM</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Team</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage administrator-created SocialDesk accounts for your workspace.
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={Plus} onClick={openAddModal}>
          + Add Team Member
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 grid grid-cols-1 lg:grid-cols-[1fr_220px_180px] gap-3">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by name, email, or department..."
          leftIcon={Search}
        />
        <Select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={[{ value: 'All', label: 'Filter by Role' }, ...TEAM_ROLE_OPTIONS]}
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={[{ value: 'All', label: 'Filter by Status' }, ...STATUS_OPTIONS]}
        />
      </div>

      {loading ? (
        <LoadingState type="skeleton-table" count={8} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members found"
          description="Only real workspace users from MySQL appear here."
          actionLabel="+ Add Team Member"
          onAction={openAddModal}
        />
      ) : (
        <>
          <Table className="min-w-[1120px]">
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Clients</TableHead>
                <TableHead>Assigned Tasks</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Avatar src={member.avatar} name={member.name} size="lg" />
                  </TableCell>
                  <TableCell>
                    <button type="button" onClick={() => openDrawer(member)} className="font-extrabold text-slate-900 hover:text-indigo-700 cursor-pointer">
                      {member.name}
                    </button>
                    <p className="text-[11px] text-slate-400">{member.jobTitle || 'No job title'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary">{ROLE_LABELS[member.role] || member.role}</Badge>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.department || 'Not set'}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(member.status)} dot>{member.status}</Badge>
                  </TableCell>
                  <TableCell>{member.assignedClientsCount}</TableCell>
                  <TableCell>{member.activeTasksCount}</TableCell>
                  <TableCell>{formatDate(member.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="xs" leftIcon={Eye} onClick={() => openDrawer(member)}>Open</Button>
                      <Button variant="ghost" size="xs" leftIcon={Edit2} onClick={() => openEditModal(member)}>Edit</Button>
                      <Button variant="ghost" size="xs" leftIcon={KeyRound} onClick={() => openResetModal(member)}>Reset</Button>
                      <select
                        value={member.statusValue || member.status?.toUpperCase()}
                        onChange={(e) => handleStatusChange(member, e.target.value)}
                        className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer"
                        aria-label={`Change status for ${member.name}`}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalResults={members.length}
              pageSize={pageSize}
            />
          </div>
        </>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Team Member" maxWidth="max-w-4xl">
        <TeamMemberForm
          mode="add"
          value={form}
          errors={errors}
          onChange={updateForm}
          onSubmit={handleAddMember}
          onCancel={() => setIsAddModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Team Member" maxWidth="max-w-4xl">
        <TeamMemberForm
          mode="edit"
          value={form}
          errors={errors}
          onChange={updateForm}
          onSubmit={handleEditMember}
          onCancel={() => setIsEditModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>

      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Password">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={resetForm.newPassword}
            error={resetErrors.newPassword}
            helperText={PASSWORD_MESSAGE}
            onChange={(e) => setResetForm((current) => ({ ...current, newPassword: e.target.value }))}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={resetForm.confirmPassword}
            error={resetErrors.confirmPassword}
            onChange={(e) => setResetForm((current) => ({ ...current, confirmPassword: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" leftIcon={KeyRound} isLoading={isSubmitting}>Reset Password</Button>
          </div>
        </form>
      </Modal>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedMember?.name || 'Team Member'}
        size="max-w-3xl"
      >
        {selectedMember && (
          <div className="space-y-5 text-xs">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <Avatar src={selectedMember.avatar} name={selectedMember.name} size="xl" />
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-900">{selectedMember.name}</h3>
                <p className="text-indigo-700 font-bold">{ROLE_LABELS[selectedMember.role] || selectedMember.role}</p>
                <p className="text-slate-500">{selectedMember.email}</p>
              </div>
              <Badge className="ml-auto" variant={statusBadgeVariant(selectedMember.status)} dot>{selectedMember.status}</Badge>
            </div>

            <Tabs tabs={drawerTabs} activeTab={activeDrawerTab} onChange={setActiveDrawerTab} className="overflow-x-auto" />

            {activeDrawerTab === 'profile' && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><span className="font-extrabold text-slate-400 uppercase">Phone</span><p className="font-bold text-slate-900">{selectedMember.phone || 'Not set'}</p></div>
                <div><span className="font-extrabold text-slate-400 uppercase">Job Title</span><p className="font-bold text-slate-900">{selectedMember.jobTitle || 'Not set'}</p></div>
                <div><span className="font-extrabold text-slate-400 uppercase">Department</span><p className="font-bold text-slate-900">{selectedMember.department || 'Not set'}</p></div>
                <div><span className="font-extrabold text-slate-400 uppercase">Created</span><p className="font-bold text-slate-900">{formatDate(selectedMember.createdAt)}</p></div>
                <div className="sm:col-span-2"><span className="font-extrabold text-slate-400 uppercase">Bio</span><p className="text-slate-700 mt-1">{selectedMember.bio || 'No bio provided.'}</p></div>
              </div>
            )}

            {activeDrawerTab === 'clients' && (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {selectedMember.assignedClients?.length ? selectedMember.assignedClients.map((client) => (
                  <div key={client.id} className="p-4 flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{client.name}</span>
                    <Badge variant={client.status === 'ACTIVE' ? 'success' : 'warning'}>{client.status}</Badge>
                  </div>
                )) : <p className="p-4 text-slate-500">No clients assigned.</p>}
              </div>
            )}

            {activeDrawerTab !== 'profile' && activeDrawerTab !== 'clients' && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="font-extrabold text-slate-900 capitalize">{activeDrawerTab}</p>
                <p className="text-slate-500 mt-1">
                  {activeDrawerTab === 'tasks' && `${selectedMember.assignedTasksCount || 0} assigned tasks, ${selectedMember.activeTasksCount || 0} currently active.`}
                  {activeDrawerTab === 'content' && `${selectedMember.assignedContentCount || 0} content items assigned.`}
                  {activeDrawerTab === 'activity' && `${selectedMember.activityCount || 0} activity records for this workspace.`}
                  {activeDrawerTab === 'permissions' && `Permissions are inherited from ${ROLE_LABELS[selectedMember.role] || selectedMember.role}.`}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
