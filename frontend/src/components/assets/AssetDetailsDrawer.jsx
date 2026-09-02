import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../forms/Input';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/formatters';
import { assetService } from '../../services/assetService';
import { useToast } from '../../hooks/useToast';
import {
  FileText,
  Download,
  Trash2,
  Edit2,
  FolderOpen,
  User,
  Building2,
  Calendar,
  Layers,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Hash,
  Maximize2,
  Clock,
  Mic,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AssetDetailsDrawer = ({ isOpen, onClose, assetId, onUpdateSuccess }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Protection Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUsageWarning, setDeleteUsageWarning] = useState(null);

  const loadAssetDetails = async () => {
    if (!assetId) return;
    setLoading(true);
    try {
      const data = await assetService.getAsset(assetId);
      setAsset(data);
      setDisplayName(data?.name || data?.fileName || '');
    } catch (err) {
      toast.error('Error', 'Unable to load asset details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && assetId) {
      loadAssetDetails();
    }
  }, [isOpen, assetId]);

  const handleSaveRename = async () => {
    if (!displayName.trim()) return;
    setIsSubmitting(true);
    try {
      await assetService.renameAsset(assetId, displayName.trim());
      toast.success('Renamed', 'Updated asset display name.');
      setIsEditingName(false);
      loadAssetDetails();
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      toast.error('Error', 'Failed to rename asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttempt = async (force = false) => {
    setIsSubmitting(true);
    try {
      await assetService.deleteAsset(assetId, force);
      toast.info('Asset Deleted', 'Removed asset from library.');
      setIsDeleteModalOpen(false);
      onClose();
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.usage) {
        setDeleteUsageWarning(err.response.data.usage);
        setIsDeleteModalOpen(true);
      } else {
        toast.error('Error', err.response?.data?.message || 'Failed to delete asset.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asset Details & Usage Inspector" maxWidth="max-w-2xl">
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading asset details...</div>
      ) : !asset ? (
        <div className="py-8 text-center text-xs text-slate-500">Asset not found.</div>
      ) : (
        <div className="space-y-5 text-xs">
          {/* MEDIA PREVIEW CONTAINER */}
          <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-[#F8F9FC] border border-[#E5E7EB] overflow-hidden flex items-center justify-center">
            {asset.assetType === 'VIDEO' ? (
              <video src={asset.url} controls className="w-full h-full object-contain" />
            ) : asset.assetType === 'VOICE_NOTE' || asset.mimeType?.startsWith('audio/') ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-white text-center">
                <Mic className="w-10 h-10 text-[#4F39F6] mb-2 animate-pulse" />
                <p className="font-bold text-xs text-black mb-2 max-w-xs truncate">{asset.fileName}</p>
                <audio src={asset.url} controls className="w-4/5 max-w-sm shadow-2xs rounded-full" />
              </div>
            ) : asset.assetType === 'DOCUMENT' ? (
              <div className="text-center p-6 text-slate-700">
                <FileText className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-sm text-black max-w-xs truncate">{asset.fileName}</p>
                <p className="text-xs text-slate-500 mt-1">{asset.mimeType}</p>
              </div>
            ) : (
              <img
                src={asset.url}
                alt={asset.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) {
                    e.currentTarget.nextSibling.style.display = 'flex';
                  }
                }}
              />
            )}
            <div className="hidden w-full h-full items-center justify-center text-slate-400">
              <ImageIcon className="w-10 h-10 text-slate-400" />
            </div>
          </div>

          {/* ASSET NAME & QUICK ACTIONS BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#F8F9FC] rounded-2xl border border-[#E5E7EB]">
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="text-xs font-bold"
                  />
                  <Button variant="primary" size="xs" onClick={handleSaveRename} isLoading={isSubmitting} className="bg-[#4F39F6] hover:bg-[#4330d8] text-white">
                    Save
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setIsEditingName(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-black truncate" title={asset.name}>
                    {asset.name}
                  </h3>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-400 hover:text-[#4F39F6] cursor-pointer"
                    title="Rename asset"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                Original: {asset.originalFilename}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={asset.downloadUrl}
                download={asset.fileName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4F39F6] text-white font-extrabold text-xs hover:bg-[#4330d8] transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteAttempt(false)}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* METADATA GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">File Type</p>
              <p className="text-xs font-bold text-black mt-0.5">{asset.assetType} ({asset.mimeType || 'Binary'})</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">File Size</p>
              <p className="text-xs font-bold text-black mt-0.5">{asset.size}</p>
            </div>

            {asset.width && asset.height && (
              <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Dimensions</p>
                <p className="text-xs font-bold text-black mt-0.5">{asset.width} × {asset.height}</p>
              </div>
            )}

            <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Client Brand</p>
              <p className="text-xs font-bold text-[#4F39F6] mt-0.5">{asset.client}</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Uploaded By</p>
              <p className="text-xs font-bold text-black mt-0.5">{asset.uploaderName}</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Uploaded Date</p>
              <p className="text-xs font-bold text-black mt-0.5">{formatDate(asset.uploadedDate)}</p>
            </div>
          </div>

          {/* SHA-256 FILE HASH */}
          {asset.fileHash && (
            <div className="p-2.5 bg-[#F8F9FC] rounded-xl border border-[#E5E7EB] flex items-center justify-between text-[10px]">
              <span className="font-extrabold text-slate-500 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" /> SHA-256 Fingerprint:
              </span>
              <span className="font-mono text-slate-700 truncate max-w-[280px]" title={asset.fileHash}>
                {asset.fileHash}
              </span>
            </div>
          )}

          {/* USED IN SECTION (Delete Protection & Resource Navigation) */}
          <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] space-y-2">
            <h4 className="text-xs font-extrabold text-black uppercase tracking-wider flex items-center justify-between">
              <span>Asset Usage Locations ({asset.usage?.totalCount || 0})</span>
              {asset.usage?.totalCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black border border-amber-200">
                  IN USE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black">
                  UNUSED
                </span>
              )}
            </h4>

            {asset.usage?.totalCount === 0 ? (
              <p className="text-slate-400 text-xs italic">
                This asset is not attached to any content posts, projects, or tasks.
              </p>
            ) : (
              <div className="space-y-1.5 pt-1">
                {asset.usage.contentPosts?.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      onClose();
                      navigate(`/workspace/content?id=${post.id}`);
                    }}
                    className="p-2 rounded-xl bg-[#F8F9FC] hover:bg-[#4F39F6]/5 border border-[#E5E7EB] flex items-center justify-between cursor-pointer transition-all text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#4F39F6]" />
                      <span className="font-bold text-black">Content Post: "{post.title}"</span>
                    </div>
                    <span className="text-[10px] text-[#4F39F6] font-bold flex items-center gap-0.5">
                      Open <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                ))}

                {asset.usage.projects?.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => {
                      onClose();
                      navigate('/workspace/projects');
                    }}
                    className="p-2 rounded-xl bg-[#F8F9FC] hover:bg-[#4F39F6]/5 border border-[#E5E7EB] flex items-center justify-between cursor-pointer transition-all text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-[#4F39F6]" />
                      <span className="font-bold text-black">Project: "{proj.name}"</span>
                    </div>
                    <span className="text-[10px] text-[#4F39F6] font-bold flex items-center gap-0.5">
                      Open <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE PROTECTION CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Protection Warning"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold">Asset is Currently Being Used!</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  This file is currently attached to {deleteUsageWarning?.totalCount || 'active'} content items or projects. Deleting it may break image references on published/draft content.
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={() => handleDeleteAttempt(true)}
                isLoading={isSubmitting}
              >
                Delete Anyway
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
