import React, { useEffect } from 'react';
import { X, Download, ExternalLink, FileText, Play } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUtils';

export const TaskMediaViewer = ({ isOpen, onClose, media }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !media) return null;

  const fileName = media.fileName || media.name || media.originalName || 'File';
  const rawUrl = media.url || media.fileUrl || '';
  const resolvedUrl = resolveMediaUrl(rawUrl);

  const rawType = String(media.type || '').toLowerCase();
  const mimeType = String(media.mimeType || '').toLowerCase();
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  const isImage =
    rawType === 'image' ||
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext);

  const isVideo =
    rawType === 'video' ||
    mimeType.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(ext);

  const isPdf =
    rawType === 'pdf' ||
    mimeType.includes('pdf') ||
    ext === 'pdf';

  const fileSize = media.fileSize || media.size || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="min-w-0 pr-4">
            <h3 className="text-sm font-bold text-slate-100 truncate">{fileName}</h3>
            {fileSize && <p className="text-[10px] text-slate-400 font-medium">{fileSize}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {resolvedUrl && (
              <a
                href={resolvedUrl}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                title="Download File"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {resolvedUrl && (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                title="Open in New Tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-slate-950/50 min-h-[300px]">
          {isImage ? (
            <img
              src={resolvedUrl}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : isVideo ? (
            <div className="w-full max-w-3xl flex flex-col items-center">
              <video
                src={resolvedUrl}
                controls
                preload="metadata"
                className="w-full max-h-[65vh] rounded-lg bg-black"
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>
          ) : isPdf ? (
            <div className="w-full h-[65vh] flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <FileText className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-200">{fileName}</p>
                <p className="text-xs text-slate-400 mt-1">{fileSize || 'PDF Document'}</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open PDF Viewer
                </a>
                <a
                  href={resolvedUrl}
                  download={fileName}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{fileName}</p>
                <p className="text-xs text-slate-400 mt-1">Preview not available for this document type.</p>
              </div>
              {resolvedUrl && (
                <a
                  href={resolvedUrl}
                  download={fileName}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  Download File ({fileSize || 'Direct'})
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
