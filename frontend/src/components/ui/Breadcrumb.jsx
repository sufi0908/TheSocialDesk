import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';

export const Breadcrumb = ({ items = [], className }) => {
  return (
    <nav className={cn('flex items-center gap-1.5 text-xs text-slate-500', className)}>
      <NavLink to="/workspace/dashboard" className="hover:text-slate-800 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </NavLink>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {isLast || !item.path ? (
              <span className="font-semibold text-slate-900 truncate max-w-xs">{item.label}</span>
            ) : (
              <NavLink to={item.path} className="hover:text-slate-800 transition-colors">
                {item.label}
              </NavLink>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
