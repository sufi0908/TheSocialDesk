const { db } = require('../config/database');
const notificationService = require('./notificationService');
const activityService = require('./activityService');
const { emitWorkspaceEvent, emitNotificationToUser } = require('../config/socket');

class TaskService {
  /**
   * Helper to format task output with standard camelCase and snake_case properties.
   */
  formatTaskOutput(row) {
    if (!row) return null;

    const dueDateObj = row.due_date ? new Date(row.due_date) : null;
    const isCompleted = String(row.status).toUpperCase() === 'COMPLETED';
    const isOverdue = dueDateObj && dueDateObj < new Date() && !isCompleted;

    const rawStatus = String(row.status || 'TODO').toUpperCase();
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
        : row.status || 'To Do';

    const priorityFormatted = row.priority
      ? row.priority.charAt(0).toUpperCase() + row.priority.slice(1).toLowerCase()
      : 'Medium';

    return {
      id: row.id,
      workspaceId: row.workspace_id,
      workspace_id: row.workspace_id,
      clientId: row.client_id,
      client_id: row.client_id,
      clientName: row.client_company_name || row.client_name || row.client || '',
      client_name: row.client_name || row.client_company_name || row.client || '',
      client_company_name: row.client_company_name || row.client_name || row.client || '',
      client: {
        id: row.client_id,
        name: row.client_name || row.client_company_name || 'General Client',
        companyName: row.client_company_name || row.client_name || 'General Client',
      },
      projectId: row.project_id,
      project_id: row.project_id,
      projectName: row.project_name || '',
      project_name: row.project_name || '',
      project: row.project_id
        ? {
            id: row.project_id,
            name: row.project_name || 'Project',
          }
        : null,
      contentId: row.content_id,
      content_id: row.content_id,
      contentTitle: row.content_title || '',
      content_title: row.content_title || '',
      title: row.title,
      description: row.description || '',
      instructions: row.instructions || '',
      status: rawStatus,
      statusDisplay: statusFormatted,
      priority: (row.priority || 'MEDIUM').toUpperCase(),
      priorityDisplay: priorityFormatted,
      dueDate: row.due_date,
      due_date: row.due_date,
      dueTime: row.due_time || '',
      due_time: row.due_time || '',
      isOverdue: Boolean(isOverdue),
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
      completedAt: row.completed_at,
      completed_at: row.completed_at,
      assignedTo: row.assigned_to,
      assigned_to: row.assigned_to,
      assigneeName: row.assignee_name || 'Unassigned',
      assignee_name: row.assignee_name || 'Unassigned',
      assigneeAvatar: row.assignee_avatar || '',
      assignee_avatar: row.assignee_avatar || '',
      assigneeRole: row.assignee_role || '',
      assignee_role: row.assignee_role || '',
      assignee: row.assigned_to
        ? {
            id: row.assigned_to,
            name: row.assignee_name || 'Team Member',
            avatar: row.assignee_avatar || '',
            role: row.assignee_role || 'Member',
          }
        : null,
      createdBy: row.created_by,
      created_by: row.created_by,
      creatorName: row.creator_name || 'Workspace Manager',
      creator_name: row.creator_name || 'Workspace Manager',
      creatorAvatar: row.creator_avatar || '',
      creator_avatar: row.creator_avatar || '',
      creatorRole: row.creator_role || 'Manager',
      creator_role: row.creator_role || 'Manager',
      creator: {
        id: row.created_by,
        name: row.creator_name || 'Workspace Manager',
        avatar: row.creator_avatar || '',
        role: row.creator_role || 'Manager',
      },
      commentsCount: parseInt(row.comments_count || 0, 10),
      comments_count: parseInt(row.comments_count || 0, 10),
      attachmentsCount: parseInt(row.attachments_count || 0, 10),
      attachments_count: parseInt(row.attachments_count || 0, 10),
    };
  }

  /**
   * Helper to log task activity in MySQL.
   */
  async logTaskActivity(workspaceId, taskId, userId, action, description) {
    try {
      await db.execute(
        `INSERT INTO task_activity (workspace_id, task_id, user_id, action, description, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [workspaceId, taskId, userId, action, description]
      );
    } catch (err) {
      console.warn('Failed logging task activity:', err.message);
    }
  }

  /**
   * 1. Create a Task with strict validation, real user checks, activity logging, and notifications.
   */
  async createTask(creatorUser, workspaceId, data) {
    const {
      title,
      description,
      instructions,
      clientId,
      projectId,
      contentId,
      assignedTo,
      priority,
      status,
      dueDate,
      dueTime,
      attachments,
    } = data;

    if (!title || !title.trim()) {
      const error = new Error('Task title is required.');
      error.status = 400;
      throw error;
    }

    if (clientId) {
      const [clients] = await db.execute(
        'SELECT id FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
        [clientId, workspaceId]
      );
      if (clients.length === 0) {
        const error = new Error('Client not found or does not belong to your workspace.');
        error.status = 404;
        throw error;
      }
    }

    if (projectId) {
      const [projects] = await db.execute(
        'SELECT id FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
        [projectId, workspaceId]
      );
      if (projects.length === 0) {
        const error = new Error('Project not found or does not belong to your workspace.');
        error.status = 404;
        throw error;
      }
    }

    let assignedUserName = null;
    let targetAssigneeId = null;
    if (assignedTo && String(assignedTo).trim() !== '' && assignedTo !== 'null' && assignedTo !== 'undefined') {
      const parsedAssigneeId = parseInt(assignedTo, 10);
      if (!isNaN(parsedAssigneeId) && parsedAssigneeId > 0) {
        const [users] = await db.execute(
          `SELECT u.id, u.full_name, u.avatar_url 
           FROM users u 
           JOIN workspace_users wu ON u.id = wu.user_id 
           WHERE u.id = ? AND wu.workspace_id = ? AND wu.status = 'ACTIVE' AND u.deleted_at IS NULL`,
          [parsedAssigneeId, workspaceId]
        );
        if (users.length === 0) {
          const error = new Error('Selected assignee does not belong to this workspace or is inactive.');
          error.status = 400;
          throw error;
        }
        targetAssigneeId = users[0].id;
        assignedUserName = users[0].full_name;
      }
    }

    const rawStatus = (status || 'TODO').toUpperCase();
    const taskStatus = rawStatus === 'REVISION' ? 'REVISION_REQUIRED' : rawStatus;
    const taskPriority = (priority || 'MEDIUM').toUpperCase();

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.execute(
        `INSERT INTO tasks (workspace_id, client_id, project_id, content_id, assigned_to, created_by, title, description, instructions, status, priority, due_date, due_time, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          workspaceId,
          clientId || null,
          projectId || null,
          contentId || null,
          targetAssigneeId,
          creatorUser.id,
          title.trim(),
          description ? description.trim() : null,
          instructions ? instructions.trim() : null,
          taskStatus,
          taskPriority,
          dueDate || null,
          dueTime || null,
        ]
      );

      const taskId = result.insertId;

      // Handle initial attachments if provided
      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          const fileName = att.fileName || att.name || 'Attachment';
          const fileUrl = att.fileUrl || att.url;
          if (fileName && fileUrl && !fileUrl.startsWith('blob:')) {
            await connection.execute(
              `INSERT INTO task_attachments (workspace_id, task_id, asset_id, user_id, file_name, file_url, file_type, file_size, attachment_type, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'REFERENCE', NOW())`,
              [
                workspaceId,
                taskId,
                att.assetId || att.id || null,
                creatorUser.id,
                fileName,
                fileUrl,
                att.fileType || att.mimeType || 'document',
                att.fileSize || att.size || null,
              ]
            );
          }
        }
      }

      await connection.execute(
        `INSERT INTO task_activity (workspace_id, task_id, user_id, action, description, created_at)
         VALUES (?, ?, ?, 'TASK_CREATED', ?, NOW())`,
        [workspaceId, taskId, creatorUser.id, `Task created by ${creatorUser.full_name || 'Workspace Manager'}`]
      );

      if (targetAssigneeId && assignedUserName) {
        await connection.execute(
          `INSERT INTO task_activity (workspace_id, task_id, user_id, action, description, created_at)
           VALUES (?, ?, ?, 'TASK_ASSIGNED', ?, NOW())`,
          [workspaceId, taskId, creatorUser.id, `Task assigned to ${assignedUserName}`]
        );
      }

      await connection.commit();

      // Log system activity & notifications
      await activityService.logActivity({
        workspaceId,
        clientId: clientId || null,
        userId: creatorUser.id,
        entityType: 'TASK',
        entityId: taskId,
        action: 'TASK_CREATED',
        description: `${creatorUser.full_name || 'User'} created task "${title.trim()}".`,
        isInternal: true,
      });

      if (targetAssigneeId) {
        await notificationService.createNotification({
          userId: targetAssigneeId,
          workspaceId,
          relatedTaskId: taskId,
          relatedContentId: contentId || null,
          title: 'New Task Assigned 📋',
          message: `${creatorUser.full_name || 'Workspace Manager'} assigned you: "${title.trim()}" (Priority: ${taskPriority})`,
          type: 'TASK_ASSIGNED',
          link: `/workspace/tasks/${taskId}`,
        });
      }

      const createdTask = await this.getTask(creatorUser, workspaceId, taskId);

      // Emit realtime socket events
      emitWorkspaceEvent(workspaceId, 'task_created', createdTask);
      if (targetAssigneeId) {
        emitWorkspaceEvent(workspaceId, 'task_assigned', { taskId, assignedTo: targetAssigneeId, task: createdTask });
      }

      return createdTask;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 2. List Tasks with strict server-side permission isolation.
   * A normal team member will ONLY receive tasks assigned to them or created by them.
   */
  async listTasks(currentUser, workspaceId, { clientId, projectId, contentId, assignedTo, createdBy, status, priority, dueFrom, dueTo, dueDate, search }) {
    let query = `
      SELECT t.id, t.workspace_id, t.client_id, t.project_id, t.content_id, t.assigned_to, t.created_by,
             t.title, t.description, t.instructions, t.status, t.priority, t.due_date, t.due_time,
             t.created_at, t.updated_at, t.completed_at,
             c.name as client_name, c.company_name as client_company_name,
             p.name as project_name,
             cnt.title as content_title,
             u_assignee.full_name as assignee_name, u_assignee.avatar_url as assignee_avatar, r_assignee.name as assignee_role,
             u_creator.full_name as creator_name, u_creator.avatar_url as creator_avatar, r_creator.name as creator_role,
             (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id AND tc.deleted_at IS NULL) as comments_count,
             (SELECT COUNT(*) FROM task_attachments ta WHERE ta.task_id = t.id AND ta.deleted_at IS NULL) as attachments_count
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN content cnt ON t.content_id = cnt.id
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      LEFT JOIN roles r_assignee ON u_assignee.role_id = r_assignee.id
      JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN roles r_creator ON u_creator.role_id = r_creator.id
      WHERE t.workspace_id = ? AND t.deleted_at IS NULL
    `;

    const params = [workspaceId];

    // ==========================================
    // CRITICAL SERVER-SIDE VISIBILITY ENFORCEMENT
    // ==========================================
    const userRole = currentUser ? currentUser.role : '';
    const isManager = ['superadmin', 'workspace_manager'].includes(userRole);
    const isAgencyLead = ['graphic_team_head', 'social_media_manager'].includes(userRole);
    const isClient = userRole === 'client' || userRole === 'client_user';

    if (isClient) {
      // Clients only see tasks explicitly belonging to their client account
      query += ` AND t.client_id IN (
        SELECT id FROM clients 
        WHERE (LOWER(email) = LOWER(?) OR id IN (SELECT client_id FROM client_team WHERE user_id = ?))
          AND workspace_id = ? AND deleted_at IS NULL
      )`;
      params.push(currentUser.email, currentUser.id, workspaceId);
    } else if (!isManager && !isAgencyLead) {
      // Normal team member (graphic_designer, video_editor, content_writer, reviewer)
      // STRICT ISOLATION: only see tasks assigned to them OR created by them
      query += ' AND (t.assigned_to = ? OR t.created_by = ?)';
      params.push(currentUser.id, currentUser.id);
    }

    // Filters
    if (clientId && clientId !== 'All' && clientId !== 'all') {
      query += ' AND t.client_id = ?';
      params.push(clientId);
    }

    if (projectId && projectId !== 'All' && projectId !== 'all') {
      query += ' AND t.project_id = ?';
      params.push(projectId);
    }

    if (contentId) {
      query += ' AND t.content_id = ?';
      params.push(contentId);
    }

    if (assignedTo && assignedTo !== 'All' && assignedTo !== 'all') {
      query += ' AND t.assigned_to = ?';
      params.push(assignedTo);
    }

    if (createdBy && createdBy !== 'All' && createdBy !== 'all') {
      query += ' AND t.created_by = ?';
      params.push(createdBy);
    }

    if (status && status !== 'All' && status !== 'ALL') {
      const normalizedStatus =
        status === 'To Do' || status === 'TODO'
          ? 'TODO'
          : status === 'In Progress' || status === 'IN_PROGRESS'
          ? 'IN_PROGRESS'
          : status === 'Ready for Review' || status === 'Review' || status === 'READY_FOR_REVIEW' || status === 'IN_REVIEW'
          ? 'READY_FOR_REVIEW'
          : status === 'Revision Required' || status === 'Revision' || status === 'REVISION' || status === 'REVISION_REQUIRED'
          ? 'REVISION_REQUIRED'
          : status === 'Completed' || status === 'COMPLETED'
          ? 'COMPLETED'
          : status === 'Overdue'
          ? 'OVERDUE'
          : status.toUpperCase();

      if (normalizedStatus === 'OVERDUE') {
        query += ' AND t.due_date < NOW() AND t.status != "COMPLETED"';
      } else if (normalizedStatus === 'REVISION_REQUIRED') {
        query += ' AND (t.status = "REVISION_REQUIRED" OR t.status = "REVISION")';
      } else if (normalizedStatus === 'READY_FOR_REVIEW') {
        query += ' AND (t.status = "READY_FOR_REVIEW" OR t.status = "REVIEW" OR t.status = "IN_REVIEW")';
      } else {
        query += ' AND t.status = ?';
        params.push(normalizedStatus);
      }
    }

    if (priority && priority !== 'All' && priority !== 'ALL') {
      query += ' AND t.priority = ?';
      params.push(priority.toUpperCase());
    }

    if (dueDate) {
      query += ' AND DATE(t.due_date) = DATE(?)';
      params.push(dueDate);
    }

    if (dueFrom) {
      query += ' AND DATE(t.due_date) >= DATE(?)';
      params.push(dueFrom);
    }

    if (dueTo) {
      query += ' AND DATE(t.due_date) <= DATE(?)';
      params.push(dueTo);
    }

    if (search && search.trim()) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ? OR t.instructions LIKE ? OR c.name LIKE ? OR c.company_name LIKE ? OR p.name LIKE ? OR u_assignee.full_name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term, term);
    }

    query += ' ORDER BY t.created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows.map((r) => this.formatTaskOutput(r));
  }

  /**
   * 3. Get tasks assigned to or created by current user (/api/tasks/my).
   */
  async getMyTasks(currentUser, workspaceId, filters = {}) {
    return this.listTasks(currentUser, workspaceId, {
      ...filters,
      assignedTo: currentUser.id,
    });
  }

  /**
   * 4. Get Task Details with authorization enforcement, comments, attachments, and activity history.
   */
  async getTask(currentUser, workspaceId, taskId) {
    const [rows] = await db.execute(
      `SELECT t.id, t.workspace_id, t.client_id, t.project_id, t.content_id, t.assigned_to, t.created_by,
              t.title, t.description, t.instructions, t.status, t.priority, t.due_date, t.due_time,
              t.created_at, t.updated_at, t.completed_at,
              c.name as client_name, c.company_name as client_company_name,
              p.name as project_name,
              cnt.title as content_title,
              u_assignee.full_name as assignee_name, u_assignee.avatar_url as assignee_avatar, r_assignee.name as assignee_role,
              u_creator.full_name as creator_name, u_creator.avatar_url as creator_avatar, r_creator.name as creator_role
       FROM tasks t
       LEFT JOIN clients c ON t.client_id = c.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN content cnt ON t.content_id = cnt.id
       LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
       LEFT JOIN roles r_assignee ON u_assignee.role_id = r_assignee.id
       JOIN users u_creator ON t.created_by = u_creator.id
       LEFT JOIN roles r_creator ON u_creator.role_id = r_creator.id
       WHERE t.workspace_id = ? AND t.id = ? AND t.deleted_at IS NULL`,
      [workspaceId, taskId]
    );

    if (rows.length === 0) {
      const error = new Error('Task not found.');
      error.status = 404;
      throw error;
    }

    const row = rows[0];

    // ==========================================
    // SERVER-SIDE TASK ACCESS AUTHORIZATION
    // ==========================================
    if (currentUser) {
      const userRole = currentUser.role;
      const isManager = ['superadmin', 'workspace_manager'].includes(userRole);
      const isAgencyLead = ['graphic_team_head', 'social_media_manager'].includes(userRole);
      const isAssignee = Number(row.assigned_to) === Number(currentUser.id);
      const isCreator = Number(row.created_by) === Number(currentUser.id);

      if (!isManager && !isAgencyLead && !isAssignee && !isCreator) {
        if (userRole === 'client' || userRole === 'client_user') {
          const [clientMatches] = await db.execute(
            `SELECT id FROM clients 
             WHERE id = ? AND (LOWER(email) = LOWER(?) OR id IN (SELECT client_id FROM client_team WHERE user_id = ?))
               AND workspace_id = ? AND deleted_at IS NULL`,
            [row.client_id, currentUser.email, currentUser.id, workspaceId]
          );
          if (clientMatches.length === 0) {
            const error = new Error('Permission denied. You do not have permission to access this task.');
            error.status = 403;
            throw error;
          }
        } else {
          const error = new Error('Permission denied. You do not have permission to access this task.');
          error.status = 403;
          throw error;
        }
      }
    }

    const taskFormatted = this.formatTaskOutput(row);

    // Fetch comments with user details and avatars
    const [comments] = await db.execute(
      `SELECT tc.id, tc.task_id, tc.user_id, tc.message, tc.created_at, tc.updated_at,
              u.full_name as user_name, u.avatar_url as user_avatar, r.name as user_role
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE tc.task_id = ? AND tc.deleted_at IS NULL
       ORDER BY tc.created_at ASC`,
      [taskId]
    );

    // Fetch attachments (Reference vs Submission)
    const [attachments] = await db.execute(
      `SELECT ta.id, ta.task_id, ta.asset_id, ta.user_id, ta.file_name,
              COALESCE(a.file_url, ta.file_url, CONCAT('/api/assets/', ta.asset_id, '/file')) as file_url,
              COALESCE(a.file_type, ta.file_type) as file_type,
              COALESCE(a.file_size, ta.file_size) as file_size,
              COALESCE(a.mime_type, ta.file_type) as mime_type,
              COALESCE(a.storage_path, '') as storage_path,
              COALESCE(a.original_filename, ta.file_name) as original_name,
              ta.attachment_type, ta.created_at,
              u.full_name as uploaded_by_name, u.avatar_url as uploaded_by_avatar, r.name as uploaded_by_role
       FROM task_attachments ta
       LEFT JOIN assets a ON ta.asset_id = a.id
       JOIN users u ON ta.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE ta.task_id = ? AND ta.deleted_at IS NULL
       ORDER BY ta.created_at ASC`,
      [taskId]
    );

    // Fetch activity history
    const [activity] = await db.execute(
      `SELECT ta.id, ta.task_id, ta.user_id, ta.action, ta.description, ta.created_at,
              u.full_name as user_name, u.avatar_url as user_avatar
       FROM task_activity ta
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = ?
       ORDER BY ta.created_at DESC`,
      [taskId]
    );

    const mappedAttachments = attachments.map((a) => {
      const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(a.file_name) || String(a.file_type || a.mime_type || '').toLowerCase().startsWith('image');
      const isVid = /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(a.file_name) || String(a.file_type || a.mime_type || '').toLowerCase().startsWith('video');
      const isPdf = /\.pdf$/i.test(a.file_name) || String(a.file_type || a.mime_type || '').toLowerCase().includes('pdf');

      const calculatedType = isImg ? 'image' : isVid ? 'video' : isPdf ? 'pdf' : 'document';

      const sizeFormatted = a.file_size
        ? a.file_size > 1024 * 1024
          ? `${(a.file_size / (1024 * 1024)).toFixed(1)} MB`
          : `${(a.file_size / 1024).toFixed(0)} KB`
        : '1.2 MB';

      const validUrl = a.file_url || (a.asset_id ? `/api/assets/${a.asset_id}/file` : '');

      return {
        id: a.id,
        taskId: a.task_id,
        assetId: a.asset_id,
        userId: a.user_id,
        name: a.file_name,
        fileName: a.file_name,
        originalName: a.original_name || a.file_name,
        url: validUrl,
        fileUrl: validUrl,
        thumbnailUrl: isImg ? validUrl : (isVid ? null : validUrl),
        storagePath: a.storage_path || null,
        type: calculatedType,
        mimeType: a.mime_type || a.file_type || (isImg ? 'image/png' : isVid ? 'video/mp4' : isPdf ? 'application/pdf' : 'application/octet-stream'),
        size: a.file_size,
        fileSize: sizeFormatted,
        attachmentType: a.attachment_type === 'SUBMISSION' ? 'SUBMISSION' : 'REFERENCE',
        createdAt: a.created_at,
        uploadedBy: {
          id: a.user_id,
          name: a.uploaded_by_name || 'Team Member',
          avatar: a.uploaded_by_avatar || '',
          role: a.uploaded_by_role || 'Member',
        },
        uploadedByName: a.uploaded_by_name || 'Team Member',
        uploadedByAvatar: a.uploaded_by_avatar || '',
      };
    });

    const referenceFiles = mappedAttachments.filter((a) => a.attachmentType === 'REFERENCE');
    const deliverables = mappedAttachments.filter((a) => a.attachmentType === 'SUBMISSION');

    return {
      ...taskFormatted,
      comments: comments.map((c) => ({
        id: c.id,
        taskId: c.task_id,
        userId: c.user_id,
        text: c.message,
        message: c.message,
        commentText: c.message,
        createdAt: c.created_at,
        updatedAt: c.updated_at || c.created_at,
        userName: c.user_name,
        userAvatar: c.user_avatar || '',
        userRole: c.user_role || 'Member',
        user: {
          id: c.user_id,
          name: c.user_name,
          avatar: c.user_avatar || '',
          role: c.user_role || 'Member',
        },
      })),
      attachments: mappedAttachments,
      referenceFiles: referenceFiles,
      deliverables: deliverables,
      activity: activity.map((act) => ({
        id: act.id,
        taskId: act.task_id,
        userId: act.user_id,
        action: act.action,
        description: act.description,
        createdAt: act.created_at,
        userName: act.user_name || 'System',
        userAvatar: act.user_avatar || '',
        user: {
          id: act.user_id,
          name: act.user_name || 'System',
          avatar: act.user_avatar || '',
        },
      })),
    };
  }

  /**
   * 5. Update Task Details.
   */
  async updateTask(currentUser, workspaceId, taskId, updatedFields) {
    const task = await this.getTask(currentUser, workspaceId, taskId);

    const isManager = ['superadmin', 'workspace_manager', 'graphic_team_head', 'social_media_manager'].includes(currentUser.role);
    const isAssignee = Number(task.assigned_to) === Number(currentUser.id);
    const isCreator = Number(task.created_by) === Number(currentUser.id);

    if (!isManager && !isAssignee && !isCreator) {
      const error = new Error('Permission denied. You do not have permission to edit this task.');
      error.status = 403;
      throw error;
    }

    const {
      title,
      description,
      instructions,
      assignedTo,
      clientId,
      projectId,
      contentId,
      status,
      priority,
      dueDate,
      dueTime,
    } = updatedFields;

    let newAssigneeName = null;
    let targetAssigneeId = undefined;
    if (assignedTo !== undefined && assignedTo !== null && String(assignedTo) !== '' && Number(assignedTo) !== Number(task.assigned_to)) {
      if (!isManager && !isCreator) {
        const error = new Error('Permission denied. Only managers or creators can reassign tasks.');
        error.status = 403;
        throw error;
      }
      const parsedId = parseInt(assignedTo, 10);
      const [users] = await db.execute(
        `SELECT u.id, u.full_name FROM users u JOIN workspace_users wu ON u.id = wu.user_id 
         WHERE u.id = ? AND wu.workspace_id = ? AND wu.status = 'ACTIVE' AND u.deleted_at IS NULL`,
        [parsedId, workspaceId]
      );
      if (users.length === 0) {
        const error = new Error('New assignee does not belong to your workspace or is inactive.');
        error.status = 400;
        throw error;
      }
      targetAssigneeId = users[0].id;
      newAssigneeName = users[0].full_name;
    }

    await db.execute(
      `UPDATE tasks
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           instructions = COALESCE(?, instructions),
           client_id = COALESCE(?, client_id),
           project_id = COALESCE(?, project_id),
           content_id = COALESCE(?, content_id),
           assigned_to = COALESCE(?, assigned_to),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           due_date = COALESCE(?, due_date),
           due_time = COALESCE(?, due_time),
           updated_at = NOW()
       WHERE id = ? AND workspace_id = ?`,
      [
        title ? title.trim() : null,
        description !== undefined ? description : null,
        instructions !== undefined ? instructions : null,
        clientId || null,
        projectId || null,
        contentId || null,
        targetAssigneeId !== undefined ? targetAssigneeId : null,
        status || null,
        priority ? priority.toUpperCase() : null,
        dueDate || null,
        dueTime || null,
        taskId,
        workspaceId,
      ]
    );

    const updatedTask = await this.getTask(currentUser, workspaceId, taskId);

    if (targetAssigneeId && Number(targetAssigneeId) !== Number(task.assigned_to)) {
      await this.logTaskActivity(
        workspaceId,
        taskId,
        currentUser.id,
        'TASK_REASSIGNED',
        `Task reassigned from ${task.assignee_name || 'Unassigned'} to ${newAssigneeName}`
      );

      await notificationService.createNotification({
        userId: targetAssigneeId,
        workspaceId,
        relatedTaskId: taskId,
        title: 'Task Assigned To You 📋',
        message: `${currentUser.full_name || 'Workspace Manager'} assigned you: "${updatedTask.title}".`,
        type: 'TASK_ASSIGNED',
        link: `/workspace/tasks/${taskId}`,
      });

      if (task.assigned_to) {
        await notificationService.createNotification({
          userId: task.assigned_to,
          workspaceId,
          relatedTaskId: taskId,
          title: 'Task Reassigned',
          message: `Task "${updatedTask.title}" was reassigned to ${newAssigneeName}.`,
          type: 'TASK_UPDATED',
          link: `/workspace/tasks/${taskId}`,
        });
      }

      emitWorkspaceEvent(workspaceId, 'task_reassigned', { taskId, assignedTo: targetAssigneeId, task: updatedTask });
    } else {
      await this.logTaskActivity(workspaceId, taskId, currentUser.id, 'TASK_UPDATED', `Task updated by ${currentUser.full_name}`);
    }

    emitWorkspaceEvent(workspaceId, 'task_updated', updatedTask);
    return updatedTask;
  }

  /**
   * 6. Reassign Task.
   */
  async reassignTask(currentUser, workspaceId, taskId, newAssigneeId) {
    const isManager = ['superadmin', 'workspace_manager', 'graphic_team_head', 'social_media_manager'].includes(currentUser.role);
    if (!isManager) {
      const error = new Error('Permission denied. Only managers or team heads can reassign tasks.');
      error.status = 403;
      throw error;
    }

    return this.updateTask(currentUser, workspaceId, taskId, { assignedTo: newAssigneeId });
  }

  /**
   * 7. Update Task Status (Strict Role State Machine).
   * Prevents assignees from approving their own work.
   */
  async updateTaskStatus(currentUser, workspaceId, taskId, status, notes = '') {
    const normalizedStatus =
      status === 'To Do' || status === 'TODO'
        ? 'TODO'
        : status === 'In Progress' || status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : status === 'Ready for Review' || status === 'READY_FOR_REVIEW' || status === 'IN_REVIEW' || status === 'REVIEW'
        ? 'READY_FOR_REVIEW'
        : status === 'Revision Required' || status === 'Revision' || status === 'REVISION' || status === 'REVISION_REQUIRED'
        ? 'REVISION_REQUIRED'
        : status === 'Completed' || status === 'COMPLETED'
        ? 'COMPLETED'
        : status === 'Blocked' || status === 'BLOCKED'
        ? 'BLOCKED'
        : status === 'Cancelled' || status === 'CANCELLED'
        ? 'CANCELLED'
        : status === 'Reopened' || status === 'REOPENED'
        ? 'REOPENED'
        : status.toUpperCase();

    const validStatuses = ['TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'REVISION_REQUIRED', 'COMPLETED', 'BLOCKED', 'CANCELLED', 'REOPENED'];
    if (!validStatuses.includes(normalizedStatus)) {
      const error = new Error(`Invalid task status. Allowed: ${validStatuses.join(', ')}`);
      error.status = 400;
      throw error;
    }

    const task = await this.getTask(currentUser, workspaceId, taskId);
    const userRole = currentUser.role;
    const isManager = ['superadmin', 'workspace_manager'].includes(userRole);
    const isAgencyLead = ['graphic_team_head', 'social_media_manager'].includes(userRole);
    const isAssignee = Number(task.assigned_to) === Number(currentUser.id);
    const isCreator = Number(task.created_by) === Number(currentUser.id);

    if (!isManager && !isAgencyLead && !isAssignee && !isCreator) {
      const error = new Error('Permission denied. You can only update tasks assigned to you or created by you.');
      error.status = 403;
      throw error;
    }

    // CRITICAL: Graphic Designers and Assignees CANNOT approve their own task
    if (normalizedStatus === 'COMPLETED' && !isManager && !isAgencyLead && !isCreator) {
      const error = new Error('Permission denied. Only Workspace Managers or Team Heads can approve and complete tasks.');
      error.status = 403;
      throw error;
    }

    const completedAtClause = normalizedStatus === 'COMPLETED' ? 'completed_at = NOW(),' : (normalizedStatus === 'REOPENED' || normalizedStatus === 'IN_PROGRESS') ? 'completed_at = NULL,' : '';

    await db.execute(
      `UPDATE tasks SET status = ?, ${completedAtClause} updated_at = NOW() WHERE id = ? AND workspace_id = ?`,
      [normalizedStatus, taskId, workspaceId]
    );

    if (normalizedStatus === 'IN_PROGRESS') {
      await this.logTaskActivity(workspaceId, taskId, currentUser.id, 'TASK_STARTED', `${currentUser.full_name} started task`);
    } else if (normalizedStatus === 'READY_FOR_REVIEW') {
      await this.logTaskActivity(workspaceId, taskId, currentUser.id, 'TASK_READY_FOR_REVIEW', `${currentUser.full_name} submitted task for review`);

      // Notify task creator / manager
      const reviewerId = task.created_by || null;
      if (reviewerId && Number(reviewerId) !== Number(currentUser.id)) {
        await notificationService.createNotification({
          userId: reviewerId,
          workspaceId,
          relatedTaskId: taskId,
          title: 'Task Ready for Review 📋',
          message: `${currentUser.full_name} submitted "${task.title}" for review.`,
          type: 'TASK_READY_FOR_REVIEW',
          link: `/workspace/tasks/${taskId}`,
        });
      }

      await notificationService.notifyWorkspaceManagers(workspaceId, {
        title: 'Task Ready for Review 📋',
        message: `${currentUser.full_name} submitted "${task.title}" for review.`,
        type: 'TASK_READY_FOR_REVIEW',
        link: `/workspace/tasks/${taskId}`,
      });
    } else if (normalizedStatus === 'REVISION_REQUIRED') {
      const noteText = notes ? notes.trim() : 'Please check feedback and make necessary revisions.';
      await this.logTaskActivity(workspaceId, taskId, currentUser.id, 'TASK_REVISION_REQUESTED', `Revision requested by ${currentUser.full_name}: "${noteText}"`);

      // Add auto-comment for transparency
      await this.addComment(currentUser, workspaceId, taskId, `REVISION REQUESTED: ${noteText}`);

      if (task.assigned_to && Number(task.assigned_to) !== Number(currentUser.id)) {
        await notificationService.createNotification({
          userId: task.assigned_to,
          workspaceId,
          relatedTaskId: taskId,
          title: 'Revision Requested ⚠️',
          message: `${currentUser.full_name} requested revisions on "${task.title}": ${noteText}`,
          type: 'TASK_CHANGES_REQUESTED',
          link: `/workspace/tasks/${taskId}`,
        });
      }
    } else if (normalizedStatus === 'COMPLETED') {
      await this.logTaskActivity(workspaceId, taskId, currentUser.id, 'TASK_COMPLETED', `Task approved & completed by ${currentUser.full_name}`);

      if (task.assigned_to && Number(task.assigned_to) !== Number(currentUser.id)) {
        await notificationService.createNotification({
          userId: task.assigned_to,
          workspaceId,
          relatedTaskId: taskId,
          title: 'Task Approved & Completed! 🎉',
          message: `Your work on "${task.title}" was approved and marked as completed.`,
          type: 'TASK_COMPLETED',
          link: `/workspace/tasks/${taskId}`,
        });
      }
    } else if (normalizedStatus === 'REOPENED') {
      await this.logTaskActivity(workspaceId, taskId, currentUser.id, 'TASK_REOPENED', `Task reopened by ${currentUser.full_name}`);
      if (task.assigned_to && Number(task.assigned_to) !== Number(currentUser.id)) {
        await notificationService.createNotification({
          userId: task.assigned_to,
          workspaceId,
          relatedTaskId: taskId,
          title: 'Task Reopened 🔄',
          message: `Task "${task.title}" was reopened by ${currentUser.full_name}.`,
          type: 'TASK_REOPENED',
          link: `/workspace/tasks/${taskId}`,
        });
      }
    } else {
      await this.logTaskActivity(workspaceId, taskId, currentUser.id, 'TASK_STATUS_UPDATED', `Status updated to ${normalizedStatus} by ${currentUser.full_name}`);
    }

    const updatedTask = await this.getTask(currentUser, workspaceId, taskId);

    // Realtime broadcast
    emitWorkspaceEvent(workspaceId, 'task_status_changed', {
      taskId: parseInt(taskId, 10),
      status: normalizedStatus,
      updatedBy: currentUser.id,
      task: updatedTask,
    });
    emitWorkspaceEvent(workspaceId, 'task_updated', updatedTask);

    return updatedTask;
  }

  /**
   * 8. Add Attachment (Distinguishing REFERENCE files from SUBMISSION deliverables).
   */
  async addAttachment(currentUser, workspaceId, taskId, { fileName, fileUrl, fileType, fileSize, assetId, attachmentType = 'REFERENCE' }) {
    const task = await this.getTask(currentUser, workspaceId, taskId);

    if (!fileName || !fileUrl) {
      const error = new Error('File name and file URL are required.');
      error.status = 400;
      throw error;
    }

    const type = attachmentType === 'SUBMISSION' ? 'SUBMISSION' : 'REFERENCE';

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.execute(
        `INSERT INTO task_attachments (workspace_id, task_id, asset_id, user_id, file_name, file_url, file_type, file_size, attachment_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          workspaceId,
          taskId,
          assetId || null,
          currentUser.id,
          fileName.trim(),
          fileUrl,
          fileType || 'document',
          fileSize || null,
          type,
        ]
      );

      const attachmentId = result.insertId;

      await connection.execute(
        `INSERT INTO task_activity (workspace_id, task_id, user_id, action, description, created_at)
         VALUES (?, ?, ?, 'ATTACHMENT_ADDED', ?, NOW())`,
        [
          workspaceId,
          taskId,
          currentUser.id,
          `${currentUser.full_name} uploaded ${type === 'SUBMISSION' ? 'deliverable' : 'reference file'}: "${fileName}"`,
        ]
      );

      await connection.commit();

      if (type === 'SUBMISSION' && Number(task.created_by) !== Number(currentUser.id)) {
        await notificationService.createNotification({
          userId: task.created_by,
          workspaceId,
          relatedTaskId: taskId,
          title: 'New Deliverable Uploaded 📎',
          message: `${currentUser.full_name} uploaded deliverable on "${task.title}": ${fileName}`,
          type: 'TASK_UPDATED',
          link: `/workspace/tasks/${taskId}`,
        });
      }

      const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName) || String(fileType).startsWith('image/');
      const isVid = /\.(mp4|webm|mov|mkv|avi)$/i.test(fileName) || String(fileType).startsWith('video/');

      const newAttachment = {
        id: attachmentId,
        taskId: parseInt(taskId, 10),
        assetId: assetId || null,
        userId: currentUser.id,
        name: fileName,
        fileName: fileName,
        url: fileUrl,
        fileUrl: fileUrl,
        thumbnailUrl: fileUrl,
        type: isImg ? 'image' : isVid ? 'video' : 'document',
        mimeType: fileType || (isImg ? 'image/jpeg' : isVid ? 'video/mp4' : 'application/octet-stream'),
        size: fileSize,
        fileSize: fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${(fileSize / 1024).toFixed(0)} KB`) : '1.2 MB',
        attachmentType: type,
        createdAt: new Date().toISOString(),
        uploadedBy: {
          id: currentUser.id,
          name: currentUser.full_name,
          avatar: currentUser.avatar_url || '',
          role: currentUser.role,
        },
        uploadedByName: currentUser.full_name,
        uploadedByAvatar: currentUser.avatar_url || '',
      };

      // Realtime notification
      emitWorkspaceEvent(workspaceId, 'task_attachment_added', {
        taskId: parseInt(taskId, 10),
        attachment: newAttachment,
      });

      return newAttachment;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 9. Delete Attachment.
   */
  async deleteAttachment(currentUser, workspaceId, taskId, attachmentId) {
    await this.getTask(currentUser, workspaceId, taskId);

    const [rows] = await db.execute(
      'SELECT id, file_name, user_id FROM task_attachments WHERE id = ? AND task_id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [attachmentId, taskId, workspaceId]
    );

    if (rows.length === 0) {
      const error = new Error('Attachment not found.');
      error.status = 404;
      throw error;
    }

    const att = rows[0];
    const isManager = ['superadmin', 'workspace_manager', 'graphic_team_head'].includes(currentUser.role);
    if (!isManager && Number(att.user_id) !== Number(currentUser.id)) {
      const error = new Error('Permission denied. You can only delete attachments uploaded by you.');
      error.status = 403;
      throw error;
    }

    await db.execute('UPDATE task_attachments SET deleted_at = NOW() WHERE id = ?', [attachmentId]);

    await this.logTaskActivity(
      workspaceId,
      taskId,
      currentUser.id,
      'ATTACHMENT_REMOVED',
      `${currentUser.full_name} removed attachment "${att.file_name}"`
    );

    emitWorkspaceEvent(workspaceId, 'task_attachment_removed', {
      taskId: parseInt(taskId, 10),
      attachmentId: parseInt(attachmentId, 10),
    });

    return { success: true, message: 'Attachment removed successfully.', attachmentId: parseInt(attachmentId, 10) };
  }

  /**
   * 10. Add Comment to Task.
   */
  async addComment(currentUser, workspaceId, taskId, commentText) {
    if (!commentText || !commentText.trim()) {
      const error = new Error('Comment text is required.');
      error.status = 400;
      throw error;
    }

    const task = await this.getTask(currentUser, workspaceId, taskId);

    const [result] = await db.execute(
      `INSERT INTO task_comments (task_id, user_id, message, created_at)
       VALUES (?, ?, ?, NOW())`,
      [taskId, currentUser.id, commentText.trim()]
    );

    await this.logTaskActivity(workspaceId, taskId, currentUser.id, 'COMMENT_ADDED', `Comment added by ${currentUser.full_name || 'Team Member'}`);

    // Notify other participant (if creator, notify assignee; if assignee, notify creator)
    const otherUserId = Number(currentUser.id) === Number(task.created_by) ? task.assigned_to : task.created_by;
    if (otherUserId && Number(otherUserId) !== Number(currentUser.id)) {
      await notificationService.createNotification({
        userId: otherUserId,
        workspaceId,
        relatedTaskId: taskId,
        title: 'New Comment on Task 💬',
        message: `${currentUser.full_name || 'Team Member'}: "${commentText.trim().substring(0, 80)}"`,
        type: 'TASK_COMMENT',
        link: `/workspace/tasks/${taskId}`,
      });
    }

    const newCommentObj = {
      id: result.insertId,
      taskId: parseInt(taskId, 10),
      userId: currentUser.id,
      text: commentText.trim(),
      message: commentText.trim(),
      commentText: commentText.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userName: currentUser.full_name || 'Team Member',
      userAvatar: currentUser.avatar_url || '',
      userRole: currentUser.role || 'Member',
      user: {
        id: currentUser.id,
        name: currentUser.full_name || 'Team Member',
        avatar: currentUser.avatar_url || '',
        role: currentUser.role || 'Member',
      },
    };

    emitWorkspaceEvent(workspaceId, 'task_comment_added', {
      taskId: parseInt(taskId, 10),
      comment: newCommentObj,
    });

    return newCommentObj;
  }

  /**
   * 11. Get Task Comments.
   */
  async getTaskComments(currentUser, workspaceId, taskId) {
    await this.getTask(currentUser, workspaceId, taskId);

    const [rows] = await db.execute(
      `SELECT tc.id, tc.task_id, tc.user_id, tc.message, tc.created_at, tc.updated_at,
              u.full_name as user_name, u.avatar_url as user_avatar, r.name as user_role
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE tc.task_id = ? AND tc.deleted_at IS NULL
       ORDER BY tc.created_at ASC`,
      [taskId]
    );

    return rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      userId: r.user_id,
      text: r.message,
      message: r.message,
      commentText: r.message,
      createdAt: r.created_at,
      updatedAt: r.updated_at || r.created_at,
      userName: r.user_name,
      userAvatar: r.user_avatar || '',
      userRole: r.user_role || 'Member',
      user: {
        id: r.user_id,
        name: r.user_name,
        avatar: r.user_avatar || '',
        role: r.user_role || 'Member',
      },
    }));
  }

  /**
   * 12. Delete Task Comment.
   */
  async deleteComment(currentUser, workspaceId, taskId, commentId) {
    await this.getTask(currentUser, workspaceId, taskId);

    const [rows] = await db.execute(
      `SELECT tc.id, tc.user_id, t.workspace_id
       FROM task_comments tc
       JOIN tasks t ON tc.task_id = t.id
       WHERE tc.id = ? AND tc.task_id = ? AND t.workspace_id = ? AND tc.deleted_at IS NULL`,
      [commentId, taskId, workspaceId]
    );

    if (rows.length === 0) {
      const error = new Error('Comment not found.');
      error.status = 404;
      throw error;
    }

    const comm = rows[0];
    const isManager = ['superadmin', 'workspace_manager'].includes(currentUser.role);
    if (!isManager && Number(comm.user_id) !== Number(currentUser.id)) {
      const error = new Error('Permission denied. You can only delete your own comments.');
      error.status = 403;
      throw error;
    }

    await db.execute('UPDATE task_comments SET deleted_at = NOW() WHERE id = ?', [commentId]);
    return { success: true, message: 'Comment deleted successfully.', commentId: parseInt(commentId, 10) };
  }

  /**
   * 13. Duplicate Task.
   */
  async duplicateTask(currentUser, workspaceId, taskId) {
    const original = await this.getTask(currentUser, workspaceId, taskId);

    return this.createTask(currentUser, workspaceId, {
      title: `${original.title} (Copy)`,
      description: original.description,
      instructions: original.instructions,
      clientId: original.client_id,
      projectId: original.project_id,
      assignedTo: original.assigned_to,
      priority: original.priority,
      dueDate: original.due_date,
      dueTime: original.due_time,
      status: 'TODO',
      attachments: original.attachments,
    });
  }

  /**
   * 14. Delete Task (Soft Delete).
   */
  async deleteTask(currentUser, workspaceId, taskId) {
    const isManager = ['superadmin', 'workspace_manager'].includes(currentUser.role);
    if (!isManager) {
      const error = new Error('Permission denied. Only workspace managers can delete tasks.');
      error.status = 403;
      throw error;
    }

    const [tasks] = await db.execute('SELECT id, title FROM tasks WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL', [taskId, workspaceId]);
    if (tasks.length === 0) {
      const error = new Error('Task not found.');
      error.status = 404;
      throw error;
    }

    await db.execute('UPDATE tasks SET deleted_at = NOW() WHERE id = ? AND workspace_id = ?', [taskId, workspaceId]);

    await activityService.logActivity({
      workspaceId,
      userId: currentUser.id,
      entityType: 'TASK',
      entityId: taskId,
      action: 'TASK_DELETED',
      description: `${currentUser.full_name} deleted task "${tasks[0].title}".`,
      isInternal: true,
    });

    emitWorkspaceEvent(workspaceId, 'task_deleted', { taskId: parseInt(taskId, 10) });

    return { success: true, message: 'Task deleted successfully.', taskId: parseInt(taskId, 10) };
  }
}

module.exports = new TaskService();
