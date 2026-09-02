import React, { useRef, useState } from 'react';
import { UploadCloud, Plus, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { TaskAttachmentPreview } from './TaskAttachmentPreview';
import { TaskMediaViewer } from './TaskMediaViewer';

export const TaskDeliverables = ({
  deliverables = [],
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
      files.forEach((file) => onUpload(file, 'SUBMISSION'));
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
          <Sparkles className="w-4 h-4 text-amber-600" />
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Work Deliverables ({deliverables.length})
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
              variant="primary"
              size="xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-1.5 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
            >
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              Upload Deliverable
            </Button>
          </div>
        )}
      </div>

      {/* Deliverables Grid */}
      {deliverables.length === 0 ? (
        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">No deliverables submitted yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upload completed artwork, videos, or documents to submit for review.
            </p>
          </div>
          {canUpload && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
            >
              <Plus className="w-3 h-3 mr-1" />
              Select Deliverables to Upload
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {deliverables.map((deliv) => (
            <TaskAttachmentPreview
              key={deliv.id || deliv.fileUrl || deliv.url}
              attachment={{ ...deliv, attachmentType: 'SUBMISSION' }}
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
