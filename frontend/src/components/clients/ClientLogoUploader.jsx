import React, { useRef, useState } from 'react';
import { Upload, X, RefreshCw } from 'lucide-react';

export const ClientLogoUploader = ({
  logoUrl,
  clientName = 'Client',
  onFileSelect,
  onRemove,
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  uploading = false,
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onRemove) onRemove();
  };

  const currentDisplayUrl = previewUrl || logoUrl;

  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-20 h-20 text-xl',
    lg: 'w-28 h-28 text-3xl',
  }[size] || 'w-20 h-20 text-xl';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative ${sizeClasses} rounded-2xl flex items-center justify-center font-bold transition-all duration-200 cursor-pointer overflow-hidden border-2 shadow-sm ${
          isDragging
            ? 'border-[#4F39F6] bg-[#4F39F6]/5 scale-105'
            : currentDisplayUrl
            ? 'border-gray-200 bg-white hover:border-[#4F39F6]'
            : 'border-dashed border-gray-300 bg-[#F8F9FC] hover:border-[#4F39F6] hover:bg-[#4F39F6]/5'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center justify-center p-2 text-center text-[#4F39F6]">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
        ) : currentDisplayUrl ? (
          <img
            src={currentDisplayUrl}
            alt={clientName}
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            <span className="text-[#4F39F6] font-semibold">{getInitials(clientName)}</span>
          </div>
        )}

        {/* Hover overlay for quick action */}
        {!disabled && !uploading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white">
            <Upload className="w-5 h-5" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 hover:bg-[#4F39F6]/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {currentDisplayUrl ? 'Replace Logo' : 'Upload Logo'}
          </button>

          {currentDisplayUrl && onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-500">
          Recommended: Transparent PNG, SVG, or JPG (max 5MB).
        </p>
      </div>
    </div>
  );
};
