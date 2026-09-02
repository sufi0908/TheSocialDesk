import React from 'react';
import { Search, Info, ChevronLeft, Pin, BellOff, Users } from 'lucide-react';
import { GroupAvatar } from './GroupAvatar';

export const GroupHeader = ({
  group,
  onToggleInfo,
  onToggleSearch,
  isSearchOpen,
  isInfoOpen,
  onBack,
}) => {
  if (!group) return null;

  const memberCount = group.member_count || group.members?.length || 0;
  const isPinned = Boolean(group.is_pinned);
  const isMuted = Boolean(group.is_muted);

  return (
    <div className="h-16 px-4 sm:px-6 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 select-none z-10">
      {/* Left: Avatar & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <GroupAvatar
          src={group.image}
          name={group.name}
          size="md"
          isPinned={isPinned}
          isMuted={isMuted}
        />

        <div className="min-w-0 cursor-pointer" onClick={onToggleInfo}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
              {group.name}
            </h3>
            {group.group_type && group.group_type !== 'General' && (
              <span className="hidden sm:inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.2 rounded-md border border-indigo-200">
                {group.group_type}
              </span>
            )}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 truncate flex items-center gap-1.5">
            <Users className="w-3 h-3 text-slate-400" />
            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            {group.description && (
              <span className="hidden sm:inline-block text-slate-400 truncate max-w-xs">
                • {group.description}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* In-Chat Search Button */}
        <button
          type="button"
          onClick={onToggleSearch}
          title="Search in conversation"
          className={`p-2 rounded-xl transition-colors ${
            isSearchOpen
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Group Details Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleInfo}
          title="Group Information"
          className={`p-2 rounded-xl transition-colors ${
            isInfoOpen
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Info className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};
