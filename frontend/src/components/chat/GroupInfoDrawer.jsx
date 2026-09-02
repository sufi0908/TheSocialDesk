import React, { useState } from 'react';
import {
  X,
  Pin,
  Bell,
  BellOff,
  UserPlus,
  MoreVertical,
  Shield,
  ShieldAlert,
  LogOut,
  Archive,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Video,
  FileText,
  Mic,
  Download,
  Users,
  Layers,
} from 'lucide-react';
import { GroupAvatar } from './GroupAvatar';
import { Avatar } from '../ui/Avatar';
import { resolveMediaUrl } from '../../utils/mediaUtils';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

export const GroupInfoDrawer = ({
  isOpen,
  onClose,
  group,
  currentUserId,
  currentUserRole,
  sharedMedia,
  onUpdatePreferences,
  onOpenEditGroup,
  onOpenAddMembers,
  onUpdateMemberRole,
  onRemoveMember,
  onLeaveGroup,
  onArchiveGroup,
  onOpenMedia,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'media' | 'settings'
  const [mediaSubTab, setMediaSubTab] = useState('images'); // 'images' | 'videos' | 'documents' | 'audio'
  const [memberMenuOpen, setMemberMenuOpen] = useState(null);
  const [showMuteMenu, setShowMuteMenu] = useState(false);

  if (!isOpen || !group) return null;

  const members = group.members || [];
  const isManager = ['superadmin', 'workspace_manager', 'agency_admin'].includes(currentUserRole);
  const myMembership = members.find((m) => Number(m.user_id) === Number(currentUserId));
  const isGroupAdmin = myMembership?.group_role === 'ADMIN' || isManager;
  const isPinned = Boolean(group.is_pinned);
  const isMuted = Boolean(group.is_muted);

  const handleTogglePin = async () => {
    try {
      await onUpdatePreferences(group.id, { is_pinned: !isPinned });
      showToast(isPinned ? 'Group unpinned.' : 'Group pinned to top.', 'success');
    } catch (err) {
      showToast('Failed to update pin preference.', 'error');
    }
  };

  const handleMute = async (duration) => {
    try {
      await onUpdatePreferences(group.id, { is_muted: true, mute_duration: duration });
      setShowMuteMenu(false);
      showToast('Group notifications muted.', 'success');
    } catch (err) {
      showToast('Failed to mute notifications.', 'error');
    }
  };

  const handleUnmute = async () => {
    try {
      await onUpdatePreferences(group.id, { is_muted: false });
      showToast('Group notifications unmuted.', 'success');
    } catch (err) {
      showToast('Failed to unmute notifications.', 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setMemberMenuOpen(null);
    try {
      await onUpdateMemberRole(group.id, userId, newRole);
      showToast(`Member updated to ${newRole}.`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update member role.', 'error');
    }
  };

  const handleRemove = async (userId, userName) => {
    setMemberMenuOpen(null);
    if (!window.confirm(`Are you sure you want to remove ${userName} from the group?`)) return;
    try {
      await onRemoveMember(group.id, userId);
      showToast(`${userName} removed from group.`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove member.', 'error');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await onLeaveGroup(group.id);
      showToast('You left the group.', 'success');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to leave group.', 'error');
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this conversation?')) return;
    try {
      await onArchiveGroup(group.id);
      showToast('Group archived.', 'success');
      onClose();
    } catch (err) {
      showToast('Failed to archive group.', 'error');
    }
  };

  const mediaImages = sharedMedia?.images || [];
  const mediaVideos = sharedMedia?.videos || [];
  const mediaDocs = sharedMedia?.documents || [];
  const mediaAudio = sharedMedia?.audio || [];

  return (
    <div className="w-80 lg:w-[350px] border-l border-slate-200/90 bg-white flex flex-col h-full min-h-0 min-w-0 shrink-0 select-none z-20 overflow-hidden">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-sm font-extrabold text-slate-900">Group Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Group Card Preview */}
      <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center bg-gradient-to-b from-slate-50/70 to-white">
        <GroupAvatar
          src={group.image}
          name={group.name}
          size="2xl"
          isPinned={isPinned}
          isMuted={isMuted}
          className="shadow-md mb-3"
        />

        <h3 className="text-base font-black text-slate-900 leading-snug">{group.name}</h3>

        {group.group_type && (
          <span className="mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
            {group.group_type}
          </span>
        )}

        {group.description && (
          <p className="text-xs text-slate-500 mt-2 line-clamp-3 max-w-xs">{group.description}</p>
        )}

        <div className="flex items-center gap-2 mt-4">
          {/* Pin Button */}
          <button
            type="button"
            onClick={handleTogglePin}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs ${
              isPinned
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span>{isPinned ? 'Pinned' : 'Pin'}</span>
          </button>

          {/* Mute Dropdown */}
          <div className="relative">
            {isMuted ? (
              <button
                type="button"
                onClick={handleUnmute}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <BellOff className="w-3.5 h-3.5 text-slate-600" />
                <span>Muted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowMuteMenu(!showMuteMenu)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Mute</span>
              </button>
            )}

            {showMuteMenu && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 divide-y divide-slate-100 text-xs font-medium animate-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleMute('1_hour')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                >
                  For 1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => handleMute('8_hours')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                >
                  For 8 Hours
                </button>
                <button
                  type="button"
                  onClick={() => handleMute('until_tomorrow')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Until Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleMute('forever')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Until I turn it on
                </button>
              </div>
            )}
          </div>

          {/* Edit Group (Admin) */}
          {isGroupAdmin && (
            <button
              type="button"
              onClick={onOpenEditGroup}
              title="Edit group details"
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/60 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'members'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Members ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'media'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Media</span>
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {/* Add Members Button for Admin */}
            {isGroupAdmin && (
              <button
                type="button"
                onClick={onOpenAddMembers}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Members</span>
              </button>
            )}

            {/* Members List */}
            <div className="divide-y divide-slate-100">
              {members.map((m) => {
                const isSelf = Number(m.user_id) === Number(currentUserId);
                const isAdmin = m.group_role === 'ADMIN';

                return (
                  <div
                    key={m.user_id}
                    className="py-2.5 flex items-center justify-between gap-3 relative"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {m.full_name} {isSelf && '(You)'}
                          </p>
                          {isAdmin && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {m.system_role_label || m.job_title || m.email}
                        </p>
                      </div>
                    </div>

                    {/* Member Options Menu (if Admin and not target self) */}
                    {isGroupAdmin && !isSelf && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setMemberMenuOpen(memberMenuOpen === m.user_id ? null : m.user_id)
                          }
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {memberMenuOpen === m.user_id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs font-medium divide-y divide-slate-100 animate-in zoom-in-95">
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleRoleChange(m.user_id, 'MEMBER')}
                                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                                <span>Demote to Member</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRoleChange(m.user_id, 'ADMIN')}
                                className="w-full text-left px-3 py-2 text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-bold"
                              >
                                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Make Group Admin</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemove(m.user_id, m.full_name)}
                              className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove from Group</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SHARED MEDIA TAB */}
        {activeTab === 'media' && (
          <div className="space-y-3">
            {/* Sub-tab pills */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setMediaSubTab('images')}
                className={`py-1 rounded-lg text-center ${
                  mediaSubTab === 'images' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Photos ({mediaImages.length})
              </button>
              <button
                type="button"
                onClick={() => setMediaSubTab('videos')}
                className={`py-1 rounded-lg text-center ${
                  mediaSubTab === 'videos' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Videos ({mediaVideos.length})
              </button>
              <button
                type="button"
                onClick={() => setMediaSubTab('documents')}
                className={`py-1 rounded-lg text-center ${
                  mediaSubTab === 'documents' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Docs ({mediaDocs.length})
              </button>
              <button
                type="button"
                onClick={() => setMediaSubTab('audio')}
                className={`py-1 rounded-lg text-center ${
                  mediaSubTab === 'audio' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Voice ({mediaAudio.length})
              </button>
            </div>

            {/* Images Grid */}
            {mediaSubTab === 'images' && (
              <div className="grid grid-cols-3 gap-1.5">
                {mediaImages.length === 0 ? (
                  <p className="col-span-3 text-center py-8 text-xs text-slate-400">
                    No shared photos yet.
                  </p>
                ) : (
                  mediaImages.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => onOpenMedia && onOpenMedia(img, mediaImages)}
                      className="aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer group relative shadow-2xs"
                    >
                      <img
                        src={resolveMediaUrl(img.url || img.storage_path)}
                        alt={img.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Videos List */}
            {mediaSubTab === 'videos' && (
              <div className="space-y-2">
                {mediaVideos.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">No shared videos yet.</p>
                ) : (
                  mediaVideos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => onOpenMedia && onOpenMedia(vid, mediaVideos)}
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                          <Video className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {vid.file_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatFileSize(vid.file_size)} • {formatDate(vid.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Documents List */}
            {mediaSubTab === 'documents' && (
              <div className="space-y-2">
                {mediaDocs.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">
                    No shared documents yet.
                  </p>
                ) : (
                  mediaDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {doc.file_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatFileSize(doc.file_size)} • {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <a
                        href={resolveMediaUrl(doc.url || doc.storage_path)}
                        download={doc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Voice Notes */}
            {mediaSubTab === 'audio' && (
              <div className="space-y-2">
                {mediaAudio.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">
                    No shared voice notes yet.
                  </p>
                ) : (
                  mediaAudio.map((aud) => (
                    <div
                      key={aud.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                          <Mic className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            Voice Note ({aud.duration ? `${Math.round(aud.duration)}s` : 'Audio'})
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Sent by {aud.senderName} • {formatDate(aud.createdAt)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenMedia && onOpenMedia(aud, mediaAudio)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer Footer Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-2 shrink-0">
        {/* Archive Group (Admin) */}
        {isGroupAdmin && (
          <button
            type="button"
            onClick={handleArchive}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive Conversation</span>
          </button>
        )}

        {/* Leave Group Button */}
        <button
          type="button"
          onClick={handleLeave}
          className="w-full py-2 px-3 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Leave Group</span>
        </button>
      </div>
    </div>
  );
};
