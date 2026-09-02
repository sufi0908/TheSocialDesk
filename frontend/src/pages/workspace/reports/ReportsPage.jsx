import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Select } from '../../../components/forms/Select';
import { Input } from '../../../components/forms/Input';
import { Tabs } from '../../../components/ui/Tabs';
import { LoadingState } from '../../../components/common/LoadingState';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { reportService } from '../../../services/reportService';
import { clientService } from '../../../services/clientService';
import { projectService } from '../../../services/projectService';
import { teamService } from '../../../services/teamService';
import { useToast } from '../../../hooks/useToast';
import { ROLE_LABELS } from '../../../utils/constants';
import {
  BarChart3,
  FolderKanban,
  CheckSquare,
  Users2,
  FileText,
  Clock,
  AlertCircle,
  Briefcase,
  Download,
  Filter,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export const ReportsPage = () => {
  const toast = useToast();

  const [reports, setReports] = useState(null);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 5 Report Filters
  const [dateRange, setDateRange] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('All');
  const [selectedProjectId, setSelectedProjectId] = useState('All');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Active Report Tab
  const [activeTab, setActiveTab] = useState('workload');

  // 1. Initial metadata loading (clients, projects, team members)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [cList, pList, tList] = await Promise.all([
          clientService.getClients().catch(() => []),
          projectService.getProjects().catch(() => []),
          teamService.getTeamMembers().catch(() => []),
        ]);
        setClients(cList);
        setProjects(pList);
        setTeamMembers(tList);
      } catch (err) {
        console.error('Failed to load reports filter metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  // 2. Dynamically filter projects belonging to selected client
  const filteredProjects = useMemo(() => {
    if (selectedClientId === 'All') return projects;
    return projects.filter(
      (p) => String(p.clientId || p.client_id) === String(selectedClientId)
    );
  }, [projects, selectedClientId]);

  // If selected project does not belong to the selected client, reset to 'All'
  useEffect(() => {
    if (selectedProjectId !== 'All' && selectedClientId !== 'All') {
      const exists = filteredProjects.some((p) => String(p.id) === String(selectedProjectId));
      if (!exists) {
        setSelectedProjectId('All');
      }
    }
  }, [selectedClientId, filteredProjects, selectedProjectId]);

  // 3. Main report query loader
  const loadReportsData = async () => {
    setReportsLoading(true);
    setError(null);
    try {
      const data = await reportService.getAgencyReports({
        dateRange,
        startDate: dateRange === 'Custom Range' ? customStartDate : undefined,
        endDate: dateRange === 'Custom Range' ? customEndDate : undefined,
        clientId: selectedClientId,
        projectId: selectedProjectId,
        teamMemberId: selectedTeamMemberId,
        status: selectedStatus,
      });
      setReports(data);
    } catch (err) {
      console.error('Failed to load agency reports:', err);
      setError('Unable to load report metrics. Please check your connection and try again.');
    } finally {
      setReportsLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load if not Custom Range, or if Custom Range has both dates filled
    if (dateRange === 'Custom Range') {
      if (customStartDate && customEndDate) {
        loadReportsData();
      }
    } else {
      loadReportsData();
    }
  }, [dateRange, customStartDate, customEndDate, selectedClientId, selectedProjectId, selectedTeamMemberId, selectedStatus]);

  const handleResetFilters = () => {
    setDateRange('This Month');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedClientId('All');
    setSelectedProjectId('All');
    setSelectedTeamMemberId('All');
    setSelectedStatus('All');
  };

  const handleExport = () => {
    toast.success('Exporting Report', 'Generating agency production PDF summary report...');
  };

  if (loading) {
    return <LoadingState type="skeleton-cards" count={4} />;
  }

  const overview = reports?.overview || {};
  const teamWorkload = reports?.teamWorkload || [];
  const projectProgress = reports?.projectProgress || [];
  const taskCompletion = reports?.taskCompletion || {};
  const contentPipeline = reports?.contentStatusPipeline || [];
  const approvalStatus = reports?.approvalStatus || {};
  const deadlineStatus = reports?.deadlineStatus || {};
  const clientSummary = reports?.clientWorkSummary || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace/dashboard' }, { label: 'Internal Production Reports' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F39F6] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 mb-1">
            <BarChart3 className="w-3.5 h-3.5" /> Operations & Work Management Analytics
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Internal Agency Production Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track team workload, project completion velocity, approval throughput, and client deliverable progress.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={Download}
          onClick={handleExport}
        >
          Export Summary Report
        </Button>
      </div>

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tasks */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-[#4F39F6]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{overview.totalTasks ?? 0}</span>
            <span className="text-xs font-bold text-emerald-600">
              {overview.completedTasks ?? 0} Completed
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {overview.pendingTasks ?? 0} Pending · {overview.overdueTasks ?? 0} Overdue
          </p>
        </div>

        {/* Card 2: Completion Rate */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completion Velocity</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{overview.completionRate ?? 0}%</span>
            <span className="text-xs font-bold text-indigo-600">Rate</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {overview.onTimeCompletionRate ?? 100}% On-Time Delivery
          </p>
        </div>

        {/* Card 3: Content Deliverables */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Content Deliverables</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{overview.totalContent ?? 0}</span>
            <span className="text-xs font-bold text-purple-600">
              {overview.publishedContent ?? 0} Published
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {overview.scheduledContent ?? 0} Scheduled · {overview.pendingApproval ?? 0} In Review
          </p>
        </div>

        {/* Card 4: Review Throughput */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Review Turnaround</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{approvalStatus.averageTurnaroundHours ?? 0}h</span>
            <span className="text-xs font-bold text-amber-700">Average</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {approvalStatus.internalApprovalRate ?? 0}% Internal · {approvalStatus.clientApprovalRate ?? 0}% Client
          </p>
        </div>
      </div>

      {/* 5 REPORT FILTERS */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-[#4F39F6]" />
            <span>Report Filters</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] text-slate-500 hover:text-[#4F39F6] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. Date Range */}
          <Select
            label="Date Range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: 'Today', label: 'Today' },
              { value: 'This Week', label: 'This Week' },
              { value: 'This Month', label: 'This Month' },
              { value: 'Last Month', label: 'Last Month' },
              { value: 'This Quarter', label: 'This Quarter' },
              { value: 'Year to Date', label: 'Year to Date' },
              { value: 'Custom Range', label: 'Custom Range...' },
              { value: 'All', label: 'All Time' },
            ]}
          />

          {/* 2. Client Brand */}
          <Select
            label="Client Brand"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            options={[
              { value: 'All', label: 'All Client Brands' },
              ...clients.map((c) => ({ value: String(c.id), label: c.companyName || c.name })),
            ]}
          />

          {/* 3. Project (Dynamically filtered by client) */}
          <Select
            label="Campaign Project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            options={[
              { value: 'All', label: 'All Projects' },
              ...filteredProjects.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
          />

          {/* 4. Team Member */}
          <Select
            label="Team Member"
            value={selectedTeamMemberId}
            onChange={(e) => setSelectedTeamMemberId(e.target.value)}
            options={[
              { value: 'All', label: 'All Team Members' },
              ...teamMembers.map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />

          {/* 5. Work Status */}
          <Select
            label="Work Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Active', label: 'Active / In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Overdue', label: 'Overdue' },
              { value: 'TODO', label: 'To Do' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'READY_FOR_REVIEW', label: 'In Review' },
            ]}
          />
        </div>

        {/* Custom Range Date Pickers (Shown when Custom Range is selected) */}
        {dateRange === 'Custom Range' && (
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 bg-slate-50/50 p-3 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-[#4F39F6]" />
              <span>Select Custom Window:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs h-8"
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="xs" onClick={loadReportsData}>
            Retry
          </Button>
        </div>
      )}

      {/* 7 REPORT TABS */}
      <Tabs
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t)}
        tabs={[
          { id: 'workload', label: 'Team Workload', icon: Users2 },
          { id: 'progress', label: 'Project Progress', icon: FolderKanban },
          { id: 'tasks', label: 'Task Completion', icon: CheckSquare },
          { id: 'content', label: 'Content Status', icon: FileText },
          { id: 'approvals', label: 'Approval Status', icon: Clock },
          { id: 'deadlines', label: 'Deadline Status', icon: AlertCircle },
          { id: 'clients', label: 'Client Work Summary', icon: Briefcase },
        ]}
      />

      {reportsLoading && (
        <div className="py-4">
          <LoadingState type="skeleton-cards" count={2} />
        </div>
      )}

      {!reportsLoading && (
        <>
          {/* REPORT 1: TEAM WORKLOAD */}
          {activeTab === 'workload' && (
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Team Workload & Capacity Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {teamWorkload.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No team member activity recorded for the selected filter.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Assigned Tasks</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Overdue</TableHead>
                        <TableHead className="w-36">Completion Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamWorkload.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-semibold text-slate-900">
                            <div className="flex items-center gap-3">
                              <Avatar src={m.avatar} name={m.name} size="sm" />
                              <div>
                                <span className="font-bold text-slate-900 text-xs block">{m.name}</span>
                                {m.jobTitle && <span className="text-[10px] text-slate-400 block">{m.jobTitle}</span>}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#4F39F6] text-xs font-semibold border border-purple-100">
                              {ROLE_LABELS[m.role] || m.role || 'Member'}
                            </span>
                          </TableCell>

                          <TableCell className="text-xs font-bold text-slate-800">{m.assignedTasks}</TableCell>
                          <TableCell className="text-xs font-bold text-emerald-700">{m.completedTasks}</TableCell>
                          <TableCell className="text-xs font-bold text-amber-700">{m.pendingTasks}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                m.overdueTasks > 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'text-slate-400 font-normal'
                              }`}
                            >
                              {m.overdueTasks > 0 ? `${m.overdueTasks} Overdue` : '0 Overdue'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className="text-slate-600">{m.completionRate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-[#4F39F6] rounded-full transition-all"
                                  style={{ width: `${m.completionRate}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* REPORT 2: PROJECT PROGRESS */}
          {activeTab === 'progress' && (
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Campaign Project Milestone Completion Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {projectProgress.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <FolderKanban className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No Projects Found</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No campaign projects match the active filters for this period.
                    </p>
                  </div>
                ) : (
                  projectProgress.map((proj) => (
                    <div key={proj.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{proj.name}</h4>
                          <p className="text-[10px] text-slate-400">
                            Client: {proj.client} • {proj.tasksCount} Total Tasks ({proj.completedTasks} Completed)
                          </p>
                        </div>
                        <Badge variant="primary">{proj.status}</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-600">Completion</span>
                          <span className="font-bold text-[#4F39F6]">{proj.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div className="h-full bg-[#4F39F6] rounded-full" style={{ width: `${proj.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* REPORT 3: TASK COMPLETION */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Tasks Tracked</span>
                  <p className="text-3xl font-black text-slate-900">{taskCompletion.totalTasks ?? 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Completed Tasks</span>
                  <p className="text-3xl font-black text-emerald-700">{taskCompletion.completedTasks ?? 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-[#4F39F6] uppercase">Overall Completion Rate</span>
                  <p className="text-3xl font-black text-[#4F39F6]">{taskCompletion.completionRate ?? 0}%</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-indigo-700 uppercase">On-Time Delivery Rate</span>
                  <p className="text-3xl font-black text-indigo-700">{taskCompletion.onTimeDeliveryRate ?? 100}%</p>
                </div>
              </div>

              {/* Status Breakdown Grid */}
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Task Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {taskCompletion.byStatus?.map((st) => (
                      <div key={st.status} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 block">{st.label}</span>
                        <span className="text-xl font-black text-slate-900 block">{st.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* REPORT 4: CONTENT STATUS PIPELINE */}
          {activeTab === 'content' && (
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Multi-Channel Content Lifecycle Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {contentPipeline.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No content items recorded for this filter.
                  </div>
                ) : (
                  contentPipeline.map((item) => (
                    <div key={item.status} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <Badge statusKey={item.status} />
                        <span className="font-bold text-slate-900">
                          {item.count} Posts ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-[#4F39F6] rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* REPORT 5: APPROVAL STATUS */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Average Review Turnaround</span>
                  <p className="text-3xl font-black text-[#4F39F6]">{approvalStatus.averageTurnaroundHours ?? 0} Hours</p>
                  <p className="text-[10px] text-slate-400">From submission to decision</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-amber-700 uppercase">Revision Request Rate</span>
                  <p className="text-3xl font-black text-amber-700">{approvalStatus.revisionRequestRate ?? 0}%</p>
                  <p className="text-[10px] text-slate-400">Percentage requiring edits</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-indigo-700 uppercase">Internal Approval Rate</span>
                  <p className="text-3xl font-black text-indigo-700">{approvalStatus.internalApprovalRate ?? 0}%</p>
                  <p className="text-[10px] text-slate-400">Passed internal review</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Client Approval Rate</span>
                  <p className="text-3xl font-black text-emerald-700">{approvalStatus.clientApprovalRate ?? 0}%</p>
                  <p className="text-[10px] text-slate-400">Passed client portal review</p>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 6: DEADLINE STATUS */}
          {activeTab === 'deadlines' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-emerald-700 uppercase">On-Time Deliverables</span>
                <p className="text-3xl font-black text-emerald-700">{deadlineStatus.onTimeDeliverables ?? 0}</p>
                <p className="text-[10px] text-slate-400">Completed on or before deadline</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-amber-700 uppercase">Approaching Deadlines</span>
                <p className="text-3xl font-black text-amber-700">{deadlineStatus.approachingDeadlines ?? 0}</p>
                <p className="text-[10px] text-slate-400">Due within next 48 hours</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-rose-700 uppercase">Overdue Tasks</span>
                <p className="text-3xl font-black text-rose-700">{deadlineStatus.overdueTasksCount ?? 0}</p>
                <p className="text-[10px] text-slate-400">Currently past due date</p>
              </div>
            </div>
          )}

          {/* REPORT 7: CLIENT WORK SUMMARY */}
          {activeTab === 'clients' && (
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Client Deliverable Output Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {clientSummary.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No client records found for this workspace.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client Brand</TableHead>
                        <TableHead>Active Projects</TableHead>
                        <TableHead>Total Tasks</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Overdue</TableHead>
                        <TableHead>Delivered Posts</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>In Review</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientSummary.map((c) => (
                        <TableRow key={c.clientId || c.client}>
                          <TableCell className="font-bold text-slate-900 text-xs">{c.client}</TableCell>
                          <TableCell className="text-xs font-semibold text-slate-700">{c.activeProjects}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-800">{c.totalTasks}</TableCell>
                          <TableCell className="text-xs font-bold text-emerald-700">{c.completedTasks}</TableCell>
                          <TableCell className="text-xs font-bold text-amber-700">{c.pendingTasks}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                c.overdueTasks > 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'text-slate-400 font-normal'
                              }`}
                            >
                              {c.overdueTasks}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-purple-700">{c.postsDelivered}</TableCell>
                          <TableCell className="text-xs font-bold text-blue-700">{c.scheduledContent}</TableCell>
                          <TableCell className="text-xs font-bold text-amber-700">{c.pendingApproval}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
