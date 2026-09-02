import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUtils';

export const MediaViewer = ({
  isOpen,
  onClose,
  mediaItem, // { url, fileName, mimeType, type, mediaCategory, senderName, createdAt }
  mediaList = [],
  onNavigate,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setZoom(1);
    setIsPlaying(false);
  }, [mediaItem]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNavigate && mediaList.length > 1) {
        const currentIndex = mediaList.findIndex((m) => m.url === mediaItem?.url || m.id === mediaItem?.id);
        if (currentIndex < mediaList.length - 1) onNavigate(mediaList[currentIndex + 1]);
      }
      if (e.key === 'ArrowLeft' && onNavigate && mediaList.length > 1) {
        const currentIndex = mediaList.findIndex((m) => m.url === mediaItem?.url || m.id === mediaItem?.id);
        if (currentIndex > 0) onNavigate(mediaList[currentIndex - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate, mediaList, mediaItem]);

  if (!isOpen || !mediaItem) return null;

  const resolvedUrl = resolveMediaUrl(mediaItem.url || mediaItem.storage_path);
  const fileName = mediaItem.fileName || mediaItem.file_name || 'Attachment';
  const mimeType = mediaItem.mimeType || mediaItem.mime_type || '';
  const isVideo = mimeType.startsWith('video/') || mediaItem.mediaCategory === 'video' || /\.(mp4|webm|mov|mkv|avi)$/i.test(fileName || resolvedUrl);
  const isAudio = mimeType.startsWith('audio/') || mediaItem.mediaCategory === 'audio' || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName || resolvedUrl);
  const isImage = !isVideo && !isAudio && (mimeType.startsWith('image/') || mediaItem.mediaCategory === 'image' || /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp)$/i.test(fileName || resolvedUrl));

  const currentIndex = mediaList.findIndex((m) => m.url === mediaItem?.url || m.id === mediaItem?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < mediaList.length - 1;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Top Toolbar */}
      <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-slate-900/60 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h4 className="text-sm font-bold text-white truncate">{fileName}</h4>
            <p className="text-[11px] text-white/60 truncate">
              {mediaItem.senderName ? `Sent by ${mediaItem.senderName}` : 'Shared Media'}
              {mediaList.length > 1 && ` • ${currentIndex + 1} of ${mediaList.length}`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isImage && (
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl mr-2">
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-white/80 px-1">{Math.round(zoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            title="Open in new tab"
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>

          <a
            href={resolvedUrl}
            download={fileName}
            title="Download file"
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Download className="w-5 h-5" />
          </a>

          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
        {/* Previous Navigation Button */}
        {hasPrev && onNavigate && (
          <button
            onClick={() => onNavigate(mediaList[currentIndex - 1])}
            className="absolute left-6 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-white/10 shadow-xl transition-all hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Media Content */}
        <div className="max-w-full max-h-full flex items-center justify-center overflow-auto">
          {isImage ? (
            <img
              src={resolvedUrl}
              alt={fileName}
              style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out' }}
              className="max-h-[82vh] max-w-[85vw] object-contain rounded-lg shadow-2xl"
            />
          ) : isVideo ? (
            <div className="max-h-[80vh] max-w-[85vw] rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
              <video
                src={resolvedUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[80vh] max-w-[85vw] object-contain"
              />
            </div>
          ) : isAudio ? (
            <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col items-center gap-6 max-w-md w-full text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Play className="w-8 h-8 ml-1" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{fileName}</h3>
                <p className="text-xs text-white/60 mt-1">Audio Recording</p>
              </div>
              <audio src={resolvedUrl} controls className="w-full" />
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">{fileName}</h4>
                <p className="text-xs text-white/60 mt-1">Document Attachment</p>
              </div>
              <a
                href={resolvedUrl}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Download className="w-4 h-4" /> Download Document
              </a>
            </div>
          )}
        </div>

        {/* Next Navigation Button */}
        {hasNext && onNavigate && (
          <button
            onClick={() => onNavigate(mediaList[currentIndex + 1])}
            className="absolute right-6 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-white/10 shadow-xl transition-all hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};
