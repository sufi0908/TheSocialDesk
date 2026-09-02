import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Select } from '../forms/Select';
import { Button } from '../ui/Button';
import { STATUS_TYPES } from '../../utils/constants';

/**
 * CalendarFilters
 * Compact horizontal filtering row for Content Calendar.
 */
export const CalendarFilters = ({
  clients = [],
  projects = [],
  selectedClientId = 'All',
  onClientChange,
  selectedProjectId = 'All',
  onProjectChange,
  selectedStatus = 'All',
  onStatusChange,
  selectedPlatform = 'All',
  onPlatformChange,
  hasActiveFilters = false,
  onClearFilters,
}) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Client Filter */}
      <div className="w-44 sm:w-52">
        <Select
          value={selectedClientId}
          onChange={(e) => onClientChange(e.target.value)}
          options={[
            { value: 'All', label: 'All Clients' },
            ...clients.map((c) => ({ value: String(c.id), label: c.companyName || c.name })),
          ]}
          className="text-xs h-8.5 py-1"
        />
      </div>

      {/* Project Filter */}
      <div className="w-44 sm:w-52">
        <Select
          value={selectedProjectId}
          onChange={(e) => onProjectChange(e.target.value)}
          options={[
            { value: 'All', label: 'All Projects' },
            ...projects.map((p) => ({ value: String(p.id), label: p.name })),
          ]}
          className="text-xs h-8.5 py-1"
        />
      </div>

      {/* Status Filter */}
      <div className="w-40 sm:w-44">
        <Select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: STATUS_TYPES.SCHEDULED, label: 'Scheduled' },
            { value: STATUS_TYPES.PUBLISHED, label: 'Published' },
          ]}
          className="text-xs h-8.5 py-1"
        />
      </div>

      {/* Platform Filter */}
      <div className="w-40 sm:w-44">
        <Select
          value={selectedPlatform}
          onChange={(e) => onPlatformChange(e.target.value)}
          options={[
            { value: 'All', label: 'All Platforms' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'facebook', label: 'Facebook' },
            { value: 'tiktok', label: 'TikTok' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'twitter', label: 'X (Twitter)' },
          ]}
          className="text-xs h-8.5 py-1"
        />
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={RotateCcw}
          onClick={onClearFilters}
          className="h-8.5 px-3 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 bg-white shadow-2xs"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
};

export default CalendarFilters;
