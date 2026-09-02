import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from '../ui/Drawer';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { MediaPreview } from '../common/MediaPreview';
import { PLATFORMS } from '../../services/contentService';
import { formatDate } from '../../utils/formatters';
import { STATUS_TYPES } from '../../utils/constants';
import {
  FileText,
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  Edit2,
  Trash2,
  Send,
  Play,
  Video,
  Film,
  Building2,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

export const ContentDetailsDrawer = ({
  isOpen,
  onClose,
  post,
  onEdit,
  onReview,
  onDelete,
}) => {
  const navigate = useNavigate();
  if (!post) return null;

  const mediaObject = post.media || post.mediaAssets?.[0] || post.media_assets?.[0] || post.mediaUrl || post.media_url || null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={post.title || 'Content Details'}
      size="lg"
    >
      <div className="space-y-6">
        {/* HEADER STATUS & CLIENT BANNER */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-slate-50 border border-slate-200/90 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 shadow-2xs">
              {post.client || 'Client Account'}
            </span>
            <Badge statusKey={post.statusKey} />
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={Edit2}
                onClick={() => {
                  onClose();
                  onEdit(post);
                }}
              >
                Edit Content
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  onClose();
                  onDelete(post);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* WORKFLOW ACTION BAR */}
        <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-bold text-indigo-950">
            Current Stage: <span className="uppercase text-indigo-700 font-extrabold">{post.statusKey?.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-2">
            {(post.statusKey === STATUS_TYPES.INTERNAL_REVIEW || post.statusKey === STATUS_TYPES.CLIENT_REVIEW) && onReview && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={ShieldCheck}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm"
                onClick={() => {
                  onClose();
                  onReview(post);
                }}
              >
                Review & Approvals
              </Button>
            )}

            {post.statusKey === STATUS_TYPES.REVISION_REQUIRED && onEdit && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={RotateCcw}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-sm"
                onClick={() => {
                  onClose();
                  onEdit(post);
                }}
              >
                Resubmit Changes
              </Button>
            )}

            {post.statusKey === STATUS_TYPES.APPROVED && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={Calendar}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm"
                onClick={() => {
                  onClose();
                  navigate('/workspace/calendar');
                }}
              >
                Schedule on Calendar
              </Button>
            )}
          </div>
        </div>

        {/* CREATIVE MEDIA DISPLAY CONTAINER */}
        <div className="space-y-2">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Creative Asset
          </h4>
          <MediaPreview
            media={mediaObject}
            alt={post.title}
            aspectRatio="aspect-video"
          />
        </div>

        {/* POST CAPTION */}
        <div className="space-y-2">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Post Caption & Copy
          </h4>
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl font-normal text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
            {post.caption || 'No caption copy provided.'}
          </div>
        </div>

        {/* METADATA GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assigned Team Member</span>
            <div className="flex items-center gap-2 pt-0.5">
              <Avatar src={post.assigneeAvatar} name={post.assigneeName || 'Unassigned'} size="sm" />
              <div>
                <p className="text-xs font-extrabold text-slate-900">{post.assigneeName || 'Unassigned'}</p>
                <p className="text-[10px] text-slate-400">{post.assigneeRole || 'Team Member'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Target Platforms</span>
            <div className="flex flex-wrap gap-1 pt-1">
              {Array.isArray(post.platforms) && post.platforms.map((pId) => {
                const p = PLATFORMS[pId.toUpperCase()] || { name: pId };
                return (
                  <span key={pId} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                    {p.name}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Format & Campaign</span>
            <p className="text-xs font-bold text-slate-800">{post.contentType || 'Single Post'} • {post.project || 'General Project'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Schedule / Deadline</span>
            <p className="text-xs font-mono font-extrabold text-slate-800">
              {post.scheduledAt ? formatDate(post.scheduledAt) : post.deadline ? formatDate(post.deadline) : 'Not Scheduled'}
            </p>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
