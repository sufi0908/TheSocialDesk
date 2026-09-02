import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { taskService } from '../../../services/taskService';
import { TaskCard } from '../../../components/tasks/TaskCard';
import { Button } from '../../../components/ui/Button';
import {
  CheckSquare,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Search,
  Sparkles,
} from 'lucide-react';

export const MyTasksPage = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const loadMyTasks = async () => {
    try {
      setLoading(true);
      const data = await taskService.getMyTasks();
      setTasks(data);
    } catch (err) {
      toast.error('Failed to Load Tasks', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyTasks();
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

  // Metrics for current user
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = tasks.filter((t) => {
      if (!t.dueDate && !t.due_date) return false;
      const d = (t.dueDate || t.due_date).split('T')[0];
      return d === todayStr && t.status !== 'COMPLETED';
    }).length;

    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const readyForReview = tasks.filter(
      (t) => t.status === 'READY_FOR_REVIEW' || t.status === 'REVIEW' || t.status === 'IN_REVIEW'
    ).length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const overdue = tasks.filter(
      (t) => t.isOverdue && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    ).length;

    return { total: tasks.length, today, todo, inProgress, readyForReview, completed, overdue };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title?.toLowerCase().includes(q);
        const descMatch = t.description?.toLowerCase().includes(q);
        const clientMatch = t.client?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !clientMatch) return false;
      }

      if (activeTab === 'TODAY') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (!t.dueDate && !t.due_date) return false;
        const d = (t.dueDate || t.due_date).split('T')[0];
        return d === todayStr;
      }

      if (activeTab === 'TODO') return t.status === 'TODO';
      if (activeTab === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
      if (activeTab === 'READY_FOR_REVIEW')
        return t.status === 'READY_FOR_REVIEW' || t.status === 'REVIEW' || t.status === 'IN_REVIEW';
      if (activeTab === 'OVERDUE')
        return t.isOverdue && t.status !== 'COMPLETED';
      if (activeTab === 'COMPLETED') return t.status === 'COMPLETED';

      return true;
    });
  }, [tasks, searchQuery, activeTab]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          My Assigned Tasks
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Focus on deliverables assigned to you, start your tasks, and submit work for review.
        </p>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div
          onClick={() => setActiveTab('TODAY')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'TODAY'
              ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Today</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{metrics.today}</p>
        </div>

        <div
          onClick={() => setActiveTab('TODO')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'TODO'
              ? 'bg-slate-100 border-slate-300 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">To Do</span>
            <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{metrics.todo}</p>
        </div>

        <div
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'IN_PROGRESS'
              ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">In Progress</span>
            <Play className="w-3.5 h-3.5 text-blue-600 fill-current" />
          </div>
          <p className="text-xl font-black text-blue-700 mt-1">{metrics.inProgress}</p>
        </div>

        <div
          onClick={() => setActiveTab('READY_FOR_REVIEW')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'READY_FOR_REVIEW'
              ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">In Review</span>
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-700 mt-1">{metrics.readyForReview}</p>
        </div>

        <div
          onClick={() => setActiveTab('OVERDUE')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'OVERDUE'
              ? 'bg-rose-50/80 border-rose-300 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600">Overdue</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-700 mt-1">{metrics.overdue}</p>
        </div>

        <div
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'COMPLETED'
              ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Done</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 mt-1">{metrics.completed}</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search your tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All My Tasks' },
            { id: 'TODAY', label: 'Today' },
            { id: 'TODO', label: 'To Do' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'READY_FOR_REVIEW', label: 'Ready for Review' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
              {tasks.length === 0 ? 'No tasks assigned to you yet.' : 'No tasks in this category.'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {tasks.length === 0
                ? 'Tasks assigned to you by your workspace manager or team head will appear here.'
                : 'Check another category tab above to see other tasks.'}
            </p>
          </div>
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
    </div>
  );
};
