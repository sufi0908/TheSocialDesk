import React, { useRef, useState } from 'react';
import { Paperclip, Plus, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { TaskAttachmentPreview } from './TaskAttachmentPreview';
import { TaskMediaViewer } from './TaskMediaViewer';

export const TaskAttachments = ({
  attachments = [],
  onUpload,
  onDelete,
  canUpload = true,
  canDelete = true,
  isUploading = false,
}) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (onUpload) {
      files.forEach((file) => onUpload(file, 'REFERENCE'));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Reference Files ({attachments.length})
          </h4>
        </div>

        {canUpload && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-1 text-[11px] font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add Reference Files
            </Button>
          </div>
        )}
      </div>

      {/* Attachments Grid */}
      {attachments.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
          <p className="text-xs text-slate-400 font-medium">No reference files attached.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {attachments.map((att) => (
            <TaskAttachmentPreview
              key={att.id || att.fileUrl || att.url}
              attachment={att}
              onOpen={(media) => setSelectedMedia(media)}
              onDelete={onDelete}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Media Viewer */}
      <TaskMediaViewer
        isOpen={Boolean(selectedMedia)}
        onClose={() => setSelectedMedia(null)}
        media={selectedMedia}
      />
    </div>
  );
};
