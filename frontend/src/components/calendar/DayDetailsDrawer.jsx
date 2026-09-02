import React from 'react';
import { Drawer } from '../ui/Drawer';
import { ScheduledContentCard } from './ScheduledContentCard';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * DayDetailsDrawer
 * Drawer modal displaying all scheduled posts for a specific date when clicking "+N more" on a day cell.
 */
export const DayDetailsDrawer = ({
  isOpen = false,
  onClose,
  dateStr = '',
  posts = [],
  canManage = true,
  onCardClick,
  onCardDragStart,
  onCardDragEnd,
  onScheduleNew,
}) => {
  let formattedDate = dateStr;
  try {
    if (dateStr) {
      const [y, m, d] = dateStr.split('-');
      const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      formattedDate = dt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch (e) {
    formattedDate = dateStr;
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={formattedDate || 'Scheduled Posts'}
      size="max-w-md"
    >
      <div className="space-y-4 text-xs">
        {/* HEADER SUMMARY */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800">
              {posts.length} {posts.length === 1 ? 'post scheduled' : 'posts scheduled'}
            </span>
          </div>

          {canManage && onScheduleNew && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={Plus}
              onClick={() => {
                onClose();
                onScheduleNew(dateStr);
              }}
              className="h-7.5 px-2.5 text-xs font-bold text-[#4F39F6] border-purple-200 hover:bg-purple-50"
            >
              Add Post
            </Button>
          )}
        </div>

        {/* POSTS LIST */}
        <div className="space-y-3">
          {posts.map((post) => (
            <ScheduledContentCard
              key={post.id || post.contentId}
              post={post}
              canManage={canManage}
              draggable={false}
              onClick={(p) => {
                onClose();
                if (onCardClick) onCardClick(p);
              }}
              compact={false}
            />
          ))}
        </div>
      </div>
    </Drawer>
  );
};

export default DayDetailsDrawer;
