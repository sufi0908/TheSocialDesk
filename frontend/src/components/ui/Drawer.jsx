import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Drawer = ({ isOpen, onClose, title, children, position = 'right', size = 'max-w-md', className }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClasses = {
    right: 'right-0 top-0 bottom-0 animate-in slide-in-from-right duration-200',
    left: 'left-0 top-0 bottom-0 animate-in slide-in-from-left duration-200',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Side Drawer'}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Light Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={cn('fixed z-50 h-full w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col', size, positionClasses[position], className)}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/80 bg-white shrink-0">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Drawer"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 bg-slate-50/40 space-y-6">{children}</div>
      </div>
    </div>
  );
};
