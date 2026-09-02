import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import {
  MessageSquare,
  Paperclip,
  ArrowRight,
  Play,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
} from 'lucide-react';

export const TaskCard = ({ task, onStatusChange, onClick }) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!task) return null;

  const currentUserId = Number(user?.id);
  const assigneeId = Number(task.assigned_to || task.assignedTo);
  const assigneeName = task.assigneeName || task.assignee_name || (task.assignee?.name) || 'Unassigned';
  const assigneeAvatar = task.assigneeAvatar || task.assignee_avatar || (task.assignee?.avatar) || '';
  const assigneeRole = task.assigneeRole || task.assignee_role || (task.assignee?.role) || 'Member';

  const clientName = task.client || task.client_company_name || task.client_name || 'General';
  const dueDate = task.dueDate || task.due_date;
  const description = task.description || task.instructions || 'No instructions added.';
  const commentsCount = task.commentsCount || task.comments_count || (task.comments?.length) || 0;
  const attachmentsCount = task.attachmentsCount || task.attachments_count || (task.attachments?.length) || 0;

  const rawStatus = String(task.status || 'TODO').toUpperCase();
  const isAssignee = currentUserId === assigneeId;
  const isManager =
    role === ROLES.WORKSPACE_MANAGER ||
    role === ROLES.SUPERADMIN ||
    role === ROLES.GRAPHIC_TEAM_HEAD ||
    role === ROLES.SOCIAL_MEDIA_MANAGER;

  const handleCardClick = () => {
    if (onClick) {
      onClick(task);
    } else {
      navigate(`/workspace/tasks/${task.id}`);
    }
  };

  const handleQuickStatusChange = async (e, newStatus) => {
    e.stopPropagation();
    if (!onStatusChange || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    try {
      await onStatusChange(task.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer group space-y-3.5"
    >
      {/* Top Row: Client & Priority */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 truncate max-w-[150px]">
            {clientName}
          </span>

          <TaskPriorityBadge priority={task.priority} />
        </div>

        {/* Task Title */}
        <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {task.title}
        </h3>

        {/* Task Description Snippet */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
          {description}
        </p>
      </div>

      {/* Middle: Assignee & Due Date */}
      <div className="pt-3 border-t border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          {/* Assignee */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar src={assigneeAvatar} name={assigneeName} size="xs" />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-xs truncate leading-tight">
                {assigneeName}
              </p>
              <p className="text-[10px] text-slate-400 font-medium capitalize truncate leading-none mt-0.5">
                {assigneeRole}
              </p>
            </div>
          </div>

          {/* Due Date */}
          <div className="text-right shrink-0">
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{dueDate ? formatDate(dueDate) : 'No Date'}</span>
            </div>
          </div>
        </div>

        {/* Status Badge & Quick Status Action */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
          <TaskStatusBadge status={task.status} isOverdue={task.isOverdue} />

          {/* Quick Contextual Status Actions */}
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {isAssignee && !isManager && (
              <>
                {(rawStatus === 'TODO' || rawStatus === 'REVISION_REQUIRED' || rawStatus === 'REOPENED') && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={(e) => handleQuickStatusChange(e, 'IN_PROGRESS')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                  >
                    {isUpdatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                    Start
                  </button>
                )}

                {rawStatus === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={(e) => handleQuickStatusChange(e, 'READY_FOR_REVIEW')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors shadow-2xs"
                  >
                    {isUpdatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Submit
                  </button>
                )}
              </>
            )}

            {isManager && rawStatus === 'READY_FOR_REVIEW' && (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={(e) => handleQuickStatusChange(e, 'COMPLETED')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
              >
                {isUpdatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Approve
              </button>
            )}
          </div>
        </div>

        {/* Footer: Counters & Open Task Link */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              {attachmentsCount}
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              {commentsCount}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
            Open Task <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
