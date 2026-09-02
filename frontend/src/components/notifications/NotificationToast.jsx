import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckSquare,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  MessageSquare,
  Paperclip,
  Share2,
  X,
  ArrowRight,
} from 'lucide-react';

export const NotificationToastContainer = ({ toasts = [], onDismiss }) => {
  const navigate = useNavigate();

  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type) => {
    const t = String(type || '').toUpperCase();
    if (t.includes('TASK')) return <CheckSquare className="w-4 h-4 text-indigo-600" />;
    if (t.includes('APPROVED') || t.includes('APPROVAL_APPROVED'))
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (t.includes('REVISION')) return <RotateCcw className="w-4 h-4 text-amber-600" />;
    if (t.includes('CALENDAR') || t.includes('SCHEDULE'))
      return <Calendar className="w-4 h-4 text-purple-600" />;
    if (t.includes('CHAT') || t.includes('COMMENT') || t.includes('MENTION'))
      return <MessageSquare className="w-4 h-4 text-sky-600" />;
    if (t.includes('ATTACHMENT') || t.includes('ASSET'))
      return <Paperclip className="w-4 h-4 text-blue-600" />;
    return <Bell className="w-4 h-4 text-indigo-600" />;
  };

  const getBadgeClass = (type) => {
    const t = String(type || '').toUpperCase();
    if (t.includes('APPROVED')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (t.includes('REVISION')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (t.includes('CALENDAR')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (t.includes('CHAT') || t.includes('MENTION')) return 'bg-sky-50 text-sky-700 border-sky-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.slice(0, 3).map((toast) => {
        const targetLink =
          toast.link ||
          (toast.relatedTaskId
            ? `/workspace/tasks/${toast.relatedTaskId}`
            : toast.relatedContentId
            ? `/workspace/content/${toast.relatedContentId}`
            : '/workspace/notifications');

        return (
          <div
            key={toast.id}
            onClick={() => {
              navigate(targetLink);
              onDismiss(toast.id);
            }}
            className="pointer-events-auto group relative bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100 cursor-pointer overflow-hidden backdrop-blur-md flex items-start gap-3"
            role="alert"
          >
            {/* Type Indicator Icon */}
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {getIcon(toast.type)}
            </div>

            {/* Content Area */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${getBadgeClass(
                    toast.type
                  )}`}
                >
                  {toast.type ? toast.type.replace(/_/g, ' ') : 'NOTIFICATION'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Just now</span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 leading-snug">
                {toast.title}
              </h4>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {toast.message}
              </p>

              <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View Details</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
