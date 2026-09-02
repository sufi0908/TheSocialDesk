import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Textarea } from '../forms/Textarea';
import { Input } from '../forms/Input';
import { Select } from '../forms/Select';
import { MediaPreview } from '../common/MediaPreview';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { approvalService } from '../../services/approvalService';
import { revisionService } from '../../services/revisionService';
import { PLATFORMS } from '../../services/contentService';
import { formatDate } from '../../utils/formatters';
import { ROLES, STATUS_TYPES } from '../../utils/constants';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Clock,
  User,
  Film,
  Play,
  RotateCcw,
  Sparkles,
  FileText,
  AlertCircle,
  Share2,
} from 'lucide-react';

export const ContentReviewModal = ({
  isOpen,
  onClose,
  post,
  onActionSuccess,
}) => {
  const toast = useToast();
  const { role: userRole, user } = useAuth();
  const isClient = userRole === ROLES.CLIENT || userRole === 'client_user';
  const isManager = userRole === ROLES.WORKSPACE_MANAGER || userRole === ROLES.SUPERADMIN;
  const isGraphicHead = userRole === ROLES.GRAPHIC_TEAM_HEAD;
  const isInternalApprover = isManager || isGraphicHead;
  const isClientApprover = isClient || isManager;
  const isPostInternalReview = post?.statusKey === STATUS_TYPES.INTERNAL_REVIEW || post?.statusKey === 'internal_review';
  const isPostClientReview = post?.statusKey === STATUS_TYPES.CLIENT_REVIEW || post?.statusKey === 'client_review';

  const canTakeApprovalAction = (isPostInternalReview && isInternalApprover) || (isPostClientReview && isClientApprover);

  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  const [showExternalApprovalForm, setShowExternalApprovalForm] = useState(false);
  const [externalSource, setExternalSource] = useState('WhatsApp');
  const [externalNotes, setExternalNotes] = useState('');
  const [externalApprovedBy, setExternalApprovedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revisions, setRevisions] = useState([]);

  useEffect(() => {
    if (isOpen && post?.id) {
      setShowRevisionForm(false);
      setShowExternalApprovalForm(false);
      setRevisionComment('');
      setExternalSource('WhatsApp');
      setExternalNotes(`Client approved via WhatsApp on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`);
      setExternalApprovedBy(post.client || 'Client Representative');
      loadRevisionHistory(post.id);
    }
  }, [isOpen, post]);

  const loadRevisionHistory = async (contentId) => {
    try {
      const history = await revisionService.getRevisionHistory(contentId);
      setRevisions(Array.isArray(history) ? history : []);
    } catch (e) {
      setRevisions([]);
    }
  };

  if (!post) return null;

  const mediaObject = post.media || post.mediaAssets?.[0] || post.media_assets?.[0] || post.mediaUrl || post.media_url || null;

  // Direct Approval Handler
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      if (isClient || post.statusKey === STATUS_TYPES.CLIENT_REVIEW) {
        await approvalService.clientApprove(post.id, { notes: 'Approved by client directly in portal.' });
        toast.success('Content Approved! 🎉', 'Item is now APPROVED and available for calendar scheduling.');
      } else {
        await approvalService.internalApprove(post.id, { notes: 'Passed internal review.' });
        toast.success('Passed Internal Review ✅', 'Content moved to client review stage.');
      }

      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      toast.error('Approval Failed', err.response?.data?.message || err.message || 'Could not approve content.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // External Approval Recording (WhatsApp, Email, Phone, etc.)
  const handleRecordExternalApproval = async () => {
    setIsSubmitting(true);
    try {
      await approvalService.externalClientApprove(post.id, {
        approvalSource: externalSource,
        source: externalSource,
        notes: externalNotes.trim() || `Client approved via ${externalSource}.`,
        approvedBy: externalApprovedBy.trim() || post.client || 'Client',
      });

      toast.success(
        `Client Approval Recorded (${externalSource}) 🎉`,
        'Content is now APPROVED and available in Calendar.'
      );

      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      toast.error('Record Approval Failed', err.response?.data?.message || err.message || 'Could not record external approval.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revision Handler with MANDATORY COMMENT VALIDATION
  const handleRequestRevision = async () => {
    if (!revisionComment.trim()) {
      toast.error('Comment Required', 'Please explain what needs to be changed before requesting a revision.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isClient || post.statusKey === STATUS_TYPES.CLIENT_REVIEW) {
        await approvalService.clientRevision(post.id, { notes: revisionComment.trim(), comment: revisionComment.trim() });
      } else {
        await approvalService.internalRevision(post.id, { notes: revisionComment.trim(), comment: revisionComment.trim() });
      }

      toast.warning('Revision Requested ⚠️', 'Notified content creator and logged feedback comment.');
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      toast.error('Revision Request Failed', err.response?.data?.message || err.message || 'Could not request revision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Content Review — ${post.title}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        {/* HEADER BRAND & STATUS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              {post.client || 'Client Account'}
            </span>
            <Badge statusKey={post.statusKey} />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Assigned Creator:</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Avatar src={post.assigneeAvatar} name={post.assigneeName || 'Creator'} size="xs" />
              <span>{post.assigneeName || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {/* 2-COLUMN REVIEW CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: CREATIVE DISPLAY (7 COLS) */}
          <div className="lg:col-span-7 space-y-3">
            <MediaPreview
              media={mediaObject}
              alt={post.title}
              aspectRatio="aspect-video"
            />

            {/* TARGET PLATFORMS */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Platforms:</span>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(post.platforms) && post.platforms.map((pId) => {
                  const p = PLATFORMS[pId.toUpperCase()] || { name: pId };
                  return (
                    <span key={pId} className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: COPY & METADATA (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Post Caption & Copy
              </h4>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                {post.caption || 'No caption copy provided.'}
              </div>
            </div>

            {/* REVISION HISTORY TIMELINE */}
            {revisions.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Previous Revision Notes
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {revisions.map((rev) => (
                    <div key={rev.id} className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                      <p className="font-semibold italic">"{rev.reason || rev.notes}"</p>
                      <p className="text-[10px] text-amber-700 font-mono">
                        By {rev.requested_by_name || 'Reviewer'} • {formatDate(rev.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* INLINE REVISION COMMENT FORM */}
        {showRevisionForm && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Explain What Needs to be Changed (Required)
              </label>
              <span className="text-[10px] font-bold text-amber-700">Mandatory Feedback Comment</span>
            </div>

            <Textarea
              placeholder="e.g. Please update the background graphic color to brand hex #4F46E5 and modify line 2 of the caption..."
              rows={3}
              value={revisionComment}
              onChange={(e) => setRevisionComment(e.target.value)}
              className="bg-white border-amber-200 text-xs focus:border-amber-500 focus:ring-amber-500/20"
            />

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRevisionForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold"
                onClick={handleRequestRevision}
                isLoading={isSubmitting}
              >
                Submit Revision Request
              </Button>
            </div>
          </div>
        )}

        {/* INLINE EXTERNAL APPROVAL (WHATSAPP / EMAIL) FORM */}
        {showExternalApprovalForm && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Record External Client Approval
              </label>
              <span className="text-[10px] font-bold text-emerald-700">Client Sign-Off Record</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">Approval Source</label>
                <select
                  value={externalSource}
                  onChange={(e) => setExternalSource(e.target.value)}
                  className="w-full text-xs rounded-xl border-emerald-300 bg-white p-2 font-semibold text-slate-800 focus:ring-emerald-500"
                >
                  <option value="WhatsApp">WhatsApp Message / Chat</option>
                  <option value="Email">Email Confirmation</option>
                  <option value="Phone">Phone Call / Verbal</option>
                  <option value="Other">Other External Channel</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">Confirmed By (Contact Name)</label>
                <input
                  type="text"
                  value={externalApprovedBy}
                  onChange={(e) => setExternalApprovedBy(e.target.value)}
                  placeholder="e.g. John Doe (Client Manager)"
                  className="w-full text-xs rounded-xl border-emerald-300 bg-white p-2 font-semibold text-slate-800 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">Approval Note / Reference</label>
              <Textarea
                placeholder="e.g. Client approved all creatives via WhatsApp group at 4:30 PM..."
                rows={2}
                value={externalNotes}
                onChange={(e) => setExternalNotes(e.target.value)}
                className="bg-white border-emerald-200 text-xs focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExternalApprovalForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm"
                onClick={handleRecordExternalApproval}
                isLoading={isSubmitting}
              >
                Confirm External Approval
              </Button>
            </div>
          </div>
        )}

        {/* REVIEWER ACTION FOOTER */}
        {!showRevisionForm && !showExternalApprovalForm && (
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={onClose}
            >
              Close
            </Button>

            {canTakeApprovalAction ? (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Revision Button */}
                <Button
                  variant="outline"
                  size="md"
                  className="border-amber-300 text-amber-800 hover:bg-amber-50 font-extrabold"
                  onClick={() => setShowRevisionForm(true)}
                  disabled={isSubmitting}
                  leftIcon={RotateCcw}
                >
                  Request Revision
                </Button>

                {/* External Client Approval Button for Managers in CLIENT_REVIEW */}
                {isManager && isPostClientReview && (
                  <Button
                    variant="outline"
                    size="md"
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-extrabold"
                    onClick={() => setShowExternalApprovalForm(true)}
                    disabled={isSubmitting}
                    leftIcon={Share2}
                  >
                    Mark Client Approved (WhatsApp / External)
                  </Button>
                )}

                {/* Primary Approval Button */}
                <Button
                  variant="primary"
                  size="md"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm"
                  onClick={handleApprove}
                  isLoading={isSubmitting}
                  leftIcon={CheckCircle2}
                >
                  {isPostClientReview
                    ? 'Approve Content'
                    : 'Approve & Send to Client'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  {isPostInternalReview
                    ? 'Internal Review in progress by Graphic Head / Manager'
                    : isPostClientReview
                    ? 'Awaiting Client Review & Sign-Off'
                    : 'View Only Mode'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
