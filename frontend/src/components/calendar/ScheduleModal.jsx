import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../forms/Input';
import { PlatformIcon } from '../common/PlatformIcon';
import { resolveMediaUrl } from '../../utils/mediaUtils';

/**
 * ScheduleModal
 * Modal to select publishing date & time for approved content.
 * Integrates conflict checking for overlapping client/platform schedules.
 */
export const ScheduleModal = ({
  isOpen = false,
  onClose,
  post = null,
  initialDate = '',
  initialTime = '14:00',
  conflictData = null,
  onSubmit,
  isSubmitting = false,
}) => {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialTime || '14:00');

  useEffect(() => {
    if (initialDate) setDate(initialDate);
    if (initialTime) setTime(initialTime);
  }, [initialDate, initialTime, isOpen]);

  if (!post) return null;

  const mediaSrc =
    post.mediaUrl ||
    post.media?.url ||
    post.media_url ||
    post.mediaAssets?.[0]?.file_url ||
    null;
  const resolvedMediaSrc = resolveMediaUrl(mediaSrc);

  const platforms = Array.isArray(post.platforms)
    ? post.platforms
    : typeof post.platforms === 'string'
    ? [post.platforms]
    : ['instagram'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        post,
        date,
        time,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Content Publishing"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* POST SUMMARY CARD */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-start gap-3">
            {resolvedMediaSrc ? (
              <img
                src={resolvedMediaSrc}
                alt={post.title}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block truncate">
                {post.client || 'Client'}
              </span>
              <h4 className="font-bold text-slate-900 text-sm leading-snug truncate mt-0.5">
                {post.title}
              </h4>
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                {platforms.map((p) => (
                  <PlatformIcon key={p} platform={p} showLabel={true} size="xs" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CONFLICT WARNING BANNER (IF DETECTED) */}
        {conflictData?.hasConflict && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold">Schedule Overlap Warning</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                {conflictData.message || 'Another post is already scheduled for this platform around this time.'}
              </p>
            </div>
          </div>
        )}

        {/* DATE & TIME INPUTS */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Publishing Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Publishing Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        {/* ACTIONS */}
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
            {conflictData?.hasConflict ? 'Schedule Anyway' : 'Confirm Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleModal;
