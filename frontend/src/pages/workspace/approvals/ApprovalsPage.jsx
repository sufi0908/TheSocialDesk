import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { StatCard } from '../../../components/ui/StatCard';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { SearchFilterBar } from '../../../components/common/SearchFilterBar';
import { Pagination } from '../../../components/ui/Pagination';
import { LoadingState } from '../../../components/common/LoadingState';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { ContentReviewModal } from '../../../components/content/ContentReviewModal';
import { MediaPreview } from '../../../components/common/MediaPreview';
import { approvalService } from '../../../services/approvalService';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { STATUS_TYPES, ROLES } from '../../../utils/constants';
import { formatDate } from '../../../utils/formatters';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  MessageSquare,
  Clock,
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  History,
} from 'lucide-react';

export const ApprovalsPage = () => {
  const { role: userRole, user } = useAuth();
  const toast = useToast();

  const isInternalApprover = [ROLES.SUPERADMIN, ROLES.WORKSPACE_MANAGER, ROLES.GRAPHIC_TEAM_HEAD].includes(userRole);
  const isClientApprover = [ROLES.SUPERADMIN, ROLES.WORKSPACE_MANAGER, ROLES.CLIENT].includes(userRole) || userRole === 'client_user';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Selected post for ContentReviewModal
  const [reviewPost, setReviewPost] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await approvalService.getApprovalPosts();
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveInternal = async (postId) => {
    setIsSubmitting(true);
    try {
      await approvalService.internalApprove(postId, { notes: 'Passed internal review.' });
      toast.success('Approved Internally! ✅', 'Content submitted for Client Review.');
      loadData();
    } catch (err) {
      toast.error('Approval Failed', err.response?.data?.message || 'Failed to approve content.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveClient = async (postId) => {
    setIsSubmitting(true);
    try {
      await approvalService.clientApprove(postId, { notes: 'Approved by client.' });
      toast.success('Client Approved! 🎉', 'Post marked as APPROVED and pushed to Calendar queue.');
      loadData();
    } catch (err) {
      toast.error('Approval Failed', err.response?.data?.message || 'Failed to record client approval.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.client || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.creator || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.statusKey === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredPosts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace/dashboard' }, { label: 'Approval Pipeline' }]} />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 mb-1.5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Multi-Stage Agency Approval Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Content Approvals</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review creative assets, verify copy guidelines, track version history, and manage client sign-offs.
          </p>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Internal Review"
          value={posts.filter((p) => p.statusKey === STATUS_TYPES.INTERNAL_REVIEW || p.statusKey === 'internal_review').length}
          icon={Clock}
          description="Awaiting reviewer approval"
        />
        <StatCard
          title="Client Review"
          value={posts.filter((p) => p.statusKey === STATUS_TYPES.CLIENT_REVIEW || p.statusKey === 'client_review').length}
          icon={Send}
          description="Awaiting client sign-off"
        />
        <StatCard
          title="Revision Required"
          value={posts.filter((p) => p.statusKey === STATUS_TYPES.REVISION_REQUIRED || p.statusKey === 'revision_required').length}
          icon={RotateCcw}
          description="Changes requested"
        />
        <StatCard
          title="Approved Content"
          value={posts.filter((p) => p.statusKey === STATUS_TYPES.APPROVED || p.statusKey === 'approved').length}
          icon={CheckCircle2}
          description="Ready for Calendar"
        />
      </div>

      {/* Search & Status Filter */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setCurrentPage(1);
        }}
        statusOptions={[
          { label: 'All Approvals', value: 'All' },
          { label: 'Internal Review', value: STATUS_TYPES.INTERNAL_REVIEW },
          { label: 'Client Review', value: STATUS_TYPES.CLIENT_REVIEW },
          { label: 'Revision Required', value: STATUS_TYPES.REVISION_REQUIRED },
          { label: 'Approved', value: STATUS_TYPES.APPROVED },
        ]}
        placeholder="Search by post title, client or creator..."
      />

      {/* APPROVAL REQUEST CARDS GRID */}
      {loading ? (
        <LoadingState type="skeleton-cards" count={6} />
      ) : paginatedPosts.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          No approval items found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedPosts.map((post) => {
            const mediaObject = post.media || post.mediaAssets?.[0] || post.mediaUrl || null;
            return (
              <div
                key={post.id}
                className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Creative Thumbnail */}
                  <MediaPreview
                    media={mediaObject}
                    alt={post.title}
                    aspectRatio="aspect-video"
                  />

                  {/* Title, Client & Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{post.title}</h3>
                      <p className="text-[10px] font-bold text-indigo-600">Client: {post.client}</p>
                    </div>
                    <Badge statusKey={post.statusKey} />
                  </div>

                  {/* Caption Snippet */}
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                    "{post.caption || 'No caption copy.'}"
                  </p>

                  {/* Creator & Target Platforms */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar src={post.creatorAvatar} name={post.creator} size="xs" />
                      <div>
                        <p className="font-semibold text-slate-900 leading-none">{post.creator}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{post.assigneeName}</p>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-slate-400">{formatDate(post.submittedAt)}</span>
                  </div>
                </div>

                {/* CARD FOOTER ACTIONS */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="xs"
                    leftIcon={Eye}
                    onClick={() => setReviewPost(post)}
                  >
                    Review & Sign-off
                  </Button>

                  {isInternalApprover && (post.statusKey === STATUS_TYPES.INTERNAL_REVIEW || post.statusKey === 'internal_review') && (
                    <Button
                      variant="light"
                      size="xs"
                      className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                      onClick={() => handleApproveInternal(post.id)}
                      isLoading={isSubmitting}
                    >
                      Approve Internal
                    </Button>
                  )}

                  {isClientApprover && (post.statusKey === STATUS_TYPES.CLIENT_REVIEW || post.statusKey === 'client_review') && (
                    <Button
                      variant="light"
                      size="xs"
                      className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                      onClick={() => handleApproveClient(post.id)}
                      isLoading={isSubmitting}
                    >
                      Approve Client
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Navigation */}
      {totalItems > 0 && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalResults={totalItems}
            pageSize={pageSize}
          />
        </div>
      )}

      {/* COMPREHENSIVE CONTENT REVIEW MODAL */}
      <ContentReviewModal
        isOpen={!!reviewPost}
        onClose={() => setReviewPost(null)}
        post={reviewPost}
        onActionSuccess={() => {
          setReviewPost(null);
          loadData();
        }}
      />
    </div>
  );
};
