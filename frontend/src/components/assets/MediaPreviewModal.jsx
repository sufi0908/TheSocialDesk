import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate, formatFileSize } from '../../utils/formatters';
import {
  X,
  Download,
  Eye,
  FileText,
  Video,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Volume2,
  Mic,
  Clock,
  User,
  Building2,
  HardDrive,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';

export const MediaPreviewModal = ({ isOpen, onClose, asset, onOpenDetails }) => {
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!isOpen || !asset) return null;

  const isImage =
    asset.mimeType?.startsWith('image/') ||
    asset.assetType === 'IMAGE' ||
    /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(asset.fileName || asset.name || '');

  const isVideo =
    asset.mimeType?.startsWith('video/') ||
    asset.assetType === 'VIDEO' ||
    /\.(mp4|webm|mov|mkv|avi)$/i.test(asset.fileName || asset.name || '');

  const isPdf =
    asset.mimeType === 'application/pdf' ||
    /\.pdf$/i.test(asset.fileName || asset.name || '');

  const isAudio =
    asset.mimeType?.startsWith('audio/') ||
    asset.assetType === 'VOICE_NOTE' ||
    /\.(mp3|wav|ogg|m4a|aac)$/i.test(asset.fileName || asset.name || '');

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-5xl">
      <div className="space-y-4 -mt-2">
        {/* BENTO HEADER TILE */}
        <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#4F39F6]/10 border border-[#4F39F6]/20 flex items-center justify-center text-[#4F39F6] shrink-0 shadow-2xs">
              {isVideo ? (
                <Video className="w-5 h-5" />
              ) : isImage ? (
                <ImageIcon className="w-5 h-5" />
              ) : isAudio ? (
                <Mic className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#4F39F6] bg-[#4F39F6]/10 px-2.5 py-0.5 rounded-md border border-[#4F39F6]/20">
                  {asset.client || 'General Client'}
                </span>
                <span className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-widest">
                  {asset.size || formatFileSize(asset.sizeBytes)}
                </span>
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-black truncate mt-0.5" title={asset.name}>
                {asset.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isImage && (
              <div className="flex items-center bg-[#F8F9FC] p-1 rounded-xl border border-[#E5E7EB]">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-600 hover:text-[#4F39F6] hover:bg-white rounded-lg transition-all cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="text-[10px] font-extrabold font-mono text-slate-700 px-2 cursor-pointer hover:text-[#4F39F6]"
                  title="Reset Zoom"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-600 hover:text-[#4F39F6] hover:bg-white rounded-lg transition-all cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}

            {onOpenDetails && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={Info}
                onClick={() => {
                  onClose();
                  onOpenDetails(asset.id);
                }}
                className="border-[#E5E7EB] text-slate-700 hover:border-[#4F39F6] hover:text-[#4F39F6] font-bold uppercase tracking-wider text-[11px]"
              >
                Details
              </Button>
            )}

            <a
              href={asset.downloadUrl || asset.url}
              download={asset.fileName || asset.name}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#4F39F6] hover:bg-[#4330d8] text-white rounded-xl font-extrabold text-xs shadow-sm transition-all cursor-pointer uppercase tracking-tight"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        </div>

        {/* BENTO MEDIA DISPLAY TILE */}
        <div className="relative w-full h-[60vh] min-h-[360px] max-h-[620px] bg-[#F8F9FC] rounded-3xl overflow-hidden border border-[#E5E7EB] flex items-center justify-center group select-none shadow-2xs">
          {isImage ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={asset.url}
                alt={asset.name}
                style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out' }}
                onError={(e) => {
                  if (asset.fallbackViewUrl && e.currentTarget.src !== asset.fallbackViewUrl) {
                    e.currentTarget.src = asset.fallbackViewUrl;
                  }
                }}
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
              />
            </div>
          ) : isVideo ? (
            <video
              src={asset.url}
              controls
              autoPlay
              playsInline
              className="w-full h-full max-h-full object-contain"
            />
          ) : isAudio ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-white text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#4F39F6]/10 border border-[#4F39F6]/20 flex items-center justify-center text-[#4F39F6] mb-4 animate-pulse shadow-2xs">
                <Mic className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-black uppercase tracking-tight text-black mb-1 max-w-md truncate">{asset.name}</h4>
              <p className="text-xs text-[#4F39F6] font-mono mb-6">{asset.mimeType || 'Audio Track'}</p>
              <audio src={asset.url} controls autoPlay className="w-full max-w-lg shadow-sm rounded-full" />
            </div>
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={`${asset.url}#toolbar=1`}
                title={asset.name}
                className="w-full h-full border-0 rounded-2xl"
              />
            </div>
          ) : (
            /* STYLIZED DOCUMENT DISPLAY FOR NON-PDF / GENERAL FILES */
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white">
              <div className="w-24 h-24 rounded-3xl bg-amber-50 border border-amber-200/80 flex flex-col items-center justify-center text-amber-600 mb-4 shadow-sm">
                <FileText className="w-12 h-12" />
                <span className="text-[9px] font-black uppercase text-amber-700 mt-1 font-mono tracking-widest">
                  {asset.mimeType?.split('/')[1] || 'DOC'}
                </span>
              </div>
              <h4 className="text-base font-black uppercase tracking-tight text-black max-w-md truncate">{asset.name}</h4>
              <p className="text-xs text-slate-500 mt-1 font-mono">{asset.mimeType || 'Document File'}</p>

              <div className="flex items-center gap-3 mt-6">
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-black rounded-xl font-bold text-xs border border-[#E5E7EB] transition-all uppercase tracking-wider shadow-2xs"
                >
                  <ExternalLink className="w-4 h-4 text-[#4F39F6]" /> Open in New Tab
                </a>
                <a
                  href={asset.downloadUrl || asset.url}
                  download={asset.fileName || asset.name}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#4F39F6] hover:bg-[#4330d8] text-white rounded-xl font-extrabold text-xs shadow-sm transition-all uppercase tracking-wider"
                >
                  <Download className="w-4 h-4" /> Download Document
                </a>
              </div>
            </div>
          )}
        </div>

        {/* BENTO METADATA GRID TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Uploaded Date</span>
            <span className="font-extrabold text-black text-xs mt-0.5 block">{formatDate(asset.uploadedDate)}</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Uploader</span>
            <span className="font-extrabold text-black text-xs mt-0.5 block truncate">{asset.uploaderName || 'Team Member'}</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">MIME Type</span>
            <span className="font-mono text-[11px] font-bold text-[#4F39F6] mt-0.5 block truncate">{asset.mimeType || 'Unknown'}</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SHA-256 Fingerprint</span>
            <span className="font-mono text-[10px] text-slate-600 mt-0.5 block truncate" title={asset.fileHash || 'N/A'}>
              {asset.fileHash ? `${asset.fileHash.substring(0, 16)}...` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
