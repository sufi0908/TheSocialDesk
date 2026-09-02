import React, { useState, useEffect } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/common/LoadingState';
import { dashboardService } from '../../../services/dashboardService';
import { useNavigate } from 'react-router-dom';
import {
  Palette,
  Users2,
  CheckSquare,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const GraphicTeamHeadDashboardView = () => {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.warn('Failed to load Graphic Team Head data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingState type="skeleton-cards" count={4} />;
  }

  const team = dashboardData?.teamWorkload || [];
  const stats = dashboardData?.stats || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Graphic Team Head Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage graphic designer workload, graphic task assignments, creative reviews, and deadlines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={RefreshCw} onClick={loadData}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/workspace/team')}>
            Manage Designers
          </Button>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Team Members" value={team.length} icon={Users2} description="Assigned designers" />
        <StatCard title="Pending Tasks" value={stats.pendingTasks ?? 0} icon={CheckSquare} description="In execution" />
        <StatCard title="Content in Review" value={stats.contentInReview ?? 0} icon={Palette} description="Awaiting review" />
        <StatCard title="Upcoming Deadlines" value={stats.upcomingDeadlines ?? 0} icon={Clock} description="Due within 7 days" />
      </div>

      {/* Designer Workload Cards Grid */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users2 className="w-4 h-4 text-indigo-600" />
              <span>Graphic Designer Capacity Cards</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {team.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              No designers found in this workspace.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {team.map((d) => (
                <div key={d.id} className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={d.avatar} name={d.name} size="md" />
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{d.name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium capitalize">{d.role || 'Designer'}</p>
                      </div>
                    </div>
                    <Badge variant={d.activeTasks > 5 ? 'warning' : 'success'}>
                      {d.activeTasks > 5 ? 'High Workload' : 'Available'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                    <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="text-[9px] font-extrabold text-blue-700 uppercase">Active</span>
                      <p className="font-extrabold text-blue-900 mt-0.5">{d.activeTasks}</p>
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-[9px] font-extrabold text-emerald-700 uppercase">Done</span>
                      <p className="font-extrabold text-emerald-900 mt-0.5">{d.completedTasks}</p>
                    </div>
                    <div className="p-2 bg-amber-50/60 rounded-xl border border-amber-100">
                      <span className="text-[9px] font-extrabold text-amber-700 uppercase">Pending</span>
                      <p className="font-extrabold text-amber-900 mt-0.5">{d.pendingTasks}</p>
                    </div>
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
