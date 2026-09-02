import React from 'react';
import { Card } from './Card';
import { cn } from '../../utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({ title, value, change, isPositive = true, icon: Icon, iconBg = 'bg-indigo-50 text-indigo-700 border-indigo-200/80', description }) => {
  return (
    <Card className="p-5 sm:p-6 hover:border-indigo-400/80 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs', iconBg)}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{value}</h4>

        {change && (
          <div
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs shrink-0',
              isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            )}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{change}</span>
          </div>
        )}
      </div>

      {description && <p className="text-xs font-medium text-slate-400 leading-relaxed pt-1 border-t border-slate-100/80">{description}</p>}
    </Card>
  );
};
