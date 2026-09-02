import { apiClient } from './apiClient';
import { resolveMediaUrl } from '../utils/mediaUtils';

export const TASK_STATUSES = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  READY_FOR_REVIEW: 'Ready for Review',
  REVISION_REQUIRED: 'Revision Required',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
  CANCELLED: 'Cancelled',
  REOPENED: 'Reopened',
};

export const TASK_PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

function normalizeTask(t) {
  if (!t) return null;

  const rawStatus = String(t.status || 'TODO').toUpperCase();
  const statusFormatted =
    rawStatus === 'TODO'
      ? 'To Do'
      : rawStatus === 'IN_PROGRESS'
      ? 'In Progress'
      : rawStatus === 'READY_FOR_REVIEW' || rawStatus === 'REVIEW' || rawStatus === 'IN_REVIEW'
      ? 'Ready for Review'
      : rawStatus === 'REVISION' || rawStatus === 'REVISION_REQUIRED'
      ? 'Revision Required'
      : rawStatus === 'COMPLETED'
      ? 'Completed'
      : rawStatus === 'BLOCKED'
      ? 'Blocked'
      : rawStatus === 'CANCELLED'
      ? 'Cancelled'
      : rawStatus === 'REOPENED'
      ? 'Reopened'
      : t.statusDisplay || t.status || 'To Do';

  const priorityFormatted = t.priority
    ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase()
    : 'Medium';

  const dueDateObj = t.due_date || t.dueDate ? new Date(t.due_date || t.dueDate) : null;
  const isCompleted = rawStatus === 'COMPLETED';
  const isOverdue = dueDateObj && dueDateObj < new Date() && !isCompleted;

  const allAttachments = Array.isArray(t.attachments)
    ? t.attachments.map((a) => {
        const fileName = a.fileName || a.name || a.originalName || a.file_name || 'File';
        const rawUrl = a.fileUrl || a.file_url || a.url || (a.assetId || a.asset_id ? `/api/assets/${a.assetId || a.asset_id}/file` : '');
        const resolvedUrl = resolveMediaUrl(rawUrl);

        const mime = String(a.mimeType || a.mime_type || a.fileType || a.file_type || '').toLowerCase();
        const ext = (fileName.split('.').pop() || '').toLowerCase();

        const isImg =
          mime.startsWith('image/') ||
          ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext);
        const isVid =
          mime.startsWith('video/') ||
          ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(ext);
        const isPdf =
          mime.includes('pdf') ||
          ext === 'pdf';

        const type = isImg ? 'image' : isVid ? 'video' : isPdf ? 'pdf' : 'document';

        const sizeInBytes = a.fileSize || a.file_size || a.size || null;
        let formattedSize = 'Attachment';
        if (sizeInBytes && typeof sizeInBytes === 'number') {
          formattedSize = sizeInBytes > 1048576 ? `${(sizeInBytes / 1048576).toFixed(1)} MB` : `${Math.round(sizeInBytes / 1024)} KB`;
        } else if (typeof sizeInBytes === 'string') {
          formattedSize = sizeInBytes;
        }

        const attachmentType =
          String(a.attachmentType || a.attachment_type || '').toUpperCase() === 'SUBMISSION'
            ? 'SUBMISSION'
            : 'REFERENCE';

        return {
          id: a.id,
          taskId: a.taskId || a.task_id,
          assetId: a.assetId || a.asset_id,
          originalName: a.originalName || a.original_name || fileName,
          name: fileName,
          fileName: fileName,
          url: resolvedUrl,
          fileUrl: resolvedUrl,
          thumbnailUrl: isImg ? resolvedUrl : (isVid ? null : resolvedUrl),
          type: type,
          mimeType: mime || (isImg ? 'image/png' : isVid ? 'video/mp4' : isPdf ? 'application/pdf' : 'application/octet-stream'),
          size: sizeInBytes,
          fileSize: formattedSize,
          attachmentType: attachmentType,
          createdAt: a.createdAt || a.created_at,
          uploadedBy: a.uploadedBy || {
            id: a.userId || a.user_id,
            name: a.uploadedByName || a.uploaded_by_name || 'Team Member',
            avatar: a.uploadedByAvatar || a.uploaded_by_avatar || '',
          },
          uploadedByName: a.uploadedByName || a.uploaded_by_name || (a.uploadedBy?.name) || 'Team Member',
          uploadedByAvatar: a.uploadedByAvatar || a.uploaded_by_avatar || (a.uploadedBy?.avatar) || '',
        };
      })
    : [];

  const referenceFiles = allAttachments.filter((a) => a.attachmentType === 'REFERENCE');
  const deliverables = allAttachments.filter((a) => a.attachmentType === 'SUBMISSION');

  const normalizedComments = Array.isArray(t.comments)
    ? t.comments.map((c) => ({
        id: c.id,
        taskId: c.taskId || c.task_id,
        userId: c.userId || c.user_id,
        text: c.text || c.message || c.commentText || '',
        message: c.message || c.text || c.commentText || '',
        commentText: c.commentText || c.text || c.message || '',
        createdAt: c.createdAt || c.created_at,
        updatedAt: c.updatedAt || c.updated_at,
        userName: c.userName || c.user_name || (c.user?.name) || 'Team Member',
        userAvatar: c.userAvatar || c.user_avatar || (c.user?.avatar) || '',
        userRole: c.userRole || c.user_role || (c.user?.role) || 'Member',
        user: c.user || {
          id: c.userId || c.user_id,
          name: c.userName || c.user_name || 'Team Member',
          avatar: c.userAvatar || c.user_avatar || '',
          role: c.userRole || c.user_role || 'Member',
        },
      }))
    : [];

  const normalizedActivity = Array.isArray(t.activity)
    ? t.activity.map((act) => ({
        id: act.id,
        taskId: act.taskId || act.task_id,
        userId: act.userId || act.user_id,
        action: act.action,
        description: act.description,
        createdAt: act.createdAt || act.created_at,
        userName: act.userName || act.user_name || (act.user?.name) || 'System',
        userAvatar: act.userAvatar || act.user_avatar || (act.user?.avatar) || '',
        user: act.user || {
          id: act.userId || act.user_id,
          name: act.userName || act.user_name || 'System',
          avatar: act.userAvatar || act.user_avatar || '',
        },
      }))
    : [];

  return {
    id: t.id,
    title: t.title,
    description: t.description || '',
    instructions: t.instructions || '',
    status: rawStatus,
    statusDisplay: statusFormatted,
    priority: (t.priority || 'MEDIUM').toUpperCase(),
    priorityDisplay: priorityFormatted,
    isOverdue: t.isOverdue !== undefined ? Boolean(t.isOverdue) : Boolean(isOverdue),
    dueDate: t.due_date || t.dueDate || null,
    due_date: t.due_date || t.dueDate || null,
    dueTime: t.due_time || t.dueTime || '',
    due_time: t.due_time || t.dueTime || '',
    createdAt: t.created_at || t.createdAt,
    created_at: t.created_at || t.createdAt,
    updatedAt: t.updated_at || t.updatedAt,
    updated_at: t.updated_at || t.updatedAt,
    completedAt: t.completed_at || t.completedAt,
    completed_at: t.completed_at || t.completedAt,
    client: t.client_company_name || t.client_name || t.client?.name || t.client || '',
    client_name: t.client_name || t.client_company_name || t.client?.name || t.client || '',
    client_company_name: t.client_company_name || t.client_name || t.client?.companyName || t.client || '',
    clientId: t.client_id || t.clientId || t.client?.id,
    client_id: t.client_id || t.clientId || t.client?.id,
    project: t.project_name || t.project?.name || t.project || '',
    project_name: t.project_name || t.project?.name || t.project || '',
    projectId: t.project_id || t.projectId || t.project?.id,
    project_id: t.project_id || t.projectId || t.project?.id,
    contentId: t.content_id || t.contentId,
    content_id: t.content_id || t.contentId,
    contentTitle: t.content_title || t.contentTitle || '',
    content_title: t.content_title || t.contentTitle || '',
    assignedTo: t.assigned_to || t.assignedTo,
    assigned_to: t.assigned_to || t.assignedTo,
    assignee: t.assignee || (t.assigned_to ? {
      id: t.assigned_to,
      name: t.assignee_name || t.assigneeName || 'Team Member',
      avatar: t.assignee_avatar || t.assigneeAvatar || '',
      role: t.assignee_role || t.assigneeRole || 'Member',
    } : null),
    assigneeName: t.assignee_name || t.assigneeName || (t.assignee?.name) || 'Unassigned',
    assignee_name: t.assignee_name || t.assigneeName || (t.assignee?.name) || 'Unassigned',
    assigneeAvatar: t.assignee_avatar || t.assigneeAvatar || (t.assignee?.avatar) || '',
    assignee_avatar: t.assignee_avatar || t.assigneeAvatar || (t.assignee?.avatar) || '',
    assigneeRole: t.assignee_role || t.assigneeRole || (t.assignee?.role) || '',
    createdBy: t.created_by || t.createdBy,
    created_by: t.created_by || t.createdBy,
    creator: t.creator || {
      id: t.created_by || t.createdBy,
      name: t.creator_name || t.creatorName || 'Workspace Manager',
      avatar: t.creator_avatar || t.creatorAvatar || '',
      role: t.creator_role || t.creatorRole || 'Manager',
    },
    creatorName: t.creator_name || t.creatorName || (t.creator?.name) || 'Workspace Manager',
    creator_name: t.creator_name || t.creatorName || (t.creator?.name) || 'Workspace Manager',
    creatorAvatar: t.creator_avatar || t.creatorAvatar || (t.creator?.avatar) || '',
    creator_avatar: t.creator_avatar || t.creatorAvatar || (t.creator?.avatar) || '',
    commentsCount: parseInt(t.comments_count || t.commentsCount || (t.comments?.length) || 0, 10),
    comments_count: parseInt(t.comments_count || t.commentsCount || (t.comments?.length) || 0, 10),
    attachmentsCount: parseInt(t.attachments_count || t.attachmentsCount || allAttachments.length, 10),
    attachments_count: parseInt(t.attachments_count || t.attachmentsCount || allAttachments.length, 10),
    attachments: allAttachments,
    referenceFiles: referenceFiles,
    deliverables: deliverables,
    comments: normalizedComments,
    activity: normalizedActivity,
  };
}

export const taskService = {
  async getTasks(filters = {}) {
    const response = await apiClient.get('/tasks', { params: filters });
    if (response.data?.success && Array.isArray(response.data?.data)) {
      return response.data.data.map(normalizeTask);
    }
    return [];
  },

  async getAllTasks(filters = {}) {
    return this.getTasks(filters);
  },

  async getMyTasks(filters = {}) {
    const response = await apiClient.get('/tasks/my', { params: filters });
    if (response.data?.success && Array.isArray(response.data?.data)) {
      return response.data.data.map(normalizeTask);
    }
    return [];
  },

  async getTask(taskId) {
    const response = await apiClient.get(`/tasks/${taskId}`);
    if (response.data?.success && response.data?.data) {
      return normalizeTask(response.data.data);
    }
    throw new Error(response.data?.message || 'Task not found');
  },

  async getTaskDetails(taskId) {
    return this.getTask(taskId);
  },

  async createTask(taskData) {
    let payload = taskData;

    if (taskData instanceof FormData) {
      const response = await apiClient.post('/tasks', taskData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data?.success && response.data?.data) {
        return normalizeTask(response.data.data);
      }
      throw new Error(response.data?.message || 'Failed to create task');
    }

    const backendStatus =
      taskData.status === 'To Do' || taskData.status === 'TODO'
        ? 'TODO'
        : taskData.status === 'In Progress' || taskData.status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : taskData.status === 'Ready for Review' || taskData.status === 'READY_FOR_REVIEW'
        ? 'READY_FOR_REVIEW'
        : (taskData.status || 'TODO').toUpperCase();

    payload = {
      title: taskData.title,
      description: taskData.description || null,
      instructions: taskData.instructions || null,
      clientId: taskData.clientId || (typeof taskData.client === 'number' ? taskData.client : undefined),
      projectId: taskData.projectId || (typeof taskData.project === 'number' ? taskData.project : undefined),
      contentId: taskData.contentId,
      assignedTo: taskData.assignedTo || taskData.assigneeId || null,
      status: backendStatus,
      priority: (taskData.priority || 'MEDIUM').toUpperCase(),
      dueDate: taskData.dueDate || taskData.due_date || null,
      dueTime: taskData.dueTime || taskData.due_time || null,
      attachments: taskData.attachments || [],
    };

    const response = await apiClient.post('/tasks', payload);
    if (response.data?.success && response.data?.data) {
      return normalizeTask(response.data.data);
    }
    throw new Error(response.data?.message || 'Failed to create task');
  },

  async updateTask(id, updatedFields) {
    const backendStatus = updatedFields.status
      ? updatedFields.status === 'To Do' || updatedFields.status === 'TODO'
        ? 'TODO'
        : updatedFields.status === 'In Progress' || updatedFields.status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : updatedFields.status === 'Ready for Review' || updatedFields.status === 'READY_FOR_REVIEW'
        ? 'READY_FOR_REVIEW'
        : updatedFields.status === 'Revision Required' || updatedFields.status === 'REVISION_REQUIRED' || updatedFields.status === 'REVISION'
        ? 'REVISION_REQUIRED'
        : updatedFields.status === 'Completed' || updatedFields.status === 'COMPLETED'
        ? 'COMPLETED'
        : updatedFields.status.toUpperCase()
      : undefined;

    const payload = {
      title: updatedFields.title,
      description: updatedFields.description,
      instructions: updatedFields.instructions,
      assignedTo: updatedFields.assignedTo !== undefined ? updatedFields.assignedTo : updatedFields.assigneeId,
      clientId: updatedFields.clientId,
      projectId: updatedFields.projectId,
      status: backendStatus,
      priority: updatedFields.priority ? updatedFields.priority.toUpperCase() : undefined,
      dueDate: updatedFields.dueDate || updatedFields.due_date,
      dueTime: updatedFields.dueTime || updatedFields.due_time,
    };

    const response = await apiClient.put(`/tasks/${id}`, payload);
    if (response.data?.success && response.data?.data) {
      return normalizeTask(response.data.data);
    }
    throw new Error(response.data?.message || 'Failed to update task');
  },

  async reassignTask(id, newAssigneeId) {
    const response = await apiClient.post(`/tasks/${id}/assign`, { assignedTo: newAssigneeId });
    if (response.data?.success && response.data?.data) {
      return normalizeTask(response.data.data);
    }
    throw new Error(response.data?.message || 'Failed to reassign task');
  },

  async updateTaskStatus(id, newStatus, notes = '') {
    const backendStatus =
      newStatus === 'To Do' || newStatus === 'TODO'
        ? 'TODO'
        : newStatus === 'In Progress' || newStatus === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : newStatus === 'Ready for Review' || newStatus === 'READY_FOR_REVIEW'
        ? 'READY_FOR_REVIEW'
        : newStatus === 'Revision Required' || newStatus === 'REVISION_REQUIRED' || newStatus === 'REVISION'
        ? 'REVISION_REQUIRED'
        : newStatus === 'Completed' || newStatus === 'COMPLETED'
        ? 'COMPLETED'
        : newStatus === 'Blocked' || newStatus === 'BLOCKED'
        ? 'BLOCKED'
        : newStatus === 'Cancelled' || newStatus === 'CANCELLED'
        ? 'CANCELLED'
        : newStatus === 'Reopened' || newStatus === 'REOPENED'
        ? 'REOPENED'
        : newStatus.toUpperCase();

    const response = await apiClient.patch(`/tasks/${id}/status`, { status: backendStatus, notes });
    if (response.data?.success && response.data?.data) {
      return normalizeTask(response.data.data);
    }
    throw new Error(response.data?.message || 'Failed to update task status');
  },

  async startTask(id) {
    return this.updateTaskStatus(id, 'IN_PROGRESS');
  },

  async submitForReview(id) {
    return this.updateTaskStatus(id, 'READY_FOR_REVIEW');
  },

  async approveTask(id) {
    return this.updateTaskStatus(id, 'COMPLETED');
  },

  async requestRevision(id, notes) {
    return this.updateTaskStatus(id, 'REVISION_REQUIRED', notes);
  },

  async duplicateTask(id) {
    const response = await apiClient.post(`/tasks/${id}/duplicate`);
    if (response.data?.success && response.data?.data) {
      return normalizeTask(response.data.data);
    }
    throw new Error(response.data?.message || 'Failed to duplicate task');
  },

  async deleteTask(id) {
    const response = await apiClient.delete(`/tasks/${id}`);
    if (response.data?.success) {
      return true;
    }
    throw new Error(response.data?.message || 'Failed to delete task');
  },

  async getTaskComments(taskId) {
    const response = await apiClient.get(`/tasks/${taskId}/comments`);
    if (response.data?.success && Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    return [];
  },

  async addComment(taskId, commentText) {
    const response = await apiClient.post(`/tasks/${taskId}/comments`, { message: commentText });
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to add comment');
  },

  async deleteComment(taskId, commentId) {
    const response = await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
    if (response.data?.success) {
      return true;
    }
    throw new Error(response.data?.message || 'Failed to delete comment');
  },

  async uploadTaskAttachment(taskId, file, attachmentType = 'REFERENCE', onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('attachmentType', attachmentType);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (onProgress && typeof onProgress === 'function') {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      };
    }

    const response = await apiClient.post(`/tasks/${taskId}/attachments`, formData, config);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to upload attachment');
  },

  async deleteAttachment(taskId, attachmentId) {
    const response = await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    if (response.data?.success) {
      return true;
    }
    throw new Error(response.data?.message || 'Failed to delete attachment');
  },

  async getTaskActivity(taskId) {
    const response = await apiClient.get(`/tasks/${taskId}/activity`);
    if (response.data?.success && Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    return [];
  },
};
