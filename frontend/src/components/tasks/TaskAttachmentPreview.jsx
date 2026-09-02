import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Play,
  ExternalLink,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUtils';
import { Avatar } from '../ui/Avatar';
import { formatDate } from '../../utils/formatters';

export const TaskAttachmentPreview = ({
  attachment,
  onOpen,
  onDelete,
  canDelete = false,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  if (!attachment) return null;

  const fileName = attachment.fileName || attachment.name || attachment.originalName || 'File';
  const rawUrl = attachment.url || attachment.fileUrl || '';
  const resolvedUrl = resolveMediaUrl(rawUrl);

  const rawType = String(attachment.type || '').toLowerCase();
  const mimeType = String(attachment.mimeType || '').toLowerCase();
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  const isImage =
    rawType === 'image' ||
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif'].includes(ext);

  const isVideo =
    rawType === 'video' ||
    mimeType.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'ogv'].includes(ext);

  const isPdf =
    rawType === 'pdf' ||
    mimeType.includes('pdf') ||
    ext === 'pdf';

  const isSpreadsheet = ['xlsx', 'xls', 'csv'].includes(ext);
  const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
  const isDesignFile = ['psd', 'ai', 'xd', 'fig', 'sketch', 'eps'].includes(ext);

  const sizeFormatted = attachment.fileSize || attachment.size || 'Attachment';
  const uploaderName = attachment.uploadedByName || attachment.uploadedBy?.name;
  const uploaderAvatar = attachment.uploadedByAvatar || attachment.uploadedBy?.avatar;
  const isSubmission = attachment.attachmentType === 'SUBMISSION';

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!resolvedUrl) return;
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = (e) => {
    e.stopPropagation();
    if (resolvedUrl) {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`group relative flex flex-col bg-white border rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all ${
        isSubmission ? 'border-amber-200/90 hover:border-amber-400' : 'border-slate-200 hover:border-indigo-300'
      } ${className}`}
    >
      {/* Deliverable Badge if this is a submission */}
      {isSubmission && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
            Deliverable
          </span>
        </div>
      )}

      {/* MEDIA PREVIEW BODY */}
      <div className="relative w-full bg-slate-50/70 flex items-center justify-center overflow-hidden min-h-[140px] max-h-56">
        {/* 1. IMAGE PREVIEW */}
        {isImage && !hasError && resolvedUrl ? (
          <div
            onClick={() => onOpen && onOpen(attachment)}
            className="w-full h-44 relative flex items-center justify-center bg-slate-900/5 cursor-pointer p-2"
          >
            <img
              src={resolvedUrl}
              alt={fileName}
              loading="lazy"
              onError={() => setHasError(true)}
              className="max-h-40 max-w-full object-contain rounded-lg shadow-2xs transition-transform duration-200 group-hover:scale-102"
            />
            {/* Quick Hover Overlay */}
            <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="p-2 bg-white/95 rounded-xl text-slate-900 shadow-md flex items-center gap-1 text-xs font-bold hover:scale-105 transition-transform">
                <Eye className="w-3.5 h-3.5" /> View
              </span>
            </div>
          </div>
        ) : isVideo && !hasError && resolvedUrl ? (
          /* 2. VIDEO PREVIEW */
          <div className="w-full p-2 bg-slate-950 flex flex-col items-center justify-center">
            <video
              src={resolvedUrl}
              controls
              preload="metadata"
              onError={() => setHasError(true)}
              className="max-h-40 max-w-full object-contain rounded-lg bg-black"
            >
              Your browser does not support HTML5 video playback.
            </video>
          </div>
        ) : isPdf && !hasError ? (
          /* 3. PDF PREVIEW CARD */
          <div
            onClick={() => onOpen && onOpen(attachment)}
            className="w-full h-40 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-rose-50/40 to-slate-50 text-center cursor-pointer space-y-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                PDF Document
              </span>
            </div>
          </div>
        ) : hasError || !resolvedUrl ? (
          /* 4. ERROR / FALLBACK STATE (Preview Unavailable) */
          <div className="w-full h-40 flex flex-col items-center justify-center p-4 text-center space-y-2 bg-slate-100/60">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-600">Preview unavailable</p>
            <div className="flex items-center gap-2 pt-1">
              {resolvedUrl && (
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
                >
                  Open
                </button>
              )}
              {resolvedUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-2xs"
                >
                  Download
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 5. OTHER FILE TYPES (DOCX, PSD, ZIP, ETC.) */
          <div
            onClick={() => onOpen && onOpen(attachment)}
            className="w-full h-40 flex flex-col items-center justify-center p-4 text-center cursor-pointer space-y-2 bg-gradient-to-b from-indigo-50/30 to-slate-50"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              {isSpreadsheet ? (
                <FileSpreadsheet className="w-6 h-6" />
              ) : isArchive ? (
                <FileArchive className="w-6 h-6" />
              ) : isDesignFile ? (
                <span className="text-xs font-black uppercase">{ext}</span>
              ) : (
                <FileCode className="w-6 h-6" />
              )}
            </div>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
              {ext.toUpperCase() || 'FILE'}
            </span>
          </div>
        )}
      </div>

      {/* FOOTER: FILE METADATA & ACTIONS */}
      <div className="p-3 bg-white border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate" title={fileName}>
              {fileName}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              {typeof sizeFormatted === 'number'
                ? sizeFormatted > 1048576
                  ? `${(sizeFormatted / 1048576).toFixed(1)} MB`
                  : `${Math.round(sizeFormatted / 1024)} KB`
                : sizeFormatted}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {resolvedUrl && isPdf && (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Open PDF in New Tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {resolvedUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {canDelete && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(attachment.id);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete File"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Uploader Attribution if available */}
        {uploaderName && (
          <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar src={uploaderAvatar} name={uploaderName} size="xs" />
              <span className="font-semibold text-slate-700 truncate">{uploaderName}</span>
            </div>
            {attachment.createdAt && (
              <span className="shrink-0">{formatDate(attachment.createdAt)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
