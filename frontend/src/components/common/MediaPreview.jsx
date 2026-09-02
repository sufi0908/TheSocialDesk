import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Play,
  Download,
  ExternalLink,
  Trash2,
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import { normalizeAsset, resolveMediaUrl } from '../../utils/mediaUtils';

export const MediaPreview = ({
  media,
  attachment,
  alt,
  onRemove,
  canRemove = false,
  compact = false,
  aspectRatio = 'aspect-video',
  className = '',
  onPlayVideo,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const rawItem = media || attachment;
  if (!rawItem) return null;

  const item = normalizeAsset(rawItem);
  if (!item || !item.url) return null;

  const fileName = item.fileName || alt || 'Creative Media';
  const fileUrl = resolveMediaUrl(item.url);
  const fileSize = item.size || '';
  const isImage = item.type === 'image';
  const isVideo = item.type === 'video';

  const isPdf = /\.pdf$/i.test(fileName) || String(item.mimeType || '').includes('pdf');
  const isSheet = /\.(xlsx|xls|csv)$/i.test(fileName);
  const isZip = /\.(zip|rar|7z|tar|gz)$/i.test(fileName);

  const getFileIcon = () => {
    if (isPdf) return <FileText className="w-6 h-6 text-rose-500" />;
    if (isSheet) return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
    if (isZip) return <FileArchive className="w-6 h-6 text-amber-500" />;
    return <FileText className="w-6 h-6 text-indigo-500" />;
  };

  const handleVideoClick = (e) => {
    e.stopPropagation();
    if (onPlayVideo) {
      onPlayVideo(item);
    } else {
      setIsVideoModalOpen(true);
    }
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
    setIsImageModalOpen(true);
  };

  return (
    <>
      <div className={`relative w-full ${aspectRatio} bg-slate-950 rounded-xl overflow-hidden group/media flex items-center justify-center ${className}`}>
        {/* IMAGE PREVIEW */}
        {isImage && (
          <>
            {!imageLoaded && !hasError && (
              <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-slate-300" />
              </div>
            )}

            {hasError ? (
              <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
                <AlertCircle className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-[10px] font-bold text-slate-400">Preview unavailable</span>
              </div>
            ) : (
              <img
                src={fileUrl}
                alt={fileName}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setHasError(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 cursor-pointer group-hover/media:scale-105 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={handleImageClick}
              />
            )}

            {imageLoaded && !hasError && (
              <div
                onClick={handleImageClick}
                className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[11px] font-bold text-white flex items-center gap-1.5 shadow-sm">
                  <Eye className="w-3.5 h-3.5" /> Preview
                </div>
              </div>
            )}
          </>
        )}

        {/* VIDEO PREVIEW */}
        {isVideo && (
          <div
            onClick={handleVideoClick}
            className="relative w-full h-full bg-slate-950 flex items-center justify-center cursor-pointer group/vid"
          >
            <video
              src={fileUrl}
              className="w-full h-full object-cover"
              preload="metadata"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/vid:bg-black/10 transition-colors">
              <div className="w-11 h-11 rounded-full bg-white/90 text-slate-900 group-hover/vid:bg-indigo-600 group-hover/vid:text-white group-hover/vid:scale-110 transition-all flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
            <span className="absolute bottom-2 right-2 text-[9px] font-mono font-bold text-white bg-black/70 px-1.5 py-0.5 rounded">
              VIDEO
            </span>
          </div>
        )}

        {/* DOCUMENT / FILE PREVIEW */}
        {!isImage && !isVideo && (
          <div className="w-full h-full p-4 bg-slate-900 flex flex-col items-center justify-center text-center text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-2 shadow-2xs">
              {getFileIcon()}
            </div>
            <p className="text-xs font-bold truncate max-w-[200px]">{fileName}</p>
            <p className="text-[10px] text-slate-400">{fileSize}</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Open File
            </a>
          </div>
        )}

        {/* Remove Button if enabled */}
        {canRemove && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white hover:bg-rose-600 transition-colors shadow-sm z-10"
            title="Remove media"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* MODAL: FULL IMAGE PREVIEW LIGHTBOX */}
      {isImage && isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white text-xs">
              <span className="font-bold truncate max-w-md">{fileName}</span>
              <div className="flex items-center gap-2">
                <a
                  href={fileUrl}
                  download={fileName}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img src={fileUrl} alt={fileName} className="max-h-[75vh] w-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FULL VIDEO PLAYER */}
      {isVideo && isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white text-xs">
              <span className="font-bold truncate max-w-md">{fileName}</span>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 aspect-video bg-black flex items-center justify-center">
              <video
                src={fileUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[75vh] object-contain rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MediaPreview;
