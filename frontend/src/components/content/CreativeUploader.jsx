import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Video, Trash2, RefreshCw, Play, FolderOpen, AlertCircle, Loader2 } from 'lucide-react';
import { SafeImage } from '../common/SafeImage';
import { MediaPreview } from '../common/MediaPreview';
import { normalizeAsset } from '../../utils/mediaUtils';

export const CreativeUploader = ({
  selectedCreative,
  onCreativeChange,
  onOpenAssetLibrary,
  isUploading,
  onUploadFile,
  onPlayVideo,
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const normalizedCreative = selectedCreative ? normalizeAsset(selectedCreative) : null;

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file) => {
    setUploadError('');
    const ext = `.${file.name.split('.').pop().toLowerCase()}`;
    const isExecutable = ['.exe', '.bat', '.cmd', '.sh', '.ps1'].includes(ext);
    if (isExecutable) {
      setUploadError('Executable files are not allowed.');
      return;
    }
    if (onUploadFile) {
      try {
        await onUploadFile(file);
      } catch (err) {
        setUploadError(err.message || 'Failed to upload creative file.');
      }
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        onChange={handleFileSelect}
      />

      {uploadError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {normalizedCreative ? (
        /* ACTIVE CREATIVE DISPLAY CARD */
        <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs space-y-0">
          <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden group">
            <MediaPreview
              media={normalizedCreative}
              onPlayVideo={onPlayVideo}
              aspectRatio="aspect-video"
            />

            {isUploading && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 z-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs font-bold">Uploading new creative...</span>
              </div>
            )}
          </div>

          {/* CARD FOOTER INFO & CONTROLS */}
          <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-xs font-extrabold text-slate-800 truncate" title={normalizedCreative.fileName}>
                {normalizedCreative.fileName}
              </p>
              <p className="text-[10px] text-slate-500 font-mono font-medium mt-0.5">
                {normalizedCreative.size} • {normalizedCreative.type?.toUpperCase()}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-slate-500" /> Replace
              </button>

              <button
                type="button"
                onClick={onOpenAssetLibrary}
                disabled={isUploading}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <FolderOpen className="w-3 h-3 text-indigo-600" /> Library
              </button>

              <button
                type="button"
                onClick={() => onCreativeChange(null)}
                disabled={isUploading}
                className="p-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                title="Remove Creative"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* INITIAL DROPZONE STATE */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
            isDragging ? 'border-indigo-500 bg-indigo-50/70 scale-[0.99]' : 'border-slate-300 bg-slate-50/80 hover:bg-slate-100/70'
          }`}
        >
          {isUploading ? (
            <div className="py-4 space-y-2 text-indigo-600">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs font-extrabold">Uploading creative...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-extrabold text-slate-800">Upload your creative</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Drag & drop image or video here</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  Upload from Computer
                </button>

                <button
                  type="button"
                  onClick={onOpenAssetLibrary}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-extrabold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-600" /> Choose from Library
                </button>
              </div>

              <p className="text-[10px] text-slate-400 font-mono font-medium">
                Supported: JPG, PNG, WEBP, MP4, MOV, WEBM
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
