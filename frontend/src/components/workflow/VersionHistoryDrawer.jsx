import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { formatDate } from '../../utils/formatters';
import { Layers, Clock, User, FileText } from 'lucide-react';

export const VersionHistoryDrawer = ({ versions = [] }) => {
  if (!versions || versions.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
        <Layers className="w-6 h-6 text-slate-300 mx-auto mb-1" />
        <p className="font-bold text-slate-700">Version 1.0 (Initial Draft)</p>
        <p>No previous versions available.</p>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl border-slate-200 shadow-2xs bg-white">
      <CardHeader className="py-3.5 px-4 border-b border-slate-100">
        <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Content Versions ({versions.length})</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {versions.map((ver) => (
          <div
            key={ver.id}
            className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs hover:border-indigo-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-indigo-700 text-xs">Version {ver.version_number}.0</span>
              <span className="font-mono text-[10px] text-slate-400">{formatDate(ver.created_at)}</span>
            </div>

            <h5 className="font-bold text-slate-900 leading-snug">{ver.title}</h5>

            {ver.caption && (
              <p className="text-slate-600 text-[11px] line-clamp-2 bg-white p-2 rounded-xl border border-slate-100 italic">
                "{ver.caption}"
              </p>
            )}

            <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span>Created by: <strong className="text-slate-800">{ver.creator_name || 'Team member'}</strong></span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
