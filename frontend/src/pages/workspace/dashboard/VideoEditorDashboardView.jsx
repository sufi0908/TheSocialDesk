import React, { useState, useEffect } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/common/LoadingState';
import { MyClientsWidget } from '../../../components/dashboard/MyClientsWidget';
import { MyRevisionsWidget } from '../../../components/dashboard/MyRevisionsWidget';
import { DashboardTodoWidget } from '../../../components/dashboard/DashboardTodoWidget';
import { taskService } from '../../../services/taskService';
import { contentService } from '../../../services/contentService';
import { revisionService } from '../../../services/revisionService';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  CheckSquare,
  RotateCcw,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const VideoEditorDashboardView = () => {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [contentPosts, setContentPosts] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [taskList, posts, revs] = await Promise.all([
          taskService.getTasks(),
          contentService.getContentPosts(),
          revisionService.getMyRevisions(),
        ]);
        setTasks(taskList || []);
        setContentPosts(posts || []);
        setRevisions(revs || []);
      } catch (err) {
        console.warn('Video Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return <LoadingState type="skeleton-cards" count={4} />;
  }

  const assignedTasks = tasks.filter((t) => t.status !== 'Completed' && t.status !== 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Video Editor Studio Workbench</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your assigned video editing tasks, reel cuts, video revision requests, deadlines, and media assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/workspace/assets')}>
            Browse Media Assets
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/workspace/tasks')}>
            Video Task Queue
          </Button>
        </div>
      </div>

      {/* 4 Core Video Personal Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Video Editing Tasks" value={assignedTasks.length} icon={Video} description="Reels and promo edits" />
        <StatCard title="Active Projects" value={contentPosts.length} icon={CheckSquare} description="In execution" trend="up" />
        <StatCard title="Video Revisions" value={revisions.length} icon={RotateCcw} description="Edits requested" trend={revisions.length > 0 ? 'up' : 'neutral'} />
        <StatCard title="Total Tasks" value={tasks.length} icon={Clock} description="All active items" />
      </div>

      {/* Main Grid: Video Tasks Cards & Revisions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-600" />
                  <span>My Video Editing Tasks Queue</span>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/workspace/tasks')} rightIcon={ArrowRight}>
                  View All Video Tasks
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {assignedTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  <Video className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No active video tasks</p>
                  <p>Check back later or view media assets!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {assignedTasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-indigo-700">{task.client}</span>
                          <Badge variant="purple">{task.priority || 'Normal'}</Badge>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{task.title}</h4>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <Badge statusKey={task.status?.toLowerCase().replace(' ', '_')} />
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {task.dueDate || 'No date'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <MyClientsWidget />
          <MyRevisionsWidget />
          <DashboardTodoWidget />
        </div>
      </div>
    </div>
  );
};
