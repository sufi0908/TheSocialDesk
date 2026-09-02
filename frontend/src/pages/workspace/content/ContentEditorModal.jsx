import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/forms/Input';
import { Select } from '../../../components/forms/Select';
import { Textarea } from '../../../components/forms/Textarea';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SafeImage } from '../../../components/common/SafeImage';
import { useToast } from '../../../hooks/useToast';
import { CreativeUploader } from '../../../components/content/CreativeUploader';
import { SocialPreview } from '../../../components/content/SocialPreview';
import { AssetLibraryModal } from '../../../components/content/AssetLibraryModal';
import { revisionService } from '../../../services/revisionService';
import { contentService, PLATFORMS } from '../../../services/contentService';
import { clientService } from '../../../services/clientService';
import { projectService } from '../../../services/projectService';
import { teamService } from '../../../services/teamService';
import { assetService } from '../../../services/assetService';
import { normalizeAsset } from '../../../utils/mediaUtils';
import { STATUS_TYPES, ROLE_LABELS, ROLES } from '../../../utils/constants';
import {
  FileText,
  Send,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Play,
  Users,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const ContentEditorModal = ({ isOpen, onClose, postToEdit, onSaveSuccess }) => {
  const toast = useToast();

  // Data Dependencies State
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [libraryAssets, setLibraryAssets] = useState([]);

  // UI Modal State
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isVideoLightboxOpen, setIsVideoLightboxOpen] = useState(false);
  const [revisions, setRevisions] = useState([]);

  // Core Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCreative, setSelectedCreative] = useState(null);
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram', 'tiktok']);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');

  // Advanced Form State
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('Single Post');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedReviewerId, setSelectedReviewerId] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single Source of Truth Builder for Media Object
  const buildCreativeObject = (raw) => {
    return normalizeAsset(raw);
  };

  useEffect(() => {
    const loadDependencies = async () => {
      const [cList, pList, tList, aList] = await Promise.all([
        clientService.getClients(),
        projectService.getProjects(),
        teamService.getTeamMembers(),
        assetService.getAllAssets(),
      ]);

      const clientArray = Array.isArray(cList) ? cList : [];
      const projectArray = Array.isArray(pList) ? pList : [];
      const teamArray = Array.isArray(tList) ? tList : [];
      const assetArray = Array.isArray(aList) ? aList : [];

      setClients(clientArray);
      setProjects(projectArray);
      setTeamMembers(teamArray);
      setLibraryAssets(assetArray);

      const defaultReviewer = teamArray.find((m) => m.role === 'workspace_manager' || m.role === 'reviewer') || teamArray[0];

      if (postToEdit) {
        setTitle(postToEdit.title || '');
        setCaption(postToEdit.caption || '');
        setContentType(postToEdit.contentType || 'Single Post');
        setSelectedClientId(postToEdit.clientId || (clientArray[0]?.id || ''));
        setSelectedProjectId(postToEdit.projectId || (projectArray[0]?.id || ''));
        setSelectedAssigneeId(postToEdit.assignedTo || postToEdit.assigneeId || (teamArray[0]?.id || ''));
        setSelectedReviewerId(postToEdit.reviewerId || defaultReviewer?.id || '');
        setSelectedPlatforms(postToEdit.platforms || ['instagram']);

        const initialCreative = buildCreativeObject(postToEdit.mediaAssets?.[0] || postToEdit.mediaUrl);
        setSelectedCreative(initialCreative);

        try {
          const revList = await revisionService.getRevisionHistory(postToEdit.id);
          setRevisions(Array.isArray(revList) ? revList : []);
        } catch (e) {
          setRevisions([]);
        }
      } else {
        setTitle('');
        setCaption('');
        setContentType('Single Post');
        setSelectedClientId(clientArray[0]?.id || '');
        setSelectedProjectId(projectArray[0]?.id || '');
        setSelectedAssigneeId(teamArray[0]?.id || '');
        setSelectedReviewerId(defaultReviewer?.id || '');
        setSelectedPlatforms(['instagram', 'tiktok']);
        setSelectedCreative(null);
      }
    };

    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen, postToEdit]);

  const togglePlatform = (pId) => {
    if (selectedPlatforms.includes(pId)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((id) => id !== pId));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, pId]);
    }
  };

  const handleUploadMediaFile = async (file) => {
    setIsUploading(true);
    try {
      const uploaded = await assetService.uploadAsset(file, {
        clientId: selectedClientId || undefined,
        projectId: selectedProjectId || undefined,
        category: 'Content Media',
      });
      console.log('[SocialDesk Media] Upload API Response:', uploaded);
      const creativeObj = normalizeAsset(uploaded);
      if (creativeObj && creativeObj.url) {
        setSelectedCreative(creativeObj);
        toast.success('Media Attached', `Uploaded "${file.name}" to content.`);
      } else {
        toast.error('Upload Failed', 'Uploaded file could not be attached to content.');
      }
    } catch (err) {
      console.error('[SocialDesk Media] Upload Error:', err);
      toast.error('Upload Failed', err.response?.data?.message || err.message || 'Media file could not be uploaded.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectAssetFromLibrary = (asset) => {
    const creativeObj = normalizeAsset(asset);
    if (creativeObj && creativeObj.url) {
      setSelectedCreative(creativeObj);
      toast.success('Asset Selected', `Selected "${creativeObj.fileName}".`);
    } else {
      toast.error('Selection Failed', 'The selected asset could not be attached.');
    }
  };

  const handleSavePost = async (targetStatusKey) => {
    setIsSubmitting(true);
    try {
      const clientObj = clients.find((c) => String(c.id) === String(selectedClientId)) || clients[0];
      const projObj = projects.find((p) => String(p.id) === String(selectedProjectId)) || projects[0];
      const memberObj = teamMembers.find((m) => String(m.id) === String(selectedAssigneeId)) || teamMembers[0];

      const activeUrl = selectedCreative ? selectedCreative.url : '';
      const activeAssetId = selectedCreative ? selectedCreative.id : null;
      const effectiveTitle = title.trim() || `${clientObj?.companyName || 'Post'} - ${contentType || 'Single Post'}`;

      const payload = {
        title: effectiveTitle,
        caption,
        contentType,
        client: clientObj?.companyName || clientObj?.name || 'General Client',
        clientId: clientObj?.id || selectedClientId,
        project: projObj?.name || 'General Project',
        projectId: projObj?.id || selectedProjectId,
        assignedTo: selectedAssigneeId,
        assigneeId: selectedAssigneeId,
        assigneeName: memberObj?.name || 'Team Member',
        assigneeRole: memberObj?.role || ROLES.GRAPHIC_DESIGNER,
        reviewerId: selectedReviewerId,
        platforms: selectedPlatforms,
        mediaUrl: activeUrl,
        assetId: activeAssetId,
        mediaAssets: selectedCreative ? [{ id: selectedCreative.id, file_url: selectedCreative.url, mime_type: selectedCreative.mimeType }] : [],
        statusKey: targetStatusKey,
      };

      if (postToEdit) {
        await contentService.updateContentPost(postToEdit.id, payload);
      } else {
        await contentService.createContentPost(payload);
      }

      toast.success(
        targetStatusKey === STATUS_TYPES.DRAFT ? 'Draft Saved' : 'Submitted for Review',
        targetStatusKey === STATUS_TYPES.DRAFT ? 'Saved content draft successfully.' : 'Post submitted for internal review.'
      );

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error('Save Failed', err.response?.data?.message || 'Could not save content post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentClient = clients.find((c) => String(c.id) === String(selectedClientId)) || clients[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={postToEdit ? `Edit Content Post #${postToEdit.id}` : 'Create New Social Content'}
      maxWidth="max-w-5xl"
    >
      {/* 2-COLUMN CLEAN REDESIGNED LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================================================
            LEFT COLUMN: CONTENT FORM (7 COLS)
            ================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* ACTIVE REVISION REQUEST BANNER */}
          {postToEdit && (postToEdit.statusKey === STATUS_TYPES.REVISION_REQUIRED || revisions.length > 0) && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  REVISION REQUESTED — Reviewer Feedback
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                  Action Required
                </span>
              </div>
              <p className="text-xs font-semibold text-amber-900 bg-white/90 p-2.5 rounded-xl border border-amber-200/80 italic">
                "{revisions[0]?.reason || revisions[0]?.notes || 'Please update creative media and caption according to requested changes.'}"
              </p>
              <p className="text-[10px] font-medium text-amber-700">
                Replace creative media or edit copy below, then click <span className="font-bold">Resubmit for Review</span>.
              </p>
            </div>
          )}

          {/* STEP 1: CLIENT SELECTION */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              1. Select Client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              {clients.length === 0 ? (
                <option value="">No clients available</option>
              ) : (
                clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    ○ {c.companyName || c.name} — Brand Account
                  </option>
                ))
              )}
            </select>
          </div>

          {/* STEP 2: CREATIVE UPLOADER */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              2. Add Creative Media
            </label>
            <CreativeUploader
              selectedCreative={selectedCreative}
              onCreativeChange={setSelectedCreative}
              onOpenAssetLibrary={() => setIsAssetPickerOpen(true)}
              isUploading={isUploading}
              onUploadFile={handleUploadMediaFile}
              onPlayVideo={() => setIsVideoLightboxOpen(true)}
            />
          </div>

          {/* STEP 3: CAPTION */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-0.5">
              <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                3. Post Caption
              </label>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {caption.length} / 2200
              </span>
            </div>
            <Textarea
              placeholder="Write your post caption, copy, hashtags, and call-to-action here..."
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="rounded-xl border-slate-200 text-xs font-medium focus:border-indigo-500"
            />
          </div>

          {/* STEP 4: PLATFORMS */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              4. Social Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(PLATFORMS).map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      isSelected
                        ? `${p.color} ring-2 ring-indigo-500/20 shadow-2xs`
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 font-medium pt-0.5">
              Content is tracked and scheduled for selected platforms. SocialDesk does not auto-publish.
            </p>
          </div>

          {/* STEP 5: ASSIGNEE */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              5. Assign Team Member
            </label>
            <select
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {ROLE_LABELS[m.role] || m.role}
                </option>
              ))}
            </select>
          </div>

          {/* ADVANCED OPTIONS COLLAPSIBLE */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 hover:bg-slate-100 text-slate-700 text-xs font-extrabold transition-colors cursor-pointer"
            >
              <span>Advanced Options (Post Title, Format, Project, Reviewer)</span>
              {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isAdvancedOpen && (
              <div className="p-3 mt-2 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <Input
                  label="Custom Post Title (Optional)"
                  placeholder="e.g. Autumn Product Launch #1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="Content Format"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    options={[
                      { value: 'Single Post', label: 'Single Post' },
                      { value: 'Carousel', label: 'Carousel Graphics' },
                      { value: 'Reel / Video', label: 'Reel / Short Video' },
                      { value: 'Story', label: 'Social Story' },
                    ]}
                  />

                  <Select
                    label="Campaign Project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </div>

                <Select
                  label="Reviewer / Approver"
                  value={selectedReviewerId}
                  onChange={(e) => setSelectedReviewerId(e.target.value)}
                  options={teamMembers.map((m) => ({ value: m.id, label: `${m.name} (${ROLE_LABELS[m.role] || m.role})` }))}
                />
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => handleSavePost(STATUS_TYPES.DRAFT)}
              isLoading={isSubmitting}
            >
              Save Draft
            </Button>

            <Button
              variant="primary"
              size="md"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm"
              onClick={() => handleSavePost(STATUS_TYPES.INTERNAL_REVIEW)}
              isLoading={isSubmitting}
              leftIcon={postToEdit?.statusKey === STATUS_TYPES.REVISION_REQUIRED ? RotateCcw : Send}
            >
              {postToEdit?.statusKey === STATUS_TYPES.REVISION_REQUIRED ? 'Resubmit for Review' : 'Submit for Review'}
            </Button>
          </div>
        </div>

        {/* ==================================================
            RIGHT COLUMN: LIVE SOCIAL PREVIEW (5 COLS)
            ================================================== */}
        <div className="lg:col-span-5 pl-0 lg:pl-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0">
          <SocialPreview
            selectedCreative={selectedCreative}
            caption={caption}
            selectedClient={currentClient}
            selectedPlatforms={selectedPlatforms}
            onPlayVideo={() => setIsVideoLightboxOpen(true)}
          />
        </div>
      </div>

      {/* ASSET LIBRARY MODAL */}
      <AssetLibraryModal
        isOpen={isAssetPickerOpen}
        onClose={() => setIsAssetPickerOpen(false)}
        libraryAssets={libraryAssets}
        selectedCreative={selectedCreative}
        onSelectAsset={handleSelectAssetFromLibrary}
      />

      {/* VIDEO LIGHTBOX PLAYER MODAL */}
      <Modal
        isOpen={isVideoLightboxOpen}
        onClose={() => setIsVideoLightboxOpen(false)}
        title={`Video Player — ${selectedCreative?.name || 'Creative Video'}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-center">
          {selectedCreative?.url && (
            <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
              <video
                src={selectedCreative.url}
                controls
                autoPlay
                className="w-full max-h-[70vh] mx-auto object-contain"
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setIsVideoLightboxOpen(false)}>
              Close Player
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};
