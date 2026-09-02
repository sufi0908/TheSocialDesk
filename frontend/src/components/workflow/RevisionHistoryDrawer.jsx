import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/formatters';
import { RotateCcw, Clock, User, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';

export const RevisionHistoryDrawer = ({ revisions = [], onSelectRevision }) => {
  if (!revisions || revisions.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 font-medium space-y-1 bg-slate-50 rounded-2xl border border-slate-200">
        <RotateCcw className="w-6 h-6 text-slate-300 mx-auto mb-1" />
        <p className="font-bold text-slate-700">No revision requests yet.</p>
        <p>This content has not received any change requests.</p>
      </div>
    );
  }

  const getPriorityClass = (p) => {
    switch (p) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-300">OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black border border-blue-300">IN PROGRESS</span>;
      case 'RESUBMITTED':
        return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black border border-purple-300">RESUBMITTED</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black">{status}</span>;
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200 shadow-2xs bg-white">
      <CardHeader className="py-3.5 px-4 border-b border-slate-100">
        <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-600" />
          <span>Revision History ({revisions.length})</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {revisions.map((rev, index) => (
          <div
            key={rev.id}
            className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2 text-xs hover:border-indigo-300 transition-all"
          >
            {/* Header: Revision # + Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900">Revision #{revisions.length - index}</span>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${getPriorityClass(rev.priority)}`}>
                  {rev.priority}
                </span>
              </div>
              {getStatusBadge(rev.status)}
            </div>

            {/* Requested Reason */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-slate-800 font-medium leading-relaxed italic">
              "{rev.reason}"
            </div>

            {/* Changes Made if Resubmitted */}
            {rev.changes_made && (
              <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 text-indigo-900 text-[11px] font-medium space-y-1">
                <span className="font-extrabold uppercase text-[9px] text-indigo-700 block">Changes Completed:</span>
                <p>"{rev.changes_made}"</p>
              </div>
            )}

            {/* Footer Metadata */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-medium flex-wrap gap-2">
              <div>
                Requested by: <strong className="text-slate-800">{rev.requester_name || 'User'}</strong>
                {rev.assignee_name && <span> • Assigned: <strong className="text-slate-800">{rev.assignee_name}</strong></span>}
              </div>
              <span className="font-mono text-slate-400">{formatDate(rev.created_at)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
