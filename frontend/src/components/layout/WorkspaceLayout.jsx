import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Modal } from '../ui/Modal';
import { Input } from '../forms/Input';
import { Textarea } from '../forms/Textarea';
import { Select } from '../forms/Select';
import { Button } from '../ui/Button';
import { ToastContainer } from '../common/ToastContainer';
import { FileUpload } from '../common/FileUpload';
import { useWorkspace } from '../../hooks/useWorkspace';

import { useToast } from '../../hooks/useToast';
import { contentService } from '../../services/contentService';
import { POST_STATUS, PLATFORMS } from '../../utils/constants';

export const WorkspaceLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { activeWorkspace, clients } = useWorkspace();
  const toast = useToast();

  // Create Post Form State
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [clientId, setClientId] = useState(clients[0]?.id || 'cli_lumina');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram']);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!title || !caption) {
      toast.error('Missing fields', 'Please enter a title and caption for the post.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClient = clients.find((c) => c.id === clientId) || clients[0];
      await contentService.createPost({
        workspaceId: activeWorkspace?.id || 'ws_hyperdrive',
        clientId: selectedClient?.id || 'cli_lumina',
        clientName: selectedClient?.name || 'Lumina Fashion',
        title,
        caption,
        platforms: selectedPlatforms,
        mediaUrl: mediaUrl || '',
        status: POST_STATUS.PENDING_APPROVAL,
        scheduledFor: new Date(Date.now() + 86400000 * 3).toISOString(),
        author: 'Alex Vance',
      });


      toast.success('Post Created', 'Post has been submitted for client review.');
      setIsCreateModalOpen(false);
      // Reset
      setTitle('');
      setCaption('');
      setMediaUrl('');
    } catch (err) {
      toast.error('Error', 'Failed to create post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePlatform = (pId) => {
    if (selectedPlatforms.includes(pId)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== pId));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, pId]);
    }
  };

  const location = useLocation();
  const isChat = location.pathname.endsWith('/chat');
  const isCalendar = location.pathname.includes('/calendar');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <Sidebar className="relative z-50 w-64" onCloseMobile={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />

        {/* Dynamic Page Body: Full-height for Chat, Wide for Calendar, Padded scroll for other pages */}
        {isChat ? (
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Outlet />
          </main>
        ) : isCalendar ? (
          <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
            <div className="w-full mx-auto space-y-5">
              <Outlet />
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <Outlet />
            </div>
          </main>
        )}
      </div>


      {/* Global Toast Container */}
      <ToastContainer />

      {/* Quick Create Post Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Social Post"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreatePost} className="space-y-4">
          <Select
            label="Target Client Account"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={clients.map((c) => ({ value: c.id, label: `${c.name} (${c.category})` }))}
          />

          <Input
            label="Post Internal Title"
            placeholder="e.g. Summer Sale Announcement Reel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            label="Post Content & Caption"
            placeholder="Write your social post copy with hashtags..."
            rows={4}
            maxLength={2200}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          {/* Platforms Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Publish Channels</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(PLATFORMS).map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? `${p.badgeBg} font-semibold shadow-2xs`
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Creative Media Upload</label>
            <FileUpload
              accept="image/*,video/*"
              maxSizeMB={50}
              onFileSelect={(files) => {
                const file = Array.isArray(files) ? files[0] : files;
                if (file) {
                  const url = URL.createObjectURL(file);
                  setMediaUrl(url);
                }
              }}
            />
          </div>


          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" isLoading={isSubmitting}>
              Submit for Approval
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
