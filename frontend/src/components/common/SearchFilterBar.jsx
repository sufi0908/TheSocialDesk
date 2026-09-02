import React, { useState, useEffect } from 'react';
import { Search, Filter, X, RotateCcw, ArrowUpDown } from 'lucide-react';
import { Input } from '../forms/Input';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../utils/cn';

export const SearchFilterBar = ({
  searchValue = '',
  onSearchChange,
  statusFilter = 'All',
  onStatusChange,
  statusOptions = [],
  clientFilter,
  onClientChange,
  clientOptions = [],
  projectFilter,
  onProjectChange,
  projectOptions = [],
  assigneeFilter,
  onAssigneeChange,
  assigneeOptions = [],
  platformFilter,
  onPlatformChange,
  platformOptions = [],
  dateFilter,
  onDateChange,
  dateOptions = [],
  sortBy,
  onSortChange,
  sortOptions = [],
  onClearFilters,
  placeholder = 'Search records...',
}) => {
  const [internalSearch, setInternalSearch] = useState(searchValue);
  const debouncedSearch = useDebounce(internalSearch, 250);

  useEffect(() => {
    setInternalSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    if (onSearchChange && debouncedSearch !== searchValue) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch]);

  const activeFilters = [];
  if (statusFilter && statusFilter !== 'All') activeFilters.push({ key: 'status', label: `Status: ${statusFilter}`, clear: () => onStatusChange && onStatusChange('All') });
  if (clientFilter && clientFilter !== 'All') activeFilters.push({ key: 'client', label: `Client: ${clientFilter}`, clear: () => onClientChange && onClientChange('All') });
  if (projectFilter && projectFilter !== 'All') activeFilters.push({ key: 'project', label: `Project: ${projectFilter}`, clear: () => onProjectChange && onProjectChange('All') });
  if (assigneeFilter && assigneeFilter !== 'All') activeFilters.push({ key: 'assignee', label: `Assignee: ${assigneeFilter}`, clear: () => onAssigneeChange && onAssigneeChange('All') });
  if (platformFilter && platformFilter !== 'All') activeFilters.push({ key: 'platform', label: `Platform: ${platformFilter}`, clear: () => onPlatformChange && onPlatformChange('All') });
  if (dateFilter && dateFilter !== 'All') activeFilters.push({ key: 'date', label: `Date: ${dateFilter}`, clear: () => onDateChange && onDateChange('All') });
  if (internalSearch) activeFilters.push({ key: 'search', label: `Search: "${internalSearch}"`, clear: () => { setInternalSearch(''); onSearchChange && onSearchChange(''); } });

  const handleClearAll = () => {
    setInternalSearch('');
    if (onSearchChange) onSearchChange('');
    if (onStatusChange) onStatusChange('All');
    if (onClientChange) onClientChange('All');
    if (onProjectChange) onProjectChange('All');
    if (onAssigneeChange) onAssigneeChange('All');
    if (onPlatformChange) onPlatformChange('All');
    if (onDateChange) onDateChange('All');
    if (onClearFilters) onClearFilters();
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
      {/* Primary Row: Search Input, Status Filter Pills & Sort Dropdown */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Input
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder={placeholder}
            leftIcon={Search}
            rightIcon={
              internalSearch ? () => (
                <button
                  onClick={() => {
                    setInternalSearch('');
                    if (onSearchChange) onSearchChange('');
                  }}
                  className="cursor-pointer hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ) : null
            }
            className="bg-slate-50 border-slate-200 text-xs py-2.5 focus:bg-white"
          />
        </div>

        {/* Status Filter Chips */}
        {statusOptions.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <Filter className="w-4 h-4 text-indigo-600 shrink-0 mr-1 hidden md:block" />
            {statusOptions.map((opt) => {
              const isActive = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onStatusChange && onStatusChange(opt.value)}
                  className={cn(
                    'px-3.5 py-1.5 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all cursor-pointer border',
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50/90 text-slate-600 border-slate-200/90 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Sort Dropdown */}
        {sortOptions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange && onSortChange(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold cursor-pointer text-slate-700"
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Active Filter Chips & Clear Filters Bar */}
      {activeFilters.length > 0 && (
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Filters:</span>
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl border border-indigo-200"
              >
                <span>{f.label}</span>
                <button onClick={f.clear} className="hover:text-indigo-900 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
