import React from 'react';
import { cn } from '../../utils/cn';

export const TaskStatusBadge = ({ status, isOverdue, className }) => {
  const rawStatus = String(status || 'TODO').toUpperCase();

  let label = 'To Do';
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  switch (rawStatus) {
    case 'IN_PROGRESS':
      label = 'In Progress';
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      dotColor = 'bg-blue-500';
      break;
    case 'READY_FOR_REVIEW':
    case 'IN_REVIEW':
    case 'REVIEW':
      label = 'Ready for Review';
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      dotColor = 'bg-indigo-500';
      break;
    case 'REVISION':
    case 'REVISION_REQUIRED':
      label = 'Revision Required';
      badgeStyle = 'bg-orange-50 text-orange-700 border-orange-200';
      dotColor = 'bg-orange-500';
      break;
    case 'COMPLETED':
      label = 'Completed';
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
      break;
    case 'BLOCKED':
      label = 'Blocked';
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
      dotColor = 'bg-rose-500';
      break;
    case 'CANCELLED':
      label = 'Cancelled';
      badgeStyle = 'bg-slate-100 text-slate-500 border-slate-200 line-through';
      dotColor = 'bg-slate-400';
      break;
    case 'REOPENED':
      label = 'Reopened';
      badgeStyle = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      dotColor = 'bg-cyan-500';
      break;
    case 'TODO':
    default:
      label = 'To Do';
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      dotColor = 'bg-slate-400';
      break;
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border tracking-wide select-none',
          badgeStyle,
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
        {label}
      </span>

      {isOverdue && rawStatus !== 'COMPLETED' && rawStatus !== 'CANCELLED' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Overdue
        </span>
      )}
    </div>
  );
};
