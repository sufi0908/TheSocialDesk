import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingState } from './LoadingState';
import { FileUpload } from './FileUpload';
import { brandKitService } from '../../services/brandKitService';
import { useToast } from '../../hooks/useToast';
import {
  Palette,
  Type,
  FileText,
  Copy,
  Check,
  Download,
  Globe,
  Upload,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FolderArchive,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

export const BrandKitModal = ({ isOpen, onClose, clientId, clientName }) => {
  const toast = useToast();
  const [brandKit, setBrandKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadLogo, setShowUploadLogo] = useState(false);

  const fetchKit = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const kit = await brandKitService.getBrandKit(clientId);
      setBrandKit(kit);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && clientId) {
      fetchKit();
    }
  }, [isOpen, clientId]);

  const copyToClipboard = (text, keyName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success('Copied to Clipboard!', `Copied ${text} to clipboard.`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUploadAsset = async (file, assetType = 'PRIMARY_LOGO') => {
    setIsUploading(true);
    try {
      await brandKitService.uploadBrandAsset(clientId, file, {
        assetType,
        title: file.name,
      });
      toast.success('Asset Uploaded', `Successfully updated brand asset.`);
      setShowUploadLogo(false);
      fetchKit();
    } catch (err) {
      toast.error('Upload Failed', err.response?.data?.message || err.message || 'Could not upload brand asset.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBrandAsset = async (assetId) => {
    try {
      await brandKitService.deleteBrandAsset(clientId, assetId);
      toast.success('Asset Deleted', 'Removed asset from brand kit.');
      fetchKit();
    } catch (err) {
      toast.error('Delete Failed', err.message || 'Could not delete asset.');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${clientName || brandKit?.companyName || 'Client'} — Official Brand Kit`}
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <LoadingState type="skeleton-cards" count={3} />
      ) : !brandKit ? (
        <div className="py-8 text-center text-xs text-slate-400 font-medium">
          No brand kit configured for this client.
        </div>
      ) : (
        <div className="space-y-6 text-xs">
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              {brandKit.primaryLogo ? (
                <img
                  src={brandKit.primaryLogo}
                  alt="Brand Logo"
                  className="w-12 h-12 rounded-xl object-contain bg-white/10 p-1 border-2 border-white/20 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-700/60 border-2 border-white/20 flex items-center justify-center font-bold text-white text-lg shrink-0">
                  {(brandKit.companyName || 'B')[0]}
                </div>
              )}
              <div>
                <h3 className="text-base font-extrabold text-white leading-tight">{brandKit.companyName || brandKit.brandName || clientName}</h3>
                <p className="text-[11px] text-indigo-200 font-medium mt-0.5">{brandKit.guidelines || 'Official brand design guidelines and creative assets.'}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="xs"
              leftIcon={Upload}
              onClick={() => setShowUploadLogo(!showUploadLogo)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 shrink-0"
            >
              {showUploadLogo ? 'Hide Upload' : 'Upload Brand Asset'}
            </Button>
          </div>

          {showUploadLogo && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900">Upload New Brand Logo or Guidelines</h4>
              <FileUpload
                multiple={false}
                onUpload={(file) => handleUploadAsset(file, 'BRAND_IMAGE')}
                uploadLabel="Drop brand logo, icon, or document here"
                subtitle="JPG, PNG, WEBP, SVG, PDF (Max 10MB)"
                disabled={isUploading}
              />
            </div>
          )}

          {/* SECTION 1: LOGOS & CREATIVE ASSETS */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" /> Brand Logos & Master Assets
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary Logo */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Primary Logo
                  </span>
                  <div className="my-3 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center p-2">
                    {brandKit.primaryLogo ? (
                      <img src={brandKit.primaryLogo} alt="Primary Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">No logo uploaded</span>
                    )}
                  </div>
                </div>
                {brandKit.primaryLogo && (
                  <div className="flex justify-end">
                    <a
                      href={brandKit.primaryLogo}
                      download="brand-logo"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Logo
                    </a>
                  </div>
                )}
              </div>

              {/* Upload New Brand Asset Card */}
              <div className="p-3 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-4">
                <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700">Add Brand Asset</p>
                <p className="text-[10px] text-slate-500 mb-3">Upload secondary logos, guidelines, or vector assets</p>
                <Button size="xs" variant="primary" leftIcon={Upload} onClick={() => setShowUploadLogo(true)}>
                  Upload File
                </Button>
              </div>
            </div>

            {/* Additional Brand Assets List */}
            {brandKit.assets && brandKit.assets.length > 0 && (
              <div className="pt-3 border-t border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-700">Uploaded Assets & Guidelines:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {brandKit.assets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 truncate">{asset.title || asset.fileName || 'Asset'}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {asset.fileUrl && (
                          <a href={asset.fileUrl} download className="p-1 text-slate-500 hover:text-indigo-600">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBrandAsset(asset.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: BRAND COLORS & SWATCHES */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600" /> Official Brand Color Palette (HEX & RGB)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {brandKit.colors && Object.entries(brandKit.colors).map(([key, col]) => (
                <div key={key} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div
                    className="h-14 rounded-lg border border-slate-200/80 shadow-inner flex items-center justify-center font-mono font-bold text-xs text-white"
                    style={{ backgroundColor: col.hex }}
                  >
                    <span className="drop-shadow-md">{col.hex}</span>
                  </div>

                  <div>
                    <p className="font-extrabold text-slate-900 text-xs">{col.label || key}</p>
                  </div>

                  <div className="pt-1 flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(col.hex, `hex_${key}`)}
                      className="flex-1 px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[10px] font-extrabold border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {copiedKey === `hex_${key}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      HEX
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: TYPOGRAPHY */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-600" /> Approved Typography
            </h4>

            <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Font</span>
                <span className="font-mono text-xs font-extrabold text-indigo-700">{brandKit.typography?.primaryFont || 'Inter, sans-serif'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Secondary Font</span>
                <span className="font-mono text-xs font-extrabold text-indigo-700">{brandKit.typography?.secondaryFont || 'Outfit, sans-serif'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

