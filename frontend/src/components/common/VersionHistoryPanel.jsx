import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Textarea } from '../forms/Textarea';
import { versionService } from '../../services/versionService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import {
  History,
  GitCommit,
  GitCompare,
  RotateCcw,
  MessageSquare,
  Lock,
  Globe,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
} from 'lucide-react';

export const VersionHistoryPanel = ({ postId, currentVersion, mediaUrl, caption, onRestoreVersion, isClientPortal = false }) => {
  const { user, role: userRole } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('versions'); // 'versions' | 'internal_notes' | 'client_feedback'
  const [versions, setVersions] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  // Compare Modal State
  const [compareVersion, setCompareVersion] = useState(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Feedback Form State
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackType, setFeedbackType] = useState(isClientPortal ? 'client' : 'internal'); // 'internal' | 'client'
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const loadData = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const vList = await versionService.getVersions(postId);
      const fList = await versionService.getFeedback(postId, isClientPortal);

      setVersions(vList);
      setFeedback(fList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [postId, isClientPortal]);

  const handleAddFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;

    setIsSubmittingFeedback(true);
    try {
      await versionService.addFeedback(postId, {
        authorName: user?.name || 'User',
        authorRole: ROLE_LABELS[userRole] || 'Team',
        isClientFeedback: feedbackType === 'client' || isClientPortal,
        message: feedbackMsg,
      });

      toast.success(
        feedbackType === 'client' || isClientPortal ? 'Client Feedback Added' : 'Internal Note Logged',
        'Feedback has been recorded.'
      );
      setFeedbackMsg('');
      loadData();
    } catch (err) {
      toast.error('Error', 'Failed to add feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleRestore = async (version) => {
    try {
      if (onRestoreVersion) {
        onRestoreVersion(version);
      }
      toast.success('Version Restored', `Restored content payload to ${version.versionNum}.`);
      loadData();
    } catch (err) {
      toast.error('Error', 'Failed to restore version.');
    }
  };

  const internalNotesList = feedback.filter((f) => !f.isClientFeedback);
  const clientFeedbackList = feedback.filter((f) => f.isClientFeedback);

  return (
    <div className="space-y-4">
      {/* Panel Header & Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('versions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
              activeTab === 'versions' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" /> History ({versions.length})
          </button>

          {!isClientPortal && (
            <button
              onClick={() => setActiveTab('internal_notes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
                activeTab === 'internal_notes' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" /> Internal Notes ({internalNotesList.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab('client_feedback')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
              activeTab === 'client_feedback' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" /> Client Feedback ({clientFeedbackList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: VERSION HISTORY LIST */}
      {activeTab === 'versions' && (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
          {versions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-medium">No previous versions logged yet.</div>
          ) : (
            versions.map((ver) => (
              <div
                key={ver.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-extrabold border border-indigo-200">
                      {ver.versionNum}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{ver.changedBy}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({ver.changedByRole})</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setCompareVersion(ver);
                        setIsCompareModalOpen(true);
                      }}
                      className="p-1 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <GitCompare className="w-3.5 h-3.5" /> Compare
                    </button>

                    {!isClientPortal && (
                      <button
                        onClick={() => handleRestore(ver)}
                        className="p-1 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {ver.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>{formatDate(ver.changedAt)}</span>
                  <span className="font-mono text-slate-400 truncate max-w-[180px]">Caption: "{ver.caption}"</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2 & 3: INTERNAL NOTES VS CLIENT FEEDBACK */}
      {(activeTab === 'internal_notes' || activeTab === 'client_feedback') && (
        <div className="space-y-4">
          {/* Feedback Items Stream */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
            {(activeTab === 'internal_notes' ? internalNotesList : clientFeedbackList).length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                {activeTab === 'internal_notes' ? 'No internal agency notes logged.' : 'No client feedback entries recorded.'}
              </div>
            ) : (
              (activeTab === 'internal_notes' ? internalNotesList : clientFeedbackList).map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    item.isClientFeedback
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-amber-50/40 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{item.authorName}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.2 rounded-md border border-slate-200">
                        {item.authorRole}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-slate-400 font-mono">{formatDate(item.date)}</span>
                  </div>

                  <p className="text-slate-800 font-medium leading-relaxed">{item.message}</p>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded-full border border-slate-200">
                      Status: {item.status}
                    </span>
                    {item.isClientFeedback ? (
                      <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> Client Viewable
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-700 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Internal Agency Only
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Feedback Form */}
          <form onSubmit={handleAddFeedback} className="space-y-3 pt-2 border-t border-slate-200">
            {!isClientPortal && (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-slate-700">Log Feedback As:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-amber-800">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="internal"
                    checked={feedbackType === 'internal'}
                    onChange={() => setFeedbackType('internal')}
                  />
                  Internal Note (Private)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-emerald-800">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="client"
                    checked={feedbackType === 'client'}
                    onChange={() => setFeedbackType('client')}
                  />
                  Client Feedback
                </label>
              </div>
            )}

            <Textarea
              placeholder={
                feedbackType === 'internal'
                  ? 'Add internal note (e.g. "Adjust headline font size before client review")...'
                  : 'Add client feedback note...'
              }
              rows={2}
              value={feedbackMsg}
              onChange={(e) => setFeedbackMsg(e.target.value)}
              required
            />

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="xs" leftIcon={Send} isLoading={isSubmittingFeedback}>
                Log Feedback
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* COMPARE VERSIONS SIDE-BY-SIDE MODAL */}
      <Modal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        title={`Version Comparison: Current vs ${compareVersion?.versionNum}`}
        maxWidth="max-w-3xl"
      >
        {compareVersion && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* CURRENT VERSION BOX */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Current Payload
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Live</span>
                </div>

                <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                  <img src={mediaUrl} alt="Current Creative" className="w-full h-full object-contain" />
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Caption Text</p>
                  <p className="font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed mt-1">
                    "{caption}"
                  </p>
                </div>
              </div>

              {/* HISTORICAL VERSION BOX */}
              <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                    {compareVersion.versionNum}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">{formatDate(compareVersion.changedAt)}</span>
                </div>

                <div className="aspect-video rounded-xl overflow-hidden border border-amber-200 bg-slate-900">
                  <img src={compareVersion.mediaUrl} alt="Historical Creative" className="w-full h-full object-contain" />
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Caption Text</p>
                  <p className="font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-amber-200 leading-relaxed mt-1">
                    "{compareVersion.caption}"
                  </p>
                </div>

                <div className="pt-2 border-t border-amber-200 text-[11px] text-amber-800 font-medium">
                  Author: <span className="font-bold">{compareVersion.changedBy}</span> ({compareVersion.changedByRole})
                  <p className="italic text-[10px] text-slate-500">"{compareVersion.description}"</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setIsCompareModalOpen(false)}>
                Close Comparison
              </Button>

              {!isClientPortal && (
                <Button
                  variant="primary"
                  leftIcon={RotateCcw}
                  onClick={() => {
                    handleRestore(compareVersion);
                    setIsCompareModalOpen(false);
                  }}
                >
                  Restore {compareVersion.versionNum} to Current
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
