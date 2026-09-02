import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* Left Light Branding Panel */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between relative bg-white border-r border-slate-200">
        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
            SD
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">SocialDesk</h1>
            <p className="text-xs text-indigo-600 font-semibold">Agency Workspace Platform</p>
          </div>
        </div>

        {/* Hero Value Prop */}
        <div className="my-12 relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Social Media Agency Operating System
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Scale agency social management without the chaos.
          </h2>
          <p className="text-sm text-slate-600 mt-4 leading-relaxed">
            Collaborate with clients, schedule multi-platform campaigns, manage approvals, and automate reports in one clean white workspace.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Multi-Tenant Agency Workspaces & Client Portals',
              'Instant One-Click Client Approval Workflows',
              'Multi-Platform Content Calendar & Asset Management',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Light Testimonial Box */}
        <div className="relative z-10 p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-md">
          <p className="text-xs text-slate-700 italic">
            "SocialDesk transformed our agency workflow. Client approval times dropped by 70% in our first month."
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
              HV
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">HyperDrive Media</p>
              <p className="text-[10px] text-slate-500">Managing 24+ Brands</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Outlet */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
