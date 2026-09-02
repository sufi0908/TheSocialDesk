import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { todoService } from '../../services/todoService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ROLES } from '../../utils/constants';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const DashboardTodoWidget = ({ className, onTodoChange }) => {
  const { role } = useAuth();
  const toast = useToast();

  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState({ today: 0, overdue: 0, completed: 0, pending: 0 });
  const [quickTitle, setQuickTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine portal route for "View All"
  const getTodoRoute = () => {
    if (role === ROLES.SUPERADMIN) return '/superadmin/todo';
    if (role === ROLES.CLIENT) return '/client/todo';
    return '/workspace/todo';
  };

  const loadWidgetData = async () => {
    setLoading(true);
    try {
      const list = await todoService.getTodos({ status: 'TODO' });
      const statsData = await todoService.getStats();
      setTodos(list.slice(0, 5)); // Show top 5 active
      setStats(statsData);
    } catch (err) {
      console.warn('Failed to load todo widget data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWidgetData();
  }, []);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await todoService.createTodo({
        title: quickTitle.trim(),
        priority: 'MEDIUM',
        category: 'General',
      });
      setQuickTitle('');
      toast.success('To-Do Added', 'Personal item added to your list.');
      loadWidgetData();
      if (onTodoChange) onTodoChange();
    } catch (err) {
      toast.error('Error', 'Failed to add To-Do.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCheck = async (todo) => {
    const isCompleted = todo.status !== 'COMPLETED';
    // Optimistic UI update
    setTodos((prev) => prev.filter((t) => String(t.id) !== String(todo.id)));
    setStats((prev) => ({
      ...prev,
      completed: isCompleted ? prev.completed + 1 : Math.max(0, prev.completed - 1),
      pending: Math.max(0, prev.pending - 1),
    }));

    try {
      await todoService.toggleComplete(todo.id, isCompleted);
      toast.success(isCompleted ? 'Completed!' : 'Restored', `"${todo.title}" updated.`);
      loadWidgetData();
      if (onTodoChange) onTodoChange();
    } catch (err) {
      toast.error('Error', 'Failed to update item.');
      loadWidgetData();
    }
  };

  return (
    <Card className={`rounded-2xl border-slate-200/90 shadow-xs bg-white ${className}`}>
      <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-indigo-600" />
          <CardTitle className="text-sm font-extrabold text-slate-900 tracking-tight">
            MY PERSONAL TO-DO
          </CardTitle>
        </div>

        <NavLink
          to={getTodoRoute()}
          className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </NavLink>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Counter Pills */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-700 uppercase">Today</span>
            <span className="text-xs font-black text-indigo-900 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
              {stats.today}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase">Overdue</span>
            <span className="text-xs font-black text-amber-900 bg-white px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
              {stats.overdue}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase font-bold">Done</span>
            <span className="text-xs font-black text-emerald-900 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
              {stats.completed}
            </span>
          </div>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add a quick task... (Press Enter)"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
          />
          <Button
            type="submit"
            variant="primary"
            size="xs"
            disabled={!quickTitle.trim()}
            isLoading={isSubmitting}
            className="py-2 px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </form>

        {/* Active Checklist Items */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading To-Dos...</div>
          ) : todos.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-medium space-y-1">
              <Sparkles className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <p>No pending personal To-Dos.</p>
              <p className="text-[10px] text-slate-400">Add something you want to get done!</p>
            </div>
          ) : (
            todos.map((todo) => {
              const isOverdue = todo.due_date && new Date(todo.due_date) < new Date(new Date().setHours(0,0,0,0));
              return (
                <div
                  key={todo.id}
                  className="p-2.5 bg-slate-50/70 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all flex items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={todo.status === 'COMPLETED'}
                      onChange={() => handleToggleCheck(todo)}
                      className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate leading-snug">
                        {todo.title}
                      </p>
                      {todo.category && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          {todo.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {isOverdue && (
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black uppercase border border-amber-200 shrink-0">
                      Overdue
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
