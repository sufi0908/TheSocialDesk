import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../forms/Input';
import { Button } from '../ui/Button';
import { SafeImage } from '../common/SafeImage';
import { Search, Video, FileText, ImageIcon, Check } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const AssetLibraryModal = ({
  isOpen,
  onClose,
  libraryAssets = [],
  selectedCreative = null,
  onSelectAsset,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'IMAGE' | 'VIDEO'

  const filteredAssets = (Array.isArray(libraryAssets) ? libraryAssets : []).filter((asset) => {
    const name = asset.name || asset.file_name || asset.displayName || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());

    const type = asset.assetType || asset.file_type || (asset.mime_type && asset.mime_type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
    const isVid = String(type).toUpperCase() === 'VIDEO' || /\.(mp4|webm|mov|mkv)$/i.test(name);
    const isImg = !isVid;

    if (categoryFilter === 'IMAGE') return matchesSearch && isImg;
    if (categoryFilter === 'VIDEO') return matchesSearch && isVid;
    return matchesSearch;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asset Library — Select Creative Media"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search assets by file name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:bg-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
            {['ALL', 'IMAGE', 'VIDEO'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  categoryFilter === cat ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'All Assets' : cat === 'IMAGE' ? 'Images' : 'Videos'}
              </button>
            ))}
          </div>
        </div>

        {/* Assets Grid */}
        {filteredAssets.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No media assets found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
            {filteredAssets.map((asset) => {
              const fileId = asset.id || asset.asset_id;
              const isSelected = selectedCreative && String(selectedCreative.id) === String(fileId);
              const type = asset.assetType || asset.file_type || (asset.mime_type && asset.mime_type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
              const isVid = String(type).toUpperCase() === 'VIDEO' || /\.(mp4|webm|mov|mkv)$/i.test(asset.name || asset.file_name || '');
              const url = asset.url || asset.file_url || asset.storagePath || (fileId ? `/api/assets/${fileId}/file` : '');
              const name = asset.name || asset.file_name || asset.originalFilename || 'Media Asset';

              return (
                <div
                  key={fileId || name}
                  onClick={() => {
                    onSelectAsset(asset);
                    onClose();
                  }}
                  className={`relative p-2 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                    isSelected ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300 bg-white'
                  }`}
                >
                  <div className="aspect-square bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center mb-2 relative">
                    {isVid ? (
                      <div className="w-full h-full flex items-center justify-center bg-purple-950 text-purple-300">
                        <Video className="w-7 h-7 stroke-[1.5]" />
                      </div>
                    ) : (
                      <SafeImage
                        src={url}
                        alt={name}
                        fallbackType="creative"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate" title={name}>
                      {name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>{asset.size || 'Media'}</span>
                      <span className="font-semibold text-slate-500">{isVid ? 'VIDEO' : 'IMAGE'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
