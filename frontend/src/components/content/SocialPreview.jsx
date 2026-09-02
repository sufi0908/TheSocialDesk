import React, { useState } from 'react';
import { Smartphone, Image as ImageIcon, Film, Play } from 'lucide-react';
import { SafeImage } from '../common/SafeImage';
import { MediaPreview } from '../common/MediaPreview';
import { PLATFORMS } from '../../services/contentService';

export const SocialPreview = ({
  selectedCreative,
  caption = '',
  selectedClient = null,
  selectedPlatforms = ['instagram'],
  onPlayVideo,
}) => {
  const [activeTab, setActiveTab] = useState(selectedPlatforms[0] || 'instagram');

  const platformObj = PLATFORMS[activeTab?.toUpperCase()] || PLATFORMS.INSTAGRAM || { name: 'Instagram', id: 'instagram' };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Live Preview</h3>
        </div>

        {/* Platform Preview Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {selectedPlatforms.map((pId) => {
            const p = PLATFORMS[pId.toUpperCase()] || { name: pId, id: pId };
            const isActive = activeTab === pId;
            return (
              <button
                key={pId}
                type="button"
                onClick={() => setActiveTab(pId)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  isActive ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* PHONE FRAME MOCKUP */}
      <div className="bg-slate-900 rounded-[28px] p-3 shadow-xl max-w-[295px] mx-auto border-4 border-slate-800 space-y-2">
        {/* Phone Speaker Notch */}
        <div className="w-16 h-2 bg-slate-800 rounded-full mx-auto" />

        {/* Social Feed Card */}
        <div className="bg-white rounded-2xl overflow-hidden text-left shadow-2xs">
          {/* Account Header */}
          <div className="flex items-center gap-2 p-2.5 border-b border-slate-100">
            <SafeImage
              src={selectedClient?.logoUrl || selectedClient?.logo}
              name={selectedClient?.companyName || selectedClient?.name || 'Client'}
              fallbackType="avatar"
              className="w-7 h-7 rounded-full border border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold text-slate-900 leading-tight truncate">
                {selectedClient?.companyName || selectedClient?.name || 'Select Client'}
              </p>
              <p className="text-[9px] text-slate-400 font-medium">
                Sponsored • {platformObj.name}
              </p>
            </div>
          </div>

          {/* Creative Media Container */}
          <div className="relative aspect-square bg-slate-950 overflow-hidden flex items-center justify-center">
            <MediaPreview
              media={selectedCreative}
              onPlayVideo={onPlayVideo}
              aspectRatio="aspect-square"
            />
          </div>

          {/* Caption Feed Text */}
          <div className="p-2.5 space-y-1 bg-white">
            <p className="text-[10px] font-bold text-slate-900 leading-snug">
              {selectedClient?.companyName || selectedClient?.name || 'Brand'}{' '}
              <span className="font-normal text-slate-700 leading-snug line-clamp-3">
                {caption || 'Your post caption will appear here live as you type...'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
