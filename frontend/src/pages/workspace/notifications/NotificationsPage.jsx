import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Tabs } from '../../../components/ui/Tabs';
import { LoadingState } from '../../../components/common/LoadingState';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { useNotifications } from '../../../context/NotificationContext';
import { notificationService, NOTIFICATION_EVENTS } from '../../../services/notificationService';
import { useToast } from '../../../hooks/useToast';
import {
  Bell,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  CalendarDays,
  Paperclip,
  MessageSquare,
  UserCheck,
  Send,
  Activity,
  Check,
  Sparkles,
  Inbox,
} from 'lucide-react';

export const NotificationsPage = () => {
  const { unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('center'); // 'center' | 'feed'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const notifs = await notificationService.getNotifications(categoryFilter);
      const feed = await notificationService.getActivityFeed();
      setNotifications(notifs);
      setActivityFeed(feed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, unreadCount]);

  const handleMarkItemRead = async (id) => {
    await markAsRead(id);
    toast.info('Marked as Read', 'Notification item updated.');
    loadData();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    toast.success('All Read!', 'All notifications marked as read.');
    loadData();
  };

  const getEventIcon = (eventType) => {
    if (eventType === NOTIFICATION_EVENTS.TASK_ASSIGNED || eventType === NOTIFICATION_EVENTS.TASK_COMPLETED) {
      return <UserCheck className="w-4 h-4 text-blue-600" />;
    }
    if (eventType === NOTIFICATION_EVENTS.CLIENT_APPROVED || eventType === NOTIFICATION_EVENTS.CONTENT_APPROVED) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    }
    if (eventType === NOTIFICATION_EVENTS.REVISION_REQUESTED) {
      return <RotateCcw className="w-4 h-4 text-amber-600" />;
    }
    if (eventType === NOTIFICATION_EVENTS.CONTENT_REJECTED) {
      return <XCircle className="w-4 h-4 text-rose-600" />;
    }
    if (eventType === NOTIFICATION_EVENTS.CONTENT_SCHEDULED) {
      return <CalendarDays className="w-4 h-4 text-cyan-600" />;
    }
    if (eventType === NOTIFICATION_EVENTS.ASSET_UPLOADED) {
      return <Paperclip className="w-4 h-4 text-indigo-600" />;
    }
    if (eventType === NOTIFICATION_EVENTS.COMMENT_ADDED) {
      return <MessageSquare className="w-4 h-4 text-purple-600" />;
    }
    return <Send className="w-4 h-4 text-indigo-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace/dashboard' }, { label: 'Notification Center & Activity' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 mb-1">
            <Bell className="w-3.5 h-3.5" /> Socket.io Event Stream Ready
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notification & Activity Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time alerts for approvals, client feedback, task assignments, and agency audit activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={Check}
              onClick={handleMarkAllRead}
            >
              Mark All as Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* SECTION A: NOTIFICATION CENTER */}
      <div className="space-y-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'Unread', 'Approvals', 'Tasks', 'Assets', 'Comments'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notifications Table */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Inbox className="w-4 h-4 text-indigo-600" />
                <span>Inbox Alerts ({notifications.length})</span>
              </CardTitle>

              {unreadCount > 0 && (
                <Button variant="ghost" size="xs" onClick={markAllAsRead} className="text-indigo-600 font-bold">
                  Mark All Read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <LoadingState type="skeleton-table" />
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">All caught up!</p>
                <p>No unread notifications in this category.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id);
                    }}
                    className={`p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer ${
                      !n.isRead ? 'bg-indigo-50/40 border-l-4 border-l-indigo-600' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                        <Bell className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-900 text-sm">{n.title}</p>
                          <Badge variant="indigo">{n.category}</Badge>
                        </div>
                        <p className="text-slate-600 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-slate-400 font-mono pt-0.5">{n.time}</p>
                      </div>
                    </div>

                    {!n.isRead && (
                      <Badge variant="danger" dot className="self-start sm:self-center shrink-0">
                        Unread
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
