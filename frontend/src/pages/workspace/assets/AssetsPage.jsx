import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/forms/Input';
import { Select } from '../../../components/forms/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { Pagination } from '../../../components/ui/Pagination';
import { LoadingState } from '../../../components/common/LoadingState';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { FileUpload } from '../../../components/common/FileUpload';
import { AssetDetailsDrawer } from '../../../components/assets/AssetDetailsDrawer';
import { AssetFolderModal } from '../../../components/assets/AssetFolderModal';
import { StorageBreakdownModal } from '../../../components/assets/StorageBreakdownModal';
import { MediaPreviewModal } from '../../../components/assets/MediaPreviewModal';
import { assetService, ASSET_TYPES } from '../../../services/assetService';
import { clientService } from '../../../services/clientService';
import { teamService } from '../../../services/teamService';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { formatDate, formatFileSize } from '../../../utils/formatters';
import {
  Image as ImageIcon,
  Video,
  FileText,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Trash2,
  FolderOpen,
  FolderPlus,
  Grid,
  List,
  Eye,
  CheckSquare,
  Square,
  HardDrive,
  Clock,
  Sparkles,
  Layers,
  AlertTriangle,
  PieChart,
  Tag,
  CheckCircle2,
  Mic,
  Music,
  Play,
  Info,
  ExternalLink,
  Zap,
  CloudUpload,
  MoreVertical,
  Edit2,
  FolderEdit,
} from 'lucide-react';

export const AssetsPage = () => {
  const { user } = useAuth();
  const toast = useToast();

  // View Mode State: 'grid' | 'list'
  const [viewMode, setViewMode] = useState('grid');

  // Stats State (Real MySQL Aggregation)
  const [stats, setStats] = useState(null);

  // Asset Data & Collections State
  const [assets, setAssets] = useState([]);
  const [clients, setClients] = useState([]);
  const [uploaders, setUploaders] = useState([]);
  const [folders, setFolders] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Filters State
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('All'); // 'All' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'VOICE_NOTE'
  const [selectedClientId, setSelectedClientId] = useState('All');
  const [selectedUploaderId, setSelectedUploaderId] = useState('All');
  const [selectedFolderId, setSelectedFolderId] = useState('All');
  const [dateRange, setDateRange] = useState('All');
  const [sizeRange, setSizeRange] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'largest' | 'smallest' | 'name_asc' | 'name_desc'

  // Loading & Upload State
  const [loading, setLoading] = useState(true);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // File Input Ref for Drag & Drop
  const fileInputRef = useRef(null);

  // Duplicate Alert Modal State
  const [duplicateAlert, setDuplicateAlert] = useState(null);

  // Inspector Drawer State & Preview Modal State
  const [inspectingAssetId, setInspectingAssetId] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);

  // Folder & Storage Modals State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState('create');
  const [folderToEdit, setFolderToEdit] = useState(null);
  const [folderMenuOpenId, setFolderMenuOpenId] = useState(null);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  // Bulk Selection State
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Close folder action dropdown on click outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setFolderMenuOpenId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const loadStatsAndFilters = async () => {
    try {
      const [statsRes, clientsRes, teamRes, foldersRes] = await Promise.allSettled([
        assetService.getAssetStats(),
        clientService.getClients(),
        teamService.getTeamMembers(),
        assetService.listFolders(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
      if (clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value)) {
        setClients(clientsRes.value);
      }
      if (teamRes.status === 'fulfilled' && Array.isArray(teamRes.value)) {
        setUploaders(teamRes.value);
      }
      if (foldersRes.status === 'fulfilled' && Array.isArray(foldersRes.value)) {
        setFolders(foldersRes.value);
      }
    } catch (err) {
      console.warn('Unable to load workspace storage statistics:', err);
    }
  };

  const loadAssetsData = async () => {
    setLoading(true);
    try {
      const result = await assetService.getAssets({
        page: currentPage,
        limit: pageSize,
        search,
        fileType,
        clientId: selectedClientId,
        uploaderId: selectedUploaderId,
        folderId: selectedFolderId,
        dateRange,
        sizeRange,
        sortBy,
      });

      setAssets(result.assets || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.total || 0);
    } catch (err) {
      toast.error('Error', 'Unable to load asset library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatsAndFilters();
  }, []);

  useEffect(() => {
    loadAssetsData();
  }, [
    currentPage,
    search,
    fileType,
    selectedClientId,
    selectedUploaderId,
    selectedFolderId,
    dateRange,
    sizeRange,
    sortBy,
  ]);

  // Bulk Selection Toggle
  const toggleSelectAsset = (id) => {
    if (selectedAssetIds.includes(id)) {
      setSelectedAssetIds(selectedAssetIds.filter((item) => item !== id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedAssetIds.length === assets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(assets.map((a) => a.id));
    }
  };

  // Upload Handling with Duplicate Detection
  const handleUploadFile = async (incoming) => {
    const fileList = Array.isArray(incoming) ? incoming : (incoming ? [incoming] : []);
    if (fileList.length === 0) return;

    setIsUploading(true);
    try {
      const metadata = {
        clientId: selectedClientId !== 'All' && selectedClientId !== 'all' ? selectedClientId : undefined,
        folderId: selectedFolderId !== 'All' && selectedFolderId !== 'all' && selectedFolderId !== 'ROOT' ? selectedFolderId : undefined,
      };

      for (const file of fileList) {
        if (!file || !(file instanceof File || file instanceof Blob)) continue;
        const result = await assetService.uploadAsset(file, metadata);

        if (result?.isDuplicate) {
          setDuplicateAlert({
            file,
            metadata,
            existingAsset: result.existingAsset,
          });
        } else {
          toast.success('Asset Uploaded', `Uploaded "${file.name}" to media library.`);
        }
      }
      loadStatsAndFilters();
      loadAssetsData();
    } catch (err) {
      toast.error('Upload Failed', err.response?.data?.message || err.message || 'File upload error.');
    } finally {
      setIsUploading(false);
    }
  };

  // Drag & Drop Dropzone Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleUploadFile(droppedFiles);
    }
  };

  // Force Duplicate Upload
  const handleForceUploadDuplicate = async () => {
    if (!duplicateAlert) return;
    setIsUploading(true);
    try {
      await assetService.uploadAsset(duplicateAlert.file, {
        ...duplicateAlert.metadata,
        forceUpload: true,
      });
      toast.info('Asset Uploaded', `Uploaded duplicate file "${duplicateAlert.file.name}".`);
      setDuplicateAlert(null);
      loadStatsAndFilters();
      loadAssetsData();
    } catch (err) {
      toast.error('Error', 'Failed to upload duplicate file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Bulk Delete Handler
  const handleBulkDeleteConfirm = async () => {
    if (selectedAssetIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await assetService.bulkDeleteAssets(selectedAssetIds, true);
      toast.info('Assets Deleted', `Removed ${res.count || selectedAssetIds.length} asset(s).`);
      setSelectedAssetIds([]);
      loadStatsAndFilters();
      loadAssetsData();
    } catch (err) {
      toast.error('Error', 'Bulk delete failed.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // MIME Type & File Extension Classifiers
  const isImageFile = (asset) =>
    asset.mimeType?.startsWith('image/') ||
    asset.assetType === 'IMAGE' ||
    /\.(png|jpe?g|webp|gif|svg|bmp|avif|heic)$/i.test(asset.fileName || asset.name || '');

  const isVideoFile = (asset) =>
    asset.mimeType?.startsWith('video/') ||
    asset.assetType === 'VIDEO' ||
    /\.(mp4|webm|mov|mkv|avi|m4v|wmv)$/i.test(asset.fileName || asset.name || '');

  const isPdfOrDoc = (asset) =>
    asset.mimeType === 'application/pdf' ||
    asset.assetType === 'DOCUMENT' ||
    /\.(pdf|docx?|pptx?|xlsx?|txt|csv|zip)$/i.test(asset.fileName || asset.name || '');

  const isAudioFile = (asset) =>
    asset.mimeType?.startsWith('audio/') ||
    asset.assetType === 'VOICE_NOTE' ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(asset.fileName || asset.name || '');

  // Helper to render Masonry Type-Specific Thumbnails preserving Aspect Ratio
  const renderMasonryThumbnail = (asset) => {
    if (isImageFile(asset)) {
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-[#F8F9FC] border border-[#E5E7EB] group/img">
          <img
            src={asset.url}
            alt={asset.name}
            loading="lazy"
            onError={(e) => {
              if (asset.fallbackViewUrl && e.currentTarget.src !== asset.fallbackViewUrl) {
                e.currentTarget.src = asset.fallbackViewUrl;
              } else {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex';
                }
              }
            }}
            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="hidden w-full aspect-video items-center justify-center bg-[#F8F9FC] text-slate-400">
            <ImageIcon className="w-8 h-8 text-slate-400" />
          </div>
        </div>
      );
    }

    if (isVideoFile(asset)) {
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 group/video flex items-center justify-center">
          <video
            src={asset.url}
            preload="metadata"
            className="w-full h-auto max-h-[520px] object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          {/* Prominent Floating Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all z-10">
            <div className="w-12 h-12 rounded-full bg-[#4F39F6] text-white flex items-center justify-center shadow-lg backdrop-blur-xs group-hover/video:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>
        </div>
      );
    }

    if (isAudioFile(asset)) {
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-[#F8F9FC] border border-[#E5E7EB] p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[#4F39F6]/10 border border-[#4F39F6]/20 flex items-center justify-center mx-auto mb-3 animate-pulse shadow-2xs">
            <Mic className="w-7 h-7 text-[#4F39F6]" />
          </div>
          <span className="text-[10px] font-black uppercase font-mono tracking-widest text-[#4F39F6] block">
            AUDIO TRACK
          </span>
          <span className="text-xs font-black text-black mt-1 block truncate max-w-[180px] mx-auto">
            {asset.name}
          </span>
        </div>
      );
    }

    // PDF & Document files render as distinct aspect-[3/4] stylized cards
    const ext = asset.fileName?.split('.').pop()?.toUpperCase() || 'PDF';
    return (
      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-[#F8F9FC] border border-[#E5E7EB] flex flex-col justify-between p-4 text-slate-700 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
            <FileText className="w-5 h-5" />
          </div>
          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black uppercase font-mono tracking-widest border border-amber-200/80">
            {ext}
          </span>
        </div>

        <div className="text-center my-auto px-2 space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center text-amber-600 mx-auto shadow-xs">
            <FileText className="w-8 h-8" />
          </div>
          <p className="text-xs font-black uppercase tracking-tight text-black line-clamp-2 leading-snug" title={asset.name}>
            {asset.name}
          </p>
          <span className="text-[10px] font-mono text-slate-500 font-bold block">{asset.size}</span>
        </div>

        <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[9px] font-extrabold uppercase font-mono text-slate-400">
          <span>{asset.mimeType?.split('/')[1] || 'DOCUMENT'}</span>
          <span>{formatDate(asset.uploadedDate)}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`space-y-6 text-black min-h-screen transition-all ${
        isDragOver ? 'ring-4 ring-[#4F39F6]/50 bg-[#4F39F6]/5 rounded-3xl p-2' : ''
      }`}
    >
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace/dashboard' }, { label: 'Asset & Media Library' }]} />

      {/* Header Banner & CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#4F39F6] bg-[#4F39F6]/10 px-3 py-1 rounded-full border border-[#4F39F6]/20 mb-1.5 shadow-2xs">
            <HardDrive className="w-3.5 h-3.5 text-[#4F39F6]" /> Database-Backed Media Storage
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight uppercase">
            Asset & Media Library
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Masonry multi-format media manager with native aspect ratio support and real-time previews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={FolderPlus}
            onClick={() => {
              setFolderModalMode('create');
              setIsFolderModalOpen(true);
            }}
            className="border-[#E5E7EB] text-slate-700 hover:border-[#4F39F6] hover:text-[#4F39F6] font-bold"
          >
            New Collection
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={Upload}
            onClick={() => setShowUploadArea(!showUploadArea)}
            className="bg-[#4F39F6] hover:bg-[#4330d8] text-white font-extrabold tracking-tight shadow-sm"
          >
            {showUploadArea ? 'Close Upload' : 'Upload Media'}
          </Button>
        </div>
      </div>

      {/* DRAG & DROP OVERLAY DROPZONE */}
      {isDragOver && (
        <div className="p-8 rounded-3xl border-2 border-dashed border-[#4F39F6] bg-[#4F39F6]/5 text-center shadow-lg transition-all animate-pulse">
          <CloudUpload className="w-12 h-12 text-[#4F39F6] mx-auto mb-2" />
          <h3 className="text-base font-black uppercase tracking-tight text-black">
            Drop Files to Upload to Media Library
          </h3>
          <p className="text-xs font-bold text-slate-600 mt-1">
            Files will be stored with SHA-256 duplicate detection and database registration.
          </p>
        </div>
      )}

      {/* 1. BENTO BOX STORAGE & METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3.5">
        {/* Bento Tile 1: Storage Quota & Storage Bar (Spans 6 cols on lg) */}
        <div className="lg:col-span-6 p-5 rounded-3xl bg-white text-black border border-[#E5E7EB] shadow-2xs flex flex-col justify-between space-y-4 hover:border-[#4F39F6]/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4F39F6] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#4F39F6]" /> Storage Capacity
              </span>
              <h2 className="text-xl font-black tracking-tight text-black mt-1">
                {formatFileSize(stats?.totalStorageBytes)} <span className="text-slate-400 font-normal text-sm">/ {formatFileSize(stats?.storageQuotaBytes || 21474836480)}</span>
              </h2>
            </div>
            <Button
              variant="outline"
              size="xs"
              leftIcon={PieChart}
              onClick={() => setIsStorageModalOpen(true)}
              className="border-[#E5E7EB] text-slate-700 hover:bg-[#F8F9FC] hover:text-[#4F39F6] hover:border-[#4F39F6]/40 font-bold"
            >
              Breakdown
            </Button>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-[#E5E7EB]">
              <div
                className="h-full bg-[#4F39F6] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round(((stats?.totalStorageBytes || 0) / (stats?.storageQuotaBytes || 21474836480)) * 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Avg File: <strong className="text-black">{formatFileSize(stats?.avgFileSizeBytes)}</strong></span>
              <span>Largest: <strong className="text-black">{formatFileSize(stats?.largestFileBytes)}</strong></span>
              <span>Newest: <strong className="text-black">{stats?.newestUpload ? formatDate(stats.newestUpload) : 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        {/* Bento Tile 2: Total Assets (Spans 2 cols) */}
        <div className="md:col-span-3 lg:col-span-2 p-4 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs hover:border-[#4F39F6]/40 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Assets</span>
            <div className="w-9 h-9 rounded-2xl bg-[#4F39F6]/10 border border-[#4F39F6]/20 flex items-center justify-center text-[#4F39F6]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-black tracking-tight">{stats?.totalAssets || 0}</p>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Files Managed</span>
          </div>
        </div>

        {/* Bento Tile 3: Images Count (Spans 2 cols) */}
        <div className="md:col-span-3 lg:col-span-2 p-4 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs hover:border-[#4F39F6]/40 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Images</span>
            <div className="w-9 h-9 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-black tracking-tight">{stats?.counts?.images || 0}</p>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
              {formatFileSize(stats?.storageByType?.imagesBytes)}
            </span>
          </div>
        </div>

        {/* Bento Tile 4: Videos & Documents (Spans 2 cols) */}
        <div className="md:col-span-6 lg:col-span-2 p-4 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs hover:border-[#4F39F6]/40 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Videos / Docs</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#4F39F6]">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-xl font-black text-black tracking-tight">{stats?.counts?.videos || 0}</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Videos</span>
            </div>
            <div className="text-right border-l border-slate-100 pl-3">
              <p className="text-xl font-black text-black tracking-tight">{stats?.counts?.documents || 0}</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Docs</span>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DRAG & DROP UPLOAD PANEL */}
      {showUploadArea && (
        <Card className="rounded-3xl border-[#E5E7EB] bg-[#F8F9FC] p-5 shadow-2xs">
          <CardContent className="p-0">
            <FileUpload
              label="Drag & Drop campaign images, videos, or documents to upload to media library"
              sublabel="Files are verified and registered in MySQL with SHA-256 duplicate protection."
              onFileSelect={handleUploadFile}
              isLoading={isUploading}
            />
      </CardContent>
        </Card>
      )}

      {/* COLLECTIONS & FOLDER BAR */}
      <div className="flex flex-wrap items-center gap-2 pb-1 relative z-20">
        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest shrink-0 flex items-center gap-1">
          <FolderOpen className="w-3.5 h-3.5 text-[#4F39F6]" /> Collections:
        </span>

        <button
          type="button"
          onClick={() => {
            setSelectedFolderId('All');
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
            selectedFolderId === 'All'
              ? 'bg-[#4F39F6] text-white shadow-2xs'
              : 'bg-white border border-[#E5E7EB] text-slate-700 hover:bg-[#F8F9FC] hover:text-black hover:border-slate-300'
          }`}
        >
          All Folders
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedFolderId('ROOT');
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
            selectedFolderId === 'ROOT'
              ? 'bg-[#4F39F6] text-white shadow-2xs'
              : 'bg-white border border-[#E5E7EB] text-slate-700 hover:bg-[#F8F9FC] hover:text-black hover:border-slate-300'
          }`}
        >
          Unorganized (Root)
        </button>

        {folders.map((f) => {
          const isSelected = selectedFolderId === f.id.toString();
          const isMenuOpen = folderMenuOpenId === f.id;

          return (
            <div
              key={f.id}
              className="relative inline-flex items-center"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFolderMenuOpenId(isMenuOpen ? null : f.id);
              }}
            >
              <div
                className={`inline-flex items-center rounded-xl text-xs font-extrabold tracking-tight transition-all border ${
                  isSelected
                    ? 'bg-[#4F39F6] text-white border-[#4F39F6] shadow-2xs'
                    : 'bg-white border border-[#E5E7EB] text-slate-700 hover:bg-[#F8F9FC] hover:text-black hover:border-[#4F39F6]/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFolderId(f.id.toString());
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title={`View collection "${f.name}"`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{f.name}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderMenuOpenId(isMenuOpen ? null : f.id);
                  }}
                  className={`p-1.5 mr-1 rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'hover:bg-white/20 text-white/90 hover:text-white'
                      : 'hover:bg-slate-100 text-slate-400 hover:text-black'
                  }`}
                  title="Folder Actions (Edit / Delete)"
                  aria-label="Folder Options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dropdown Menu for Custom Folder */}
              {isMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 mt-1 z-50 w-40 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setFolderMenuOpenId(null);
                      setFolderToEdit(f);
                      setFolderModalMode('edit');
                      setIsFolderModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-700 hover:bg-[#F8F9FC] hover:text-black flex items-center gap-2 font-bold cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#4F39F6]" />
                    <span>Edit Folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFolderMenuOpenId(null);
                      setFolderToEdit(f);
                      setFolderModalMode('delete');
                      setIsFolderModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete Folder</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ACTIVE COLLECTION MANAGEMENT BANNER (When a custom folder is currently active) */}
      {(() => {
        const currentSelectedFolder = folders.find((f) => f.id.toString() === selectedFolderId);
        if (!currentSelectedFolder) return null;

        return (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#4F39F6]/10 border border-[#4F39F6]/20 flex items-center justify-center text-[#4F39F6] shrink-0">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4F39F6] bg-[#4F39F6]/10 px-2 py-0.5 rounded-md border border-[#4F39F6]/20">
                    Collection
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    {currentSelectedFolder.asset_count || 0} Assets
                  </span>
                </div>
                <h3 className="text-sm font-black text-black truncate uppercase tracking-tight mt-0.5">
                  {currentSelectedFolder.name}
                </h3>
                {currentSelectedFolder.description && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {currentSelectedFolder.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                leftIcon={Edit2}
                onClick={() => {
                  setFolderToEdit(currentSelectedFolder);
                  setFolderModalMode('edit');
                  setIsFolderModalOpen(true);
                }}
                className="border-[#E5E7EB] text-slate-700 hover:text-[#4F39F6] hover:border-[#4F39F6] font-bold text-xs"
              >
                Edit Folder
              </Button>

              <Button
                variant="outline"
                size="sm"
                leftIcon={Trash2}
                onClick={() => {
                  setFolderToEdit(currentSelectedFolder);
                  setFolderModalMode('delete');
                  setIsFolderModalOpen(true);
                }}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-xs"
              >
                Delete Folder
              </Button>
            </div>
          </div>
        );
      })()}

      {/* SEARCH, MEDIA TYPE FILTERS & VIEW MODE BENTO BAR */}
      <div className="p-4 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs space-y-3">
        {/* Media Type Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'All', label: 'All Media' },
              { id: 'IMAGE', label: 'Images' },
              { id: 'VIDEO', label: 'Videos' },
              { id: 'DOCUMENT', label: 'PDFs & Docs' },
              { id: 'VOICE_NOTE', label: 'Audio' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFileType(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  fileType === tab.id
                    ? 'bg-[#4F39F6] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-black hover:bg-slate-100/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Masonry vs List */}
          <div className="flex items-center gap-1 bg-[#F8F9FC] p-1 rounded-xl border border-[#E5E7EB] shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#4F39F6] shadow-2xs' : 'text-slate-400 hover:text-black'
              }`}
              title="Masonry Layout"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-[#4F39F6] shadow-2xs' : 'text-slate-400 hover:text-black'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs pt-1">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search filename, client, uploader..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#F8F9FC] border border-[#E5E7EB] rounded-xl focus:outline-hidden focus:border-[#4F39F6] font-medium text-black placeholder:text-slate-400"
            />
          </div>

          {/* Client Filter */}
          <Select
            label="Client Brand"
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'All', label: 'All Clients' },
              ...clients.map((c) => ({ value: c.id, label: c.companyName || c.name })),
            ]}
          />

          {/* Date Range Filter */}
          <Select
            label="Upload Date"
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'All', label: 'All Dates' },
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'last7days', label: 'Last 7 Days' },
              { value: 'last30days', label: 'Last 30 Days' },
              { value: 'thisMonth', label: 'This Month' },
            ]}
          />

          {/* Size Filter */}
          <Select
            label="File Size"
            value={sizeRange}
            onChange={(e) => {
              setSizeRange(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'All', label: 'All Sizes' },
              { value: '<1MB', label: '< 1 MB' },
              { value: '1-10MB', label: '1 – 10 MB' },
              { value: '10-50MB', label: '10 – 50 MB' },
              { value: '50-100MB', label: '50 – 100 MB' },
              { value: '100MB+', label: '100+ MB' },
            ]}
          />

          {/* Sort By */}
          <Select
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'largest', label: 'Largest Size' },
              { value: 'smallest', label: 'Smallest Size' },
              { value: 'name_asc', label: 'Name A-Z' },
              { value: 'name_desc', label: 'Name Z-A' },
            ]}
          />
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedAssetIds.length > 0 && (
        <div className="p-3.5 bg-white border border-[#E5E7EB] text-black rounded-2xl shadow-md flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black uppercase tracking-wider text-[11px] px-2.5 py-1 bg-[#4F39F6] text-white rounded-lg">
              {selectedAssetIds.length} Selected
            </span>
            <button onClick={toggleSelectAll} className="text-slate-600 hover:text-black font-bold cursor-pointer">
              {selectedAssetIds.length === assets.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              leftIcon={FolderOpen}
              onClick={() => {
                setFolderModalMode('move');
                setIsFolderModalOpen(true);
              }}
              className="border-[#E5E7EB] text-slate-700 hover:bg-[#F8F9FC] hover:border-slate-300 font-bold"
            >
              Move Selected
            </Button>

            <Button
              variant="primary"
              size="xs"
              leftIcon={Trash2}
              onClick={handleBulkDeleteConfirm}
              isLoading={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* MEDIA CONTAINER: RESPONSIVE MASONRY LAYOUT OR LIST VIEW */}
      {loading ? (
        <LoadingState type="skeleton-cards" count={8} />
      ) : assets.length === 0 ? (
        <Card className="rounded-3xl border-[#E5E7EB] bg-white p-12 text-center text-xs">
          <Sparkles className="w-8 h-8 text-[#4F39F6] mx-auto mb-2" />
          <p className="text-sm font-black uppercase tracking-tight text-black">No assets found matching criteria.</p>
          <p className="text-slate-500 mt-1 font-medium">Try clearing filters or dragging media files into this area.</p>
          <Button variant="outline" size="sm" leftIcon={Upload} onClick={() => setShowUploadArea(true)} className="mt-4 border-[#E5E7EB] text-slate-700 hover:border-[#4F39F6] hover:text-[#4F39F6] font-bold">
            Upload Asset
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* RESPONSIVE MASONRY LAYOUT USING TAILWIND COLUMNS */
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6">
          {assets.map((asset) => {
            const isSelected = selectedAssetIds.includes(asset.id);

            return (
              <div
                key={asset.id}
                className={`break-inside-avoid mb-6 p-4 rounded-3xl bg-white border transition-all duration-300 ease-out flex flex-col justify-between space-y-3.5 group ${
                  isSelected
                    ? 'border-[#4F39F6] ring-2 ring-[#4F39F6]/20 bg-[#4F39F6]/5 shadow-lg'
                    : 'border-[#E5E7EB] hover:border-[#4F39F6]/40 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1'
                }`}
              >
                <div className="space-y-3">
                  {/* Thumbnail Container & Dynamic Aspect Ratio Rendering */}
                  <div className="relative w-full overflow-hidden">
                    {/* Checkbox Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectAsset(asset.id);
                      }}
                      className="absolute top-3 left-3 z-30 p-1.5 bg-white/90 border border-[#E5E7EB] rounded-xl text-slate-700 backdrop-blur-xs cursor-pointer hover:bg-white transition-colors shadow-xs"
                      title="Select Asset"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#4F39F6]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Type Badge Top Right */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-lg bg-white/90 border border-[#E5E7EB] text-black text-[9px] font-black uppercase tracking-wider backdrop-blur-xs font-mono shadow-xs">
                        {asset.assetType}
                      </span>
                    </div>

                    {/* Dynamic Aspect-Preserved Masonry Thumbnail */}
                    {renderMasonryThumbnail(asset)}

                    {/* HOVER OVERLAY WITH REAL-TIME ACTIONS */}
                    <div className="absolute inset-0 z-20 rounded-2xl bg-black/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2.5 p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewAsset(asset);
                        }}
                        className="p-3 rounded-2xl bg-[#4F39F6] hover:bg-[#4330d8] text-white shadow-xl hover:scale-110 transition-all cursor-pointer"
                        title="Preview / Play"
                      >
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </button>

                      <a
                        href={asset.downloadUrl || asset.url}
                        download={asset.fileName || asset.name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-3 rounded-2xl bg-white hover:bg-slate-100 text-black shadow-xl hover:scale-110 transition-all cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-black" />
                      </a>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingAssetId(asset.id);
                        }}
                        className="p-3 rounded-2xl bg-white hover:bg-slate-100 text-black shadow-xl hover:scale-110 transition-all cursor-pointer"
                        title="View Details"
                      >
                        <Info className="w-4 h-4 text-[#4F39F6]" />
                      </button>
                    </div>
                  </div>

                  {/* Editorial Typography & Metadata */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black text-[#4F39F6] uppercase tracking-wider bg-[#4F39F6]/10 px-2.5 py-0.5 rounded-md border border-[#4F39F6]/20 truncate max-w-[150px]">
                        {asset.client}
                      </span>
                      <span className="text-[10px] font-extrabold font-mono text-slate-400 uppercase tracking-wider shrink-0">
                        {asset.size}
                      </span>
                    </div>

                    <h4 className="text-sm font-black uppercase tracking-tight text-black leading-snug line-clamp-2" title={asset.name}>
                      {asset.name}
                    </h4>
                  </div>
                </div>

                {/* Card Footer Info & Details Button */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">
                  <span>{formatDate(asset.uploadedDate)}</span>

                  <button
                    onClick={() => setInspectingAssetId(asset.id)}
                    className="text-[#4F39F6] hover:text-[#3826c7] font-black flex items-center gap-0.5 cursor-pointer uppercase tracking-tight"
                  >
                    <Eye className="w-3.5 h-3.5" /> Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW TABLE */
        <Card className="rounded-3xl border-[#E5E7EB] bg-white shadow-2xs">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <button onClick={toggleSelectAll} className="cursor-pointer">
                      {selectedAssetIds.length === assets.length ? (
                        <CheckSquare className="w-4 h-4 text-[#4F39F6]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Preview</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Asset Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Size</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Client Brand</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Uploaded By</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const isSelected = selectedAssetIds.includes(asset.id);

                  return (
                    <TableRow key={asset.id} className={isSelected ? 'bg-[#4F39F6]/5' : ''}>
                      <TableCell>
                        <button onClick={() => toggleSelectAsset(asset.id)} className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#4F39F6]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="w-10 h-10 rounded-xl bg-[#F8F9FC] overflow-hidden flex items-center justify-center border border-[#E5E7EB] shrink-0">
                          {isImageFile(asset) ? (
                            <img src={asset.url} alt={asset.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : isVideoFile(asset) ? (
                            <Video className="w-5 h-5 text-[#4F39F6]" />
                          ) : isAudioFile(asset) ? (
                            <Mic className="w-5 h-5 text-[#4F39F6]" />
                          ) : (
                            <FileText className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-black text-xs uppercase tracking-tight">
                        <span className="truncate max-w-[220px] block">{asset.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-md bg-[#F8F9FC] text-slate-700 font-black text-[9px] uppercase tracking-wider border border-[#E5E7EB] font-mono">
                          {asset.assetType}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-600">{asset.size}</TableCell>
                      <TableCell className="text-[#4F39F6] font-bold text-xs uppercase tracking-wider">{asset.client}</TableCell>
                      <TableCell className="text-slate-600 text-xs font-medium">{asset.uploaderName}</TableCell>
                      <TableCell className="text-slate-400 font-mono text-xs">{formatDate(asset.uploadedDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewAsset(asset)}
                            className="p-1.5 text-slate-500 hover:text-[#4F39F6] hover:bg-[#4F39F6]/10 rounded-lg cursor-pointer transition-colors"
                            title="Preview / Play"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <a
                            href={asset.downloadUrl || asset.url}
                            download={asset.fileName || asset.name}
                            className="p-1.5 text-slate-500 hover:text-[#4F39F6] hover:bg-[#4F39F6]/10 rounded-lg cursor-pointer transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setInspectingAssetId(asset.id)}
                            className="p-1.5 text-slate-500 hover:text-[#4F39F6] hover:bg-[#4F39F6]/10 rounded-lg cursor-pointer transition-colors"
                            title="View Details"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="pt-2 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {/* REAL-TIME MEDIA PREVIEW LIGHTBOX MODAL */}
      <MediaPreviewModal
        isOpen={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        asset={previewAsset}
        onOpenDetails={(id) => setInspectingAssetId(id)}
      />

      {/* INSPECTOR DRAWER */}
      <AssetDetailsDrawer
        isOpen={Boolean(inspectingAssetId)}
        onClose={() => setInspectingAssetId(null)}
        assetId={inspectingAssetId}
        onUpdateSuccess={() => {
          loadStatsAndFilters();
          loadAssetsData();
        }}
      />

      {/* FOLDER MODAL */}
      <AssetFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setFolderToEdit(null);
        }}
        mode={folderModalMode}
        folderToEdit={folderToEdit}
        selectedAssetIds={selectedAssetIds}
        onSuccess={(deletedFolderId) => {
          setSelectedAssetIds([]);
          if (deletedFolderId && selectedFolderId === deletedFolderId.toString()) {
            setSelectedFolderId('ROOT');
            setCurrentPage(1);
          }
          loadStatsAndFilters();
          loadAssetsData();
        }}
      />

      {/* STORAGE BREAKDOWN MODAL */}
      <StorageBreakdownModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        stats={stats}
      />

      {/* DUPLICATE DETECTED ALERT MODAL */}
      {duplicateAlert && (
        <Modal
          isOpen={Boolean(duplicateAlert)}
          onClose={() => setDuplicateAlert(null)}
          title="Identical Asset Detected (SHA-256 Match)"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold uppercase tracking-tight">Duplicate File Found</p>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  An identical file with matching SHA-256 fingerprint already exists in your library as <strong className="text-black">"{duplicateAlert.existingAsset.file_name}"</strong>.
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setDuplicateAlert(null)} className="font-bold text-slate-600 hover:text-black">
                Use Existing Asset
              </Button>
              <Button
                variant="primary"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={handleForceUploadDuplicate}
                isLoading={isUploading}
              >
                Upload Duplicate Anyway
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
