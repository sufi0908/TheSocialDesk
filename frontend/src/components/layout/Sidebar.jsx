import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Users2,
  FolderKanban,
  CheckSquare,
  FileText,
  Clock,
  CalendarDays,
  Image,
  Bell,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../context/ChatContext';
import { ROLE_NAV_CONFIG, ROLE_LABELS, ROLES } from '../../utils/constants';

import socialDeskLogo from '/socialdesk-logo.png';

const ICON_MAP = {
  Dashboard: LayoutDashboard,
  'Superadmin Dashboard': LayoutDashboard,
  Chat: MessageSquare,
  Clients: Users,
  Team: Users2,
  'Workspace Managers': Users2,
  Projects: FolderKanban,
  Workspaces: FolderKanban,
  Tasks: CheckSquare,
  'Personal To-Do': CheckSquare,
  Content: FileText,
  Approvals: Clock,
  'Pending Approval': Clock,
  Calendar: CalendarDays,
  Assets: Image,
  Notifications: Bell,
  Reports: BarChart3,
  'System Activity': BarChart3,
  Settings: Settings,
};

export const Sidebar = ({ className, onCloseMobile }) => {
  const { role } = useAuth();
  const { unreadTotalCount } = useChat();

  const currentRole = role || ROLES.WORKSPACE_MANAGER;

  // Retrieve navigation items based strictly on the current role
  const navItems =
    ROLE_NAV_CONFIG[currentRole] ||
    ROLE_NAV_CONFIG[ROLES.WORKSPACE_MANAGER];

  return (
    <aside
      className={cn(
        'w-64 bg-white text-slate-700 flex flex-col h-screen sticky top-0 border-r border-slate-200/80 shrink-0 select-none shadow-2xs',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white">
        <NavLink
          to="/workspace/dashboard"
          className="flex items-center gap-3 group"
        >
          {/* SocialDesk Logo */}
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <img
              src={socialDeskLogo}
              alt="SocialDesk Logo"
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </div>

          {/* Brand Name */}
          <div>
            <span className="text-base font-extrabold text-slate-900 tracking-tight block">
              SocialDesk
            </span>

            <span className="text-[10px] text-indigo-600 font-bold block uppercase tracking-wider">
              {ROLE_LABELS[currentRole] || 'Workspace Manager'}
            </span>
          </div>
        </NavLink>
      </div>

      {/* Dynamic Role Navigation List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6 scrollbar-none bg-white">
        <div>
          <p className="px-3 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-2.5">
            Navigation Menu
          </p>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = ICON_MAP[item.label] || LayoutDashboard;
              const isChat = item.label === 'Chat';

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group cursor-pointer',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />

                    <span>{item.label}</span>
                  </div>

                  {isChat && unreadTotalCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white animate-pulse">
                      ● {unreadTotalCount}
                    </span>
                  )}

                  {item.highlight && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-50 text-amber-800 border-amber-200">
                      Action
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Role Badge */}
      <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/50">
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Active Role Context
          </p>

          <p className="text-xs font-extrabold text-indigo-700">
            {ROLE_LABELS[currentRole]}
          </p>
        </div>
      </div>
    </aside>
  );
};