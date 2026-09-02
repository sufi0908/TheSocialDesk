import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { STATUS_TYPES, ROLES } from '../../../utils/constants';
import { calendarService } from '../../../services/calendarService';
import { clientService } from '../../../services/clientService';
import { projectService } from '../../../services/projectService';
import { resolveMediaUrl } from '../../../utils/mediaUtils';
import { formatTime } from '../../../utils/formatters';

import {
  CalendarOverviewHeader,
  CalendarToolbar,
  CalendarFilters,
  CalendarWorkspace,
  ScheduleModal,
  RescheduleModal,
  DayDetailsDrawer,
  useCalendarDragDrop,
} from '../../../components/calendar';

import { Drawer } from '../../../components/ui/Drawer';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { MediaPreview } from '../../../components/common/MediaPreview';
import { PlatformIcon } from '../../../components/common/PlatformIcon';
import { CommentThread } from '../../../components/common/CommentThread';
import { CheckCircle2, RotateCcw, Clock, CalendarDays } from 'lucide-react';

/**
 * CalendarPage
 * Main workspace content calendar for SocialDesk.
 * Completely rebuilt with bespoke React grid architecture, native HTML5 drag-and-drop,
 * real creative thumbnails, and resilient MySQL-backed scheduling reconciliation.
 */
export const CalendarPage = () => {
  const { role: userRole } = useAuth();
  const toast = useToast();

  const isClient = userRole === ROLES.CLIENT || userRole === 'client' || userRole === 'client_user';
  const canManageCalendar = !isClient;

  // 1. Navigation & View State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day' | 'agenda'
  const [isQueueOpen, setIsQueueOpen] = useState(true);

  // 2. Data Collections
  const [calendarPosts, setCalendarPosts] = useState([]);
  const [unscheduledPosts, setUnscheduledPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // 3. Filters
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('All');
  const [selectedProjectId, setSelectedProjectId] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('All');

  // 4. Modal & Drawer States
  const [selectedPost, setSelectedPost] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [postToSchedule, setPostToSchedule] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('14:00');
  const [conflictData, setConflictData] = useState(null);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Reschedule Confirmation Modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [postToReschedule, setPostToReschedule] = useState(null);
  const [rescheduleSourceDate, setRescheduleSourceDate] = useState('');
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState('');
  const [rescheduleTargetTime, setRescheduleTargetTime] = useState('14:00');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Day Details Drawer ("+N more")
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [dayDrawerDate, setDayDrawerDate] = useState('');
  const [dayDrawerPosts, setDayDrawerPosts] = useState([]);

  // 5. Calculate date range for current view and date
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const firstDayWeekday = firstDay.getDay(); // 0 = Sun
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

  // Fetch real data from backend based on selected client and visible date range
  const loadData = async () => {
    setLoading(true);
    try {
      const cId = selectedClientId === 'All' ? null : selectedClientId;
      const [posts, queue, cList, pList] = await Promise.all([
        calendarService.getCalendarPosts(cId, dateRange.startDate, dateRange.endDate),
        calendarService.getUnscheduledApprovedPosts(cId),
        clientService.getClients().catch(() => []),
        projectService.getProjects().catch(() => []),
      ]);

      setCalendarPosts(Array.isArray(posts) ? posts : []);
      setUnscheduledPosts(Array.isArray(queue) ? queue : []);
      setClients(Array.isArray(cList) ? cList : []);
      setProjects(Array.isArray(pList) ? pList : []);
    } catch (err) {
      toast.error('Error', 'Unable to load calendar data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClientId, dateRange.startDate, dateRange.endDate]);

  // 5. PERIOD TITLE CALCULATION
  const periodTitle = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month' || viewMode === 'agenda') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    if (viewMode === 'week') {
      const dayOfWeek = currentDate.getDay();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });

      if (startMonth === endMonth) {
        return `${startMonth} ${startOfWeek.getDate()} – ${endOfWeek.getDate()}, ${year}`;
      }
      return `${startMonth} ${startOfWeek.getDate()} – ${endMonth} ${endOfWeek.getDate()}, ${year}`;
    }

    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    return '';
  }, [currentDate, viewMode]);

  // Navigation handlers
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

  // Filter calculations
  const filteredCalendarPosts = useMemo(() => {
    return calendarPosts.filter((post) => {
      if (selectedProjectId !== 'All' && String(post.projectId) !== String(selectedProjectId)) return false;
      if (selectedStatusFilter !== 'All' && post.statusKey !== selectedStatusFilter && post.status !== selectedStatusFilter) return false;
      if (
        selectedPlatformFilter !== 'All' &&
        !post.platforms?.map((p) => p.toLowerCase()).includes(selectedPlatformFilter.toLowerCase())
      ) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          (post.title || '').toLowerCase().includes(q) ||
          (post.client || '').toLowerCase().includes(q) ||
          (post.caption || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [calendarPosts, selectedProjectId, selectedStatusFilter, selectedPlatformFilter, search]);

  const filteredUnscheduledPosts = useMemo(() => {
    return unscheduledPosts.filter((post) => {
      if (selectedProjectId !== 'All' && String(post.projectId) !== String(selectedProjectId)) return false;
      if (
        selectedPlatformFilter !== 'All' &&
        !post.platforms?.map((p) => p.toLowerCase()).includes(selectedPlatformFilter.toLowerCase())
      ) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          (post.title || '').toLowerCase().includes(q) ||
          (post.client || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [unscheduledPosts, selectedProjectId, selectedPlatformFilter, search]);

  const stats = useMemo(() => {
    const totalScheduled = calendarPosts.filter(
      (p) => (p.statusKey || '').toLowerCase() === 'scheduled' || (p.status || '').toUpperCase() === 'SCHEDULED'
    ).length;
    const awaitingSchedule = unscheduledPosts.length;
    const published = calendarPosts.filter(
      (p) => (p.statusKey || '').toLowerCase() === 'published' || (p.status || '').toUpperCase() === 'PUBLISHED'
    ).length;
    return { totalScheduled, awaitingSchedule, published };
  }, [calendarPosts, unscheduledPosts]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedClientId('All');
    setSelectedProjectId('All');
    setSelectedStatusFilter('All');
    setSelectedPlatformFilter('All');
  };

  const hasActiveFilters =
    Boolean(search) ||
    selectedClientId !== 'All' ||
    selectedProjectId !== 'All' ||
    selectedStatusFilter !== 'All' ||
    selectedPlatformFilter !== 'All';

  // 6. DRAG & DROP HANDLERS
  const handleScheduleDrop = async ({ item, targetDate, targetTime }) => {
    if (!canManageCalendar) return;

    setPostToSchedule(item);
    setScheduleDate(targetDate);
    setScheduleTime(targetTime || '14:00');

    // Run conflict check
    try {
      const conflict = await calendarService.checkConflict({
        clientId: item.clientId,
        contentId: item.id || item.contentId,
        platforms: item.platforms,
        date: targetDate,
        time: targetTime || '14:00',
      });
      setConflictData(conflict);
    } catch (e) {
      setConflictData(null);
    }

    setIsScheduleModalOpen(true);
  };

  const handleRescheduleDrop = ({ item, sourceDate, targetDate, targetTime }) => {
    if (!canManageCalendar) return;

    setPostToReschedule(item);
    setRescheduleSourceDate(sourceDate || item.date);
    setRescheduleTargetDate(targetDate);
    setRescheduleTargetTime(targetTime || item.time || '14:00');
    setIsRescheduleModalOpen(true);
  };

  const {
    isDragging,
    hoveredDate,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useCalendarDragDrop({
    onScheduleDrop: handleScheduleDrop,
    onRescheduleDrop: handleRescheduleDrop,
    canManage: canManageCalendar,
  });

  // 7. MODAL SUBMISSION HANDLERS
  const handleScheduleSubmit = async ({ post, date, time }) => {
    setIsSubmittingSchedule(true);
    try {
      await calendarService.schedulePost({
        id: post.id || post.contentId,
        contentId: post.contentId || post.id,
        date,
        time,
        timezone: 'UTC',
        platforms: post.platforms,
        title: post.title,
        client: post.client,
        clientId: post.clientId,
        project: post.project,
        caption: post.caption,
        mediaUrl: post.mediaUrl,
      });

      toast.success('Content Scheduled', `Scheduled "${post.title}" for ${date} at ${time}.`);
      setIsScheduleModalOpen(false);
      setPostToSchedule(null);
      loadData();
    } catch (err) {
      toast.error('Unable to schedule content', err.message || 'Failed to schedule post.');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleRescheduleConfirm = async ({ post, date, time }) => {
    setIsSubmittingReschedule(true);
    const prevPostsSnapshot = [...calendarPosts];

    // Optimistic UI update
    setCalendarPosts((prev) =>
      prev.map((p) =>
        String(p.id || p.contentId) === String(post.id || post.contentId)
          ? { ...p, date, time }
          : p
      )
    );

    try {
      await calendarService.reschedulePost(post.id || post.contentId, date, time);
      toast.success('Post Rescheduled', `Moved "${post.title}" to ${date} at ${time}.`);
      setIsRescheduleModalOpen(false);
      setPostToReschedule(null);
      loadData();
    } catch (err) {
      // Revert optimistic update
      setCalendarPosts(prevPostsSnapshot);
      toast.error('Unable to reschedule', err.message || 'Failed to reschedule post.');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Workflow actions on inspect
  const handleUnschedule = async (post) => {
    if (!canManageCalendar) return;
    try {
      await calendarService.unschedulePost(post.id || post.contentId);
      toast.info('Post Unscheduled', `Returned "${post.title}" to Approved Queue.`);
      setIsInspectorOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error', err.message || 'Failed to unschedule post.');
    }
  };

  const handleMarkPublished = async (post) => {
    if (!canManageCalendar) return;
    try {
      await calendarService.markPublished(post.id || post.contentId);
      toast.success('Marked Published', `Updated "${post.title}" status to Published.`);
      setIsInspectorOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error', err.message || 'Failed to mark post as published.');
    }
  };

  // Empty cell click handler
  const handleCellClick = (dateStr, timeStr = '14:00') => {
    if (!canManageCalendar) return;
    if (unscheduledPosts.length > 0) {
      setPostToSchedule(unscheduledPosts[0]);
      setScheduleDate(dateStr);
      setScheduleTime(timeStr);
      setIsScheduleModalOpen(true);
    } else {
      toast.info('No Approved Content', 'Approve content from the Review module first to schedule it.');
    }
  };

  const handleOpenMore = (dateStr, posts) => {
    setDayDrawerDate(dateStr);
    setDayDrawerPosts(posts);
    setIsDayDrawerOpen(true);
  };

  return (
    <div className="w-full space-y-4 select-none pb-8">
      {/* 1. OVERVIEW HEADER */}
      <CalendarOverviewHeader
        isClient={isClient}
        canManage={canManageCalendar}
        stats={stats}
        isQueueOpen={isQueueOpen}
        onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
        onOpenScheduleModal={() => {
          if (unscheduledPosts.length > 0) {
            setPostToSchedule(unscheduledPosts[0]);
            setScheduleDate(new Date().toISOString().split('T')[0]);
            setScheduleTime('14:00');
            setIsScheduleModalOpen(true);
          } else {
            toast.info('Queue Empty', 'All approved content is currently scheduled.');
          }
        }}
      />

      {/* 2. UNIFIED NAVIGATION & SEARCH TOOLBAR */}
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

      {/* 3. HORIZONTAL FILTERS ROW */}
      <CalendarFilters
        clients={clients}
        projects={projects}
        selectedClientId={selectedClientId}
        onClientChange={setSelectedClientId}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        selectedStatus={selectedStatusFilter}
        onStatusChange={setSelectedStatusFilter}
        selectedPlatform={selectedPlatformFilter}
        onPlatformChange={setSelectedPlatformFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {/* 4. SUBTLE EMPTY PERIOD BANNER (OUTSIDE GRID) */}
      {!loading && filteredCalendarPosts.length === 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>No content scheduled for this {viewMode === 'month' ? 'month' : viewMode}.</span>
          </div>
          {canManageCalendar && filteredUnscheduledPosts.length > 0 && (
            <span className="text-xs font-semibold text-[#4F39F6] hidden sm:inline">
              Drag approved items from the queue to schedule.
            </span>
          )}
        </div>
      )}

      {/* 5. MAIN WORKSPACE: CALENDAR GRID + APPROVED QUEUE */}
      <CalendarWorkspace
        viewMode={viewMode}
        currentDate={currentDate}
        posts={filteredCalendarPosts}
        loading={loading}
        canManage={canManageCalendar}
        isDragging={isDragging}
        hoveredDate={hoveredDate}
        onCardClick={(post) => {
          setSelectedPost(post);
          setIsInspectorOpen(true);
        }}
        onCardDragStart={handleDragStart}
        onCardDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onOpenMore={handleOpenMore}
        onCellClick={handleCellClick}
        onReschedule={(post) => {
          setPostToReschedule(post);
          setRescheduleSourceDate(post.date);
          setRescheduleTargetDate(post.date || new Date().toISOString().split('T')[0]);
          setRescheduleTargetTime(post.time || '14:00');
          setIsRescheduleModalOpen(true);
        }}
        onUnschedule={handleUnschedule}
        onMarkPublished={handleMarkPublished}
        queuePosts={filteredUnscheduledPosts}
        isQueueOpen={isQueueOpen}
        onCloseQueue={() => setIsQueueOpen(false)}
        onQueueScheduleClick={(post) => {
          setPostToSchedule(post);
          setScheduleDate(new Date().toISOString().split('T')[0]);
          setScheduleTime('14:00');
          setIsScheduleModalOpen(true);
        }}
      />

      {/* 5. SCHEDULE MODAL */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setPostToSchedule(null);
          setConflictData(null);
        }}
        post={postToSchedule}
        initialDate={scheduleDate}
        initialTime={scheduleTime}
        conflictData={conflictData}
        onSubmit={handleScheduleSubmit}
        isSubmitting={isSubmittingSchedule}
      />

      {/* 6. RESCHEDULE CONFIRMATION MODAL */}
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setPostToReschedule(null);
        }}
        post={postToReschedule}
        sourceDate={rescheduleSourceDate}
        targetDate={rescheduleTargetDate}
        targetTime={rescheduleTargetTime}
        onConfirm={handleRescheduleConfirm}
        isSubmitting={isSubmittingReschedule}
      />

      {/* 7. DAY DETAILS DRAWER ("+N more") */}
      <DayDetailsDrawer
        isOpen={isDayDrawerOpen}
        onClose={() => setIsDayDrawerOpen(false)}
        dateStr={dayDrawerDate}
        posts={dayDrawerPosts}
        canManage={canManageCalendar}
        onCardClick={(post) => {
          setSelectedPost(post);
          setIsInspectorOpen(true);
        }}
        onScheduleNew={(date) => {
          if (unscheduledPosts.length > 0) {
            setPostToSchedule(unscheduledPosts[0]);
            setScheduleDate(date);
            setScheduleTime('14:00');
            setIsScheduleModalOpen(true);
          }
        }}
      />

      {/* 8. INSPECTOR & POST DETAILS DRAWER */}
      <Drawer
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        title="Scheduled Content Details"
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

            {/* Content Details Meta Card */}
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

              <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Avatar src={selectedPost.creatorAvatar} name={selectedPost.creatorName || 'Team'} size="xs" />
                  <div className="min-w-0">
                    <p className="text-[9px] text-slate-400 font-semibold">Created By</p>
                    <p className="font-bold text-slate-700 text-xs truncate">
                      {selectedPost.creatorName || 'Team Member'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar src={selectedPost.reviewerAvatar} name={selectedPost.reviewerName || 'Reviewer'} size="xs" />
                  <div className="min-w-0">
                    <p className="text-[9px] text-slate-400 font-semibold">Approved By</p>
                    <p className="font-bold text-slate-700 text-xs truncate">
                      {selectedPost.reviewerName || 'Reviewer'}
                    </p>
                  </div>
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

            {/* Workflow Actions */}
            {canManageCalendar && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    variant="outline"
                    className="h-10 text-xs font-semibold"
                    onClick={() => {
                      setIsInspectorOpen(false);
                      setPostToReschedule(selectedPost);
                      setRescheduleSourceDate(selectedPost.date);
                      setRescheduleTargetDate(selectedPost.date || new Date().toISOString().split('T')[0]);
                      setRescheduleTargetTime(selectedPost.time || '14:00');
                      setIsRescheduleModalOpen(true);
                    }}
                  >
                    Reschedule
                  </Button>

                  <Button
                    variant="ghost"
                    className="h-10 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-slate-200"
                    onClick={() => handleUnschedule(selectedPost)}
                  >
                    Unschedule
                  </Button>
                </div>

                {selectedPost.statusKey !== 'published' && selectedPost.status !== 'PUBLISHED' && (
                  <Button
                    variant="primary"
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    leftIcon={CheckCircle2}
                    onClick={() => handleMarkPublished(selectedPost)}
                  >
                    Mark as Published
                  </Button>
                )}
              </div>
            )}

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

export default CalendarPage;
