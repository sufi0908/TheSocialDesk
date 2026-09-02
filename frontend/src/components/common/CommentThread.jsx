import React, { useState, useEffect } from 'react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../forms/Input';
import { commentService } from '../../services/commentService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ROLE_LABELS, ROLES } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import {
  MessageSquare,
  Reply,
  Edit2,
  Trash2,
  Send,
  AtSign,
  Check,
  X,
} from 'lucide-react';

export const CommentThread = ({ entityType, entityId, entityTitle, clientName }) => {
  const { user, role: userRole } = useAuth();
  const toast = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Composer State
  const [newCommentText, setNewCommentText] = useState('');
  const [commentType, setCommentType] = useState('CLIENT'); // 'CLIENT' | 'INTERNAL'
  const [replyParentId, setReplyParentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isClientRole = userRole === 'client' || userRole === 'client_user';

  const teamMembersToMention = [
    'Carlos Ruiz',
    'Elena Vance',
    'Marcus Chen',
    'David Sterling',
    'Sarah Lin',
    'Elena Rostova',
  ];

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await commentService.getComments(entityType, entityId);
      setComments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityType && entityId) {
      loadComments();
    }
  }, [entityType, entityId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    try {
      await commentService.addComment({
        entityType,
        entityId,
        entityTitle,
        client: clientName,
        message: newCommentText,
        commentType: isClientRole ? 'CLIENT' : commentType,
        isInternal: !isClientRole && commentType === 'INTERNAL',
        authorId: user?.id || 'usr_current',
        authorName: user?.name || 'Marcus Chen',
        authorRole: userRole || ROLES.WORKSPACE_MANAGER,
        authorAvatar: user?.avatar || '',
      });

      toast.success('Comment Posted', 'Added discussion note.');
      setNewCommentText('');
      loadComments();
    } catch (err) {
      toast.error('Error', 'Failed to add comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId) => {
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      await commentService.addComment({
        entityType,
        entityId,
        entityTitle,
        client: clientName,
        message: replyText,
        parentId,
        authorId: user?.id || 'usr_current',
        authorName: user?.name || 'Marcus Chen',
        authorRole: userRole || ROLES.WORKSPACE_MANAGER,
        authorAvatar: user?.avatar || '',
      });


      toast.success('Reply Posted', 'Added threaded reply.');
      setReplyParentId(null);
      setReplyText('');
      loadComments();
    } catch (err) {
      toast.error('Error', 'Failed to add reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editText.trim()) return;

    setIsSubmitting(true);
    try {
      await commentService.editComment(commentId, editText);
      toast.success('Comment Updated', 'Saved changes.');
      setEditingCommentId(null);
      loadComments();
    } catch (err) {
      toast.error('Error', 'Failed to edit comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setIsSubmitting(true);
    try {
      await commentService.deleteComment(commentId);
      toast.success('Comment Deleted', 'Removed comment.');
      loadComments();
    } catch (err) {
      toast.error('Error', 'Failed to delete comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertMention = (name, isReply = false) => {
    const mentionTag = `@${name} `;
    if (isReply) {
      setReplyText((prev) => prev + mentionTag);
    } else {
      setNewCommentText((prev) => prev + mentionTag);
    }
  };

  // Helper to visually render @mentions as indigo highlighted pills
  const renderFormattedMessage = (text) => {
    const parts = text.split(/(@[A-Za-z\s]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="inline-flex items-center gap-0.5 font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 mx-0.5">
            <AtSign className="w-3 h-3 text-indigo-600 inline" />
            {part.replace('@', '')}
          </span>
        );
      }
      return part;
    });
  };

  // Separate root comments and replies
  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId) => comments.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span>Internal Discussion ({comments.length})</span>
        </h4>
      </div>

      {/* Add New Comment Box */}
      <form onSubmit={handleAddComment} className="space-y-2">
        <div className="relative">
          <textarea
            rows={2}
            placeholder={
              !isClientRole && commentType === 'INTERNAL'
                ? 'Add internal team note (hidden from client)... Use @Name to mention.'
                : 'Add comment visible to team and client... Use @Name to mention.'
            }
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Controls: Privacy Toggle + Mentions + Submit */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!isClientRole && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setCommentType('CLIENT')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold cursor-pointer transition-all ${
                  commentType === 'CLIENT'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Client Visible
              </button>
              <button
                type="button"
                onClick={() => setCommentType('INTERNAL')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold cursor-pointer transition-all ${
                  commentType === 'INTERNAL'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🔒 Internal Only
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-[10px] text-slate-400 font-medium">Mention:</span>
            {teamMembersToMention.slice(0, 3).map((name) => (
              <button
                type="button"
                key={name}
                onClick={() => insertMention(name)}
                className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer"
              >
                @{name}
              </button>
            ))}
          </div>

          <Button type="submit" variant="primary" size="sm" leftIcon={Send} isLoading={isSubmitting}>
            Post Comment
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="py-4 text-center text-xs text-slate-400">Loading comments...</div>
      ) : rootComments.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
          No comments yet. Start the discussion above!
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {rootComments.map((cmt) => {
            const replies = getReplies(cmt.id);
            const isEditing = editingCommentId === cmt.id;
            const isReplying = replyParentId === cmt.id;
            const isInternalComment = cmt.commentType === 'INTERNAL' || cmt.isInternal || cmt.is_internal;

            return (
              <div key={cmt.id} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                {/* Author Info & Privacy Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar src={cmt.authorAvatar} name={cmt.authorName} size="xs" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{cmt.authorName}</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600 border border-slate-200">
                          {ROLE_LABELS[cmt.authorRole] || cmt.authorRole}
                        </span>
                        {isInternalComment && (
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold border border-amber-300">
                            🔒 INTERNAL ONLY
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">{formatDate(cmt.createdAt)}</span>
                </div>

                {/* Comment Body / Edit View */}
                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={2}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                    />
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" onClick={() => setEditingCommentId(null)}>
                        Cancel
                      </Button>
                      <Button variant="primary" size="xs" onClick={() => handleEditComment(cmt.id)}>
                        Save Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                    {renderFormattedMessage(cmt.message)}
                  </p>
                )}

                {/* Comment Action Toolbar */}
                {!isEditing && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                    <button
                      onClick={() => {
                        setReplyParentId(replyParentId === cmt.id ? null : cmt.id);
                        setReplyText('');
                      }}
                      className="flex items-center gap-1 hover:text-indigo-600 font-bold cursor-pointer"
                    >
                      <Reply className="w-3 h-3" /> Reply
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCommentId(cmt.id);
                          setEditText(cmt.message);
                        }}
                        className="hover:text-slate-900 cursor-pointer"
                      >
                        Edit
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleDeleteComment(cmt.id)}
                        className="hover:text-rose-600 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Reply Composer */}
                {isReplying && (
                  <div className="pl-4 pt-2 border-l-2 border-indigo-200 space-y-2">
                    <textarea
                      rows={2}
                      placeholder={`Reply to ${cmt.authorName}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {teamMembersToMention.slice(0, 2).map((name) => (
                          <button
                            type="button"
                            key={name}
                            onClick={() => insertMention(name, true)}
                            className="text-[9px] bg-slate-100 hover:bg-indigo-50 font-bold px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            @{name}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="xs" onClick={() => setReplyParentId(null)}>
                          Cancel
                        </Button>
                        <Button variant="primary" size="xs" onClick={() => handleAddReply(cmt.id)}>
                          Post Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Threaded Replies */}
                {replies.length > 0 && (
                  <div className="pl-4 pt-2 border-l-2 border-slate-100 space-y-2">
                    {replies.map((reply) => (
                      <div key={reply.id} className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Avatar src={reply.authorAvatar} name={reply.authorName} size="xs" />
                            <span className="font-bold text-slate-900 text-[11px]">{reply.authorName}</span>
                          </div>
                          <span className="text-[9px] text-slate-400">{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-snug">
                          {renderFormattedMessage(reply.message)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
