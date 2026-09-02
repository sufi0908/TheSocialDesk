import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../forms/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import {
  Play,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Loader2,
} from 'lucide-react';

export const TaskStatusActions = ({
  task,
  onStatusChange,
  isUpdating = false,
  className = '',
}) => {
  const { user, role } = useAuth();
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  if (!task) return null;

  const rawStatus = String(task.status || 'TODO').toUpperCase();
  const currentUserId = Number(user?.id);
  const assigneeId = Number(task.assigned_to || task.assignedTo);
  const creatorId = Number(task.created_by || task.createdBy);

  const isManager =
    role === ROLES.WORKSPACE_MANAGER ||
    role === ROLES.SUPERADMIN ||
    role === ROLES.GRAPHIC_TEAM_HEAD ||
    role === ROLES.SOCIAL_MEDIA_MANAGER;

  const isGraphicHead = role === ROLES.GRAPHIC_TEAM_HEAD;
  const isAssignee = currentUserId === assigneeId;
  const isCreator = currentUserId === creatorId;

  const handleStartTask = () => {
    if (onStatusChange) onStatusChange('IN_PROGRESS');
  };

  const handleSubmitForReview = () => {
    if (onStatusChange) onStatusChange('READY_FOR_REVIEW');
  };

  const handleApprove = () => {
    if (onStatusChange) onStatusChange('COMPLETED');
  };

  const handleReopen = () => {
    if (onStatusChange) onStatusChange('REOPENED');
  };

  const handleConfirmRevision = async () => {
    if (!revisionNotes.trim()) return;
    setIsSubmittingRevision(true);
    try {
      if (onStatusChange) {
        await onStatusChange('REVISION_REQUIRED', revisionNotes.trim());
      }
      setShowRevisionModal(false);
      setRevisionNotes('');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  return (
    <div className={`flex items-center gap-2.5 flex-wrap ${className}`}>
      {/* 1. ASSIGNEE ACTIONS */}
      {isAssignee && !isManager && (
        <>
          {(rawStatus === 'TODO' || rawStatus === 'REVISION_REQUIRED' || rawStatus === 'REOPENED' || rawStatus === 'BLOCKED') && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleStartTask}
              disabled={isUpdating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-2xs"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              Start Task
            </Button>
          )}

          {rawStatus === 'IN_PROGRESS' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmitForReview}
              disabled={isUpdating}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-2xs"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit for Review
            </Button>
          )}

          {rawStatus === 'READY_FOR_REVIEW' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700">
              <Clock className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
              Waiting for Team Review
            </div>
          )}

          {rawStatus === 'COMPLETED' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Approved & Completed
            </div>
          )}
        </>
      )}

      {/* 2. REVIEWER / MANAGER ACTIONS */}
      {(isManager || isCreator) && (
        <>
          {rawStatus === 'READY_FOR_REVIEW' && (
            <>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-2xs"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve & Complete
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRevisionModal(true)}
                disabled={isUpdating}
                className="text-orange-700 border-orange-300 hover:bg-orange-50 font-bold gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                Request Revision
              </Button>
            </>
          )}

          {rawStatus === 'COMPLETED' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReopen}
              disabled={isUpdating}
              className="text-slate-700 border-slate-300 hover:bg-slate-50 font-bold gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Reopen Task
            </Button>
          )}

          {/* Manager can also start or submit if they are doing hands-on work */}
          {isManager && (rawStatus === 'TODO' || rawStatus === 'REOPENED') && !isAssignee && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStartTask}
              disabled={isUpdating}
              className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-indigo-600 fill-current" />
              Start Task
            </Button>
          )}
        </>
      )}

      {/* REQUEST REVISION MODAL */}
      <Modal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        title="Request Revisions from Assignee"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Provide clear instructions for the assignee explaining what changes or refinements are needed before approval.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Revision Feedback & Instructions <span className="text-rose-500">*</span>
            </label>
            <Textarea
              rows={4}
              placeholder="e.g. Please increase the logo size by 15%, fix the contrast on the headline text, and export as PNG."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="text-xs"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRevisionModal(false)}
              disabled={isSubmittingRevision}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmRevision}
              disabled={!revisionNotes.trim() || isSubmittingRevision}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-1.5"
            >
              {isSubmittingRevision ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Send Revision Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
