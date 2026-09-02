import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Bell, CheckCircle2, RotateCcw, Clock } from 'lucide-react';

export const ClientNotificationsPage = () => {
  const notifications = [
    {
      id: 'cnot_1',
      title: 'New Social Post Ready for Review',
      message: 'Agency creative team submitted "Autumn Elegance Lookbook Reel #1" for client approval.',
      time: '2 hours ago',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      id: 'cnot_2',
      title: 'Post Scheduled on Content Calendar',
      message: '"Behind the Scenes Paris Shoot Photo" was approved and queued for publishing on Sep 1.',
      time: 'Yesterday',
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Client Account Notifications</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time updates when new content is ready for your approval or queued for publishing.
        </p>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
            <div className={`p-2 rounded-lg border shrink-0 ${n.color}`}>
              <n.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">{n.title}</h3>
                <span className="text-[10px] text-slate-400">{n.time}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
