import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { taskService } from '../../../services/taskService';
import { TaskStatusBadge } from '../../../components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '../../../components/tasks/TaskPriorityBadge';
import { TaskStatusActions } from '../../../components/tasks/TaskStatusActions';
import { TaskAttachments } from '../../../components/tasks/TaskAttachments';
import { TaskDeliverables } from '../../../components/tasks/TaskDeliverables';
import { TaskComments } from '../../../components/tasks/TaskComments';
import { TaskActivity } from '../../../components/tasks/TaskActivity';
import { TaskManagerModal } from '../../../components/tasks/TaskManagerModal';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { formatDate } from '../../../utils/formatters';
import { ROLES } from '../../../utils/constants';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building2,
  FolderKanban,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Sparkles,
  AlertCircle,
  Share2,
} from 'lucide-react';

export const TaskDetailsPage = () => {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, role } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTask = async () => {
    try {
      setLoading(true);
      const data = await taskService.getTask(taskId);
      setTask(data);
    } catch (err) {
      toast.error('Task Inaccessible', err.response?.data?.message || err.message || 'Unable to load task.');
      navigate('/workspace/tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  const handleStatusChange = async (newStatus, notes = '') => {
    setIsUpdatingStatus(true);
    try {
      const updated = await taskService.updateTaskStatus(taskId, newStatus, notes);
      setTask(updated);
      toast.success('Status Updated', `Task status is now ${updated.statusDisplay}.`);
    } catch (err) {
      toast.error('Status Update Failed', err.response?.data?.message || err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUploadFile = async (file, attachmentType = 'REFERENCE') => {
    setIsUploadingAttachment(true);
    try {
      const added = await taskService.uploadTaskAttachment(taskId, file, attachmentType);
      // Reload task to guarantee synchronized relationships
      const freshTask = await taskService.getTask(taskId);
      setTask(freshTask);
      toast.success(
        attachmentType === 'SUBMISSION' ? 'Deliverable Uploaded 📎' : 'Reference File Added 📎',
        `"${file.name}" uploaded successfully.`
      );
    } catch (err) {
      toast.error('Upload Failed', err.response?.data?.message || err.message);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await taskService.deleteAttachment(taskId, attachmentId);
      setTask((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((a) => a.id !== attachmentId),
        referenceFiles: (prev.referenceFiles || []).filter((a) => a.id !== attachmentId),
        deliverables: (prev.deliverables || []).filter((a) => a.id !== attachmentId),
        attachmentsCount: Math.max(0, (prev.attachmentsCount || 1) - 1),
      }));
      toast.success('Attachment Removed', 'The file has been deleted from this task.');
    } catch (err) {
      toast.error('Delete Failed', err.response?.data?.message || err.message);
    }
  };

  const handleAddComment = async (commentText) => {
    setIsSubmittingComment(true);
    try {
      const added = await taskService.addComment(taskId, commentText);
      setTask((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), added],
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
      toast.success('Comment Added', 'Your comment has been posted.');
    } catch (err) {
      toast.error('Comment Failed', err.response?.data?.message || err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await taskService.deleteComment(taskId, commentId);
      setTask((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c.id !== commentId),
        commentsCount: Math.max(0, (prev.commentsCount || 1) - 1),
      }));
      toast.success('Comment Deleted', 'Your comment has been removed.');
    } catch (err) {
      toast.error('Delete Failed', err.response?.data?.message || err.message);
    }
  };

  const handleDeleteTask = async () => {
    setIsDeleting(true);
    try {
      await taskService.deleteTask(taskId);
      toast.success('Task Deleted', 'The task has been archived and removed.');
      navigate('/workspace/tasks');
    } catch (err) {
      toast.error('Delete Failed', err.response?.data?.message || err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading task workspace...</p>
      </div>
    );
  }

  if (!task) return null;

  const currentUserId = Number(user?.id);
  const assigneeId = Number(task.assigned_to || task.assignedTo);
  const creatorId = Number(task.created_by || task.createdBy);

  const isManager =
    role === ROLES.WORKSPACE_MANAGER ||
    role === ROLES.SUPERADMIN ||
    role === ROLES.GRAPHIC_TEAM_HEAD ||
    role === ROLES.SOCIAL_MEDIA_MANAGER;

  const isAssignee = currentUserId === assigneeId;
  const isCreator = currentUserId === creatorId;

  const canEdit = isManager || isCreator;
  const canDelete = role === ROLES.WORKSPACE_MANAGER || role === ROLES.SUPERADMIN;

  const instructionsText = task.instructions || task.description;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </button>

        {/* Manager Action Controls */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setIsEditModalOpen(true)}
              className="gap-1.5 font-bold text-slate-700 hover:bg-slate-50"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Task
            </Button>
          )}

          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="gap-1.5 font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Task
            </Button>
          )}
        </div>
      </div>

      {/* Main 2-Column Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Task Information, Instructions, Media, Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            {/* Badges & Client Tag */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {task.client && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold uppercase tracking-wide">
                    {task.client}
                  </span>
                )}
                {task.project && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                    {task.project}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <TaskPriorityBadge priority={task.priority} />
                <TaskStatusBadge status={task.status} isOverdue={task.isOverdue} />
              </div>
            </div>

            {/* Task Title */}
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {task.title}
            </h1>

            {/* Contextual Status Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Current Workflow Action:
              </span>
              <TaskStatusActions
                task={task}
                onStatusChange={handleStatusChange}
                isUpdating={isUpdatingStatus}
              />
            </div>

            {/* Key Personnel & Dates Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-slate-100 text-xs">
              {/* Assignee */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Avatar
                  src={task.assigneeAvatar}
                  name={task.assigneeName || 'Unassigned'}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned to</p>
                  <p className="font-extrabold text-slate-900 truncate">{task.assigneeName}</p>
                  <p className="text-[10px] text-indigo-600 font-bold capitalize truncate">
                    {task.assigneeRole || 'Member'}
                  </p>
                </div>
              </div>

              {/* Creator */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Avatar
                  src={task.creatorAvatar}
                  name={task.creatorName || 'Manager'}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Created by</p>
                  <p className="font-extrabold text-slate-900 truncate">{task.creatorName}</p>
                  <p className="text-[10px] text-slate-500 font-bold capitalize truncate">
                    {task.creatorRole || 'Manager'}
                  </p>
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Due Date</p>
                  <p className={`font-extrabold truncate ${task.isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                    {task.dueDate ? formatDate(task.dueDate) : 'No Deadline'}
                  </p>
                  {task.dueTime && (
                    <p className="text-[10px] text-slate-500 font-medium">{task.dueTime}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* INSTRUCTIONS / WHAT NEEDS TO BE DONE */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                What Needs to be Done / Instructions
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
              {instructionsText && instructionsText.trim() ? (
                instructionsText
              ) : (
                <span className="text-slate-400 italic font-medium">No instructions added.</span>
              )}
            </div>
          </div>

          {/* REFERENCE FILES */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <TaskAttachments
              attachments={task.referenceFiles || []}
              onUpload={handleUploadFile}
              onDelete={handleDeleteAttachment}
              canUpload={canEdit || isAssignee}
              canDelete={canEdit}
              isUploading={isUploadingAttachment}
            />
          </div>

          {/* ASSIGNEE DELIVERABLES */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <TaskDeliverables
              deliverables={task.deliverables || []}
              onUpload={handleUploadFile}
              onDelete={handleDeleteAttachment}
              canUpload={isAssignee || isManager}
              canDelete={isAssignee || isManager}
              isUploading={isUploadingAttachment}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Discussion Comments & Activity History */}
        <div className="space-y-6">
          {/* Discussion Box */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col min-h-[380px]">
            <TaskComments
              comments={task.comments || []}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              isSubmitting={isSubmittingComment}
            />
          </div>

          {/* Activity Timeline */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <TaskActivity activity={task.activity || []} />
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      <TaskManagerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        taskToEdit={task}
        onSaveSuccess={loadTask}
      />

      {/* Delete Task Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task?"
        message={`Are you sure you want to delete "${task.title}"? This task will be removed from active lists. Associated media assets and audit history will be preserved.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Task'}
        variant="danger"
      />
    </div>
  );
};
