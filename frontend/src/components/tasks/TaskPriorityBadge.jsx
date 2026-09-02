import React from 'react';
import { cn } from '../../utils/cn';

export const TaskPriorityBadge = ({ priority, className }) => {
  const rawPriority = String(priority || 'MEDIUM').toUpperCase();

  let label = 'Medium';
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (rawPriority) {
    case 'URGENT':
      label = 'Urgent';
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'HIGH':
      label = 'High';
      badgeStyle = 'bg-orange-50 text-orange-700 border-orange-200';
      break;
    case 'MEDIUM':
      label = 'Medium';
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'LOW':
      label = 'Low';
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      break;
    default:
      label = 'Medium';
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border select-none',
        badgeStyle,
        className
      )}
    >
      {label}
    </span>
  );
};
