import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export const TaskComments = ({
  comments = [],
  onAddComment,
  onDeleteComment,
  isSubmitting = false,
}) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const commentsEndRef = useRef(null);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;
    if (onAddComment) {
      onAddComment(commentText.trim());
      setCommentText('');
    }
  };

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Discussion ({comments.length})
          </h4>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px] min-h-[140px] scrollbar-thin">
        {comments.length === 0 ? (
          <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-center">
            <MessageSquare className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-600">No comments yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Leave feedback, ask questions, or provide updates.
            </p>
          </div>
        ) : (
          comments.map((comm) => {
            const isCurrentUser = Number(comm.userId) === Number(user?.id);
            const isRevisionNote = String(comm.text || comm.message || '').startsWith('REVISION REQUESTED:');

            return (
              <div
                key={comm.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isRevisionNote
                    ? 'bg-orange-50/70 border-orange-200'
                    : isCurrentUser
                    ? 'bg-indigo-50/50 border-indigo-100'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                {/* Header: Author & Timestamp */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      src={comm.userAvatar}
                      name={comm.userName || 'Team Member'}
                      size="xs"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        {comm.userName || 'Team Member'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {comm.createdAt ? formatDate(comm.createdAt) : 'Just now'}
                    </span>

                    {onDeleteComment && (isCurrentUser || user?.role === 'workspace_manager' || user?.role === 'superadmin') && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(comm.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Body */}
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {comm.text || comm.message || comm.commentText}
                </p>
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment Input Box */}
      <form onSubmit={handleSubmit} className="pt-2 border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Write a comment or reply..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          />

          <button
            type="submit"
            disabled={!commentText.trim() || isSubmitting}
            className="absolute right-1.5 p-1.5 text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 transition-colors"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
};
