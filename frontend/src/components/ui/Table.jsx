import React from 'react';
import { cn } from '../../utils/cn';

export const Table = ({ children, className }) => (
  <div className="w-full overflow-x-auto scrollbar-thin rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
    <table className={cn('w-full text-left border-collapse text-xs min-w-[750px]', className)}>{children}</table>
  </div>
);

export const TableHeader = ({ children, className }) => (
  <thead className={cn('bg-slate-50/90 text-slate-500 uppercase tracking-wider font-extrabold text-[11px] border-b border-slate-200/90', className)}>
    {children}
  </thead>
);

export const TableBody = ({ children, className }) => (
  <tbody className={cn('divide-y divide-slate-100/90 bg-white', className)}>{children}</tbody>
);

export const TableRow = ({ children, className, onClick }) => (
  <tr
    onClick={onClick}
    className={cn(
      'transition-all duration-150 hover:bg-indigo-50/30',
      onClick && 'cursor-pointer',
      className
    )}
  >
    {children}
  </tr>
);

export const TableHead = ({ children, className }) => (
  <th className={cn('px-6 py-4 font-extrabold text-slate-600 tracking-wider whitespace-nowrap', className)}>{children}</th>
);

export const TableCell = ({ children, className }) => (
  <td className={cn('px-6 py-4 text-slate-700 align-middle leading-relaxed whitespace-nowrap', className)}>{children}</td>
);
