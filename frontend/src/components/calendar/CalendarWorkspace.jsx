import React from 'react';
import { CalendarGrid } from './CalendarGrid';
import { ScheduleQueue } from './ScheduleQueue';

/**
 * CalendarWorkspace
 * Main layout container pairing the calendar canvas (75-80%) with the approved schedule queue (20-25%).
 */
export const CalendarWorkspace = ({
  // Calendar Grid Props
  viewMode = 'month',
  currentDate = new Date(),
  posts = [],
  loading = false,
  canManage = true,
  isDragging = false,
  hoveredDate = null,
  onCardClick,
  onCardDragStart,
  onCardDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenMore,
  onCellClick,
  onReschedule,
  onUnschedule,
  onMarkPublished,

  // Queue Props
  queuePosts = [],
  isQueueOpen = false,
  onCloseQueue,
  onQueueScheduleClick,
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
      {/* 1. DOMINANT CALENDAR CANVAS */}
      <div className="flex-1 min-w-0 w-full">
        <CalendarGrid
          viewMode={viewMode}
          currentDate={currentDate}
          posts={posts}
          loading={loading}
          canManage={canManage}
          isDragging={isDragging}
          hoveredDate={hoveredDate}
          onCardClick={onCardClick}
          onCardDragStart={onCardDragStart}
          onCardDragEnd={onCardDragEnd}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onOpenMore={onOpenMore}
          onCellClick={onCellClick}
          onReschedule={onReschedule}
          onUnschedule={onUnschedule}
          onMarkPublished={onMarkPublished}
        />
      </div>

      {/* 2. APPROVED CONTENT QUEUE (TOGGLEABLE RIGHT PANEL) */}
      {canManage && isQueueOpen && (
        <ScheduleQueue
          posts={queuePosts}
          isOpen={isQueueOpen}
          onClose={onCloseQueue}
          onDragStart={onCardDragStart}
          onDragEnd={onCardDragEnd}
          onScheduleClick={onQueueScheduleClick}
          onCardClick={onCardClick}
          canManage={canManage}
        />
      )}
    </div>
  );
};

export default CalendarWorkspace;
