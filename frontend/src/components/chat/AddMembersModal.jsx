import React, { useState, useEffect } from 'react';
import { X, Search, Check, UserPlus, ShieldAlert, Loader2 } from 'lucide-react';
import { chatService } from '../../services/chatService';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../../context/ToastContext';

export const AddMembersModal = ({ isOpen, onClose, groupId, groupName, onMembersAdded }) => {
  const { showToast } = useToast();
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && groupId) {
      loadEligibleUsers();
      setSelectedUserIds([]);
      setSearchTerm('');
    }
  }, [isOpen, groupId]);

  const loadEligibleUsers = async () => {
    setLoading(true);
    try {
      const users = await chatService.getWorkspaceUsers(groupId, searchTerm);
      setEligibleUsers(users || []);
    } catch (err) {
      console.error('Failed to load eligible users:', err);
      showToast('Failed to load workspace members.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      showToast('Select at least one member to add.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await onMembersAdded(selectedUserIds);
      showToast(`${selectedUserIds.length} member(s) added successfully!`, 'success');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add members.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = eligibleUsers.filter((u) =>
    (u.full_name || u.email || u.job_title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Add Group Members</h3>
              <p className="text-xs font-semibold text-slate-500 truncate max-w-xs">{groupName || 'Conversation'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Workspace Members ({selectedUserIds.length} selected)
            </label>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Same Workspace
            </span>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Members List */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Loading available members...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {searchTerm ? 'No matching workspace users found.' : 'All workspace users are already in this group.'}
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);

                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{u.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{u.role_display_name || u.job_title || u.email}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

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
            disabled={submitting || selectedUserIds.length === 0}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {submitting ? 'Adding...' : `Add Members (${selectedUserIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
