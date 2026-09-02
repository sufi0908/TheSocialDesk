import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Clock,
  CheckCircle2,
  RotateCcw,
  XCircle,
  CalendarDays,
  Bell,
  Sparkles,
} from 'lucide-react';

export const ClientSidebar = () => {
  const navItems = [
    { label: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard },
    { label: 'Content', path: '/client/content', icon: FileText },
    { label: 'Pending Approval', path: '/client/approvals', icon: Clock },
    { label: 'Approved', path: '/client/approved', icon: CheckCircle2 },
    { label: 'Revision Required', path: '/client/revisions', icon: RotateCcw },
    { label: 'Rejected', path: '/client/rejected', icon: XCircle },
    { label: 'Scheduled', path: '/client/scheduled', icon: CalendarDays },
    { label: 'Notifications', path: '/client/notifications', icon: Bell },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col justify-between z-20">
      <div className="p-4 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-black shadow-md shadow-indigo-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-none">SocialDesk</h1>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 mt-1 inline-block">
              Client Portal
            </span>
          </div>
        </div>

        {/* Client Navigation Items (8 Items) */}
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Client Portal Menu</p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <p className="text-[10px] text-slate-400 font-medium">Secured Client Portal • SocialDesk</p>
      </div>
    </aside>
  );
};
