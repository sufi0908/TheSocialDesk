import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Upload, Search, Check, Loader2, Trash2, ShieldAlert } from 'lucide-react';
import { chatService } from '../../services/chatService';
import { Avatar } from '../ui/Avatar';
import { GroupAvatar } from './GroupAvatar';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';

const GROUP_TYPES = [
  'General',
  'Department',
  'Project',
  'Client Collaboration',
  'Announcement',
  'Custom',
];

export const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState('General');
  const [image, setImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setGroupType('General');
      setImage('');
      setSelectedUserIds([]);
      setSearchTerm('');
      loadWorkspaceUsers();
    }
  }, [isOpen]);

  const loadWorkspaceUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await chatService.getWorkspaceUsers();
      // Filter out current user from selectable list (they are always the creator/admin)
      setWorkspaceUsers(users.filter((u) => Number(u.id) !== Number(user?.id)));
    } catch (err) {
      console.error('Failed to load workspace members:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const uploaded = await chatService.uploadFile(file);
      setImage(uploaded.url || uploaded.storage_path);
      showToast('Group avatar uploaded.', 'success');
    } catch (err) {
      showToast('Failed to upload image.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a group name.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const newGroup = await chatService.createGroup({
        name: name.trim(),
        description: description.trim() || null,
        group_type: groupType,
        image: image || null,
        member_ids: selectedUserIds,
      });

      showToast(`Group "${name.trim()}" created successfully!`, 'success');
      if (onGroupCreated) onGroupCreated(newGroup);
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create group.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = workspaceUsers.filter((u) =>
    (u.full_name || u.email || u.job_title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Create New Group</h3>
              <p className="text-xs font-semibold text-slate-500">Collaborate with your workspace team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <GroupAvatar src={image} name={name || 'New Group'} size="xl" />
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingImage ? 'Uploading...' : 'Group Image'}
                </button>
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    className="p-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    title="Remove image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Add an optional icon or cover photo.</p>
            </div>
          </div>

          {/* Group Name & Group Type in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marketing Team"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Group Type
              </label>
              <select
                value={groupType}
                onChange={(e) => setGroupType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
              >
                {GROUP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this conversation about?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
            />
          </div>

          {/* Members Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Add Members ({selectedUserIds.length} selected)
              </label>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Workspace Isolation Active
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Members Checkbox List */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto scrollbar-thin">
              {loadingUsers ? (
                <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Loading workspace team...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {searchTerm ? 'No matching members found.' : 'No other workspace members found.'}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">{u.full_name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{u.role_display_name || u.job_title || u.email}</p>
                        </div>
                      </div>

                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {submitting ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
