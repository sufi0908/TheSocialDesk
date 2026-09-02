import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ClientSidebar } from './ClientSidebar';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { LogOut, Globe } from 'lucide-react';

export const ClientPortalLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isChat = location.pathname.endsWith('/chat');

  return (
    <div className="flex h-screen bg-slate-50/60 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Intentionally Simple Client Sidebar */}
      <ClientSidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Minimal White Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-900">{user?.clientName || 'Client'} Guest Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <Avatar src={user?.avatar} name={user?.name || 'Client Guest'} size="sm" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name || 'Client Guest'}</p>
                <p className="text-[10px] text-slate-400 font-medium">{user?.clientName || 'Client'} Representative</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sign Out of Portal"
            >
              <LogOut className="w-4 h-4 text-slate-500 hover:text-rose-600" />
            </Button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        {isChat ? (
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Outlet />
          </main>
        ) : location.pathname.includes('/calendar') ? (
          <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 w-full mx-auto">
            <Outlet />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        )}
      </div>
    </div>
  );
};
