import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import {
  Plus,
  FileText,
  CheckSquare,
  FolderKanban,
  UserPlus,
  Upload,
  Calendar,
  Send,
  ChevronDown,
} from 'lucide-react';

export const QuickCreateDropdown = () => {
  const navigate = useNavigate();
  const { role: userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (userRole === ROLES.CLIENT) return null; // Hide for client role

  const getRoleActions = () => {
    switch (userRole) {
      case ROLES.WORKSPACE_MANAGER:
      case ROLES.SUPERADMIN:
        return [
          { label: 'New Client', path: '/workspace/clients', icon: UserPlus, color: 'text-indigo-600' },
          { label: 'New Project', path: '/workspace/projects', icon: FolderKanban, color: 'text-blue-600' },
          { label: 'New Task', path: '/workspace/tasks', icon: CheckSquare, color: 'text-emerald-600' },
          { label: 'New Content', path: '/workspace/content', icon: FileText, color: 'text-purple-600' },
        ];
      case ROLES.GRAPHIC_DESIGNER:
      case ROLES.VIDEO_EDITOR:
      case ROLES.CONTENT_WRITER:
      case ROLES.GRAPHIC_TEAM_HEAD:
        return [
          { label: 'New Content', path: '/workspace/content', icon: FileText, color: 'text-purple-600' },
          { label: 'Upload Asset', path: '/workspace/assets', icon: Upload, color: 'text-amber-600' },
          { label: 'Submit Work', path: '/workspace/approvals', icon: Send, color: 'text-emerald-600' },
        ];
      case ROLES.SOCIAL_MEDIA_MANAGER:
        return [
          { label: 'New Content', path: '/workspace/content', icon: FileText, color: 'text-purple-600' },
          { label: 'Schedule Content', path: '/workspace/calendar', icon: Calendar, color: 'text-cyan-600' },
        ];
      default:
        return [
          { label: 'New Content', path: '/workspace/content', icon: FileText, color: 'text-purple-600' },
          { label: 'New Task', path: '/workspace/tasks', icon: CheckSquare, color: 'text-emerald-600' },
        ];
    }
  };

  const actions = getRoleActions();

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Create</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-80 shrink-0 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-100">
            Quick Actions
          </div>
          {actions.map((act, idx) => {
            const IconComp = act.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setIsOpen(false);
                  navigate(act.path);
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-700 flex items-center gap-2.5 transition-colors cursor-pointer text-left whitespace-nowrap"
              >
                <IconComp className={`w-4 h-4 ${act.color} shrink-0`} />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
