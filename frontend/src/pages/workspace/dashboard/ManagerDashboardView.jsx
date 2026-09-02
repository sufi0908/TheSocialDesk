import React, { useState, useEffect, useCallback } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { LoadingState } from '../../../components/common/LoadingState';
import { useWorkspace } from '../../../hooks/useWorkspace';
import { dashboardService } from '../../../services/dashboardService';
import { DashboardTodoWidget } from '../../../components/dashboard/DashboardTodoWidget';
import { formatDateTime } from '../../../utils/formatters';
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  FileText,
  Clock,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Sparkles,
  Users2,
  Activity,
  Send,
  UserPlus,
  FileCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ManagerDashboardView = () => {
  const { activeWorkspace, activeClient } = useWorkspace();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState(null);
  const [teamWorkload, setTeamWorkload] = useState([]);
  const [activities, setActivities] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await dashboardService.getDashboard();
      setMetrics(data.stats || {});
      setTeamWorkload(data.teamWorkload || []);
      setActivities(data.recentActivity || []);
      setDeadlines(data.upcomingDeadlines || []);
    } catch (err) {
      console.error('Failed to load workspace dashboard:', err);
      setError('Unable to load live dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, activeClient, activeWorkspace]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Workspace', path: '/workspace' }, { label: 'Dashboard' }]} />
        <div className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
        <LoadingState type="skeleton-cards" count={9} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-64 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="lg:col-span-5 h-64 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Workspace', path: '/workspace' }, { label: 'Dashboard' }]} />
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-extrabold text-rose-900">Dashboard Unavailable</h3>
          <p className="text-xs text-rose-700">{error}</p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={RefreshCw}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            onClick={() => fetchDashboardData(false)}
          >
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  const statConfig = [
    {
      title: 'Active Projects',
      value: metrics?.activeProjects ?? 0,
      icon: FolderKanban,
      description: 'Ongoing marketing campaigns',
    },
    {
      title: 'Pending Tasks',
      value: metrics?.pendingTasks ?? 0,
      icon: CheckSquare,
      description: 'Tasks in execution pipeline',
    },
    {
      title: 'Overdue Tasks',
      value: metrics?.overdueTasks ?? 0,
      icon: AlertTriangle,
      description: 'Passed target deadline',
      trend: metrics?.overdueTasks > 0 ? 'down' : 'neutral',
    },
    {
      title: 'Content in Review',
      value: metrics?.contentInReview ?? 0,
      icon: FileText,
      description: 'Internal reviewer checking',
    },
    {
      title: 'Pending Client Approval',
      value: metrics?.pendingClientApproval ?? 0,
      icon: Clock,
      description: 'Awaiting client sign-off',
    },
    {
      title: 'Revision Required',
      value: metrics?.revisionRequired ?? 0,
      icon: RotateCcw,
      description: 'Feedback received for edits',
      trend: metrics?.revisionRequired > 0 ? 'down' : 'neutral',
    },
    {
      title: 'Approved Content',
      value: metrics?.approvedContent ?? 0,
      icon: CheckCircle2,
      description: 'Ready for calendar scheduling',
    },
    {
      title: 'Scheduled Content',
      value: metrics?.scheduledContent ?? 0,
      icon: Calendar,
      description: 'Queued on social calendar',
    },
    {
      title: 'Upcoming Deadlines',
      value: metrics?.upcomingDeadlines ?? 0,
      icon: Sparkles,
      description: 'Due within next 7 days',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace' }, { label: 'Dashboard' }]} />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 mb-1 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Live Agency Operations Hub
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {activeWorkspace?.name || 'Workspace'} Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time MySQL operational telemetry, team capacity distribution, and approval pipeline metrics.
          </p>
        </div>

        {/* Action Controls & Manual Refresh */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            isLoading={isRefreshing}
            onClick={() => fetchDashboardData(true)}
            title="Refresh live data from database"
          >
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/workspace/tasks')}>
            Tasks Kanban
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/workspace/content')}>
            Content Editor
          </Button>
        </div>
      </div>

      {/* 9 OPERATIONAL WORKLOAD METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {statConfig.map((stat, idx) => (
          <StatCard
            key={idx}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
            trend={stat.trend}
          />
        ))}
      </div>

      {/* TWO COLUMN OPERATIONAL LAYOUT: Team Workload & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 7 COLS: Team Workload & Task Distribution */}
        <Card className="lg:col-span-7">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users2 className="w-4 h-4 text-indigo-600" />
                  <span>Team Workload & Task Distribution</span>
                </CardTitle>
                <CardDescription>
                  Real-time active, completed, pending, and overdue tasks per workspace team member.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/workspace/team')}
                rightIcon={ArrowRight}
              >
                Manage Team
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {teamWorkload.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                No team members found in this workspace.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamWorkload.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <Avatar src={member.avatar} name={member.name} size="sm" />
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{member.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 capitalize">
                          {member.role ? member.role.replace(/_/g, ' ') : 'Member'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100">
                          {member.activeTasks}
                        </span>
                      </TableCell>
                      <TableCell className="text-amber-700 font-bold text-xs">
                        {member.reviewTasks || 0}
                      </TableCell>
                      <TableCell className="text-emerald-700 font-bold text-xs">
                        {member.completedTasks}
                      </TableCell>
                      <TableCell className={member.overdueTasks > 0 ? 'text-rose-700 font-bold text-xs' : 'text-slate-400 text-xs'}>
                        {member.overdueTasks}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/workspace/tasks?assignee=${member.id}`)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          View Tasks
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* RIGHT 5 COLS: Personal To-Do & Deliverable Deadlines */}
        <div className="lg:col-span-5 space-y-6">
          {/* Personal To-Do Checklist Widget */}
          <DashboardTodoWidget onTodoChange={() => fetchDashboardData(false)} />

          {/* Upcoming Deadlines Panel */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Upcoming Deliverable Deadlines</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {deadlines.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="font-bold text-slate-700">No Upcoming Deadlines</p>
                  <p className="text-[10px]">You're all caught up for the next 7 days.</p>
                </div>
              ) : (
                deadlines.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                          item.type === 'TASK' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type}
                        </span>
                        <p className="font-bold text-slate-900 leading-tight truncate">{item.title}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {item.client ? <>Client: <strong className="text-slate-700">{item.client}</strong> • </> : ''}
                        {item.assignee ? <>Assigned: <strong className="text-slate-700">{item.assignee}</strong></> : 'Unassigned'}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200 shrink-0">
                      {formatDateTime(item.dueDate)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
