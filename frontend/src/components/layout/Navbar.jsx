import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useNotifications } from '../../context/NotificationContext';
import { Avatar } from '../ui/Avatar';
import { Dropdown, DropdownItem, DropdownDivider } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { QuickCreateDropdown } from '../common/QuickCreateDropdown';
import {
  Bell,
  Plus,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Building2,
  CheckCircle2,
  Menu,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { ROLE_LABELS, ROLES, getRoleRedirectPath } from '../../utils/constants';

export const Navbar = ({ onToggleMobileSidebar, onOpenCreateModal }) => {
  const navigate = useNavigate();
  const { user, logout, role } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace, clients, activeClient, selectClientFilter } = useWorkspace();
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-all">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Mobile Toggle, Workspace Switcher & Client Filter Dropdown */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Workspace Dropdown */}
            <Dropdown
              trigger={
                <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    {activeWorkspace?.logo || '⚡'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {activeWorkspace?.name || 'SocialDesk'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {activeWorkspace?.plan || 'Enterprise'}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 ml-1" />
                </button>
              }
            >
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Switch Agency Workspace
                </p>
              </div>
              {workspaces.map((ws) => (
                <DropdownItem
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.id)}
                  icon={Building2}
                  className={activeWorkspace?.id === ws.id ? 'bg-indigo-50/60 font-semibold text-indigo-700' : ''}
                >
                  <div className="flex-1 flex items-center justify-between">
                    <span>{ws.name}</span>
                    {activeWorkspace?.id === ws.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                </DropdownItem>
              ))}
            </Dropdown>

            {/* Client Filter Compact Dropdown */}
            {clients.length > 0 && (
              <Dropdown
                trigger={
                  <button className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-700 cursor-pointer shrink-0">
                    <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{activeClient ? activeClient.name : 'All Clients'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                }
              >
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                  Filter Workspace Client
                </div>
                <DropdownItem
                  onClick={() => selectClientFilter(null)}
                  className={!activeClient ? 'bg-indigo-50 font-bold text-indigo-700' : ''}
                >
                  All Clients
                </DropdownItem>
                {clients.map((c) => (
                  <DropdownItem
                    key={c.id}
                    onClick={() => selectClientFilter(c.id)}
                    className={activeClient?.id === c.id ? 'bg-indigo-50 font-bold text-indigo-700' : ''}
                  >
                    {c.name}
                  </DropdownItem>
                ))}
              </Dropdown>
            )}
          </div>

          {/* Right Actions: Global Search Trigger, Quick Create, Notifications, Profile Pic Only */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Global Search Command Bar Trigger */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-xs text-slate-500 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="hidden sm:inline font-medium">Search...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">
                Ctrl+K
              </kbd>
            </button>

            {/* Role-Aware Quick Create Button Dropdown */}
            <QuickCreateDropdown />

            {/* Notifications Dropdown */}
            <Dropdown
              trigger={
                <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 shrink-0" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center text-[9px] font-black rounded-full bg-rose-600 text-white ring-2 ring-white shadow-2xs">
                      {unreadCount}
                    </span>
                  )}
                </button>
              }
              className="w-80"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id);
                      if (n.link) {
                        navigate(n.link);
                      } else {
                        navigate(role === ROLES.CLIENT ? '/client/notifications' : '/workspace/notifications');
                      }
                    }}
                    className={`p-3 hover:bg-slate-50 transition-colors text-left cursor-pointer space-y-0.5 ${
                      !n.isRead ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 font-mono pt-0.5">{n.time || n.createdAt}</p>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => navigate('/workspace/notifications')}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                >
                  Open Notification Center & Feed →
                </button>
              </div>
            </Dropdown>

            {/* User Profile Menu Trigger — ONLY USER PIC */}
            <Dropdown
              trigger={
                <button className="inline-flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/20 transition-all cursor-pointer shrink-0">
                  <Avatar src={user?.avatar} name={user?.name} size="md" status="online" />
                </button>
              }
              className="w-64"
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>


              <DropdownItem icon={User}>My Account Profile</DropdownItem>
              <DropdownItem icon={Settings} onClick={() => navigate('/workspace/settings')}>
                Agency Settings
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={LogOut} danger onClick={logout}>
                Sign Out
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      </header>

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </>
  );
};
