import React, { useState, useEffect, useMemo } from 'react';
import { CalendarGrid, CalendarToolbar, DayDetailsDrawer } from '../../components/calendar';
import { Drawer } from '../../components/ui/Drawer';
import { Badge } from '../../components/ui/Badge';
import { MediaPreview } from '../../components/common/MediaPreview';
import { PlatformIcon } from '../../components/common/PlatformIcon';
import { CommentThread } from '../../components/common/CommentThread';
import { calendarService } from '../../services/calendarService';
import { formatTime } from '../../utils/formatters';
import { CalendarDays, Calendar as CalendarIcon, Clock } from 'lucide-react';

/**
 * ClientCalendarPage
 * Client Portal view of scheduled content calendar (Read-only mode).
 */
export const ClientCalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inspector Drawer
  const [selectedPost, setSelectedPost] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Day "+N more" Drawer
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [dayDrawerDate, setDayDrawerDate] = useState('');
  const [dayDrawerPosts, setDayDrawerPosts] = useState([]);

  // Calculate date range for current view and date
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const firstDayWeekday = firstDay.getDay();
      const gridStart = new Date(year, month, 1 - firstDayWeekday);

      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const remainingDays = (7 - ((firstDayWeekday + daysInMonth) % 7)) % 7;
      const gridEnd = new Date(year, month, daysInMonth + remainingDays);

      const yStart = gridStart.getFullYear();
      const mStart = String(gridStart.getMonth() + 1).padStart(2, '0');
      const dStart = String(gridStart.getDate()).padStart(2, '0');

      const yEnd = gridEnd.getFullYear();
      const mEnd = String(gridEnd.getMonth() + 1).padStart(2, '0');
      const dEnd = String(gridEnd.getDate()).padStart(2, '0');

      return {
        startDate: `${yStart}-${mStart}-${dStart} 00:00:00`,
        endDate: `${yEnd}-${mEnd}-${dEnd} 23:59:59`,
      };
    }

    if (viewMode === 'week') {
      const dayOfWeek = currentDate.getDay();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const yStart = startOfWeek.getFullYear();
      const mStart = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const dStart = String(startOfWeek.getDate()).padStart(2, '0');

      const yEnd = endOfWeek.getFullYear();
      const mEnd = String(endOfWeek.getMonth() + 1).padStart(2, '0');
      const dEnd = String(endOfWeek.getDate()).padStart(2, '0');

      return {
        startDate: `${yStart}-${mStart}-${dStart} 00:00:00`,
        endDate: `${yEnd}-${mEnd}-${dEnd} 23:59:59`,
      };
    }

    if (viewMode === 'day') {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate.getDate()).padStart(2, '0');

      return {
        startDate: `${y}-${m}-${d} 00:00:00`,
        endDate: `${y}-${m}-${d} 23:59:59`,
      };
    }

    if (viewMode === 'agenda') {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const m = String(month + 1).padStart(2, '0');
      return {
        startDate: `${year}-${m}-01 00:00:00`,
        endDate: `${year}-${m}-${String(daysInMonth).padStart(2, '0')} 23:59:59`,
      };
    }

    return { startDate: null, endDate: null };
  }, [currentDate, viewMode]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const scheduled = await calendarService.getCalendarPosts(null, dateRange.startDate, dateRange.endDate);
      setPosts(Array.isArray(scheduled) ? scheduled : []);
    } catch (err) {
      console.error('Failed to load client calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [dateRange.startDate, dateRange.endDate]);

  const periodTitle = useMemo(() => {
    const year = currentDate.getFullYear();
    if (viewMode === 'month' || viewMode === 'agenda') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const dayOfWeek = currentDate.getDay();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    return '';
  }, [currentDate, viewMode]);

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month' || viewMode === 'agenda') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month' || viewMode === 'agenda') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const filteredPosts = useMemo(() => {
    if (!search) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.caption || '').toLowerCase().includes(q)
    );
  }, [posts, search]);

  return (
    <div className="w-full space-y-4 select-none pb-8">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 mb-1 shadow-2xs">
            <CalendarDays className="w-4 h-4 text-indigo-600" /> Brand Publishing Schedule
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Scheduled Content Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Read-only calendar view of approved social media posts scheduled for your brand.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            🔒 Client Read-Only
          </span>
        </div>
      </div>

      {/* TOOLBAR */}
      <CalendarToolbar
        search={search}
        onSearchChange={setSearch}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        periodTitle={periodTitle}
        viewMode={viewMode}
        onViewChange={setViewMode}
      />

      {/* CALENDAR GRID (READ-ONLY) */}
      <div className="w-full">
        <CalendarGrid
          viewMode={viewMode}
          currentDate={currentDate}
          posts={filteredPosts}
          loading={loading}
          canManage={false}
          onCardClick={(post) => {
            setSelectedPost(post);
            setIsDrawerOpen(true);
          }}
          onOpenMore={(dateStr, morePosts) => {
            setDayDrawerDate(dateStr);
            setDayDrawerPosts(morePosts);
            setIsDayDrawerOpen(true);
          }}
        />
      </div>

      {/* DAY "+N MORE" DRAWER */}
      <DayDetailsDrawer
        isOpen={isDayDrawerOpen}
        onClose={() => setIsDayDrawerOpen(false)}
        dateStr={dayDrawerDate}
        posts={dayDrawerPosts}
        canManage={false}
        onCardClick={(post) => {
          setSelectedPost(post);
          setIsDrawerOpen(true);
        }}
      />

      {/* INSPECTOR DRAWER */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedPost?.title || 'Scheduled Post Details'}
        size="max-w-lg"
      >
        {selectedPost && (
          <div className="space-y-5 text-xs sm:text-sm">
            {/* Creative Asset Preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950">
              <MediaPreview
                media={selectedPost.mediaUrl || selectedPost.media?.url || selectedPost}
                alt={selectedPost.title}
                aspectRatio="aspect-16/10"
              />
            </div>

            {/* Post Meta */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                  {selectedPost.client}
                </span>
                <Badge statusKey={selectedPost.statusKey || selectedPost.status} />
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {selectedPost.title}
              </h3>

              {selectedPost.caption && (
                <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap font-normal">
                  "{selectedPost.caption}"
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scheduled Date</p>
                  <p className="font-bold text-slate-800 mt-0.5 text-xs sm:text-sm">{selectedPost.date || 'Unscheduled'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scheduled Time</p>
                  <p className="font-bold text-indigo-700 mt-0.5 text-xs sm:text-sm">
                    {selectedPost.time ? formatTime(`1970-01-01T${selectedPost.time.length === 5 ? selectedPost.time + ':00' : selectedPost.time}`) : '--:--'}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Social Platforms</p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {selectedPost.platforms?.map((p) => (
                    <PlatformIcon key={p} platform={p} showLabel={true} />
                  ))}
                </div>
              </div>
            </div>

            {/* Comments Thread */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <CommentThread
                entityType="content"
                entityId={selectedPost.contentId || selectedPost.id}
                entityTitle={selectedPost.title}
                clientName={selectedPost.client}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ClientCalendarPage;
