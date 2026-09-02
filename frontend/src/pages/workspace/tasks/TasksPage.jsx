import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { taskService } from '../../../services/taskService';
import { clientService } from '../../../services/clientService';
import { teamService } from '../../../services/teamService';
import { TaskCard } from '../../../components/tasks/TaskCard';
import { TaskManagerModal } from '../../../components/tasks/TaskManagerModal';
import { Button } from '../../../components/ui/Button';
import { ROLES } from '../../../utils/constants';
import {
  Search,
  Plus,
  Filter,
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Users,
  Building2,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const TasksPage = () => {
  const { user, role } = useAuth();
  const toast = useToast();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isManager =
    role === ROLES.WORKSPACE_MANAGER ||
    role === ROLES.SUPERADMIN ||
    role === ROLES.GRAPHIC_TEAM_HEAD ||
    role === ROLES.SOCIAL_MEDIA_MANAGER;

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await taskService.getTasks();
      setTasks(data);
    } catch (err) {
      toast.error('Failed to Load Tasks', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    clientService.getClients().then(setClients).catch(() => {});
    teamService.getTeamMembers().then(setTeamMembers).catch(() => {});
  }, []);

  const handleStatusChange = async (taskId, newStatus, notes = '') => {
    try {
      const updated = await taskService.updateTaskStatus(taskId, newStatus, notes);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      toast.success('Status Updated', `Task status is now ${updated.statusDisplay}.`);
    } catch (err) {
      toast.error('Update Failed', err.response?.data?.message || err.message);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const readyForReview = tasks.filter(
      (t) => t.status === 'READY_FOR_REVIEW' || t.status === 'REVIEW' || t.status === 'IN_REVIEW'
    ).length;
    const overdue = tasks.filter((t) => t.isOverdue && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;

    return { total, inProgress, readyForReview, overdue, completed };
  }, [tasks]);

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title?.toLowerCase().includes(q);
        const descMatch = t.description?.toLowerCase().includes(q);
        const assigneeMatch = t.assigneeName?.toLowerCase().includes(q);
        const clientMatch = t.client?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !assigneeMatch && !clientMatch) return false;
      }

      // Status
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'OVERDUE') {
          if (!t.isOverdue || t.status === 'COMPLETED') return false;
        } else if (statusFilter === 'READY_FOR_REVIEW') {
          if (t.status !== 'READY_FOR_REVIEW' && t.status !== 'REVIEW' && t.status !== 'IN_REVIEW') return false;
        } else if (statusFilter === 'REVISION_REQUIRED') {
          if (t.status !== 'REVISION_REQUIRED' && t.status !== 'REVISION') return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // Priority
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) {
        return false;
      }

      // Assignee
      if (assigneeFilter !== 'ALL' && String(t.assigned_to || t.assignedTo) !== String(assigneeFilter)) {
        return false;
      }

      // Client
      if (clientFilter !== 'ALL' && String(t.client_id || t.clientId) !== String(clientFilter)) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, clientFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            Workspace Tasks
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage assignments, review deliverables, and track workflow completion.
          </p>
        </div>

        {isManager && (
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </Button>
        )}
      </div>

      {/* Manager Metric Overview Bar */}
      {isManager && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Tasks</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.total}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">In Progress</p>
              <p className="text-xl font-extrabold text-blue-700 mt-0.5">{metrics.inProgress}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">For Review</p>
              <p className="text-xl font-extrabold text-indigo-700 mt-0.5">{metrics.readyForReview}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Overdue</p>
              <p className="text-xl font-extrabold text-rose-700 mt-0.5">{metrics.overdue}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between col-span-2 sm:col-span-1">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</p>
              <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{metrics.completed}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks, descriptions, assignees, clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs rounded-xl border-slate-200 bg-white p-2 font-semibold text-slate-700"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            {/* Assignee Filter */}
            {isManager && (
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="text-xs rounded-xl border-slate-200 bg-white p-2 font-semibold text-slate-700"
              >
                <option value="ALL">All Assignees</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.full_name}
                  </option>
                ))}
              </select>
            )}

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="text-xs rounded-xl border-slate-200 bg-white p-2 font-semibold text-slate-700"
            >
              <option value="ALL">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
          {[
            { id: 'ALL', label: 'All Tasks', count: tasks.length },
            { id: 'TODO', label: 'To Do', count: tasks.filter((t) => t.status === 'TODO').length },
            { id: 'IN_PROGRESS', label: 'In Progress', count: metrics.inProgress },
            { id: 'READY_FOR_REVIEW', label: 'Ready for Review', count: metrics.readyForReview },
            { id: 'REVISION_REQUIRED', label: 'Revision Required', count: tasks.filter((t) => t.status === 'REVISION_REQUIRED' || t.status === 'REVISION').length },
            { id: 'OVERDUE', label: 'Overdue', count: metrics.overdue },
            { id: 'COMPLETED', label: 'Completed', count: metrics.completed },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {tasks.length === 0 ? 'No tasks yet.' : 'No tasks match current filters.'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {tasks.length === 0
                ? isManager
                  ? 'Get started by creating your first task and assigning it to a team member.'
                  : 'No tasks have been assigned to you yet in this workspace.'
                : 'Try adjusting your search keywords, status filter, or priority selection.'}
            </p>
          </div>
          {isManager && tasks.length === 0 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 text-white font-bold gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4" />
              Create First Task
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Task Creation Modal */}
      <TaskManagerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaveSuccess={loadTasks}
      />
    </div>
  );
};
