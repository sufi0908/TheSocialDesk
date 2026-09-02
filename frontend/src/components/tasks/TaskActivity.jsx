import React from 'react';
import {
  Activity,
  PlusCircle,
  UserCheck,
  Play,
  Send,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  RotateCcw,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const TaskActivity = ({ activity = [] }) => {
  const getActivityIcon = (action) => {
    switch (action) {
      case 'TASK_CREATED':
        return <PlusCircle className="w-3.5 h-3.5 text-indigo-500" />;
      case 'TASK_ASSIGNED':
      case 'TASK_REASSIGNED':
        return <UserCheck className="w-3.5 h-3.5 text-cyan-500" />;
      case 'TASK_STARTED':
        return <Play className="w-3.5 h-3.5 text-amber-500 fill-current" />;
      case 'TASK_READY_FOR_REVIEW':
        return <Send className="w-3.5 h-3.5 text-indigo-600" />;
      case 'TASK_REVISION_REQUESTED':
      case 'TASK_CHANGES_REQUESTED':
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />;
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'TASK_REOPENED':
        return <RotateCcw className="w-3.5 h-3.5 text-slate-500" />;
      case 'ATTACHMENT_ADDED':
      case 'DELIVERABLE_UPLOADED':
        return <Paperclip className="w-3.5 h-3.5 text-indigo-500" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="w-3.5 h-3.5 text-slate-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-indigo-600" />
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
          Activity History ({activity.length})
        </h4>
      </div>

      {activity.length === 0 ? (
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
          <p className="text-xs text-slate-400 font-medium">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="relative pl-5 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {activity.map((act, index) => (
            <div key={act.id || index} className="relative flex items-start gap-2.5 text-xs">
              {/* Dot Icon */}
              <div className="absolute -left-5 mt-0.5 w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                {getActivityIcon(act.action)}
              </div>

              {/* Activity Info */}
              <div className="min-w-0 flex-1">
                <p className="text-slate-800 font-semibold leading-snug">
                  {act.description || act.action}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {act.createdAt ? formatDate(act.createdAt) : 'Recently'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
