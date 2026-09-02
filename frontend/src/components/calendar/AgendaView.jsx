import React, { useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, RotateCcw, CalendarDays, ExternalLink } from 'lucide-react';
import { PlatformIcon } from '../common/PlatformIcon';
import { resolveMediaUrl } from '../../utils/mediaUtils';
import { formatTime } from '../../utils/formatters';
import { STATUS_CONFIG } from '../../utils/constants';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';

/**
 * AgendaView
 * Chronological, date-grouped list of scheduled content items with detailed metadata and quick actions.
 */
export const AgendaView = ({
  posts = [],
  canManage = true,
  onCardClick,
  onReschedule,
  onUnschedule,
  onMarkPublished,
}) => {
  // Group and sort posts by date
  const groupedPosts = useMemo(() => {
    const map = {};
    for (const post of posts) {
      const d = post.date || (post.scheduled_at ? post.scheduled_at.split('T')[0] : 'Unscheduled');
      if (!map[d]) map[d] = [];
      map[d].push(post);
    }

    // Sort dates ascending
    const sortedDates = Object.keys(map).sort();
    return sortedDates.map((dateStr) => ({
      dateStr,
      items: map[dateStr].sort((a, b) => (a.time || '12:00').localeCompare(b.time || '12:00')),
    }));
  }, [posts]);

  if (groupedPosts.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center space-y-3">
        <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No scheduled content found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          There are no scheduled posts matching your current filters or date range.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {groupedPosts.map(({ dateStr, items }) => {
        let dateHeading = dateStr;
        try {
          const [y, m, d] = dateStr.split('-');
          const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
          dateHeading = dt.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        } catch (e) {
          dateHeading = dateStr;
        }

        const isToday = dateStr === new Date().toISOString().split('T')[0];

        return (
          <div key={dateStr} className="space-y-3">
            {/* DATE HEADER BANNER */}
            <div className="flex items-center gap-2.5 px-1">
              <span
                className={cn(
                  'text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg border shadow-2xs flex items-center gap-1.5',
                  isToday
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-800 border-slate-200'
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                {dateHeading}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({items.length} {items.length === 1 ? 'post' : 'posts'})
              </span>
            </div>

            {/* LIST OF CARDS */}
            <div className="space-y-2.5">
              {items.map((post) => {
                const mediaSrc =
                  post.mediaUrl ||
                  post.media?.url ||
                  post.media_url ||
                  post.mediaAssets?.[0]?.file_url ||
                  null;
                const resolvedMediaSrc = resolveMediaUrl(mediaSrc);

                const timeDisplay = post.time
                  ? formatTime(`1970-01-01T${post.time.length === 5 ? post.time + ':00' : post.time}`)
                  : '12:00 PM';

                const statusKey = (post.statusKey || post.status || 'scheduled').toLowerCase();
                const statusInfo = STATUS_CONFIG[statusKey] || {
                  label: post.status || 'Scheduled',
                  badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  dotColor: 'bg-indigo-500',
                };

                const platforms = Array.isArray(post.platforms)
                  ? post.platforms
                  : typeof post.platforms === 'string'
                  ? [post.platforms]
                  : ['instagram'];

                return (
                  <div
                    key={post.id || post.contentId}
                    onClick={() => onCardClick && onCardClick(post)}
                    className="bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer group"
                  >
                    {/* Left: Thumbnail + Metadata */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {resolvedMediaSrc ? (
                        <img
                          src={resolvedMediaSrc}
                          alt={post.title}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
                          <CalendarIcon className="w-8 h-8" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                            {post.client || 'Client'}
                          </span>
                          {post.project && (
                            <span className="text-[11px] font-semibold text-slate-500">
                              Campaign: {post.project}
                            </span>
                          )}
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                              statusInfo.badgeStyle
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dotColor)} />
                            <span>{statusInfo.label}</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                          {post.title}
                        </h3>

                        {post.caption && (
                          <p className="text-xs text-slate-500 line-clamp-1">
                            "{post.caption}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 pt-0.5">
                          <div className="flex items-center gap-1 text-slate-700 font-mono font-bold">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{timeDisplay}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {platforms.map((p) => (
                              <PlatformIcon key={p} platform={p} size="sm" showBox={true} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    {canManage && (
                      <div
                        className="flex items-center gap-2 self-end md:self-center shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReschedule && onReschedule(post)}
                          className="h-8.5 text-xs font-semibold"
                        >
                          Reschedule
                        </Button>

                        {statusKey !== 'published' && (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={CheckCircle2}
                            onClick={() => onMarkPublished && onMarkPublished(post)}
                            className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Publish
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AgendaView;
