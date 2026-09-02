import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Textarea } from '../forms/Textarea';
import { MediaPreview } from '../common/MediaPreview';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { taskService } from '../../services/taskService';
import { teamService } from '../../services/teamService';
import { formatDate } from '../../utils/formatters';
import { ROLES } from '../../utils/constants';
import {
  CheckCircle2,
  Play,
  Send,
  MessageSquare,
  Clock,
  User,
  Layers,
  AlertTriangle,
  FileText,
  Paperclip,
  Activity,
  RotateCcw,
  UploadCloud,
  Edit,
  Trash2,
  Share2,
  X,
  CheckSquare,
  Sparkles,
  Download,
  ExternalLink,
  Plus,
} from 'lucide-react';

export const TaskWorkModal = ({
  isOpen,
  onClose,
  task,
  onEdit,
  onDelete,
  onActionSuccess,
}) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { role: userRole, user } = useAuth();

  const isManager =
    userRole === ROLES.WORKSPACE_MANAGER ||
    userRole === ROLES.SUPERADMIN ||
    userRole === ROLES.GRAPHIC_TEAM_HEAD;

  const isAssignee =
    task &&
    (Number(task.assigned_to || task.assignedTo) === Number(user?.id) ||
      (task.assignee_name && task.assignee_name === user?.name));

  const [fullTask, setFullTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUploadingWork, setIsUploadingWork] = useState(false);

  // Forms
  const [showRequestChangesForm, setShowRequestChangesForm] = useState(false);
  const [requestChangesText, setRequestChangesText] = useState('');
  const [showReassignDropdown, setShowReassignDropdown] = useState(false);
  const [selectedNewAssigneeId, setSelectedNewAssigneeId] = useState('');

  useEffect(() => {
    if (isOpen && task?.id) {
      setShowRequestChangesForm(false);
      setShowReassignDropdown(false);
      setRequestChangesText('');
      setNewComment('');
      loadDetails(task.id);
    }
  }, [isOpen, task]);

  const loadDetails = async (taskId) => {
    try {
      const [details, tList] = await Promise.all([
        taskService.getTaskDetails(taskId).catch(() => null),
        teamService.getTeamMembers().catch(() => []),
      ]);

      if (details) {
        setFullTask(details);
        setComments(Array.isArray(details.comments) ? details.comments : []);
        setAttachments(Array.isArray(details.attachments) ? details.attachments : []);
        setActivities(Array.isArray(details.activity) ? details.activity : []);
      } else {
        setFullTask(task);
      }
      setTeamMembers(Array.isArray(tList) ? tList : []);
    } catch (e) {
      console.warn('Failed loading task details:', e.message);
      setFullTask(task);
    }
  };

  if (!task && !fullTask) return null;

  const currentTask = fullTask || task;
  const isCompleted = String(currentTask.status).toUpperCase() === 'COMPLETED';
  const isReadyForReview =
    String(currentTask.status).toUpperCase() === 'READY_FOR_REVIEW' ||
    String(currentTask.status).toUpperCase() === 'IN_REVIEW' ||
    String(currentTask.status).toUpperCase() === 'REVIEW';
  const isInProgress = String(currentTask.status).toUpperCase() === 'IN_PROGRESS';
  const isTodo = String(currentTask.status).toUpperCase() === 'TODO';

  const dueDate = currentTask.dueDate || currentTask.due_date;
  const dueTime = currentTask.dueTime || currentTask.due_time;
  const isOverdue = dueDate && new Date(dueDate) < new Date() && !isCompleted;

  // Status Change Handler
  const handleStatusTransition = async (newStatus, notes = '') => {
    setIsUpdatingStatus(true);
    try {
      await taskService.updateTaskStatus(currentTask.id, newStatus, notes);

      let msg = `Task status updated to ${newStatus}`;
      if (newStatus === 'IN_PROGRESS') msg = 'Started work on task. Workspace Manager notified.';
      if (newStatus === 'READY_FOR_REVIEW') msg = 'Submitted task for review. Manager notified.';
      if (newStatus === 'COMPLETED') msg = 'Task approved and marked as completed! 🎉';

      toast.success('Task Updated', msg);
      if (onActionSuccess) onActionSuccess();
      loadDetails(currentTask.id);
    } catch (err) {
      toast.error('Status Update Failed', err.response?.data?.message || err.message || 'Could not update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Reassign Task Handler
  const handleReassign = async () => {
    if (!selectedNewAssigneeId) return;
    setIsUpdatingStatus(true);
    try {
      await taskService.reassignTask(currentTask.id, Number(selectedNewAssigneeId));
      toast.success('Task Reassigned', 'Task reassigned and new assignee notified.');
      setShowReassignDropdown(false);
      if (onActionSuccess) onActionSuccess();
      loadDetails(currentTask.id);
    } catch (err) {
      toast.error('Reassignment Failed', err.response?.data?.message || err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Request Changes Handler (Manager Action)
  const handleRequestChanges = async () => {
    if (!requestChangesText.trim()) {
      toast.error('Comment Required', 'Please explain what changes are required before requesting revisions.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await handleStatusTransition('IN_PROGRESS', requestChangesText.trim());
      setShowRequestChangesForm(false);
      setRequestChangesText('');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Post Comment Handler
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const added = await taskService.addComment(currentTask.id, newComment.trim());
      setComments((prev) => [...prev, added]);
      setNewComment('');
      toast.success('Comment Posted', 'Comment added to task thread.');
      loadDetails(currentTask.id);
    } catch (err) {
      toast.error('Comment Failed', err.response?.data?.message || err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Upload Work File / Submission Handler
  const handleWorkFileUpload = async (e, type = 'SUBMISSION') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingWork(true);
    try {
      const added = await taskService.uploadTaskAttachment(currentTask.id, file, type);
      setAttachments((prev) => [...prev, added]);
      toast.success('File Uploaded! 📎', `"${file.name}" attached to task.`);
      loadDetails(currentTask.id);
    } catch (err) {
      toast.error('Upload Failed', err.response?.data?.message || err.message);
    } finally {
      setIsUploadingWork(false);
    }
  };

  // Remove attachment handler
  const handleRemoveAttachment = async (attachmentId) => {
    try {
      await taskService.deleteAttachment(currentTask.id, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success('Attachment Removed', 'File removed from task.');
      loadDetails(currentTask.id);
    } catch (err) {
      toast.error('Failed to Remove', err.response?.data?.message || err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isManager ? `Task Details — ${currentTask.title}` : `My Task — ${currentTask.title}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* ============================================================ */}
        {/* HEADER BAR: CLIENT, STATUS, PRIORITY & DEADLINE */}
        {/* ============================================================ */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              {currentTask.client || currentTask.client_name || 'Workspace Task'}
            </span>
            <Badge statusKey={String(currentTask.status || 'TODO').toLowerCase().replace(' ', '_')} />
            <span className="text-xs font-black uppercase text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
              Priority: {currentTask.priority || 'MEDIUM'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className={`w-4 h-4 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
              <span className={isOverdue ? 'text-rose-600' : 'text-slate-700'}>
                Due: {dueDate ? formatDate(dueDate) : 'No Deadline'} {dueTime ? `at ${dueTime}` : ''}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/workspace/tasks/${currentTask.id}`);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline ml-2"
            >
              Open Full Page <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN 2-COLUMN LAYOUT: CONTENT & COLLABORATION */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: DESCRIPTION, INSTRUCTIONS, ATTACHMENTS (7 COLS) */}
          <div className="lg:col-span-7 space-y-5">
            {/* ASSIGNEE & CREATOR RELATIONSHIP CARDS */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar
                  src={currentTask.assigneeAvatar || currentTask.assignee_avatar}
                  name={currentTask.assigneeName || currentTask.assignee_name || 'Unassigned'}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold">Assigned To</p>
                  <p className="font-bold text-slate-900 truncate">
                    {currentTask.assigneeName || currentTask.assignee_name || 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-0 border-l border-slate-100 pl-3">
                <Avatar
                  src={currentTask.creatorAvatar || currentTask.creator_avatar}
                  name={currentTask.creatorName || currentTask.creator_name || 'Manager'}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold">Created By</p>
                  <p className="font-bold text-slate-900 truncate">
                    {currentTask.creatorName || currentTask.creator_name || 'Workspace Manager'}
                  </p>
                </div>
              </div>
            </div>

            {/* WHAT DO I NEED TO DO / DESCRIPTION */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                {isAssignee && !isManager ? 'What Do I Need To Do?' : 'Description'}
              </h4>
              <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {currentTask.description || 'No detailed description provided.'}
              </div>
            </div>

            {/* INSTRUCTIONS */}
            {currentTask.instructions && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Instructions & Guidelines
                </h4>
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed whitespace-pre-wrap font-medium">
                  {currentTask.instructions}
                </div>
              </div>
            )}

            {/* ATTACHMENTS & REFERENCE FILES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-indigo-600" /> Reference Files & Attachments ({attachments.length})
                </h4>
                <label className="cursor-pointer text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                  + Add File
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleWorkFileUpload(e, 'REFERENCE')}
                    disabled={isUploadingWork}
                  />
                </label>
              </div>

              {attachments.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                  No reference files attached yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachments.map((att) => (
                    <MediaPreview
                      key={att.id}
                      attachment={att}
                      canRemove={isManager || (isAssignee && Number(att.userId) === Number(user?.id))}
                      onRemove={handleRemoveAttachment}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* MY WORK / SUBMISSION UPLOADER (ASSIGNEE VIEW) */}
            {isAssignee && !isCompleted && (
              <div className="p-4 bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-indigo-600" /> Submit Your Work Deliverables
                  </h4>
                  <span className="text-[10px] font-bold text-indigo-600">Assignee Deliverables</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Upload finished creatives, copy drafts, or campaign files here before marking ready for review.
                </p>
                <label className="block w-full py-2.5 bg-white border border-indigo-300 hover:border-indigo-500 rounded-xl text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer transition-all shadow-2xs">
                  {isUploadingWork ? 'Uploading deliverable...' : '📁 Upload Work Deliverable'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleWorkFileUpload(e, 'SUBMISSION')}
                    disabled={isUploadingWork}
                  />
                </label>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: COMMENTS & ACTIVITY TIMELINE (5 COLS) */}
          <div className="lg:col-span-5 space-y-5">
            {/* COMMENTS THREAD */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" /> Discussion & Comments ({comments.length})
              </h4>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 max-h-60 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No comments posted yet.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Avatar src={c.userAvatar || c.user?.avatar} name={c.userName || c.user?.name || 'Member'} size="xs" />
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[120px]">
                            {c.userName || c.user?.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 pl-6 leading-relaxed whitespace-pre-wrap">
                        {c.text || c.message || c.commentText}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* COMMENT COMPOSER */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  className="w-full text-xs rounded-xl border-slate-200 bg-white p-2.5 font-semibold text-slate-800 focus:ring-indigo-500"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddComment}
                  isLoading={isSubmittingComment}
                  leftIcon={Send}
                  className="bg-indigo-600 text-white shrink-0"
                >
                  Send
                </Button>
              </div>
            </div>

            {/* ACTIVITY TIMELINE */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" /> Activity History
              </h4>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 max-h-48 overflow-y-auto">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">No activity recorded yet.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-slate-700 font-medium leading-snug">{act.description}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{formatDate(act.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* INLINE REQUEST CHANGES FORM (MANAGER ONLY) */}
        {/* ============================================================ */}
        {showRequestChangesForm && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Explain Changes Required for Assignee
              </label>
              <span className="text-[10px] font-bold text-amber-700">Status will revert to In Progress</span>
            </div>

            <Textarea
              placeholder="e.g. Please update the creative dimensions to 1080x1350 and modify the caption line 2..."
              rows={2}
              value={requestChangesText}
              onChange={(e) => setRequestChangesText(e.target.value)}
              className="bg-white border-amber-200 text-xs focus:border-amber-500"
            />

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRequestChangesForm(false)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold"
                onClick={handleRequestChanges}
                isLoading={isUpdatingStatus}
              >
                Submit Changes Request
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* INLINE REASSIGN SELECTOR (MANAGER ONLY) */}
        {/* ============================================================ */}
        {showReassignDropdown && (
          <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-2xl flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-indigo-900 mb-1">Select New Assignee</label>
              <select
                value={selectedNewAssigneeId}
                onChange={(e) => setSelectedNewAssigneeId(e.target.value)}
                className="w-full text-xs rounded-xl border-indigo-200 bg-white p-2 font-semibold text-slate-800"
              >
                <option value="">Select Team Member</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <Button variant="ghost" size="sm" onClick={() => setShowReassignDropdown(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 text-white font-bold"
                onClick={handleReassign}
                isLoading={isUpdatingStatus}
              >
                Confirm Reassign
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FOOTER CONTEXTUAL CONTROLS */}
        {/* ============================================================ */}
        {!showRequestChangesForm && !showReassignDropdown && (
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>

            {/* MANAGER ACTION CONTROLS */}
            {isManager ? (
              <div className="flex items-center gap-2 flex-wrap">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={Edit}
                    onClick={() => {
                      onClose();
                      onEdit(currentTask);
                    }}
                  >
                    Edit Task
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={Share2}
                  onClick={() => setShowReassignDropdown(true)}
                >
                  Reassign
                </Button>

                {isReadyForReview && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-800 hover:bg-amber-50 font-bold"
                    onClick={() => setShowRequestChangesForm(true)}
                    leftIcon={RotateCcw}
                  >
                    Request Changes
                  </Button>
                )}

                {!isCompleted && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm"
                    onClick={() => handleStatusTransition('COMPLETED')}
                    isLoading={isUpdatingStatus}
                    leftIcon={CheckCircle2}
                  >
                    Mark Complete
                  </Button>
                )}

                {isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusTransition('REOPENED')}
                    isLoading={isUpdatingStatus}
                    leftIcon={RotateCcw}
                  >
                    Reopen Task
                  </Button>
                )}

                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      onClose();
                      onDelete(currentTask);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              /* ASSIGNEE ACTION CONTROLS */
              <div className="flex items-center gap-2 flex-wrap">
                {isTodo && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold"
                    onClick={() => handleStatusTransition('IN_PROGRESS')}
                    isLoading={isUpdatingStatus}
                    leftIcon={Play}
                  >
                    Start Task
                  </Button>
                )}

                {isInProgress && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold"
                    onClick={() => handleStatusTransition('READY_FOR_REVIEW')}
                    isLoading={isUpdatingStatus}
                    leftIcon={CheckSquare}
                  >
                    Mark Ready for Review
                  </Button>
                )}

                {isReadyForReview && (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
                    Awaiting Manager Review
                  </span>
                )}

                {isCompleted && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    Task Completed ✅
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
