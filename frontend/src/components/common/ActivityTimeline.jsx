import React from 'react';
import { formatDate } from '../../utils/formatters';
import {
  CheckCircle2,
  AlertTriangle,
  Upload,
  Calendar,
  MessageSquare,
  FileText,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

export const INITIAL_ACTIVITY_LOGS = [
  {
    id: 'act_1',
    author: 'Sarah Lin (Client Rep)',
    role: 'Client Guest',
    action: 'Client approved content',
    item: 'Autumn Silk Collection Post #1',
    date: '2026-08-27T00:15:00Z',
    type: 'approval',
  },
  {
    id: 'act_2',
    author: 'Carlos Ruiz',
    role: 'Graphic Designer',
    action: 'Uploaded Version 2.0 creative',
    item: 'Autumn Silk Collection Post #1',
    date: '2026-08-26T16:30:00Z',
    type: 'upload',
  },
  {
    id: 'act_3',
    author: 'Elena Vance',
    role: 'Graphic Team Head',
    action: 'Requested revision: "Adjust brand color margin"',
    item: 'Gamer Surge Launch Video',
    date: '2026-08-26T14:10:00Z',
    type: 'revision',
  },
  {
    id: 'act_4',
    author: 'David Sterling',
    role: 'Workspace Manager',
    action: 'Manager scheduled content for Sep 14',
    item: 'Sustainable Fashion Educational Thread',
    date: '2026-08-25T11:00:00Z',
    type: 'schedule',
  },
];

export const ActivityTimeline = ({ activities = INITIAL_ACTIVITY_LOGS }) => {
  const getActionIcon = (type) => {
    switch (type) {
      case 'approval':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'revision':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      case 'upload':
        return <Upload className="w-3.5 h-3.5 text-indigo-600" />;
      case 'schedule':
        return <Calendar className="w-3.5 h-3.5 text-cyan-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {activities.map((act) => (
        <div key={act.id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs text-xs">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0">
            {getActionIcon(act.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-slate-900 truncate">{act.author}</span>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">{formatDate(act.date)}</span>
            </div>

            <p className="font-bold text-indigo-700 leading-tight mt-0.5">{act.action}</p>
            <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">Item: {act.item}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
