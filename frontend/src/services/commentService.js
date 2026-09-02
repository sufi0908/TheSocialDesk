import { apiClient } from './apiClient';
import { storage } from './storage';
import { notificationService, NOTIFICATION_EVENTS } from './notificationService';
import { ROLES } from '../utils/constants';

export const INITIAL_COMMENTS = [];


export const commentService = {
  async getComments(entityType, entityId) {
    if (entityType === 'content' && entityId && !isNaN(entityId)) {
      try {
        const response = await apiClient.get(`/content/${entityId}/comments`);
        if (response.data?.success && response.data?.data) {
          return response.data.data.map((c) => ({
            id: c.id,
            entityType: 'content',
            entityId: c.content_id,
            authorId: c.user_id,
            authorName: c.author_name,
            authorRole: c.author_role,
            authorAvatar: c.author_avatar || '',
            message: c.comment_text,
            commentType: c.comment_type,
            isInternal: Boolean(c.is_internal),
            createdAt: c.created_at,
            parentId: c.parent_id,
          }));
        }
      } catch (error) {
        console.warn('Backend list comments failed, fallback to local store:', error.message);
      }
    }

    const db = storage.getMockDatabase();
    const list = db.comments || INITIAL_COMMENTS;
    return list.filter((c) => c.entityType === entityType && String(c.entityId) === String(entityId));
  },

  async addComment(data) {
    if (data.entityType === 'content' && data.entityId && !isNaN(data.entityId)) {
      try {
        const response = await apiClient.post(`/content/${data.entityId}/comments`, {
          commentText: data.message,
          commentType: data.commentType || (data.isInternal ? 'INTERNAL' : 'CLIENT'),
          parentId: data.parentId || null,
        });

        if (response.data?.success && response.data?.data) {
          const c = response.data.data;
          return {
            id: c.id,
            entityType: 'content',
            entityId: c.content_id,
            authorId: c.user_id,
            authorName: c.author_name,
            authorRole: c.author_role,
            authorAvatar: c.author_avatar || '',
            message: c.comment_text,
            commentType: c.comment_type,
            isInternal: Boolean(c.is_internal),
            createdAt: c.created_at,
            parentId: c.parent_id,
          };
        }
      } catch (error) {
        console.warn('Backend add comment failed, fallback to local store:', error.message);
      }
    }

    const newComment = {
      id: `cmt_${Date.now()}`,
      entityType: data.entityType,
      entityId: data.entityId,
      authorId: data.authorId || 'usr_current',
      authorName: data.authorName || 'Marcus Chen',
      authorRole: data.authorRole || ROLES.WORKSPACE_MANAGER,
      authorAvatar: data.authorAvatar || '',
      message: data.message,
      parentId: data.parentId || null,
      createdAt: new Date().toISOString(),
    };

    storage.updateMockDatabase((db) => {
      const current = db.comments || INITIAL_COMMENTS;
      return { ...db, comments: [...current, newComment] };
    });

    return newComment;
  },

  async deleteComment(commentId) {
    if (commentId && !isNaN(commentId)) {
      try {
        const response = await apiClient.delete(`/comments/${commentId}`);
        if (response.data?.success) {
          return { success: true };
        }
      } catch (error) {
        console.warn('Backend delete comment failed:', error.message);
      }
    }

    storage.updateMockDatabase((db) => {
      const current = db.comments || INITIAL_COMMENTS;
      return { ...db, comments: current.filter((c) => String(c.id) !== String(commentId)) };
    });
    return { success: true };
  },
};
