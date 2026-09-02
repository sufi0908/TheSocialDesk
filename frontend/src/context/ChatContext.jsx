import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { chatService } from '../services/chatService';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../services/storage';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingEarlierMessages, setLoadingEarlierMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [sharedMedia, setSharedMedia] = useState({ all: [], images: [], videos: [], documents: [], audio: [] });
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadTotalCount, setUnreadTotalCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const socketRef = useRef(null);
  const activeGroupIdRef = useRef(null);
  activeGroupIdRef.current = activeGroupId;

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = storage.get(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '');
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (activeGroupIdRef.current) {
        socket.emit('join_group', { groupId: activeGroupIdRef.current });
      }
    });

    // Real-time message receiver with duplicate protection
    socket.on('new_message', (msg) => {
      const currentActiveId = activeGroupIdRef.current;
      const msgGroupId = Number(msg.group_id || msg.groupId);

      // If message is for currently open group, append to messages
      if (currentActiveId && currentActiveId === msgGroupId) {
        setMessages((prev) => {
          if (prev.some((m) => Number(m.id) === Number(msg.id))) {
            return prev;
          }
          return [...prev, msg];
        });

        // Mark read on backend
        chatService.markRead(msgGroupId, msg.id).catch(() => {});
      }

      // Update last message & unread count in groups list
      setGroups((prevGroups) =>
        prevGroups.map((g) => {
          if (Number(g.id) === msgGroupId) {
            const isCurrentOpen = currentActiveId === msgGroupId;
            return {
              ...g,
              last_message_id: msg.id,
              last_message: msg.message || (msg.attachments?.length ? `[${msg.attachments.length} Attachment(s)]` : ''),
              last_message_type: msg.message_type || msg.messageType,
              last_message_at: msg.created_at || msg.createdAt,
              last_message_sender: msg.sender_name || msg.senderName,
              unread_count: isCurrentOpen ? 0 : (Number(g.unread_count) || 0) + 1,
            };
          }
          return g;
        })
      );

      // Refresh total badge
      refreshUnreadCount();
    });

    socket.on('message_updated', (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (Number(m.id) === Number(updatedMsg.id) ? updatedMsg : m))
      );
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => Number(m.id) !== Number(messageId)));
    });

    socket.on('message_reaction', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (Number(m.id) === Number(messageId) ? { ...m, reactions } : m))
      );
    });

    socket.on('group_created', (newGroup) => {
      setGroups((prev) => {
        if (prev.some((g) => Number(g.id) === Number(newGroup.id))) return prev;
        return [newGroup, ...prev];
      });
      refreshUnreadCount();
    });

    socket.on('group_updated', (updatedGroup) => {
      setGroups((prev) =>
        prev.map((g) => (Number(g.id) === Number(updatedGroup.id) ? { ...g, ...updatedGroup } : g))
      );
      if (activeGroupIdRef.current && Number(activeGroupIdRef.current) === Number(updatedGroup.id)) {
        setActiveGroup(updatedGroup);
      }
    });

    socket.on('group_member_added', ({ groupId, group }) => {
      if (group) {
        setGroups((prev) =>
          prev.map((g) => (Number(g.id) === Number(groupId) ? { ...g, ...group } : g))
        );
        if (activeGroupIdRef.current && Number(activeGroupIdRef.current) === Number(groupId)) {
          setActiveGroup(group);
        }
      } else {
        refreshGroups();
      }
    });

    socket.on('group_member_removed', ({ groupId, userId }) => {
      if (user && Number(user.id) === Number(userId)) {
        setGroups((prev) => prev.filter((g) => Number(g.id) !== Number(groupId)));
        if (activeGroupIdRef.current && Number(activeGroupIdRef.current) === Number(groupId)) {
          setActiveGroupId(null);
          setActiveGroup(null);
          setMessages([]);
        }
      } else {
        if (activeGroupIdRef.current && Number(activeGroupIdRef.current) === Number(groupId)) {
          chatService.getGroupDetails(groupId).then((g) => setActiveGroup(g)).catch(() => {});
        }
        refreshGroups();
      }
    });

    socket.on('group_member_promoted', ({ groupId }) => {
      if (activeGroupIdRef.current && Number(activeGroupIdRef.current) === Number(groupId)) {
        chatService.getGroupDetails(groupId).then((g) => setActiveGroup(g)).catch(() => {});
      }
    });

    socket.on('group_member_demoted', ({ groupId }) => {
      if (activeGroupIdRef.current && Number(activeGroupIdRef.current) === Number(groupId)) {
        chatService.getGroupDetails(groupId).then((g) => setActiveGroup(g)).catch(() => {});
      }
    });

    socket.on('group_archived', ({ groupId }) => {
      setGroups((prev) => prev.filter((g) => Number(g.id) !== Number(groupId)));
      if (activeGroupIdRef.current && Number(activeGroupIdRef.current) === Number(groupId)) {
        setActiveGroupId(null);
        setActiveGroup(null);
        setMessages([]);
      }
    });

    socket.on('group_removed', ({ groupId }) => {
      setGroups((prev) => prev.filter((g) => Number(g.id) !== Number(groupId)));
      if (activeGroupIdRef.current && Number(activeGroupIdRef.current) === Number(groupId)) {
        setActiveGroupId(null);
        setActiveGroup(null);
        setMessages([]);
      }
    });

    socket.on('user_typing', ({ groupId, userId, userName }) => {
      setTypingUsers((prev) => {
        const groupTyping = prev[groupId] || [];
        if (!groupTyping.some((u) => u.userId === userId)) {
          return { ...prev, [groupId]: [...groupTyping, { userId, userName }] };
        }
        return prev;
      });
    });

    socket.on('user_stop_typing', ({ groupId, userId }) => {
      setTypingUsers((prev) => {
        const groupTyping = prev[groupId] || [];
        return { ...prev, [groupId]: groupTyping.filter((u) => u.userId !== userId) };
      });
    });

    socket.on('user_presence', ({ userId, status }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (status === 'ONLINE') updated.add(Number(userId));
        else updated.delete(Number(userId));
        return updated;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Load user groups & total unread count
  const refreshGroups = useCallback(async (search = '') => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const list = await chatService.getGroups(search);
      setGroups(list);
    } catch (err) {
      console.error('Failed to load chat groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [user]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await chatService.getUnreadCount();
      setUnreadTotalCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshGroups();
      refreshUnreadCount();
    }
  }, [user, refreshGroups, refreshUnreadCount]);

  // Load shared media for active group
  const loadSharedMedia = useCallback(async (groupId) => {
    if (!groupId) return;
    setLoadingMedia(true);
    try {
      const media = await chatService.getGroupMedia(groupId);
      setSharedMedia(media);
    } catch (err) {
      console.error('Failed to load shared media:', err);
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  // Select active group & load details + message history (50 messages)
  const selectGroup = useCallback(async (groupId) => {
    if (!groupId) {
      setActiveGroupId(null);
      setActiveGroup(null);
      setMessages([]);
      setHasMoreMessages(false);
      return;
    }

    const numericGroupId = Number(groupId);

    if (activeGroupIdRef.current && socketRef.current) {
      socketRef.current.emit('leave_group', { groupId: activeGroupIdRef.current });
    }

    setActiveGroupId(numericGroupId);
    setLoadingMessages(true);

    try {
      if (socketRef.current) {
        socketRef.current.emit('join_group', { groupId: numericGroupId });
      }

      const [groupDetails, msgData] = await Promise.all([
        chatService.getGroupDetails(numericGroupId),
        chatService.getMessages(numericGroupId, { limit: 50 }),
      ]);

      setActiveGroup(groupDetails);
      setMessages(msgData.messages || []);
      setHasMoreMessages(Boolean(msgData.hasMore));

      // Clear unread count locally for this group
      setGroups((prev) =>
        prev.map((g) => (Number(g.id) === numericGroupId ? { ...g, unread_count: 0 } : g))
      );

      // Mark read on backend
      chatService.markRead(numericGroupId).catch(() => {});
      refreshUnreadCount();

      // Background load shared media
      loadSharedMedia(numericGroupId);
    } catch (err) {
      console.error('Error opening group:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [refreshUnreadCount, loadSharedMedia]);

  // Cursor pagination to load earlier messages
  const loadEarlierMessages = useCallback(async () => {
    if (!activeGroupId || loadingEarlierMessages || !hasMoreMessages || messages.length === 0) {
      return;
    }

    setLoadingEarlierMessages(true);
    try {
      const oldestId = messages[0]?.id;
      const res = await chatService.getMessages(activeGroupId, {
        limit: 40,
        before_id: oldestId,
      });

      if (res.messages && res.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filteredNew = res.messages.filter((m) => !existingIds.has(m.id));
          return [...filteredNew, ...prev];
        });
      }
      setHasMoreMessages(Boolean(res.hasMore));
    } catch (err) {
      console.error('Failed to load earlier messages:', err);
    } finally {
      setLoadingEarlierMessages(false);
    }
  }, [activeGroupId, loadingEarlierMessages, hasMoreMessages, messages]);

  // Typing indicator triggers
  const startTyping = useCallback(() => {
    if (socketRef.current && activeGroupId) {
      socketRef.current.emit('typing_start', { groupId: activeGroupId });
    }
  }, [activeGroupId]);

  const stopTyping = useCallback(() => {
    if (socketRef.current && activeGroupId) {
      socketRef.current.emit('typing_stop', { groupId: activeGroupId });
    }
  }, [activeGroupId]);

  // Send message action (NO full-page reload)
  const sendMessage = useCallback(async (messageData) => {
    if (!activeGroupId) return;
    try {
      const canonicalMsg = await chatService.sendMessage(activeGroupId, messageData);
      
      // Append canonical message to local state immediately if not already added by socket
      setMessages((prev) => {
        if (prev.some((m) => Number(m.id) === Number(canonicalMsg.id))) {
          return prev;
        }
        return [...prev, canonicalMsg];
      });

      // Update sidebar last message without full refetch
      setGroups((prev) =>
        prev.map((g) => {
          if (Number(g.id) === Number(activeGroupId)) {
            return {
              ...g,
              last_message_id: canonicalMsg.id,
              last_message: canonicalMsg.message || (canonicalMsg.attachments?.length ? `[${canonicalMsg.attachments.length} Attachment(s)]` : ''),
              last_message_type: canonicalMsg.message_type || canonicalMsg.messageType,
              last_message_at: canonicalMsg.created_at || canonicalMsg.createdAt,
              last_message_sender: canonicalMsg.sender_name || canonicalMsg.senderName,
            };
          }
          return g;
        })
      );

      // If attachments exist, refresh shared media
      if (canonicalMsg.attachments?.length > 0) {
        loadSharedMedia(activeGroupId);
      }

      return canonicalMsg;
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  }, [activeGroupId, loadSharedMedia]);

  // Edit message
  const editMessage = useCallback(async (messageId, text) => {
    try {
      const updated = await chatService.editMessage(messageId, text);
      setMessages((prev) =>
        prev.map((m) => (Number(m.id) === Number(messageId) ? updated : m))
      );
      return updated;
    } catch (err) {
      console.error('Failed to edit message:', err);
      throw err;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => Number(m.id) !== Number(messageId)));
    } catch (err) {
      console.error('Failed to delete message:', err);
      throw err;
    }
  }, []);

  // Toggle reaction
  const toggleReaction = useCallback(async (messageId, reaction) => {
    try {
      const res = await chatService.toggleReaction(messageId, reaction);
      setMessages((prev) =>
        prev.map((m) => (Number(m.id) === Number(messageId) ? { ...m, reactions: res.reactions } : m))
      );
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  }, []);

  // Add members
  const addMembers = useCallback(async (groupId, memberIds) => {
    try {
      const res = await chatService.addMembers(groupId, memberIds);
      if (res && res.group) {
        setActiveGroup(res.group);
      }
      refreshGroups();
      return res;
    } catch (err) {
      console.error('Failed to add members:', err);
      throw err;
    }
  }, [refreshGroups]);

  // Remove member
  const removeMember = useCallback(async (groupId, userId) => {
    try {
      const res = await chatService.removeMember(groupId, userId);
      const isSelf = Number(userId) === Number(user?.id);
      if (isSelf) {
        setActiveGroupId(null);
        setActiveGroup(null);
        setMessages([]);
      } else {
        const updated = await chatService.getGroupDetails(groupId);
        setActiveGroup(updated);
      }
      refreshGroups();
      return res;
    } catch (err) {
      console.error('Failed to remove member:', err);
      throw err;
    }
  }, [user, refreshGroups]);

  // Update member role
  const updateMemberRole = useCallback(async (groupId, userId, role) => {
    try {
      const res = await chatService.updateMemberRole(groupId, userId, role);
      if (res && res.group) {
        setActiveGroup(res.group);
      }
      refreshGroups();
      return res;
    } catch (err) {
      console.error('Failed to update member role:', err);
      throw err;
    }
  }, [refreshGroups]);

  // Update group details
  const updateGroupDetails = useCallback(async (groupId, data) => {
    try {
      const updated = await chatService.updateGroup(groupId, data);
      setActiveGroup(updated);
      refreshGroups();
      return updated;
    } catch (err) {
      console.error('Failed to update group details:', err);
      throw err;
    }
  }, [refreshGroups]);

  // Leave group
  const leaveGroup = useCallback(async (groupId) => {
    try {
      const res = await chatService.leaveGroup(groupId);
      setActiveGroupId(null);
      setActiveGroup(null);
      setMessages([]);
      refreshGroups();
      return res;
    } catch (err) {
      console.error('Failed to leave group:', err);
      throw err;
    }
  }, [refreshGroups]);

  // Archive group
  const archiveGroup = useCallback(async (groupId) => {
    try {
      const res = await chatService.archiveGroup(groupId);
      setActiveGroupId(null);
      setActiveGroup(null);
      setMessages([]);
      refreshGroups();
      return res;
    } catch (err) {
      console.error('Failed to archive group:', err);
      throw err;
    }
  }, [refreshGroups]);

  // Update mute/pin preferences
  const updatePreferences = useCallback(async (groupId, prefs) => {
    try {
      const res = await chatService.updatePreferences(groupId, prefs);
      refreshGroups();
      return res;
    } catch (err) {
      console.error('Failed to update group preferences:', err);
      throw err;
    }
  }, [refreshGroups]);

  return (
    <ChatContext.Provider
      value={{
        groups,
        loadingGroups,
        activeGroupId,
        activeGroup,
        messages,
        loadingMessages,
        loadingEarlierMessages,
        hasMoreMessages,
        sharedMedia,
        loadingMedia,
        typingUsers: activeGroupId ? typingUsers[activeGroupId] || [] : [],
        unreadTotalCount,
        onlineUsers,
        selectGroup,
        loadEarlierMessages,
        refreshGroups,
        refreshUnreadCount,
        loadSharedMedia,
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
