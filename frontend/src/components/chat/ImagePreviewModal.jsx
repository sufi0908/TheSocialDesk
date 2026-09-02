import React from 'react';
import { X, Download } from 'lucide-react';

export const ImagePreviewModal = ({ isOpen, imageUrl, fileName, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <img
          src={imageUrl}
          alt={fileName || 'Image preview'}
          className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
        />

        {fileName && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-3">
            <span>{fileName}</span>
            <a
              href={imageUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-white/80 hover:text-white"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
