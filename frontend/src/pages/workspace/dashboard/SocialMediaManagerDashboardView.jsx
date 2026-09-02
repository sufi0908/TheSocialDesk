import React, { useState, useEffect } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/common/LoadingState';
import { MyRevisionsWidget } from '../../../components/dashboard/MyRevisionsWidget';
import { DashboardTodoWidget } from '../../../components/dashboard/DashboardTodoWidget';
import { contentService } from '../../../services/contentService';
import { clientService } from '../../../services/clientService';
import { revisionService } from '../../../services/revisionService';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  Users,
  Eye,
} from 'lucide-react';

export const SocialMediaManagerDashboardView = () => {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [contentList, clientList, revs] = await Promise.all([
          contentService.getContentPosts(),
          clientService.getClients(),
          revisionService.getMyRevisions(),
        ]);
        setPosts(contentList || []);
        setClients(clientList || []);
        setRevisions(revs || []);
      } catch (err) {
        console.warn('SMM Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return <LoadingState type="skeleton-cards" count={4} />;
  }

  const planningCount = posts.filter((p) => p.statusKey === 'draft' || p.statusKey === 'in_progress' || p.statusKey === 'internal_review').length;
  const clientReviewCount = posts.filter((p) => p.statusKey === 'client_review').length;
  const scheduledCount = posts.filter((p) => p.statusKey === 'scheduled').length;

  return (
    <div className="space-y-6">
      {/* Quick Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Social Media Manager Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Content planning, client work coordination, editorial calendar management, and approval tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/workspace/calendar')}>
            View Calendar
          </Button>
          <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => navigate('/workspace/content')}>
            Create Content Draft
          </Button>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Content in Planning" value={planningCount} icon={FileText} description="Active campaign drafts" />
        <StatCard title="Client Approvals Pending" value={clientReviewCount} icon={Clock} description="Awaiting sign-off" trend={clientReviewCount > 0 ? 'up' : 'neutral'} />
        <StatCard title="Scheduled Posts" value={scheduledCount} icon={Calendar} description="Queued on calendar" trend="up" />
        <StatCard title="Assigned Clients" value={clients.length} icon={Users} description="Active brand accounts" />
      </div>

      {/* Campaign Content Planning & Client Work */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Active Client Campaign Content ({posts.length})</span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/workspace/content')} rightIcon={ArrowRight}>
                View All Posts
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {posts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No content items found</p>
                <p>Click "Create Content Draft" above to start!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {posts.slice(0, 6).map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                        {post.mediaUrl ? (
                          <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
                            <FileText className="w-6 h-6 text-indigo-400 mb-1" />
                            <span className="text-[10px] text-slate-300 font-semibold truncate max-w-full">{post.title}</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-900/80 text-white text-[10px] font-extrabold backdrop-blur-xs">
                            {post.contentType || 'Post'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">{post.client}</p>
                        <h4 className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2">{post.title}</h4>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <Badge statusKey={post.statusKey} />
                        <span className="text-[10px] font-mono text-slate-400">{post.targetDate || 'Flexible'}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="xs"
                      leftIcon={Eye}
                      className="w-full mt-2"
                      onClick={() => navigate('/workspace/content')}
                    >
                      Inspect Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revisions & To-Do Widgets */}
        <div className="lg:col-span-4 space-y-6">
          <MyRevisionsWidget />
          <DashboardTodoWidget />
        </div>
      </div>
    </div>
  );
};
