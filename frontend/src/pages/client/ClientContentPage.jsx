import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Textarea } from '../../components/forms/Textarea';
import { SearchFilterBar } from '../../components/common/SearchFilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingState } from '../../components/common/LoadingState';
import { clientPortalService } from '../../services/clientPortalService';
import { useToast } from '../../hooks/useToast';
import { STATUS_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import {
  CheckCircle2,
  RotateCcw,
  Eye,
  FileText,
  Clock,
  Sparkles,
  CalendarDays,
  XCircle,
  FolderKanban,
} from 'lucide-react';

export const ClientContentPage = ({ defaultStatusFilter = 'All' }) => {
  const toast = useToast();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Status Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Drawer & Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStatusFilter(defaultStatusFilter);
  }, [defaultStatusFilter]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await clientPortalService.getClientPosts(statusFilter, search);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [search, statusFilter]);

  const handleApprove = async (post) => {
    setIsSubmitting(true);
    try {
      await clientPortalService.approvePost(post.id);
      toast.success('Post Approved!', `Successfully signed off on "${post.title}".`);
      setIsDrawerOpen(false);
      loadPosts();
    } catch (err) {
      toast.error('Error', 'Failed to approve post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async (e) => {
    e.preventDefault();
    if (!revisionReason || !selectedPost) return;

    setIsSubmitting(true);
    try {
      await clientPortalService.requestRevision(selectedPost.id, revisionReason);
      toast.warning('Revision Requested', `Your feedback was sent to the agency team.`);
      setIsRevisionModalOpen(false);
      setIsDrawerOpen(false);
      setRevisionReason('');
      loadPosts();
    } catch (err) {
      toast.error('Error', 'Failed to request revision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDrawer = (post) => {
    setSelectedPost(post);
    setIsDrawerOpen(true);
  };

  // Pagination Math
  const totalItems = posts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedPosts = posts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Client Brand Social Content</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View creative assets, read caption copy, and sign off on posts drafted for your brand.
        </p>
      </div>

      {/* Filter Bar */}
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
          { label: 'All Content', value: 'All' },
          { label: 'Pending Approval', value: STATUS_TYPES.CLIENT_REVIEW },
          { label: 'Approved', value: STATUS_TYPES.APPROVED },
          { label: 'Revision Required', value: STATUS_TYPES.REVISION_REQUIRED },
          { label: 'Rejected', value: STATUS_TYPES.REJECTED },
          { label: 'Scheduled', value: STATUS_TYPES.SCHEDULED },
        ]}
        placeholder="Search post title or caption copy..."
      />

      {/* CLIENT BRAND CONTENT CARDS GRID */}
      {loading ? (
        <LoadingState type="skeleton-cards" count={6} />
      ) : paginatedPosts.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          No social posts found for this view filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedPosts.map((post) => (
            <div
              key={post.id}
              className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Creative Thumbnail Image */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                  <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-900/80 text-white text-[10px] font-extrabold backdrop-blur-xs">
                      {post.contentType}
                    </span>
                  </div>
                </div>

                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-1">{post.title}</h3>
                  <Badge statusKey={post.statusKey} />
                </div>

                {/* Caption Snippet */}
                <p className="text-xs text-slate-600 font-medium line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                  "{post.caption}"
                </p>

                {/* Campaign & Target Channels */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <FolderKanban className="w-3 h-3 text-slate-400" /> {post.project}
                  </span>

                  <div className="flex flex-wrap gap-1">
                    {post.platforms.map((pId) => (
                      <span
                        key={pId}
                        className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase"
                      >
                        {pId}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* CARD FOOTER ACTION */}
              <div className="pt-3 border-t border-slate-100">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Eye}
                  className="w-full"
                  onClick={() => openDrawer(post)}
                >
                  Inspect Post Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            totalResults={totalItems}
            pageSize={pageSize}
          />
        </div>
      )}

      {/* CLIENT APPROVAL DRAWER */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Client Post Inspector"
        size="max-w-xl"
      >
        {selectedPost && (
          <div className="space-y-6">
            {/* Header Box */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div>
                <span className="text-xs font-bold text-indigo-700">{selectedPost.client}</span>
                <h3 className="text-base font-extrabold text-slate-900">{selectedPost.title}</h3>
                <span className="text-[10px] text-slate-400">Campaign: {selectedPost.project}</span>
              </div>
              <Badge statusKey={selectedPost.statusKey} />
            </div>

            {/* ACTION BUTTONS (Approve & Request Revision) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Client Decision</span>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={CheckCircle2}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm"
                  onClick={() => handleApprove(selectedPost)}
                  isLoading={isSubmitting}
                >
                  Approve & Sign-Off
                </Button>

                <Button
                  variant="light"
                  size="lg"
                  leftIcon={RotateCcw}
                  className="w-full bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 font-extrabold"
                  onClick={() => setIsRevisionModalOpen(true)}
                >
                  Request Revision
                </Button>
              </div>
            </div>

            {/* Creative Asset Preview */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Creative Asset</h4>
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-96 bg-slate-900 flex items-center justify-center">
                <img src={selectedPost.mediaUrl} alt="Creative" className="w-full h-full object-contain max-h-96" />
              </div>
            </div>

            {/* Caption & Metadata */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Caption Copy</h4>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedPost.caption}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-600">Target Channels:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedPost.platforms.map((pId) => (
                    <span key={pId} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 uppercase">
                      {pId}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* REQUEST REVISION MODAL */}
      <Modal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        title={`Request Revision: ${selectedPost?.title}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRequestRevision} className="space-y-4">
          <p className="text-xs text-slate-600">
            Explain what changes or adjustments you would like the agency creative team to make.
          </p>

          <Textarea
            label="Revision Instructions"
            placeholder="e.g. Please update the discount promo code and adjust logo placement..."
            rows={4}
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
            required
          />

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsRevisionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-amber-600 hover:bg-amber-700 text-white" isLoading={isSubmitting}>
              Send Revision Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
