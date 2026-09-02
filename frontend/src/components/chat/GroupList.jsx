import React, { useState } from 'react';
import { Search, Plus, Pin, BellOff, Users, Loader2 } from 'lucide-react';
import { GroupAvatar } from './GroupAvatar';
import { formatTime } from '../../utils/formatters';

export const GroupList = ({
  groups = [],
  activeGroupId,
  onSelectGroup,
  onOpenCreateGroup,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pinned' | 'unread'

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.last_message || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'pinned') return Boolean(g.is_pinned);
    if (activeTab === 'unread') return Number(g.unread_count) > 0;
    return true;
  });

  const pinnedGroupsCount = groups.filter((g) => Boolean(g.is_pinned)).length;
  const unreadGroupsCount = groups.filter((g) => Number(g.unread_count) > 0).length;

  return (
    <div className="flex flex-col h-full bg-slate-50/60 border-r border-slate-200/90 select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200/90 bg-white space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Chats</h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {groups.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenCreateGroup}
            title="Create new group"
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Group</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pinned')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
              activeTab === 'pinned'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Pin className="w-3 h-3" />
            <span>Pinned</span>
            {pinnedGroupsCount > 0 && (
              <span className="text-[10px] opacity-80">({pinnedGroupsCount})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
              activeTab === 'unread'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Unread</span>
            {unreadGroupsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500 text-white font-black">
                {unreadGroupsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 p-2 space-y-1 scrollbar-thin">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Loading conversations...</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
            <Users className="w-8 h-8 text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">No conversations found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchTerm ? 'Try a different search term.' : 'Click "New Group" to get started.'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isActive = Number(activeGroupId) === Number(group.id);
            const unreadCount = Number(group.unread_count || 0);
            const isPinned = Boolean(group.is_pinned);
            const isMuted = Boolean(group.is_muted);

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`p-3 rounded-2xl cursor-pointer flex items-center gap-3 transition-all duration-150 relative ${
                  isActive
                    ? 'bg-white shadow-xs border border-slate-200/90'
                    : 'hover:bg-white/80 hover:shadow-2xs'
                }`}
              >
                {/* Group Avatar */}
                <GroupAvatar
                  src={group.image}
                  name={group.name}
                  size="md"
                  isPinned={isPinned}
                  isMuted={isMuted}
                />

                {/* Info & Last Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-indigo-600' : 'text-slate-900'
                      }`}
                    >
                      {group.name}
                    </h4>
                    {group.last_message_at && (
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {formatTime(group.last_message_at)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500 truncate font-medium">
                      {group.last_message_sender ? (
                        <span className="font-semibold text-slate-700">
                          {group.last_message_sender}:{' '}
                        </span>
                      ) : null}
                      {group.last_message || 'No messages yet'}
                    </p>

                    {/* Unread Pill Counter */}
                    {unreadCount > 0 && (
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-black rounded-full bg-indigo-600 text-white shadow-2xs">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
