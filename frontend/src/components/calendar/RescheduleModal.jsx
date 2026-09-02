import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../forms/Input';
import { formatTime } from '../../utils/formatters';

/**
 * RescheduleModal
 * Modal to confirm moving a scheduled post to a new date/time after drag-and-drop or manual reschedule trigger.
 */
export const RescheduleModal = ({
  isOpen = false,
  onClose,
  post = null,
  sourceDate = '',
  targetDate = '',
  targetTime = '',
  onConfirm,
  isSubmitting = false,
}) => {
  const [newDate, setNewDate] = useState(targetDate || '');
  const [newTime, setNewTime] = useState(targetTime || '14:00');

  useEffect(() => {
    if (targetDate) setNewDate(targetDate);
    if (targetTime) setNewTime(targetTime);
  }, [targetDate, targetTime, isOpen]);

  if (!post) return null;

  const currentDisplayTime = post.time
    ? formatTime(`1970-01-01T${post.time.length === 5 ? post.time + ':00' : post.time}`)
    : '12:00 PM';

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onConfirm) {
      onConfirm({
        post,
        date: newDate,
        time: newTime,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Content"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* POST HEADER */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block truncate">
            {post.client || 'Client'}
          </span>
          <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
            {post.title}
          </h4>
        </div>

        {/* COMPARISON BOX: BEFORE VS AFTER */}
        <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            {/* CURRENT SCHEDULE */}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current</span>
              <p className="font-bold text-slate-700 mt-0.5 truncate">{sourceDate || post.date || 'Unscheduled'}</p>
              <p className="text-[11px] font-mono text-slate-500">{currentDisplayTime}</p>
            </div>

            <div className="text-indigo-400 shrink-0 px-2">
              <ArrowRight className="w-4 h-4" />
            </div>

            {/* NEW TARGET SCHEDULE */}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">New Schedule</span>
              <p className="font-bold text-indigo-700 mt-0.5 truncate">{newDate}</p>
              <p className="text-[11px] font-mono text-indigo-600 font-bold">
                {formatTime(`1970-01-01T${newTime.length === 5 ? newTime + ':00' : newTime}`)}
              </p>
            </div>
          </div>
        </div>

        {/* DATE & TIME ADJUSTMENT INPUTS */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="New Date"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
          />
          <Input
            label="New Time"
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            required
          />
        </div>

        {/* MODAL ACTIONS */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            leftIcon={CalendarIcon}
            isLoading={isSubmitting}
            className="h-10 px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            Confirm Reschedule
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RescheduleModal;
