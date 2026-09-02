import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Select } from '../../../components/forms/Select';
import { LoadingState } from '../../../components/common/LoadingState';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { workloadService, WORKLOAD_LEVELS } from '../../../services/workloadService';
import { clientService } from '../../../services/clientService';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { STATUS_TYPES, ROLES, ROLE_LABELS } from '../../../utils/constants';
import { formatDate } from '../../../utils/formatters';
import {
  Briefcase,
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  Users,
  ShieldCheck,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
} from 'lucide-react';

export const WorkloadPage = () => {
  const { user, role: userRole } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('my_work'); // 'my_work' | 'team_workload'
  const [myWorkData, setMyWorkData] = useState({ todayItems: [], upcomingItems: [], overdueItems: [], completedItems: [] });
  const [teamWorkload, setTeamWorkload] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedClient, setSelectedClient] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const [mWork, tWork, cList] = await Promise.all([
        workloadService.getMyWork(user?.name || 'Carlos Ruiz', userRole),
        workloadService.getTeamWorkload({ search, role: selectedRole }),
        clientService.getClients(),
      ]);

      setMyWorkData(mWork);
      setTeamWorkload(tWork);
      setClients(cList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, userRole, search, selectedRole]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace/dashboard' }, { label: 'My Work & Team Workload' }]} />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 mb-1.5 shadow-2xs">
            <Activity className="w-4 h-4 text-indigo-600" /> Operational Work & Capacity Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">My Work & Team Workload</h1>
          <p className="text-xs text-slate-500 mt-1">
            Personal agenda tracking & agency capacity planning. Pure work management only.
          </p>
        </div>

        {/* Non-Surveillance Notice Badge */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Agency Work Management Only (No Screen/Mouse Surveillance)</span>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('my_work')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === 'my_work'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" /> My Personal Work Agenda
        </button>

        <button
          onClick={() => setActiveTab('team_workload')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === 'team_workload'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Team Workload & Capacity ({teamWorkload.length})
        </button>
      </div>

      {/* TAB 1: MY PERSONAL WORK AGENDA */}
      {activeTab === 'my_work' && (
        loading ? (
          <LoadingState type="skeleton-cards" count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* COLUMN 1: TODAY */}
            <Card className="rounded-2xl border-indigo-200 bg-gradient-to-b from-indigo-50/50 via-white to-white shadow-xs">
              <CardHeader className="py-3 px-4 border-b border-indigo-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Due Today</CardTitle>
                </div>
                <span className="text-xs font-extrabold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  {myWorkData.todayItems.length}
                </span>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                {myWorkData.todayItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">🎉 No tasks or approvals due today!</div>
                ) : (
                  myWorkData.todayItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-indigo-200/80 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.2 rounded-md border border-indigo-100">
                          {item.itemType}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Today</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{item.title || item.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Client: {item.client}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* COLUMN 2: UPCOMING */}
            <Card className="rounded-2xl border-blue-200 bg-gradient-to-b from-blue-50/50 via-white to-white shadow-xs">
              <CardHeader className="py-3 px-4 border-b border-blue-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Upcoming</CardTitle>
                </div>
                <span className="text-xs font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  {myWorkData.upcomingItems.length}
                </span>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                {myWorkData.upcomingItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">No upcoming work scheduled.</div>
                ) : (
                  myWorkData.upcomingItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-blue-200/80 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.2 rounded-md border border-blue-100">
                          {item.itemType}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{item.dueDate || 'Next Week'}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{item.title || item.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Client: {item.client}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* COLUMN 3: OVERDUE & REVISIONS */}
            <Card className="rounded-2xl border-rose-200 bg-gradient-to-b from-rose-50/50 via-white to-white shadow-xs">
              <CardHeader className="py-3 px-4 border-b border-rose-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Overdue & Revisions</CardTitle>
                </div>
                <span className="text-xs font-extrabold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                  {myWorkData.overdueItems.length}
                </span>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                {myWorkData.overdueItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">🎉 Zero overdue items!</div>
                ) : (
                  myWorkData.overdueItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-rose-200/80 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.2 rounded-md border border-rose-100">
                          {item.itemType}
                        </span>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{item.title || item.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Client: {item.client}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* COLUMN 4: COMPLETED */}
            <Card className="rounded-2xl border-emerald-200 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-xs">
              <CardHeader className="py-3 px-4 border-b border-emerald-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Completed</CardTitle>
                </div>
                <span className="text-xs font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  {myWorkData.completedItems.length}
                </span>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                {myWorkData.completedItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">No completed items.</div>
                ) : (
                  myWorkData.completedItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-100">
                          {item.itemType}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{item.title || item.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Client: {item.client}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* TAB 2: TEAM WORKLOAD & CAPACITY MATRIX */}
      {activeTab === 'team_workload' && (
        <div className="space-y-6">
          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search team member by name or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                options={[
                  { value: 'All', label: 'All Roles' },
                  { value: ROLES.GRAPHIC_DESIGNER, label: 'Graphic Designer' },
                  { value: ROLES.VIDEO_EDITOR, label: 'Video Editor' },
                  { value: ROLES.CONTENT_WRITER, label: 'Content Writer' },
                  { value: ROLES.SOCIAL_MEDIA_MANAGER, label: 'Social Media Manager' },
                ]}
                className="w-48"
              />
            </div>
          </div>

          {/* TEAM MEMBER CAPACITY CARDS */}
          {loading ? (
            <LoadingState type="skeleton-cards" count={4} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teamWorkload.map((m) => (
                <div
                  key={m.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all space-y-3"
                >
                  {/* Member Top Info & Workload Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar src={m.avatar} name={m.name} size="md" status="online" />
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{m.name}</h3>
                        <p className="text-[10px] font-bold text-indigo-600">{ROLE_LABELS[m.role] || m.role}</p>
                      </div>
                    </div>

                    {/* Capacity Indicator Pill */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1.5 ${m.capacityLevel.color}`}>
                      <span className={`w-2 h-2 rounded-full ${m.capacityLevel.dot}`} />
                      {m.capacityLevel.label}
                    </span>
                  </div>

                  {/* 4 Workload Metrics Grid */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="text-[10px] font-bold text-blue-700">Active Tasks</span>
                      <p className="text-base font-extrabold text-blue-900 mt-0.5">{m.activeTasksCount}</p>
                    </div>

                    <div className="p-2 bg-indigo-50/60 rounded-xl border border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-700">Due Today</span>
                      <p className="text-base font-extrabold text-indigo-900 mt-0.5">{m.dueTodayCount}</p>
                    </div>

                    <div className="p-2 bg-rose-50/60 rounded-xl border border-rose-100">
                      <span className="text-[10px] font-bold text-rose-700">Overdue</span>
                      <p className="text-base font-extrabold text-rose-900 mt-0.5">{m.overdueCount}</p>
                    </div>

                    <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-700">Completed</span>
                      <p className="text-base font-extrabold text-emerald-900 mt-0.5">{m.completedCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TEAM WORKLOAD TABLE MATRIX */}
          <Card>
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Team Workload Matrix & Work Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Active Tasks</TableHead>
                    <TableHead>Pending Content</TableHead>
                    <TableHead>Overdue Items</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Capacity Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamWorkload.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar src={m.avatar} name={m.name} size="sm" />
                          <div>
                            <p className="font-bold text-slate-900">{m.name}</p>
                            <p className="text-[10px] text-slate-400">{m.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-slate-700">{ROLE_LABELS[m.role] || m.role}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-extrabold text-blue-700">{m.activeTasksCount}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-extrabold text-indigo-700">{m.pendingContentCount}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-extrabold ${m.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {m.overdueCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-extrabold text-emerald-700">{m.completedCount}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border inline-flex items-center gap-1.5 ${m.capacityLevel.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.capacityLevel.dot}`} />
                          {m.capacityLevel.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
