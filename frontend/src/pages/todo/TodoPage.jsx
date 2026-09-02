import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/forms/Input';
import { Select } from '../../components/forms/Select';
import { LoadingState } from '../../components/common/LoadingState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { todoService } from '../../services/todoService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';

import {
  CheckSquare,
  Plus,
  Clock,
  Search,
  Calendar,
  AlertTriangle,
  Tag,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Edit2,
  Sparkles,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

const CATEGORIES = ['General', 'Content', 'Design', 'Client', 'Meeting', 'Personal', 'Review', 'Other'];

export const TodoPage = () => {
  const { user } = useAuth();
  const toast = useToast();

  // Data State
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState({ today: 0, overdue: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('due_date'); // 'due_date' | 'created_at' | 'priority'

  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [todoToDelete, setTodoToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formCategory, setFormCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('');
  const [formStatus, setFormStatus] = useState('TODO');

  const loadData = async () => {
    setLoading(true);
    try {
      const filters = {
        search,
        priority: selectedPriority,
        category: selectedCategory,
        status: selectedStatus,
        sortBy,
      };

      if (activeTab !== 'all') {
        filters.dueDateFilter = activeTab;
      }

      const list = await todoService.getTodos(filters);
      const statsData = await todoService.getStats();

      setTodos(list);
      setStats(statsData);
    } catch (err) {
      toast.error('Error', 'Unable to load your personal To-Dos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedPriority, selectedCategory, selectedStatus, sortBy]);

  // Handle Search Input Delay or Trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Quick Add Action
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setIsQuickSubmitting(true);
    try {
      await todoService.createTodo({
        title: quickTitle.trim(),
        priority: 'MEDIUM',
        category: 'General',
        dueDate: new Date().toISOString().split('T')[0],
      });
      setQuickTitle('');
      toast.success('To-Do Created', 'Added new personal task.');
      loadData();
    } catch (err) {
      toast.error('Error', 'Failed to create To-Do.');
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingTodo(null);
    setFormTitle('');
    setFormDescription('');
    setFormPriority('MEDIUM');
    setFormCategory('General');
    setCustomCategory('');
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormDueTime('17:00');
    setFormStatus('TODO');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (todo) => {
    setEditingTodo(todo);
    setFormTitle(todo.title || '');
    setFormDescription(todo.description || '');
    setFormPriority(todo.priority || 'MEDIUM');
    if (CATEGORIES.includes(todo.category)) {
      setFormCategory(todo.category);
      setCustomCategory('');
    } else {
      setFormCategory('Other');
      setCustomCategory(todo.category || '');
    }
    setFormDueDate(todo.due_date ? todo.due_date.split('T')[0] : '');
    setFormDueTime(todo.due_time || '');
    setFormStatus(todo.status || 'TODO');
    setIsModalOpen(true);
  };

  // Submit Modal Form (Create or Edit)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const finalCategory = formCategory === 'Other' && customCategory.trim() ? customCategory.trim() : formCategory;

    setIsSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        priority: formPriority,
        category: finalCategory,
        dueDate: formDueDate || null,
        dueTime: formDueTime || null,
        status: formStatus,
      };

      if (editingTodo) {
        await todoService.updateTodo(editingTodo.id, payload);
        toast.success('To-Do Updated', `Updated "${formTitle}".`);
      } else {
        await todoService.createTodo(payload);
        toast.success('To-Do Created', `Created "${formTitle}".`);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error', err.message || 'Failed to save To-Do.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Completion Checkbox
  const handleToggleComplete = async (todo) => {
    const isCompleted = todo.status !== 'COMPLETED';
    try {
      await todoService.toggleComplete(todo.id, isCompleted);
      toast.success(isCompleted ? 'Task Completed' : 'Task Restored', `"${todo.title}" status updated.`);
      loadData();
    } catch (err) {
      toast.error('Error', 'Failed to update task.');
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!todoToDelete) return;
    setIsSubmitting(true);
    try {
      await todoService.deleteTodo(todoToDelete.id);
      toast.info('To-Do Deleted', `Removed "${todoToDelete.title}".`);
      setIsDeleteModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error', 'Failed to delete task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate Dynamic Due Date Tag
  const getDynamicDateLabel = (dueDateStr, dueTimeStr, isCompleted) => {
    if (!dueDateStr) return { label: 'No due date', className: 'text-slate-400 bg-slate-100 border-slate-200' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(dueDateStr);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

    let timeText = dueTimeStr ? ` at ${dueTimeStr.slice(0, 5)}` : '';

    if (isCompleted) {
      return { label: `Due ${formatDate(dueDateStr)}${timeText}`, className: 'text-slate-500 bg-slate-100 border-slate-200' };
    }

    if (diffDays < 0) {
      return {
        label: `OVERDUE (${diffDays === -1 ? 'Yesterday' : `${Math.abs(diffDays)} days ago`})${timeText}`,
        className: 'text-amber-800 bg-amber-100 border-amber-300 font-black uppercase',
      };
    }

    if (diffDays === 0) {
      return { label: `Today${timeText}`, className: 'text-indigo-700 bg-indigo-50 border-indigo-200 font-extrabold' };
    }

    if (diffDays === 1) {
      return { label: `Tomorrow${timeText}`, className: 'text-blue-700 bg-blue-50 border-blue-200 font-bold' };
    }

    return { label: `Due ${formatDate(dueDateStr)}${timeText}`, className: 'text-slate-600 bg-slate-100 border-slate-200' };
  };

  const getPriorityBadgeClass = (p) => {
    switch (p) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Personal Workspace' }, { label: 'My Personal To-Do List' }]} />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 mb-1.5 shadow-2xs">
            <CheckSquare className="w-4 h-4 text-indigo-600" /> Private Personal Checklist
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Personal To-Do List</h1>
          <p className="text-xs text-slate-500 mt-1">
            Your individual private checklist. Persisted safely in MySQL. Visible ONLY to you.
          </p>
        </div>

        <Button variant="primary" size="md" leftIcon={Plus} onClick={openCreateModal}>
          Add To-Do
        </Button>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Due Today</p>
            <p className="text-2xl font-extrabold text-indigo-700 mt-0.5">{stats.today}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Overdue</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-0.5">{stats.overdue}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.pending}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">{stats.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* QUICK ADD BAR */}
      <Card className="rounded-2xl border-slate-200/90 shadow-2xs bg-white">
        <CardContent className="p-3">
          <form onSubmit={handleQuickAdd} className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Add a task... (Press Enter to quickly save)"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              disabled={isQuickSubmitting}
              className="flex-1 text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-hidden focus:ring-0 placeholder:text-slate-400"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!quickTitle.trim()}
              isLoading={isQuickSubmitting}
              leftIcon={Plus}
            >
              Quick Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* FILTER TABS & FILTERS BAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Personal Tasks' },
            { id: 'today', label: 'Today' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs pt-1">
          <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
            />
          </form>

          <Select
            label="Priority"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Priorities' },
              { value: 'URGENT', label: 'Urgent' },
              { value: 'HIGH', label: 'High' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'LOW', label: 'Low' },
            ]}
          />

          <Select
            label="Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...CATEGORIES.map((cat) => ({ value: cat, label: cat })),
            ]}
          />

          <Select
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'due_date', label: 'Due Date' },
              { value: 'created_at', label: 'Created Date' },
              { value: 'priority', label: 'Priority Level' },
            ]}
          />
        </div>
      </div>

      {/* TASK LIST CONTAINER */}
      <Card className="rounded-2xl border-slate-200/90 shadow-2xs bg-white">
        <CardHeader className="py-3 px-5 border-b border-slate-100 flex items-center justify-between">
          <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span>
              {activeTab === 'all'
                ? 'All To-Dos'
                : activeTab === 'today'
                ? "Today's To-Dos"
                : activeTab === 'upcoming'
                ? 'Upcoming To-Dos'
                : activeTab === 'overdue'
                ? 'Overdue To-Dos'
                : 'Completed To-Dos'}{' '}
              ({todos.length})
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {loading ? (
            <LoadingState type="skeleton-cards" count={4} />
          ) : todos.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-300 mx-auto mb-1" />
              <p className="text-sm font-bold text-slate-700">No To-Dos found.</p>
              <p>Add something you want to get done for your personal workflow.</p>
              <Button variant="outline" size="sm" leftIcon={Plus} onClick={openCreateModal} className="mt-2">
                Create To-Do
              </Button>
            </div>
          ) : (
            todos.map((todo) => {
              const isCompleted = todo.status === 'COMPLETED';
              const dateTag = getDynamicDateLabel(todo.due_date, todo.due_time, isCompleted);

              return (
                <div
                  key={todo.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCompleted
                      ? 'bg-slate-50/60 border-slate-200/80 opacity-75'
                      : 'bg-white border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs'
                  }`}
                >
                  {/* Left: Checkbox + Title + Meta */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => handleToggleComplete(todo)}
                      className="w-5 h-5 mt-0.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`text-sm font-bold leading-snug ${
                            isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                        >
                          {todo.title}
                        </h4>

                        {/* Priority Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase inline-block ${getPriorityBadgeClass(
                            todo.priority
                          )}`}
                        >
                          {todo.priority}
                        </span>

                        {/* Category Badge */}
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-extrabold border border-slate-200">
                          {todo.category || 'General'}
                        </span>
                      </div>

                      {todo.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {todo.description}
                        </p>
                      )}

                      {/* Related Task/Content Link if present */}
                      {(todo.related_task_title || todo.related_content_title) && (
                        <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 pt-0.5">
                          <Tag className="w-3 h-3" />
                          <span>Related to: {todo.related_task_title || todo.related_content_title}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Date Label & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] border flex items-center gap-1 ${dateTag.className}`}>
                      <Clock className="w-3 h-3" />
                      <span>{dateTag.label}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      {isCompleted ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          title="Restore task"
                          onClick={() => handleToggleComplete(todo)}
                          className="text-slate-500 hover:text-indigo-600"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="xs"
                          title="Edit To-Do"
                          onClick={() => openEditModal(todo)}
                          className="text-slate-500 hover:text-indigo-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="xs"
                        title="Delete To-Do"
                        onClick={() => {
                          setTodoToDelete(todo);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT TO-DO MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTodo ? 'Edit Personal To-Do' : 'Create Personal To-Do'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <Input
            label="To-Do Title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g. Prepare Instagram captions for Friday post"
            required
          />

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Add details, notes, or sub-tasks..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={formPriority}
              onChange={(e) => setFormPriority(e.target.value)}
              options={[
                { value: 'LOW', label: 'Low Priority' },
                { value: 'MEDIUM', label: 'Medium Priority' },
                { value: 'HIGH', label: 'High Priority' },
                { value: 'URGENT', label: 'Urgent Priority' },
              ]}
            />

            <Select
              label="Category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>

          {formCategory === 'Other' && (
            <Input
              label="Custom Category Name"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="e.g. Strategy, Client Call, Legal"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Due Date"
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
            />
            <Input
              label="Due Time"
              type="time"
              value={formDueTime}
              onChange={(e) => setFormDueTime(e.target.value)}
            />
          </div>

          {editingTodo && (
            <Select
              label="Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              options={[
                { value: 'TODO', label: 'To-Do' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          )}

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingTodo ? 'Save Changes' : 'Create To-Do'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Personal To-Do"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete <strong className="text-slate-900">"{todoToDelete?.title}"</strong>?
          </p>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleDeleteConfirm}
              isLoading={isSubmitting}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
