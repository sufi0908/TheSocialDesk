import React, { useState, useEffect } from 'react';
import { X, Search, Image as ImageIcon, Share2 } from 'lucide-react';
import { assetService } from '../../services/assetService';

export const AssetPickerModal = ({ isOpen, onClose, onSelectAsset }) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const list = await assetService.getAllAssets();
      setAssets(list || []);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = assets.filter((a) =>
    (a.name || a.displayName || a.file_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-extrabold text-slate-900">Share Asset Library Item</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <input
              type="text"
              placeholder="Search asset files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400 font-medium">Loading assets...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-medium">No asset files found.</div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectAsset(item);
                  onClose();
                }}
                className="pt-2.5 first:pt-0 p-3 rounded-xl hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors border border-transparent hover:border-indigo-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0 overflow-hidden">
                    {item.file_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                      <img src={assetService.getAssetViewUrl(item.id)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.name || item.displayName || item.file_name}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">{item.mime_type || 'Asset File'}</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                  <Share2 className="w-3 h-3" /> Share
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
