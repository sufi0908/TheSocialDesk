import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { Dropdown, DropdownItem, DropdownDivider } from '../ui/Dropdown';
import { ToastContainer } from '../common/ToastContainer';
import {
  LayoutDashboard,
  Building2,
  UserCheck,
  Activity,
  Settings,
  ShieldCheck,
  LogOut,
  User,
  Menu,
} from 'lucide-react';

export const SuperAdminLayout = () => {
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
    { label: 'Workspaces', path: '/superadmin/workspaces', icon: Building2 },
    { label: 'Workspace Managers', path: '/superadmin/managers', icon: UserCheck },
    { label: 'Settings', path: '/superadmin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop SuperAdmin Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white text-slate-700 flex-col h-screen sticky top-0 border-r border-slate-200/80 shrink-0 select-none shadow-2xs">
        {/* Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white">
          <NavLink to="/superadmin/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
              SA
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-900 tracking-tight">SocialDesk</span>
              <span className="text-[10px] text-purple-600 font-bold block uppercase tracking-wider">
                SuperAdmin Portal
              </span>
            </div>
          </NavLink>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 bg-white">
          <div>
            <p className="px-3 text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
              Platform Administration
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group cursor-pointer',
                        isActive
                          ? 'bg-purple-50 text-purple-700 font-bold border border-purple-100 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Platform SuperAdmin</p>
              <p className="text-[10px] text-slate-500">Root Access Level</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative z-50 w-64 bg-white h-full flex flex-col border-r border-slate-200">
            <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-extrabold text-slate-900">SuperAdmin Portal</span>
            </div>
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium',
                        isActive ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      )
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  SuperAdmin Mode
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Managing Workspaces & Platform Operations
                </span>
              </div>
            </div>

            {/* Profile */}
            <Dropdown
              trigger={
                <button className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-slate-100 transition-colors">
                  <Avatar src={user?.avatar} name={user?.name || 'Superadmin'} size="sm" status="online" />
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name || 'Superadmin'}</p>
                    <p className="text-[10px] text-slate-500">SuperAdmin Root</p>
                  </div>
                </button>
              }
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name || 'Superadmin'}</p>
                <p className="text-[11px] text-slate-500">{user?.email || 'sufi@socialdesk.com'}</p>
              </div>
              <DropdownItem icon={User}>Account Settings</DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={LogOut} danger onClick={logout}>
                Sign Out
              </DropdownItem>
            </Dropdown>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
