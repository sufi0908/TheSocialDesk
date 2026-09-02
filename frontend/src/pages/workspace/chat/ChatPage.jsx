import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '../../../context/ChatContext';
import { useAuth } from '../../../hooks/useAuth';
import { GroupList } from '../../../components/chat/GroupList';
import { GroupHeader } from '../../../components/chat/GroupHeader';
import { MessageList } from '../../../components/chat/MessageList';
import { MessageComposer } from '../../../components/chat/MessageComposer';
import { GroupInfoDrawer } from '../../../components/chat/GroupInfoDrawer';
import { CreateGroupModal } from '../../../components/chat/CreateGroupModal';
import { EditGroupModal } from '../../../components/chat/EditGroupModal';
import { AddMembersModal } from '../../../components/chat/AddMembersModal';
import { MediaViewer } from '../../../components/chat/MediaViewer';
import { MessageSquare, Plus, Search, X, Loader2 } from 'lucide-react';

export const ChatPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    groups,
    loadingGroups,
    activeGroupId,
    activeGroup,
    messages,
    loadingMessages,
    loadingEarlierMessages,
    hasMoreMessages,
    sharedMedia,
    typingUsers,
    selectGroup,
    loadEarlierMessages,
    startTyping,
    stopTyping,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    addMembers,
    removeMember,
    updateMemberRole,
    updateGroupDetails,
    leaveGroup,
    archiveGroup,
    updatePreferences,
  } = useChat();

  // Modals & Drawers state
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);

  // Replying & Editing message state
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // In-chat search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inChatSearchTerm, setInChatSearchTerm] = useState('');

  // Media Viewer Lightbox state
  const [mediaViewerState, setMediaViewerState] = useState({
    isOpen: false,
    mediaItem: null,
    mediaList: [],
  });

  // Sync URL query params with active group
  useEffect(() => {
    const urlGroupId = searchParams.get('group');
    if (urlGroupId && Number(urlGroupId) !== Number(activeGroupId)) {
      selectGroup(Number(urlGroupId));
    }
  }, [searchParams]);

  const handleSelectGroup = (groupId) => {
    selectGroup(groupId);
    setSearchParams({ group: String(groupId) });
    setReplyingTo(null);
    setEditingMessage(null);
    setIsSearchOpen(false);
    setInChatSearchTerm('');
  };

  const handleBackToGroups = () => {
    selectGroup(null);
    setSearchParams({});
    setIsInfoDrawerOpen(false);
  };

  const handleOpenMedia = (mediaItem, mediaList = []) => {
    setMediaViewerState({
      isOpen: true,
      mediaItem,
      mediaList,
    });
  };

  const handleCloseMedia = () => {
    setMediaViewerState({
      isOpen: false,
      mediaItem: null,
      mediaList: [],
    });
  };

  const handleNavigateMedia = (nextItem) => {
    setMediaViewerState((prev) => ({
      ...prev,
      mediaItem: nextItem,
    }));
  };

  // Filter messages by in-chat search term if active
  const filteredMessages = inChatSearchTerm.trim()
    ? messages.filter((m) =>
        (m.message || '').toLowerCase().includes(inChatSearchTerm.toLowerCase()) ||
        (m.sender_name || '').toLowerCase().includes(inChatSearchTerm.toLowerCase())
      )
    : messages;

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-white select-none relative">
      {/* COLUMN 1: Conversations List Sidebar (320px–340px desktop) */}
      <div
        className={`w-full md:w-80 lg:w-[340px] shrink-0 h-full min-h-0 flex flex-col min-w-0 ${
          activeGroupId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <GroupList
          groups={groups}
          activeGroupId={activeGroupId}
          onSelectGroup={handleSelectGroup}
          onOpenCreateGroup={() => setIsCreateModalOpen(true)}
          loading={loadingGroups}
        />
      </div>

      {/* COLUMN 2: Active Chat Area (Center Primary Column) */}
      <div
        className={`flex-1 flex flex-col h-full min-h-0 min-w-0 bg-slate-50/40 relative overflow-hidden ${
          !activeGroupId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeGroup ? (
          <>
            {/* Group Header */}
            <GroupHeader
              group={activeGroup}
              onToggleInfo={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
              onToggleSearch={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setInChatSearchTerm('');
              }}
              isSearchOpen={isSearchOpen}
              isInfoOpen={isInfoDrawerOpen}
              onBack={handleBackToGroups}
            />

            {/* In-Chat Search Bar Drawer */}
            {isSearchOpen && (
              <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/90 flex items-center gap-3 animate-in slide-in-from-top-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in this conversation..."
                  value={inChatSearchTerm}
                  onChange={(e) => setInChatSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent text-xs text-slate-800 focus:outline-none font-medium"
                />
                {inChatSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setInChatSearchTerm('')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Messages Stream */}
            {loadingMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">Loading conversation...</span>
              </div>
            ) : (
              <MessageList
                messages={filteredMessages}
                currentUserId={user?.id}
                loadingEarlier={loadingEarlierMessages}
                hasMore={hasMoreMessages && !inChatSearchTerm}
                onLoadEarlier={loadEarlierMessages}
                typingUsers={typingUsers}
                onReply={(msg) => setReplyingTo(msg)}
                onEdit={(msg) => setEditingMessage(msg)}
                onDelete={(msgId) => deleteMessage(msgId)}
                onToggleReaction={(msgId, reaction) => toggleReaction(msgId, reaction)}
                onOpenMedia={handleOpenMedia}
              />
            )}

            {/* Message Composer */}
            <MessageComposer
              onSendMessage={sendMessage}
              onEditMessage={editMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              onStartTyping={startTyping}
              onStopTyping={stopTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Select a conversation
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
              Choose a team group from the left sidebar or create a new group to start sharing
              updates, files, and designs.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create New Group</span>
            </button>
          </div>
        )}
      </div>

      {/* COLUMN 3: Group Information Drawer */}
      {isInfoDrawerOpen && activeGroup && (
        <GroupInfoDrawer
          isOpen={isInfoDrawerOpen}
          onClose={() => setIsInfoDrawerOpen(false)}
          group={activeGroup}
          currentUserId={user?.id}
          currentUserRole={user?.role}
          sharedMedia={sharedMedia}
          onUpdatePreferences={updatePreferences}
          onOpenEditGroup={() => setIsEditModalOpen(true)}
          onOpenAddMembers={() => setIsAddMembersModalOpen(true)}
          onUpdateMemberRole={updateMemberRole}
          onRemoveMember={removeMember}
          onLeaveGroup={leaveGroup}
          onArchiveGroup={archiveGroup}
          onOpenMedia={handleOpenMedia}
        />
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={(newGroup) => {
          handleSelectGroup(newGroup.id);
        }}
      />

      {/* Edit Group Modal */}
      {activeGroup && (
        <EditGroupModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          group={activeGroup}
          onGroupUpdated={updateGroupDetails}
        />
      )}

      {/* Add Members Modal */}
      {activeGroup && (
        <AddMembersModal
          isOpen={isAddMembersModalOpen}
          onClose={() => setIsAddMembersModalOpen(false)}
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          onMembersAdded={(memberIds) => addMembers(activeGroup.id, memberIds)}
        />
      )}

      {/* Media Viewer Lightbox */}
      <MediaViewer
        isOpen={mediaViewerState.isOpen}
        onClose={handleCloseMedia}
        mediaItem={mediaViewerState.mediaItem}
        mediaList={mediaViewerState.mediaList}
        onNavigate={handleNavigateMedia}
      />
    </div>
  );
};

export default ChatPage;
