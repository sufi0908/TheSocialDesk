const fs = require('fs');
const path = require('path');
const chatService = require('../services/chatService');
const { getIO } = require('../config/socket');
const { uploadRoot, cleanupUploadedFile } = require('../middleware/uploadMiddleware');
const { db } = require('../config/database');

class ChatController {
  // GET /api/chat/groups
  async getGroups(req, res, next) {
    try {
      const search = req.query.search || '';
      const groups = await chatService.getUserGroups(req.workspaceId, req.user.id, search);
      return res.status(200).json({ success: true, data: groups });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/chat/groups
  async createGroup(req, res, next) {
    try {
      const group = await chatService.createGroup(
        req.workspaceId,
        req.user.id,
        req.user.role,
        req.body
      );

      // Realtime notification via Socket.IO
      const io = getIO();
      if (io && group.members) {
        group.members.forEach((m) => {
          io.to(`user_${m.user_id}`).emit('group_created', group);
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Chat group created successfully.',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/chat/groups/:id
  async getGroupDetails(req, res, next) {
    try {
      const group = await chatService.getGroupDetails(req.workspaceId, req.user.id, req.params.id);
      return res.status(200).json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/chat/groups/:id/members
  async getGroupMembers(req, res, next) {
    try {
      const members = await chatService.getGroupMembers(req.workspaceId, req.user.id, req.params.id);
      return res.status(200).json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/chat/workspace-users?groupId=...&search=...
  async getWorkspaceUsers(req, res, next) {
    try {
      const groupId = req.query.groupId || req.query.group_id;
      const search = req.query.search || '';
      const users = await chatService.getWorkspaceEligibleUsers(
        req.workspaceId,
        req.user.id,
        groupId,
        search
      );
      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/chat/groups/:id
  async updateGroup(req, res, next) {
    try {
      const group = await chatService.updateGroup(
        req.workspaceId,
        req.user.id,
        req.user.role,
        req.params.id,
        req.body
      );

      const io = getIO();
      if (io) {
        io.to(`chat_group_${req.params.id}`).emit('group_updated', group);
      }

      return res.status(200).json({
        success: true,
        message: 'Group updated successfully.',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/chat/groups/:id (Archive group)
  async archiveGroup(req, res, next) {
    try {
      const result = await chatService.archiveGroup(
        req.workspaceId,
        req.user.id,
        req.user.role,
        req.params.id
      );

      const io = getIO();
      if (io) {
        io.to(`chat_group_${req.params.id}`).emit('group_archived', { groupId: req.params.id });
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/chat/groups/:id/members
  async addMembers(req, res, next) {
    try {
      const { group, addedUserIds } = await chatService.addMembers(
        req.workspaceId,
        req.user.id,
        req.user.role,
        req.params.id,
        req.body.member_ids || req.body.memberIds || []
      );

      const io = getIO();
      if (io) {
        io.to(`chat_group_${req.params.id}`).emit('group_members_updated', group);
        io.to(`chat_group_${req.params.id}`).emit('group_member_added', {
          groupId: Number(req.params.id),
          addedUserIds,
          group,
        });

        // Notify individual newly added users so group pops into their sidebar
        addedUserIds.forEach((uid) => {
          io.to(`user_${uid}`).emit('group_created', group);
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Members added successfully.',
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/chat/groups/:id/members/:userId
  async removeMember(req, res, next) {
    try {
      const result = await chatService.removeMember(
        req.workspaceId,
        req.user.id,
        req.user.role,
        req.params.id,
        req.params.userId
      );

      const io = getIO();
      if (io) {
        io.to(`chat_group_${req.params.id}`).emit('group_member_removed', {
          groupId: Number(req.params.id),
          userId: Number(req.params.userId),
        });
        io.to(`user_${req.params.userId}`).emit('group_removed', {
          groupId: Number(req.params.id),
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/chat/groups/:id/members/:userId/role
  async updateMemberRole(req, res, next) {
    try {
      const result = await chatService.updateMemberRole(
        req.workspaceId,
        req.user.id,
        req.user.role,
        req.params.id,
        req.params.userId,
        req.body.role
      );

      const io = getIO();
      if (io) {
        const eventName = result.role === 'ADMIN' ? 'group_member_promoted' : 'group_member_demoted';
        io.to(`chat_group_${req.params.id}`).emit(eventName, {
          groupId: Number(req.params.id),
          userId: result.userId,
          role: result.role,
        });
        io.to(`chat_group_${req.params.id}`).emit('group_updated', result.group);
      }

      return res.status(200).json({
        success: true,
        message: result.systemMessage,
        data: result.group,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/chat/groups/:id/leave
  async leaveGroup(req, res, next) {
    try {
      const result = await chatService.removeMember(
        req.workspaceId,
        req.user.id,
        req.user.role,
        req.params.id,
        req.user.id
      );

      const io = getIO();
      if (io) {
        io.to(`chat_group_${req.params.id}`).emit('group_member_removed', {
          groupId: Number(req.params.id),
          userId: req.user.id,
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/chat/groups/:id/preferences
  async updatePreferences(req, res, next) {
    try {
      const result = await chatService.updatePreferences(
        req.workspaceId,
        req.user.id,
        req.params.id,
        req.body
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/chat/groups/:id/media
  async getGroupMedia(req, res, next) {
    try {
      const media = await chatService.getGroupSharedMedia(
        req.workspaceId,
        req.user.id,
        req.params.id
      );
      return res.status(200).json({ success: true, data: media });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/chat/groups/:id/messages
  async getMessages(req, res, next) {
    try {
      const result = await chatService.getMessages(
        req.workspaceId,
        req.user.id,
        req.params.id,
        req.query
      );

      // Auto-mark conversation as read when messages fetched
      chatService.markGroupAsRead(req.workspaceId, req.user.id, req.params.id).catch(() => {});

      return res.status(200).json({
        success: true,
        data: result.messages,
        hasMore: result.hasMore,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/chat/groups/:id/messages
  async sendMessage(req, res, next) {
    try {
      const message = await chatService.sendMessage(
        req.workspaceId,
        req.user.id,
        req.params.id,
        req.body
      );

      // Real-time broadcast canonical message
      const io = getIO();
      if (io && message) {
        io.to(`chat_group_${req.params.id}`).emit('new_message', message);
      }

      return res.status(201).json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/chat/messages/:id
  async editMessage(req, res, next) {
    try {
      const updatedMessage = await chatService.editMessage(
        req.workspaceId,
        req.user.id,
        req.params.id,
        req.body.message
      );

      const io = getIO();
      if (io && updatedMessage) {
        io.to(`chat_group_${updatedMessage.group_id}`).emit('message_updated', updatedMessage);
      }

      return res.status(200).json({ success: true, data: updatedMessage });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/chat/messages/:id
  async deleteMessage(req, res, next) {
    try {
      const result = await chatService.deleteMessage(
        req.workspaceId,
        req.user.id,
        req.user.role,
        req.params.id
      );

      const io = getIO();
      if (io) {
        io.to(`chat_group_${result.groupId}`).emit('message_deleted', result);
      }

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/chat/messages/:id/reactions
  async toggleReaction(req, res, next) {
    try {
      const result = await chatService.toggleReaction(
        req.workspaceId,
        req.user.id,
        req.params.id,
        req.body.reaction
      );

      const io = getIO();
      if (io) {
        io.to(`chat_group_${result.groupId}`).emit('message_reaction', result);
      }

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/chat/groups/:id/read
  async markRead(req, res, next) {
    try {
      const result = await chatService.markGroupAsRead(
        req.workspaceId,
        req.user.id,
        req.params.id,
        req.body.last_read_message_id || req.body.lastReadMessageId
      );

      const io = getIO();
      if (io) {
        io.to(`chat_group_${req.params.id}`).emit('message_read', {
          groupId: Number(req.params.id),
          userId: req.user.id,
          lastReadMessageId: result.lastReadMessageId,
        });
      }

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/chat/unread-count
  async getUnreadCount(req, res, next) {
    try {
      const count = await chatService.getWorkspaceUnreadCount(req.workspaceId, req.user.id);
      return res.status(200).json({ success: true, unread_count: count });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/chat/upload (Handles drag & drop file upload and voice notes)
  async uploadFile(req, res, next) {
    try {
      const file = req.file || (req.files && (Array.isArray(req.files) ? req.files[0] : Object.values(req.files)[0]?.[0]));
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }

      // Move from temp storage to workspace assets directory
      const workspaceDir = path.join(uploadRoot, `workspace-${req.workspaceId}`, 'chat');
      await fs.promises.mkdir(workspaceDir, { recursive: true });

      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `chat_${Date.now()}_${path.basename(file.path).replace(/[^a-zA-Z0-9]/g, '')}${ext}`;
      const finalPath = path.join(workspaceDir, uniqueName);

      await fs.promises.rename(file.path, finalPath);

      const relativePath = path.relative(uploadRoot, finalPath).replace(/\\/g, '/');

      // Create an asset entry in assets table to integrate with unified SocialDesk asset system
      let fileType = 'DOCUMENT';
      if (file.mimetype.startsWith('image/')) fileType = 'IMAGE';
      else if (file.mimetype.startsWith('video/')) fileType = 'VIDEO';
      else if (file.mimetype.startsWith('audio/') || req.body.duration) fileType = 'VOICE_NOTE';

      const [assetResult] = await db.execute(
        `INSERT INTO assets
         (workspace_id, uploaded_by, display_name, file_name, original_filename, storage_path, file_url, file_type, file_size, mime_type, duration, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          req.workspaceId,
          req.user.id,
          file.originalname,
          uniqueName,
          file.originalname,
          relativePath,
          `/api/chat/files/view?path=${encodeURIComponent(relativePath)}`,
          fileType,
          file.size,
          file.mimetype,
          req.body.duration ? parseFloat(req.body.duration) : null,
        ]
      );

      const assetId = assetResult.insertId;
      const canonicalUrl = `/api/assets/${assetId}/file`;
      await db.execute(`UPDATE assets SET file_url = ? WHERE id = ?`, [canonicalUrl, assetId]);

      return res.status(200).json({
        success: true,
        data: {
          asset_id: assetId,
          assetId,
          file_name: file.originalname,
          fileName: file.originalname,
          file_size: file.size,
          fileSize: file.size,
          mime_type: file.mimetype,
          mimeType: file.mimetype,
          storage_path: relativePath,
          storagePath: relativePath,
          url: canonicalUrl,
          thumbnailUrl: fileType === 'IMAGE' ? canonicalUrl : null,
          duration: req.body.duration ? parseFloat(req.body.duration) : null,
        },
      });
    } catch (error) {
      if (req.file) cleanupUploadedFile(req.file);
      next(error);
    }
  }

  // GET /api/chat/files/view?path=...
  async streamFile(req, res, next) {
    try {
      const relativePath = req.query.path;
      if (!relativePath) {
        return res.status(400).json({ success: false, message: 'Path parameter is required.' });
      }

      // Clean path to prevent path traversal
      const normalizedRelative = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.resolve(uploadRoot, normalizedRelative);

      // Security check: ensure path stays strictly inside uploadRoot
      const normalizedUploadRoot = path.resolve(uploadRoot);
      if (!fullPath.startsWith(normalizedUploadRoot)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, message: 'File not found.' });
      }

      const ext = path.extname(fullPath).toLowerCase();
      let mime = 'application/octet-stream';

      if (['.jpg', '.jpeg', '.jfif', '.pjpeg', '.pjp'].includes(ext)) mime = 'image/jpeg';
      else if (ext === '.png') mime = 'image/png';
      else if (ext === '.webp') mime = 'image/webp';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.avif') mime = 'image/avif';
      else if (ext === '.bmp') mime = 'image/bmp';
      else if (ext === '.mp4') mime = 'video/mp4';
      else if (ext === '.webm') {
        mime = relativePath.includes('voice_note') || relativePath.includes('audio') ? 'audio/webm' : 'video/webm';
      }
      else if (ext === '.mov') mime = 'video/quicktime';
      else if (ext === '.mkv') mime = 'video/x-matroska';
      else if (ext === '.avi') mime = 'video/x-msvideo';
      else if (ext === '.pdf') mime = 'application/pdf';
      else if (ext === '.mp3') mime = 'audio/mpeg';
      else if (ext === '.wav') mime = 'audio/wav';
      else if (ext === '.ogg') mime = 'audio/ogg';
      else if (ext === '.m4a') mime = 'audio/m4a';
      else if (ext === '.aac') mime = 'audio/aac';
      else if (ext === '.flac') mime = 'audio/flac';
      else if (ext === '.opus') mime = 'audio/opus';

      const stat = await fs.promises.stat(fullPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(fullPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mime,
        });
        return fileStream.pipe(res);
      }

      res.setHeader('Content-Length', fileSize);
      fs.createReadStream(fullPath).pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
