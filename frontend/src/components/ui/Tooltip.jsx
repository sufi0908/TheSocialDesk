import React, { useState } from 'react';
import { cn } from '../../utils/cn';

export const Tooltip = ({ children, content, position = 'top', className }) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) return children;

  const positions = {
    top: '-top-8 left-1/2 -translate-x-1/2',
    bottom: '-bottom-8 left-1/2 -translate-x-1/2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap shadow-md pointer-events-none animate-in fade-in duration-150',
            positions[position],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
