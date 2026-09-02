import React, { useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, UploadCloud, Video, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const FILE_LIMITS = {
  image: 25 * 1024 * 1024,
  video: 250 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
  document: 50 * 1024 * 1024,
};

const ACCEPTED_MIME = {
  'image/jpeg': FILE_LIMITS.image,
  'image/png': FILE_LIMITS.image,
  'image/webp': FILE_LIMITS.image,
  'image/gif': FILE_LIMITS.image,
  'image/svg+xml': FILE_LIMITS.image,
  'image/avif': FILE_LIMITS.image,
  'video/mp4': FILE_LIMITS.video,
  'video/webm': FILE_LIMITS.video,
  'video/quicktime': FILE_LIMITS.video,
  'application/pdf': FILE_LIMITS.pdf,
};

const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return '0 B';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileUpload = ({
  multiple = true,
  onUpload,
  onFileSelect,
  acceptTypes,
  disabled = false,
  isLoading = false,
  uploadLabel,
  label,
  subtitle,
  sublabel,
  className = '',
}) => {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const effectiveDisabled = disabled || isLoading;
  const effectiveLabel = uploadLabel || label || 'Drop files here or click to browse';
  const effectiveSubtitle = subtitle || sublabel || 'JPG, PNG, GIF, WEBP, SVG, MP4, WEBM, MOV, PDF';

  useEffect(() => () => {
    files.forEach(({ preview }) => preview && URL.revokeObjectURL(preview));
  }, [files]);

  const addFiles = (incoming) => {
    const accepted = [];
    for (const file of incoming) {
      const ext = `.${file.name.split('.').pop().toLowerCase()}`;
      const isExecutable = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js'].includes(ext);

      if (isExecutable) {
        setError(`${file.name}: Executable files are not allowed for security reasons.`);
        continue;
      }

      const limit = ACCEPTED_MIME[file.type] || (file.type.startsWith('image/') ? FILE_LIMITS.image : file.type.startsWith('video/') ? FILE_LIMITS.video : FILE_LIMITS.document);
      if (file.size > limit) {
        setError(`${file.name}: maximum size is ${formatSize(limit)}.`);
        continue;
      }

      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const preview = isImg ? URL.createObjectURL(file) : '';

      accepted.push({
        file,
        preview,
        isVideo: isVid,
        isPdf: file.type === 'application/pdf',
        progress: 0,
        status: 'selected',
      });
    }

      if (accepted.length > 0) {
        setError('');
        if (multiple) {
          setFiles((current) => [...current, ...accepted]);
          if (onFileSelect) {
            const fileObjects = accepted.map((a) => a.file);
            setTimeout(() => onFileSelect(fileObjects), 0);
          }
        } else {
          setFiles(accepted.slice(0, 1));
          if (onFileSelect) {
            const singleFile = accepted[0].file;
            setTimeout(() => onFileSelect(singleFile), 0);
          }
        }

        if (onUpload) {
          setTimeout(() => {
            accepted.forEach(async (item) => {
              setFiles((current) => current.map((entry) => entry.file === item.file ? { ...entry, status: 'uploading', progress: 10 } : entry));
              try {
                await onUpload(item.file, (progress) => {
                  setFiles((current) => current.map((entry) => entry.file === item.file ? { ...entry, progress } : entry));
                });
                setFiles((current) => current.map((entry) => entry.file === item.file ? { ...entry, progress: 100, status: 'success' } : entry));
              } catch (uploadError) {
                setError(uploadError.response?.data?.message || uploadError.message || `Could not upload ${item.file.name}.`);
                setFiles((current) => current.map((entry) => entry.file === item.file ? { ...entry, status: 'failed' } : entry));
              }
            });
          }, 0);
        }
      }
    };

  const removeFile = (index) => {
    setFiles((current) => {
      const item = current[index];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      const remaining = current.filter((_, itemIndex) => itemIndex !== index);
      if (onFileSelect) {
        if (multiple) onFileSelect(remaining.map((r) => r.file));
        else onFileSelect(null);
      }
      return remaining;
    });
  };

  const startUpload = async () => {
    if (!files.length || !onUpload) return;
    for (const item of files) {
      if (item.status === 'success') continue;
      setFiles((current) => current.map((entry) => entry === item ? { ...entry, status: 'uploading', progress: 5 } : entry));
      try {
        await onUpload(item.file, (progress) => {
          setFiles((current) => current.map((entry) => entry === item ? { ...entry, progress } : entry));
        });
        setFiles((current) => current.map((entry) => entry === item ? { ...entry, progress: 100, status: 'success' } : entry));
      } catch (uploadError) {
        setError(uploadError.response?.data?.message || uploadError.message || `Could not upload ${item.file.name}.`);
        setFiles((current) => current.map((entry) => entry === item ? { ...entry, status: 'failed' } : entry));
      }
    }
  };

  const acceptAttribute = acceptTypes || Object.keys(ACCEPTED_MIME).join(',');

  return (
    <div className={`space-y-3 ${className}`}>
      <button
        type="button"
        disabled={effectiveDisabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files || []));
        }}
        className={`w-full border-2 border-dashed rounded-xl p-5 text-center transition-all ${
          dragging ? 'border-indigo-500 bg-indigo-50/70 scale-[0.99]' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70'
        } ${effectiveDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <UploadCloud className="mx-auto w-7 h-7 text-indigo-600 mb-1.5" />
        <span className="block text-xs font-bold text-slate-800">{effectiveLabel}</span>
        <span className="block mt-0.5 text-[10px] text-slate-500 font-medium">{effectiveSubtitle}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={acceptAttribute}
        onChange={(event) => addFiles(Array.from(event.target.files || []))}
      />

      {error && (
        <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              className="flex items-center gap-3 border border-slate-200 bg-white rounded-xl p-2.5 shadow-2xs transition-all"
            >
              {item.preview ? (
                <img src={item.preview} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
              ) : item.isVideo ? (
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-200 shrink-0">
                  <Video className="w-5 h-5 text-purple-600" />
                </div>
              ) : item.isPdf ? (
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-200 shrink-0">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-200 shrink-0">
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-bold text-slate-800">{item.file.name}</p>
                  <span className="text-[10px] text-slate-400 font-medium ml-2 shrink-0">{formatSize(item.file.size)}</span>
                </div>

                {item.status === 'uploading' && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-indigo-600 font-semibold">
                      <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all duration-200" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                )}

                {item.status === 'success' && (
                  <p className="mt-0.5 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Upload complete
                  </p>
                )}

                {item.status === 'failed' && (
                  <p className="mt-0.5 text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Upload failed
                  </p>
                )}
              </div>

              {item.status !== 'uploading' && (
                <button
                  type="button"
                  title="Remove file"
                  onClick={() => removeFile(index)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {onUpload && files.some((item) => item.status === 'selected' || item.status === 'failed') && (
            <button
              type="button"
              onClick={startUpload}
              disabled={disabled}
              className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              Upload Selected {files.length > 1 ? `Files (${files.length})` : 'File'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};