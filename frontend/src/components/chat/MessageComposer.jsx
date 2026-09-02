import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Smile,
  Mic,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  Reply,
  CheckSquare,
  Layers,
  FileCheck,
  Plus,
} from 'lucide-react';
import { chatService } from '../../services/chatService';
import { VoiceRecorder } from './VoiceRecorder';
import { AssetPickerModal } from './AssetPickerModal';
import { ContentPickerModal } from './ContentPickerModal';
import { TaskPickerModal } from './TaskPickerModal';
import { useToast } from '../../context/ToastContext';
import { formatFileSize } from '../../utils/formatters';

const POPULAR_EMOJIS = ['😀', '😂', '🔥', '❤️', '👍', '🎉', '🚀', '👀', '✨', '🙌', '💯', '🤔', '😎', '💡'];

export const MessageComposer = ({
  onSendMessage,
  onEditMessage,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onStartTyping,
  onStopTyping,
}) => {
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Reference Modals State
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [isContentPickerOpen, setIsContentPickerOpen] = useState(false);
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.message || '');
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  // Handle textarea text change & typing indicator
  const handleTextChange = (e) => {
    setText(e.target.value);

    // Typing debounce
    if (onStartTyping) onStartTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (onStopTyping) onStopTyping();
    }, 2000);
  };

  // Handle multiple file upload via file picker or drag-drop
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map((file) => chatService.uploadFile(file));
      const uploadedResults = await Promise.all(uploadPromises);

      setAttachments((prev) => [...prev, ...uploadedResults]);
      showToast(`${uploadedResults.length} file(s) attached.`, 'success');
    } catch (err) {
      console.error('File upload error:', err);
      showToast('Failed to upload one or more files.', 'error');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleFileInputChange = (e) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendVoiceNote = async ({ file, duration }) => {
    setIsSending(true);
    try {
      const uploaded = await chatService.uploadFile(file, duration);
      await onSendMessage({
        message_type: 'VOICE_NOTE',
        message: '',
        attachments: [uploaded],
        reply_to_message_id: replyingTo ? replyingTo.id : null,
      });
      setIsRecordingVoice(false);
      if (onCancelReply) onCancelReply();
    } catch (err) {
      console.error('Voice note send error:', err);
      showToast('Failed to send voice note.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (uploadingFiles || isSending) return;

    const trimmedText = text.trim();
    if (!trimmedText && attachments.length === 0) return;

    setIsSending(true);
    if (onStopTyping) onStopTyping();

    try {
      if (editingMessage) {
        await onEditMessage(editingMessage.id, trimmedText);
        onCancelEdit();
      } else {
        await onSendMessage({
          message_type: 'TEXT',
          message: trimmedText,
          attachments,
          reply_to_message_id: replyingTo ? replyingTo.id : null,
        });
      }

      setText('');
      setAttachments([]);
      setShowEmojiPicker(false);
      setShowShareMenu(false);
      if (onCancelReply) onCancelReply();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      showToast('Failed to send message.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emoji) => {
    setText((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer?.files?.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Share Content Handler
  const handleSelectContent = async (contentItem) => {
    try {
      await onSendMessage({
        message_type: 'CONTENT',
        message: `Shared Content Post: ${contentItem.title || contentItem.topic}`,
        content_id: contentItem.id,
      });
      showToast('Content post shared in chat.', 'success');
    } catch (err) {
      showToast('Failed to share content.', 'error');
    }
  };

  // Share Task Handler
  const handleSelectTask = async (taskItem) => {
    try {
      await onSendMessage({
        message_type: 'TASK',
        message: `Shared Task: ${taskItem.title}`,
        task_id: taskItem.id,
      });
      showToast('Task shared in chat.', 'success');
    } catch (err) {
      showToast('Failed to share task.', 'error');
    }
  };

  // Share Asset Handler
  const handleSelectAsset = async (assetItem) => {
    try {
      await onSendMessage({
        message_type: 'ASSET',
        message: `Shared Asset: ${assetItem.name || assetItem.displayName || assetItem.file_name}`,
        asset_id: assetItem.id,
      });
      showToast('Asset shared in chat.', 'success');
    } catch (err) {
      showToast('Failed to share asset.', 'error');
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-t border-slate-200/90 bg-white p-3 sm:p-4 transition-colors select-none ${
        isDragOver ? 'bg-indigo-50/70 border-indigo-300' : ''
      }`}
    >
      {/* Drag overlay badge */}
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-2xs border-2 border-dashed border-indigo-500 rounded-xl flex items-center justify-center text-indigo-700 font-bold text-xs pointer-events-none z-30">
          Drop files here to attach
        </div>
      )}

      {/* Replying Banner */}
      {replyingTo && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between animate-in slide-in-from-bottom-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-bold text-indigo-900">
              Replying to {replyingTo.sender_name || replyingTo.senderName || 'Member'}:
            </span>
            <p className="truncate text-slate-600 text-[11px]">
              {replyingTo.message || 'Attachment'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between animate-in slide-in-from-bottom-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-amber-900">Editing Message:</span>
            <p className="truncate text-slate-600 text-[11px]">{editingMessage.message}</p>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachments Preview Row */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
          {attachments.map((att, idx) => {
            const isImg =
              att.mime_type?.startsWith('image/') ||
              att.mimeType?.startsWith('image/') ||
              /\.(jpg|jpeg|png|webp|gif)$/i.test(att.file_name || att.fileName);

            return (
              <div
                key={idx}
                className="relative group/chip flex items-center gap-2 p-1.5 pr-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs"
              >
                {isImg ? (
                  <img
                    src={att.url}
                    alt={att.file_name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <div className="max-w-[120px] truncate">
                  <p className="font-semibold text-slate-900 truncate">
                    {att.file_name || att.fileName}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatFileSize(att.file_size || att.fileSize || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Voice Recorder Mode vs Standard Input */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSend={handleSendVoiceNote}
          onCancel={() => setIsRecordingVoice(false)}
          isSending={isSending}
        />
      ) : (
        <div className="flex items-end gap-2">
          {/* File Attachment Hidden Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            className="hidden"
          />

          {/* Quick Share Menu Toggle */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowShareMenu(!showShareMenu)}
              title="Share workspace items or attach"
              className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>

            {showShareMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-1.5 divide-y divide-slate-100 animate-in zoom-in-95 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowShareMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                >
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  <span>Upload Files</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsContentPickerOpen(true);
                    setShowShareMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Share Content Post</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsTaskPickerOpen(true);
                    setShowShareMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>Share Task</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAssetPickerOpen(true);
                    setShowShareMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                >
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <span>Share Asset Library</span>
                </button>
              </div>
            )}
          </div>

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles}
            title="Attach files"
            className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-50"
          >
            {uploadingFiles ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          {/* Emoji Picker Button & Popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
              className="p-2.5 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-slate-100 transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 grid grid-cols-7 gap-1 animate-in zoom-in-95">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="p-2 text-base hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Textarea Input */}
          <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200/90 rounded-2xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white transition-all px-3.5 py-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Press Enter to send)"
              className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-32 leading-relaxed"
              style={{ minHeight: '24px' }}
            />
          </div>

          {/* Voice Note Button or Send Button */}
          {text.trim() === '' && attachments.length === 0 && !editingMessage ? (
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              title="Record voice note"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors shrink-0"
            >
              <Mic className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || uploadingFiles}
              title="Send message"
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 shadow-sm disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={isAssetPickerOpen}
        onClose={() => setIsAssetPickerOpen(false)}
        onSelectAsset={handleSelectAsset}
      />

      {/* Content Picker Modal */}
      <ContentPickerModal
        isOpen={isContentPickerOpen}
        onClose={() => setIsContentPickerOpen(false)}
        onSelectContent={handleSelectContent}
      />

      {/* Task Picker Modal */}
      <TaskPickerModal
        isOpen={isTaskPickerOpen}
        onClose={() => setIsTaskPickerOpen(false)}
        onSelectTask={handleSelectTask}
      />
    </div>
  );
};
