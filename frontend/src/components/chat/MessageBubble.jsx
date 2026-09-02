import React, { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Play,
  Pause,
  Reply,
  Smile,
  Edit2,
  Trash2,
  CheckCheck,
  Layers,
  CheckSquare,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { resolveMediaUrl } from '../../utils/mediaUtils';
import { formatTime, formatFileSize } from '../../utils/formatters';

const EMOJI_REACTIONS = ['👍', '❤️', '🔥', '🎉', '😂', '🚀', '👀'];

export const MessageBubble = ({
  message,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onOpenMedia,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const audioRef = useRef(null);

  const isOwn = Number(message.sender_id || message.senderId) === Number(currentUserId);
  const isSystem = (message.message_type || message.messageType) === 'SYSTEM';

  // System Message Display
  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-2.5 select-none">
        <div className="px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-500 shadow-2xs">
          {message.message}
        </div>
      </div>
    );
  }

  const attachments = message.attachments || [];
  const reactions = message.reactions || [];
  const hasAttachments = attachments.length > 0;
  const hasText = Boolean(message.message && message.message.trim());

  const handleAudioPlayPause = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setAudioProgress(isNaN(progress) ? 0 : progress);
  };

  // Group reactions by emoji
  const reactionGroups = reactions.reduce((acc, curr) => {
    if (!acc[curr.reaction]) {
      acc[curr.reaction] = { emoji: curr.reaction, count: 0, users: [], hasReacted: false };
    }
    acc[curr.reaction].count += 1;
    acc[curr.reaction].users.push(curr.full_name || curr.userName);
    if (Number(curr.user_id || curr.userId) === Number(currentUserId)) {
      acc[curr.reaction].hasReacted = true;
    }
    return acc;
  }, {});

  const reactionList = Object.values(reactionGroups);

  return (
    <div
      className={`group relative flex gap-2.5 my-1 px-2 select-text ${
        isOwn ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Sender Avatar for received messages */}
      {!isOwn && (
        <Avatar
          src={message.sender_avatar || message.senderAvatar}
          name={message.sender_name || message.senderName}
          size="sm"
          className="mt-0.5 shrink-0"
        />
      )}

      {/* Message Bubble Column */}
      <div
        className={`flex flex-col min-w-0 ${
          hasAttachments ? 'max-w-[340px] sm:max-w-[360px]' : 'max-w-[85%] sm:max-w-[70%]'
        } ${isOwn ? 'items-end' : 'items-start'}`}
      >
        {/* Sender Name & Role Header (Incoming messages only) */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-xs font-bold text-slate-900">
              {message.sender_name || message.senderName}
            </span>
            {(message.sender_role || message.senderRole) && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                {message.sender_role || message.senderRole}
              </span>
            )}
          </div>
        )}

        {/* Bubble Box */}
        <div
          className={`relative rounded-2xl shadow-xs transition-shadow w-fit ${
            hasAttachments && !hasText ? 'p-1.5' : 'px-3.5 py-2'
          } ${
            isOwn
              ? 'bg-indigo-600 text-white rounded-tr-xs'
              : 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs'
          }`}
        >
          {/* Replied Message Banner */}
          {(message.reply_to || message.replyTo) && (
            <div
              className={`mb-2 p-2 rounded-xl border-l-3 text-xs flex flex-col gap-0.5 ${
                isOwn
                  ? 'bg-white/15 border-white/80 text-white/90'
                  : 'bg-slate-50 border-indigo-600 text-slate-700'
              }`}
            >
              <span className="font-bold text-[11px] opacity-90">
                {(message.reply_to || message.replyTo)?.sender_name || (message.reply_to || message.replyTo)?.senderName || 'Member'}
              </span>
              <p className="truncate text-[11px] opacity-80">
                {(message.reply_to || message.replyTo)?.message || 'Attachment'}
              </p>
            </div>
          )}

          {/* Shared Content Workspace Reference */}
          {(message.content_id || message.contentId) && (
            <div
              className={`mb-2 p-2 rounded-xl border flex items-center gap-2.5 max-w-[320px] ${
                isOwn
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isOwn ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                  Content Post
                </span>
                <h5 className="text-xs font-bold truncate">
                  {message.content_title || message.contentTitle || 'Untitled Post'}
                </h5>
                {(message.content_platform || message.contentPlatform) && (
                  <p className="text-[10px] opacity-75 truncate">
                    Platform: {message.content_platform || message.contentPlatform}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Shared Task Reference */}
          {(message.task_id || message.taskId) && (
            <div
              className={`mb-2 p-2 rounded-xl border flex items-center gap-2.5 max-w-[320px] ${
                isOwn
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isOwn ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                  Workspace Task
                </span>
                <h5 className="text-xs font-bold truncate">
                  {message.task_title || message.taskTitle || 'Untitled Task'}
                </h5>
                {(message.task_status || message.taskStatus) && (
                  <p className="text-[10px] opacity-75 truncate">
                    Status: {message.task_status || message.taskStatus}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          {hasAttachments && (
            <div className={`space-y-1.5 ${hasText ? 'mb-1.5' : ''}`}>
              {/* Separate Images & Non-images */}
              {(() => {
                const images = attachments.filter(
                  (a) =>
                    a.mime_type?.startsWith('image/') ||
                    /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|jfif)$/i.test(a.file_name || a.fileName)
                );
                const others = attachments.filter((a) => !images.includes(a));

                return (
                  <>
                    {/* Single Image: Compact preview, natural aspect ratio, max 320x320 */}
                    {images.length === 1 && (
                      <div
                        onClick={() => onOpenMedia && onOpenMedia(images[0], images)}
                        className="relative group/img overflow-hidden rounded-xl bg-slate-900/5 cursor-pointer max-w-[320px] max-h-[320px] w-fit shadow-2xs"
                      >
                        <img
                          src={resolveMediaUrl(images[0].url || images[0].storage_path)}
                          alt={images[0].file_name || 'image attachment'}
                          className="max-w-[320px] max-h-[320px] w-auto h-auto object-cover rounded-xl block transition-transform duration-200 group-hover/img:scale-[1.02]"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Multiple Images (2 or more): Compact 2-column grid */}
                    {images.length > 1 && (
                      <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden max-w-[320px]">
                        {images.slice(0, 4).map((imgAtt, idx) => {
                          const resolvedImgUrl = resolveMediaUrl(imgAtt.url || imgAtt.storage_path);
                          const isExtra = images.length > 4 && idx === 3;
                          return (
                            <div
                              key={imgAtt.id || idx}
                              onClick={() => onOpenMedia && onOpenMedia(imgAtt, images)}
                              className="relative group/img overflow-hidden bg-slate-900/10 cursor-pointer rounded-lg aspect-square max-h-[140px]"
                            >
                              <img
                                src={resolvedImgUrl}
                                alt={imgAtt.file_name}
                                className="w-full h-full object-cover transition-transform duration-200 group-hover/img:scale-105"
                                loading="lazy"
                              />
                              {isExtra && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xs">
                                  +{images.length - 3}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Non-image attachments (Videos, Audio, Docs) */}
                    {others.map((att, idx) => {
                      const isVideo =
                        att.mime_type?.startsWith('video/') ||
                        /\.(mp4|webm|mov|mkv|avi)$/i.test(att.file_name || att.fileName);
                      const isAudio =
                        att.mime_type?.startsWith('audio/') ||
                        att.duration ||
                        /\.(mp3|wav|ogg|m4a|webm)$/i.test(att.file_name || att.fileName);
                      const resolvedUrl = resolveMediaUrl(att.url || att.storage_path);

                      // Compact Video Card
                      if (isVideo) {
                        return (
                          <div
                            key={att.id || idx}
                            onClick={() => onOpenMedia && onOpenMedia(att, attachments)}
                            className="relative rounded-xl overflow-hidden bg-slate-950 max-w-[320px] max-h-[220px] w-full cursor-pointer shadow-xs group/vid"
                          >
                            <video
                              src={resolvedUrl}
                              className="w-full max-h-[220px] object-cover block"
                              preload="metadata"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/vid:bg-black/10 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md">
                                <Play className="w-4 h-4 ml-0.5 fill-current" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Compact Voice Note Player
                      if (isAudio) {
                        return (
                          <div
                            key={att.id || idx}
                            className={`p-2 rounded-xl border flex items-center gap-2.5 max-w-[280px] sm:max-w-[300px] w-full ${
                              isOwn
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={handleAudioPlayPause}
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                                isOwn
                                  ? 'bg-white text-indigo-600 hover:bg-slate-100'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {isPlayingAudio ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mb-1">
                                <span>Voice message</span>
                                <span>
                                  {att.duration
                                    ? `${Math.floor(att.duration / 60)}:${String(Math.floor(att.duration % 60)).padStart(2, '0')}`
                                    : '0:00'}
                                </span>
                              </div>
                              {/* Audio Progress Bar */}
                              <div className="w-full bg-black/20 rounded-full h-1 overflow-hidden">
                                <div
                                  style={{ width: `${audioProgress}%` }}
                                  className={`h-full rounded-full transition-all duration-100 ${
                                    isOwn ? 'bg-white' : 'bg-indigo-600'
                                  }`}
                                />
                              </div>
                            </div>

                            <audio
                              ref={audioRef}
                              src={resolvedUrl}
                              onTimeUpdate={handleAudioTimeUpdate}
                              onEnded={() => {
                                setIsPlayingAudio(false);
                                setAudioProgress(0);
                              }}
                              className="hidden"
                            />
                          </div>
                        );
                      }

                      // Compact Document file card
                      return (
                        <div
                          key={att.id || idx}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 max-w-[300px] sm:max-w-[320px] w-full ${
                            isOwn
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                isOwn ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 truncate">
                              <p className="text-xs font-bold truncate">
                                {att.file_name || att.fileName || 'Document'}
                              </p>
                              <p className="text-[10px] opacity-75">
                                {formatFileSize(att.file_size || att.fileSize || 0)}
                              </p>
                            </div>
                          </div>

                          <a
                            href={resolvedUrl}
                            download={att.file_name || att.fileName}
                            target="_blank"
                            rel="noreferrer"
                            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                              isOwn
                                ? 'hover:bg-white/20 text-white'
                                : 'hover:bg-slate-200 text-slate-600'
                            }`}
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          )}

          {/* Message Text */}
          {hasText && (
            <p className={`text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words font-normal ${hasAttachments ? 'px-1' : ''}`}>
              {message.message}
            </p>
          )}

          {/* Timestamp & Status Metadata */}
          <div
            className={`flex items-center gap-1 mt-1 justify-end text-[10px] select-none ${
              hasAttachments && !hasText ? 'px-1 pb-0.5' : ''
            } ${
              isOwn ? 'text-white/80' : 'text-slate-500'
            }`}
          >
            {Boolean(message.is_edited || message.isEdited) && (
              <span className="italic opacity-80">(edited)</span>
            )}
            <span>{formatTime(message.created_at || message.createdAt)}</span>
            {isOwn && <CheckCheck className="w-3.5 h-3.5 text-white/90" />}
          </div>
        </div>

        {/* Emoji Reactions Pill Row */}
        {reactionList.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {reactionList.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onToggleReaction && onToggleReaction(message.id, r.emoji)}
                title={r.users.join(', ')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all ${
                  r.hasReacted
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs scale-105'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px]">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Bar on Hover */}
      <div
        className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl px-1 py-0.5 shadow-md z-10 ${
          isOwn ? 'right-0 -translate-y-4' : 'left-8 -translate-y-4'
        }`}
      >
        {/* Reply */}
        <button
          type="button"
          onClick={() => onReply && onReply(message)}
          title="Reply"
          className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        {/* Reaction Popover Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="React"
            className="p-1 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 animate-in zoom-in-95">
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    if (onToggleReaction) onToggleReaction(message.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1 text-sm hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Edit (if own text message) */}
        {isOwn && message.message && (
          <button
            type="button"
            onClick={() => onEdit && onEdit(message)}
            title="Edit message"
            className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete (if own or admin) */}
        {(isOwn || onDelete) && (
          <button
            type="button"
            onClick={() => onDelete && onDelete(message.id)}
            title="Delete message"
            className="p-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
