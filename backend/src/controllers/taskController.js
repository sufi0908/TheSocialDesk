const taskService = require('../services/taskService');
const assetService = require('../services/assetService');

class TaskController {
  // POST /api/tasks
  async createTask(req, res, next) {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      let payload = { ...req.body };

      // Parse JSON fields if sent via multipart/form-data
      if (typeof payload.attachments === 'string') {
        try {
          payload.attachments = JSON.parse(payload.attachments);
        } catch (e) {
          payload.attachments = [];
        }
      }

      if (!Array.isArray(payload.attachments)) {
        payload.attachments = [];
      }

      // If physical files are attached to the creation request, upload via assetService
      if (files && files.length > 0) {
        for (const file of files) {
          const asset = await assetService.createUploadedAsset(req.user, req.workspaceId, file, {
            displayName: file.originalname,
            category: 'TASK_ATTACHMENT',
          });

          payload.attachments.push({
            fileName: asset.file_name || file.originalname,
            fileUrl: asset.file_url || `/api/assets/${asset.id}/file`,
            fileType: asset.file_type || asset.mime_type || file.mimetype,
            fileSize: asset.file_size || file.size,
            assetId: asset.id,
            attachmentType: 'REFERENCE',
          });
        }
      }

      const result = await taskService.createTask(req.user, req.workspaceId, payload);
      return res.status(201).json({
        success: true,
        message: 'Task created successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tasks
  async listTasks(req, res, next) {
    try {
      const result = await taskService.listTasks(req.user, req.workspaceId, req.query);
      return res.status(200).json({
        success: true,
        data: result,
        count: result.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tasks/my
  async getMyTasks(req, res, next) {
    try {
      const result = await taskService.getMyTasks(req.user, req.workspaceId, req.query);
      return res.status(200).json({
        success: true,
        data: result,
        count: result.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tasks/:id
  async getTask(req, res, next) {
    try {
      const result = await taskService.getTask(req.user, req.workspaceId, req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/tasks/:id
  async updateTask(req, res, next) {
    try {
      const result = await taskService.updateTask(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Task updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/tasks/:id/assign
  async reassignTask(req, res, next) {
    try {
      const { assignedTo, assigneeId } = req.body;
      const targetAssignee = assignedTo || assigneeId;
      const result = await taskService.reassignTask(req.user, req.workspaceId, req.params.id, targetAssignee);
      return res.status(200).json({
        success: true,
        message: `Task reassigned to ${result.assignee_name || result.assigneeName}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/tasks/:id/status
  async updateTaskStatus(req, res, next) {
    try {
      const { status, notes } = req.body;
      const result = await taskService.updateTaskStatus(req.user, req.workspaceId, req.params.id, status, notes);
      return res.status(200).json({
        success: true,
        message: `Task status updated to ${status}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/tasks/:id/duplicate
  async duplicateTask(req, res, next) {
    try {
      const result = await taskService.duplicateTask(req.user, req.workspaceId, req.params.id);
      return res.status(201).json({
        success: true,
        message: 'Task duplicated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/tasks/:id
  async deleteTask(req, res, next) {
    try {
      const result = await taskService.deleteTask(req.user, req.workspaceId, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tasks/:id/comments
  async getTaskComments(req, res, next) {
    try {
      const result = await taskService.getTaskComments(req.user, req.workspaceId, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/tasks/:id/comments
  async addComment(req, res, next) {
    try {
      const { message, comment, commentText } = req.body;
      const text = message || comment || commentText;
      const result = await taskService.addComment(req.user, req.workspaceId, req.params.id, text);
      return res.status(201).json({ success: true, message: 'Comment added.', data: result });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/tasks/:id/comments/:commentId
  async deleteComment(req, res, next) {
    try {
      const result = await taskService.deleteComment(req.user, req.workspaceId, req.params.id, req.params.commentId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/tasks/:id/attachments
  async addAttachment(req, res, next) {
    try {
      const file = req.file || (req.files && req.files[0]);
      let attachmentPayload = { ...req.body };

      if (file) {
        // Upload via assetService
        const asset = await assetService.createUploadedAsset(req.user, req.workspaceId, file, {
          displayName: file.originalname,
          category: 'TASK_ATTACHMENT',
          ...req.body,
        });

        attachmentPayload = {
          fileName: asset.file_name || file.originalname,
          fileUrl: asset.file_url || `/api/assets/${asset.id}/file`,
          fileType: asset.file_type || asset.mime_type || file.mimetype,
          fileSize: asset.file_size || file.size,
          assetId: asset.id,
          attachmentType: req.body.attachmentType || 'REFERENCE',
        };
      }

      const result = await taskService.addAttachment(req.user, req.workspaceId, req.params.id, attachmentPayload);
      return res.status(201).json({ success: true, message: 'Attachment uploaded successfully.', data: result });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/tasks/:id/attachments/:attachmentId
  async deleteAttachment(req, res, next) {
    try {
      const result = await taskService.deleteAttachment(req.user, req.workspaceId, req.params.id, req.params.attachmentId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tasks/:id/activity
  async getTaskActivity(req, res, next) {
    try {
      const task = await taskService.getTask(req.user, req.workspaceId, req.params.id);
      return res.status(200).json({ success: true, data: task.activity || [] });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();
