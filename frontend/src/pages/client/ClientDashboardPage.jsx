import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { clientPortalService } from '../../services/clientPortalService';
import { STATUS_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import {
  Clock,
  CheckCircle2,
  RotateCcw,
  XCircle,
  CalendarDays,
  Sparkles,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardTodoWidget } from '../../components/dashboard/DashboardTodoWidget';

export const ClientDashboardPage = () => {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState(null);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const m = await clientPortalService.getDashboardMetrics();
        const posts = await clientPortalService.getClientPosts(STATUS_TYPES.CLIENT_REVIEW);
        setMetrics(m);
        setPendingPosts(posts);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState type="skeleton-cards" count={5} />;
  }

  const statConfig = [
    {
      title: 'Pending Approval',
      value: metrics?.pendingApprovalCount || 0,
      icon: Clock,
      description: 'Awaiting your sign-off',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: 'Approved',
      value: metrics?.approvedCount || 0,
      icon: CheckCircle2,
      description: 'Ready for schedule',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      title: 'Revision Required',
      value: metrics?.revisionRequiredCount || 0,
      icon: RotateCcw,
      description: 'Feedback sent to team',
      color: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    {
      title: 'Rejected',
      value: metrics?.rejectedCount || 0,
      icon: XCircle,
      description: 'Declined post ideas',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      title: 'Scheduled',
      value: metrics?.scheduledCount || 0,
      icon: CalendarDays,
      description: 'Queued for publishing',
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Lumina Fashion Account Overview
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Client Brand Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review social media content drafted by your agency team and monitor post scheduling progress.
        </p>
      </div>

      {/* Personal To-Do Checklist Widget */}
      <DashboardTodoWidget />

      {/* 5 CORE CLIENT METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {statConfig.map((item) => (
          <div key={item.title} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{item.title}</span>
              <div className={`p-2 rounded-lg border ${item.color}`}>
                <item.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">{item.value}</p>
            <p className="text-[10px] text-slate-400 font-medium">{item.description}</p>
          </div>
        ))}
      </div>

      {/* PENDING APPROVAL CARDS GRID */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900">Pending Your Approval</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Review social posts waiting for your feedback.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={ArrowRight}
            onClick={() => navigate('/client/content')}
          >
            View All Pending
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {pendingPosts.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              🎉 All caught up! No content posts are currently waiting for your approval.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Creative Image Preview */}
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                      <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-900/80 text-white text-[10px] font-extrabold backdrop-blur-xs">
                          {post.contentType}
                        </span>
                      </div>
                    </div>

                    {/* Title & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-1">{post.title}</h3>
                      <Badge statusKey={post.statusKey} />
                    </div>

                    {/* Caption Snippet */}
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      "{post.caption}"
                    </p>

                    {/* Target Platforms & Scheduled Date */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex flex-wrap gap-1">
                        {post.platforms.map((pId) => (
                          <span
                            key={pId}
                            className="px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase"
                          >
                            {pId}
                          </span>
                        ))}
                      </div>

                      <span className="font-mono text-[10px] text-slate-400">
                        {post.scheduledAt ? formatDate(post.scheduledAt) : 'Target: Sep 10'}
                      </span>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="pt-3 border-t border-slate-100">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={Eye}
                      className="w-full"
                      onClick={() => navigate('/client/content')}
                    >
                      Review & Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
