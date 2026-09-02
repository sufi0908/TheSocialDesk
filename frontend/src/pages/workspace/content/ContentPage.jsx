import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Select } from '../../../components/forms/Select';
import { Pagination } from '../../../components/ui/Pagination';
import { LoadingState } from '../../../components/common/LoadingState';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { SafeImage } from '../../../components/common/SafeImage';
import { ContentCard } from '../../../components/content/ContentCard';
import { ContentDetailsDrawer } from '../../../components/content/ContentDetailsDrawer';
import { ContentReviewModal } from '../../../components/content/ContentReviewModal';
import { ContentEditorModal } from './ContentEditorModal';
import { contentService } from '../../../services/contentService';
import { clientService } from '../../../services/clientService';
import { projectService } from '../../../services/projectService';
import { teamService } from '../../../services/teamService';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { getMediaUrl } from '../../../utils/mediaUtils';
import { STATUS_TYPES, ROLES, STATUS_CONFIG } from '../../../utils/constants';
import { formatDate } from '../../../utils/formatters';
import {
  FileText,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  Search,
  Kanban,
  List,
  LayoutGrid,
  GripVertical,
  Copy,
  CheckSquare,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const ContentPage = () => {
  const { role: userRole } = useAuth();
  const toast = useToast();

  const isClient = userRole === ROLES.CLIENT;
  const canDrag = !isClient;

  // View Mode: 'grid' | 'kanban' | 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Posts Data & Metadata
  const [posts, setPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('All');
  const [selectedProjectId, setSelectedProjectId] = useState('All');
  const [selectedAssignee, setSelectedAssignee] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedContentType, setSelectedContentType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals and Drawers
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [detailsPost, setDetailsPost] = useState(null);
  const [reviewPost, setReviewPost] = useState(null);
  const [videoPostToPlay, setVideoPostToPlay] = useState(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Selection State
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);

  // Ref to cancel in-flight requests
  const abortControllerRef = useRef(null);

  // 1. Load Filter Metadata (Clients, Projects, Team) ONCE on mount
  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const [clientList, projectList, teamList] = await Promise.all([
          clientService.getClients(),
          projectService.getProjects(),
          teamService.getTeamMembers(),
        ]);
        if (isMounted) {
          setClients(Array.isArray(clientList) ? clientList : []);
          setProjects(Array.isArray(projectList) ? projectList : []);
          setTeamMembers(Array.isArray(teamList) ? teamList : []);
        }
      } catch (err) {
        console.warn('Failed to load filter metadata:', err);
      }
    };
    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Debounce Search Input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 3. Fast, Non-Blocking Posts Loader
  const loadPosts = useCallback(
    async (showLoadingSpinner = true) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (showLoadingSpinner) {
        setLoading(true);
      }
      setHasError(false);

      try {
        const postList = await contentService.getContentPosts({
          search: debouncedSearch,
          clientId: selectedClientId,
          projectId: selectedProjectId,
          assigneeName: selectedAssignee,
          platform: selectedPlatform,
          contentType: selectedContentType,
        });

        setPosts(Array.isArray(postList) ? postList : []);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Error fetching content posts:', err);
          setHasError(true);
        }
      } finally {
        if (showLoadingSpinner) {
          setLoading(false);
        }
      }
    },
    [debouncedSearch, selectedClientId, selectedProjectId, selectedAssignee, selectedPlatform, selectedContentType]
  );

  useEffect(() => {
    loadPosts(true);
    setCurrentPage(1);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadPosts]);

  // Handle Card Click Action
  const handleCardClick = (post) => {
    const isReviewerRole = userRole === ROLES.WORKSPACE_MANAGER || userRole === ROLES.SUPERADMIN || userRole === ROLES.CLIENT;
    const isReviewableStatus = post.statusKey === STATUS_TYPES.INTERNAL_REVIEW || post.statusKey === STATUS_TYPES.CLIENT_REVIEW;

    if (isReviewerRole && isReviewableStatus) {
      setReviewPost(post);
    } else if (post.statusKey === STATUS_TYPES.DRAFT || post.statusKey === STATUS_TYPES.REVISION_REQUIRED) {
      openEditEditor(post);
    } else {
      setDetailsPost(post);
    }
  };

  // 8 KANBAN PIPELINE COLUMNS
  const PIPELINE_COLUMNS = [
    { key: STATUS_TYPES.DRAFT, label: 'Draft', color: 'border-slate-300 bg-slate-50/70' },
    { key: STATUS_TYPES.IN_PROGRESS, label: 'In Progress', color: 'border-blue-300 bg-blue-50/40' },
    { key: STATUS_TYPES.INTERNAL_REVIEW, label: 'Internal Review', color: 'border-indigo-300 bg-indigo-50/40' },
    { key: STATUS_TYPES.CLIENT_REVIEW, label: 'Client Review', color: 'border-amber-300 bg-amber-50/40' },
    { key: STATUS_TYPES.REVISION_REQUIRED, label: 'Revision Required', color: 'border-orange-300 bg-orange-50/40' },
    { key: STATUS_TYPES.APPROVED, label: 'Approved', color: 'border-emerald-300 bg-emerald-50/40' },
    { key: STATUS_TYPES.SCHEDULED, label: 'Scheduled', color: 'border-cyan-300 bg-cyan-50/40' },
    { key: STATUS_TYPES.PUBLISHED, label: 'Published', color: 'border-purple-300 bg-purple-50/40' },
  ];

  // Drag & Drop Kanban Handlers with Optimistic Updates
  const handleDragStart = (e, post) => {
    if (!canDrag) return;
    e.dataTransfer.setData('text/plain', post.id);
  };

  const handleDragOver = (e) => {
    if (!canDrag) return;
    e.preventDefault();
  };

  const handleDropOnColumn = async (e, targetStatusKey) => {
    if (!canDrag) return;
    e.preventDefault();
    const postId = e.dataTransfer.getData('text/plain');
    if (!postId) return;

    const targetPost = posts.find((p) => String(p.id) === String(postId));
    if (targetPost && targetPost.statusKey !== targetStatusKey) {
      // Optimistic local state update
      setPosts((prev) =>
        prev.map((p) => (String(p.id) === String(postId) ? { ...p, statusKey: targetStatusKey } : p))
      );

      try {
        await contentService.updatePostStatus(postId, targetStatusKey);

        const statusLabel = STATUS_CONFIG[targetStatusKey]?.label || targetStatusKey;
        if (targetStatusKey === STATUS_TYPES.APPROVED) {
          toast.success('Moved to Approved!', `"${targetPost.title}" is now approved & ready for calendar scheduling.`);
        } else {
          toast.info('Status Updated', `Moved "${targetPost.title}" to ${statusLabel}.`);
        }
        // Non-blocking background sync
        loadPosts(false);
      } catch (err) {
        toast.error('Error', 'Failed to update post status.');
        // Revert on failure
        loadPosts(false);
      }
    }
  };

  const handleDeletePost = async () => {
    if (!deleteConfirmPost) return;
    setIsDeleting(true);
    try {
      await contentService.deleteContentPost(deleteConfirmPost.id);
      toast.success('Post Deleted', `Deleted post "${deleteConfirmPost.title}".`);
      setDeleteConfirmPost(null);
      setPosts((prev) => prev.filter((p) => p.id !== deleteConfirmPost.id));
      loadPosts(false);
    } catch (err) {
      toast.error('Error', 'Failed to delete content post.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicatePost = async (e, post) => {
    if (e) e.stopPropagation();
    try {
      const duplicated = await contentService.duplicateContentPost(post.id);
      toast.success('Content Duplicated!', `Created draft "${duplicated.title}".`);
      loadPosts(false);
    } catch (err) {
      toast.error('Error', 'Failed to duplicate content.');
    }
  };

  const toggleSelectPost = (id) => {
    setSelectedPostIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedPostIds.length === paginatedPosts.length) {
      setSelectedPostIds([]);
    } else {
      setSelectedPostIds(paginatedPosts.map((p) => p.id));
    }
  };

  const handleBulkStatusChange = async (targetStatusKey) => {
    if (selectedPostIds.length === 0) return;
    try {
      await contentService.bulkUpdateStatus(selectedPostIds, targetStatusKey);
      toast.success(
        'Bulk Status Updated',
        `Updated ${selectedPostIds.length} posts to ${STATUS_CONFIG[targetStatusKey]?.label || targetStatusKey}.`
      );
      setSelectedPostIds([]);
      loadPosts(false);
    } catch (err) {
      toast.error('Error', 'Failed to perform bulk status update.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPostIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await contentService.bulkDeleteContent(selectedPostIds);
      toast.success('Bulk Delete Complete', `Deleted ${selectedPostIds.length} content posts.`);
      setSelectedPostIds([]);
      setIsBulkConfirmOpen(false);
      loadPosts(false);
    } catch (err) {
      toast.error('Error', 'Failed to perform bulk delete.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const openCreateEditor = () => {
    setSelectedPost(null);
    setIsEditorOpen(true);
  };

  const openEditEditor = (post) => {
    setSelectedPost(post);
    setIsEditorOpen(true);
  };

  const renderPlatformBadge = (pId) => {
    const formatted = pId.toUpperCase();
    return (
      <span
        key={pId}
        className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black border border-indigo-200/80 inline-block shadow-2xs"
      >
        {formatted}
      </span>
    );
  };

  // Pagination Calculation
  const totalItems = posts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedPosts = posts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace/dashboard' }, { label: 'Multi-Channel Content' }]} />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 mb-1.5 shadow-2xs">
            <Kanban className="w-4 h-4 text-indigo-600" /> Multi-Channel Agency Content Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Content Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-channel posts across Pipeline Board, Card Grid, or Table View with high-performance non-blocking media.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 3-Way View Switcher Toggle */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Pipeline Board
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Table View
            </button>
          </div>

          <Button variant="gradient" size="sm" leftIcon={Plus} onClick={openCreateEditor}>
            Create Content
          </Button>
        </div>
      </div>

      {/* SEARCH & MULTI-FILTER BAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search content by title, client, or caption..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <Select
            label="Client Brand"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            options={[
              { value: 'All', label: 'All Clients' },
              ...clients.map((c) => ({ value: c.id, label: c.companyName || c.name })),
            ]}
          />

          <Select
            label="Campaign Project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            options={[
              { value: 'All', label: 'All Projects' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />

          <Select
            label="Assignee"
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            options={[
              { value: 'All', label: 'All Team Members' },
              ...teamMembers.map((m) => ({ value: m.name, label: m.name })),
            ]}
          />

          <Select
            label="Platform"
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            options={[
              { value: 'All', label: 'All Platforms' },
              { value: 'instagram', label: 'Instagram' },
              { value: 'facebook', label: 'Facebook' },
              { value: 'twitter', label: 'X / Twitter' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'tiktok', label: 'TikTok' },
              { value: 'youtube', label: 'YouTube' },
            ]}
          />

          <Select
            label="Format"
            value={selectedContentType}
            onChange={(e) => setSelectedContentType(e.target.value)}
            options={[
              { value: 'All', label: 'All Formats' },
              { value: 'Single Post', label: 'Single Post' },
              { value: 'Carousel Post', label: 'Carousel Post' },
              { value: 'Reel / Short', label: 'Reel / Short' },
              { value: 'Story', label: 'Story' },
              { value: 'Video', label: 'Video' },
            ]}
          />
        </div>
      </div>

      {/* ERROR STATE WITH RETRY */}
      {hasError && !loading && (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-extrabold text-rose-900">Unable to load content posts</h3>
          <p className="text-xs text-rose-700">Please check your network connection and try again.</p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={RefreshCw}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            onClick={() => loadPosts(true)}
          >
            Retry Loading
          </Button>
        </div>
      )}

      {/* 1. KANBAN PIPELINE BOARD VIEW */}
      {viewMode === 'kanban' && !hasError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((col) => {
            const columnPosts = posts.filter(
              (p) => (p.statusKey || '').toLowerCase() === col.key.toLowerCase()
            );

            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnColumn(e, col.key)}
                className={`flex flex-col rounded-2xl border p-3.5 space-y-3 min-h-[500px] transition-colors ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{col.label}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 text-[10px] font-black border border-slate-200 shadow-2xs">
                      {columnPosts.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards Container */}
                <div className="space-y-3 flex-1">
                  {loading ? (
                    <LoadingState type="skeleton-cards" count={2} />
                  ) : columnPosts.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200/80 rounded-xl flex items-center justify-center text-[11px] font-bold text-slate-400 select-none">
                      Drop content here
                    </div>
                  ) : (
                    columnPosts.map((post) => (
                      <ContentCard
                        key={post.id}
                        post={post}
                        draggable={canDrag}
                        onDragStart={(e) => handleDragStart(e, post)}
                        onClick={handleCardClick}
                        onPlayVideo={(p) => setVideoPostToPlay(p)}
                        viewType="kanban"
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. CARD GRID VIEW */}
      {viewMode === 'grid' && !hasError && (
        <div className="space-y-4">
          {loading ? (
            <LoadingState type="skeleton-cards" count={6} />
          ) : paginatedPosts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 shadow-2xs space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No Content Yet</p>
              <p>Create your first content item or adjust your search filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedPosts.map((post) => (
                <ContentCard
                  key={post.id}
                  post={post}
                  onClick={handleCardClick}
                  onPlayVideo={(p) => setVideoPostToPlay(p)}
                  viewType="grid"
                />
              ))}
            </div>
          )}

          {/* Pagination Navigation */}
          {totalItems > 0 && !loading && (
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
        </div>
      )}

      {/* 3. TABLE VIEW */}
      {viewMode === 'table' && !hasError && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <LoadingState type="table" count={5} />
              ) : paginatedPosts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No content items found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedPostIds.length === paginatedPosts.length && paginatedPosts.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </TableHead>
                      <TableHead>Creative & Post Title</TableHead>
                      <TableHead>Client & Campaign</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Platforms</TableHead>
                      <TableHead>Assigned Person</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedPostIds.includes(post.id)}
                            onChange={() => toggleSelectPost(post.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <SafeImage
                              src={post.mediaUrl}
                              alt={post.title}
                              fallbackType="creative"
                              timeoutMs={6000}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer" onClick={() => handleCardClick(post)}>
                                {post.title}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">Created: {formatDate(post.createdAt)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-slate-900">{post.client}</p>
                          <p className="text-[10px] text-slate-400">{post.project}</p>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                            {post.contentType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {post.platforms.map((pId) => renderPlatformBadge(pId))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar src={post.assigneeAvatar} name={post.assigneeName} size="xs" />
                            <span className="font-medium text-slate-800 text-xs">{post.assigneeName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge statusKey={post.statusKey} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              iconOnly
                              onClick={(e) => handleDuplicatePost(e, post)}
                              title="Duplicate Content"
                            >
                              <Copy className="w-3.5 h-3.5 text-indigo-600" />
                            </Button>
                            <Button variant="ghost" size="xs" iconOnly onClick={() => openEditEditor(post)}>
                              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                            <Button variant="ghost" size="xs" iconOnly onClick={() => setDeleteConfirmPost(post)}>
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination Navigation */}
          {totalItems > 0 && !loading && (
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
        </div>
      )}

      {/* FLOATING BULK ACTIONS TOOLBAR */}
      {selectedPostIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4 z-40 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
            <CheckSquare className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-extrabold">{selectedPostIds.length} items selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              className="bg-slate-800 text-white border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 text-xs font-bold"
              onClick={() => handleBulkStatusChange(STATUS_TYPES.APPROVED)}
            >
              Bulk Approve
            </Button>

            <Button
              variant="outline"
              size="xs"
              className="bg-slate-800 text-white border-slate-700 hover:bg-amber-600 hover:border-amber-500 text-xs font-bold"
              onClick={() => handleBulkStatusChange(STATUS_TYPES.IN_PROGRESS)}
            >
              Set In Progress
            </Button>

            <Button
              variant="outline"
              size="xs"
              className="bg-rose-950 text-rose-200 border-rose-800 hover:bg-rose-700 text-xs font-bold"
              onClick={() => setIsBulkConfirmOpen(true)}
            >
              Bulk Delete
            </Button>
          </div>

          <button
            onClick={() => setSelectedPostIds([])}
            className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer pl-2"
          >
            Deselect
          </button>
        </div>
      )}

      {/* DEDICATED VIDEO PLAYER MODAL (PREVENTS BACKGROUND VIDEO PRELOADS) */}
      <Modal
        isOpen={!!videoPostToPlay}
        onClose={() => setVideoPostToPlay(null)}
        title={videoPostToPlay?.title || 'Video Player'}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800 shadow-xl">
            {videoPostToPlay && (
              <video
                src={getMediaUrl(videoPostToPlay.media?.url || videoPostToPlay.mediaUrl)}
                controls
                autoPlay
                preload="auto"
                className="w-full h-full max-h-[70vh] object-contain"
              />
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="font-bold text-slate-900">{videoPostToPlay?.client}</span>
            <span className="font-mono">{videoPostToPlay?.contentType}</span>
          </div>
        </div>
      </Modal>

      {/* CONTENT DETAILS DRAWER */}
      <ContentDetailsDrawer
        isOpen={!!detailsPost}
        onClose={() => setDetailsPost(null)}
        post={detailsPost}
        onEdit={(p) => openEditEditor(p)}
        onReview={(p) => setReviewPost(p)}
        onDelete={(p) => setDeleteConfirmPost(p)}
      />

      {/* ROLE-SPECIFIC CONTENT REVIEW MODAL */}
      <ContentReviewModal
        isOpen={!!reviewPost}
        onClose={() => setReviewPost(null)}
        post={reviewPost}
        onActionSuccess={() => {
          setReviewPost(null);
          loadPosts(false);
        }}
      />

      {/* CONTENT EDITOR WORKSPACE MODAL */}
      <ContentEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        postToEdit={selectedPost}
        onSaveSuccess={() => {
          setIsEditorOpen(false);
          loadPosts(false);
        }}
      />

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteConfirmPost}
        onClose={() => setDeleteConfirmPost(null)}
        onConfirm={handleDeletePost}
        title="Delete Content Post?"
        message={`Are you sure you want to delete "${deleteConfirmPost?.title}"? This cannot be undone.`}
        confirmText="Delete Post"
        isLoading={isDeleting}
      />

      {/* BULK DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Bulk Delete ${selectedPostIds.length} Content Posts?`}
        message={`Are you sure you want to permanently delete all ${selectedPostIds.length} selected content items? This action cannot be undone.`}
        confirmText="Confirm Bulk Delete"
        isLoading={isBulkDeleting}
      />
    </div>
  );
};
