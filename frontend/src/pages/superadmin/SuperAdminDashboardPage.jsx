import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { LoadingState } from '../../components/common/LoadingState';
import { superAdminService } from '../../services/superAdminService';
import { formatDate } from '../../utils/formatters';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Plus,
  ArrowRight,
  ShieldAlert,
  Activity,
  BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardTodoWidget } from '../../components/dashboard/DashboardTodoWidget';

export const SuperAdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const m = await superAdminService.getMetrics();
        const ws = await superAdminService.getWorkspaces();
        const act = await superAdminService.getSystemActivity();

        setMetrics(m);
        setRecentWorkspaces(ws.slice(0, 5));
        setActivities(act);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <LoadingState type="skeleton-cards" label="Loading SuperAdmin Dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'SuperAdmin Dashboard', path: '/superadmin/dashboard' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Platform Operations
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">SuperAdmin Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Global SaaS workspace provisioning, agency managers, and platform audit activity.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={Plus}
          onClick={() => navigate('/superadmin/workspaces?action=create')}
          className="bg-purple-600 hover:bg-purple-700 shrink-0"
        >
          Add New Workspace
        </Button>
      </div>

      {/* 4 Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Workspaces"
          value={metrics?.totalWorkspaces ?? 0}
          change="Platform Tenants"
          isPositive={true}
          icon={Building2}
          iconBg="bg-purple-50 text-purple-600 border border-purple-100"
        />
        <StatCard
          title="Active Workspaces"
          value={metrics?.activeWorkspaces ?? 0}
          change="Operational"
          isPositive={true}
          icon={CheckCircle2}
          iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"
        />
        <StatCard
          title="Suspended"
          value={metrics?.suspendedWorkspaces ?? 0}
          change="Requires Action"
          isPositive={false}
          icon={AlertTriangle}
          iconBg="bg-rose-50 text-rose-600 border border-rose-100"
        />
        <StatCard
          title="WS Managers"
          value={metrics?.totalManagers ?? 0}
          change="Admin Users"
          isPositive={true}
          icon={UserCheck}
          iconBg="bg-indigo-50 text-indigo-600 border border-indigo-100"
        />
      </div>

      {/* ── Main 2-column body ─────────────────────────────────────────────────── */}
      {/*
        Key fixes:
        - items-start → columns don't stretch to each other's height (no merging)
        - min-w-0    → prevents flex overflow blowout
        - overflow-x-auto on table → wide tables scroll instead of overflowing
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left – 2/3: Recent Workspaces table */}
        <div className="lg:col-span-2 min-w-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full gap-4">
                <div className="min-w-0">
                  <CardTitle>Recently Created Workspaces</CardTitle>
                  <CardDescription>Latest agency companies onboarded onto SocialDesk.</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/superadmin/workspaces')}
                  rightIcon={ArrowRight}
                  className="shrink-0"
                >
                  View All
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Company</TableHead>
                    <TableHead className="whitespace-nowrap">Manager</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentWorkspaces.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <div className="py-10 text-center text-xs text-slate-400 font-medium">
                          <BarChart3 className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                          No workspaces created yet.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentWorkspaces.map((ws) => (
                      <TableRow
                        key={ws.id}
                        onClick={() => navigate('/superadmin/workspaces')}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg shrink-0">{ws.logo || '🏢'}</span>
                            <span className="truncate">{ws.companyName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-slate-800 whitespace-nowrap">{ws.managerName}</p>
                          <p className="text-[10px] text-slate-400">{ws.managerEmail}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ws.status === 'Active' ? 'success' : 'danger'} dot>
                            {ws.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 whitespace-nowrap text-xs">
                          {formatDate(ws.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right – 1/3: To-Do widget */}
        <div className="flex flex-col gap-6 min-w-0">
          <DashboardTodoWidget />
        </div>

      </div>
    </div>
  );
};
