import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { HardDrive, PieChart, Building2, Image as ImageIcon, Video, FileText, Folder } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';

export const StorageBreakdownModal = ({ isOpen, onClose, stats }) => {
  if (!stats) return null;

  const formatSize = (bytes) => formatFileSize(bytes);


  const totalUsed = stats.totalStorageBytes || 1;
  const quota = stats.storageQuotaBytes || (20 * 1024 * 1024 * 1024);
  const quotaPercent = Math.min(100, Math.round((totalUsed / quota) * 100));

  const typeStorage = stats.storageByType || {};
  const imagesBytes = typeStorage.imagesBytes || 0;
  const videosBytes = typeStorage.videosBytes || 0;
  const docsBytes = typeStorage.documentsBytes || 0;
  const otherBytes = typeStorage.otherBytes || 0;

  const clientStorage = stats.storageByClient || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Workspace Storage Metrics & Aggregations" maxWidth="max-w-2xl">
      <div className="space-y-5 text-xs">
        {/* OVERALL STORAGE QUOTA PROGRESS BAR */}
        <div className="p-4 bg-[#F8F9FC] rounded-2xl border border-[#E5E7EB] text-black space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#4F39F6]" />
              <span className="font-extrabold text-sm text-black">Overall Storage Allocation</span>
            </div>
            <span className="font-mono text-xs font-bold text-[#4F39F6]">
              {formatSize(totalUsed)} / {formatSize(quota)} ({quotaPercent}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden p-0.5 border border-slate-300/60">
            <div
              className="h-full bg-[#4F39F6] rounded-full transition-all duration-500"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-500">
            <div>Average Size: <strong className="text-black">{formatSize(stats.avgFileSizeBytes)}</strong></div>
            <div>Largest File: <strong className="text-black">{formatSize(stats.largestFileBytes)}</strong></div>
            <div>Total Assets: <strong className="text-black">{stats.totalAssets}</strong></div>
            <div>Remaining: <strong className="text-black">{formatSize(quota - totalUsed)}</strong></div>
          </div>
        </div>

        {/* BREAKDOWN BY FILE TYPE */}
        <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] space-y-3">
          <h4 className="text-xs font-extrabold text-black uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-[#4F39F6]" />
            <span>Storage Usage by Media Type (MySQL Aggregated)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-[#F8F9FC] rounded-xl border border-[#E5E7EB] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-black flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-pink-600" /> Images
                </span>
                <span className="font-mono text-slate-700 font-bold">{formatSize(imagesBytes)}</span>
              </div>
              <p className="text-[10px] text-slate-500">{stats.counts?.images || 0} files ({Math.round((imagesBytes / totalUsed) * 100)}% of storage)</p>
            </div>

            <div className="p-3 bg-[#F8F9FC] rounded-xl border border-[#E5E7EB] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-black flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-purple-600" /> Videos
                </span>
                <span className="font-mono text-slate-700 font-bold">{formatSize(videosBytes)}</span>
              </div>
              <p className="text-[10px] text-slate-500">{stats.counts?.videos || 0} files ({Math.round((videosBytes / totalUsed) * 100)}% of storage)</p>
            </div>

            <div className="p-3 bg-[#F8F9FC] rounded-xl border border-[#E5E7EB] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-black flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" /> Documents & PDFs
                </span>
                <span className="font-mono text-slate-700 font-bold">{formatSize(docsBytes)}</span>
              </div>
              <p className="text-[10px] text-slate-500">{stats.counts?.documents || 0} files ({Math.round((docsBytes / totalUsed) * 100)}% of storage)</p>
            </div>

            <div className="p-3 bg-[#F8F9FC] rounded-xl border border-[#E5E7EB] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-black flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-slate-600" /> Other Media
                </span>
                <span className="font-mono text-slate-700 font-bold">{formatSize(otherBytes)}</span>
              </div>
              <p className="text-[10px] text-slate-500">{stats.counts?.other || 0} files</p>
            </div>
          </div>
        </div>

        {/* BREAKDOWN BY CLIENT BRAND */}
        <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] space-y-3">
          <h4 className="text-xs font-extrabold text-black uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#4F39F6]" />
            <span>Storage Usage by Client Brand</span>
          </h4>

          {clientStorage.length === 0 ? (
            <p className="text-slate-400 text-xs italic">No client-assigned media stored.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {clientStorage.map((cli) => {
                const percent = Math.round((cli.storageBytes / totalUsed) * 100);
                return (
                  <div key={cli.clientId} className="p-2.5 bg-[#F8F9FC] rounded-xl border border-[#E5E7EB] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black">{cli.clientName}</span>
                      <span className="font-mono text-slate-700 font-bold">{formatSize(cli.storageBytes)} ({cli.assetCount} assets)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#4F39F6] rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="ghost" onClick={onClose} className="text-slate-600 hover:text-black font-bold">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
