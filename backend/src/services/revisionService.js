const { pool, db } = require('../config/database');
const notificationService = require('./notificationService');
const activityService = require('./activityService');
const collaborationService = require('./collaborationService');

class RevisionService {
  /**
   * Helper to verify content existence and authorization.
   */
  async verifyContent(currentUser, workspaceId, contentId) {
    const [rows] = await db.execute(
      `SELECT c.id, c.workspace_id, c.client_id, c.title, c.caption, c.status, c.created_by as creator_id, c.created_by, c.assigned_to, c.reviewer_id
       FROM content c
       WHERE c.id = ? AND c.workspace_id = ? AND c.deleted_at IS NULL`,
      [contentId, workspaceId]
    );

    if (rows.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    const item = rows[0];

    // Security check for client role
    const isClientRole = currentUser.role === 'client_user' || currentUser.role === 'client';
    if (isClientRole) {
      const [clientMatches] = await db.execute(
        'SELECT id FROM client_team WHERE user_id = ? AND client_id = ?',
        [currentUser.id, item.client_id]
      );
      if (clientMatches.length === 0) {
        const error = new Error('Permission denied. Access restricted to assigned client brand.');
        error.status = 403;
        throw error;
      }
    }

    return item;
  }

  /**
   * Create a new Revision Request (MySQL Transaction).
   */
  async createRevisionRequest(currentUser, workspaceId, contentId, payload) {
    const { reason, priority = 'MEDIUM', assignedTo, dueDate, dueTime } = payload;

    if (!reason || !reason.trim()) {
      const error = new Error('Revision reason/feedback is required.');
      error.status = 400;
      throw error;
    }

    const item = await this.verifyContent(currentUser, workspaceId, contentId);

    // Default assignee to content's existing assigned_to or creator
    const targetAssignee = assignedTo || item.assigned_to || item.creator_id;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Insert into revision_requests
      const [revResult] = await connection.execute(
        `INSERT INTO revision_requests
         (content_id, requested_by, assigned_to, workspace_id, client_id, reason, priority, due_date, due_time, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NOW())`,
        [
          contentId,
          currentUser.id,
          targetAssignee || null,
          workspaceId,
          item.client_id,
          reason.trim(),
          priority.toUpperCase(),
          dueDate || null,
          dueTime || null,
        ]
      );
      const revisionId = revResult.insertId;

      // 2. Update content status to REVISION_REQUESTED & clear active schedule
      await connection.execute(
        'UPDATE content SET status = "REVISION_REQUESTED", scheduled_at = NULL, updated_at = NOW() WHERE id = ?',
        [contentId]
      );

      await connection.execute(
        'UPDATE calendar_events SET status = "CANCELLED", updated_at = NOW() WHERE content_id = ? AND workspace_id = ? AND status = "SCHEDULED"',
        [contentId, workspaceId]
      );


      // 3. Log in content_approvals
      await connection.execute(
        `INSERT INTO content_approvals (content_id, reviewer_id, approval_type, status, notes, created_at)
         VALUES (?, ?, ?, 'REVISION_REQUIRED', ?, NOW())`,
        [
          contentId,
          currentUser.id,
          currentUser.role.includes('client') ? 'CLIENT' : 'INTERNAL',
          reason.trim(),
        ]
      );

      // 4. Log comment in content_comments
      await connection.execute(
        `INSERT INTO content_comments (content_id, revision_request_id, user_id, comment_text, comment_type, is_internal, created_at)
         VALUES (?, ?, ?, ?, ?, 0, NOW())`,
        [
          contentId,
          revisionId,
          currentUser.id,
          `REVISION REQUESTED [${priority.toUpperCase()}]: ${reason.trim()}`,
          currentUser.role.includes('client') ? 'CLIENT' : 'INTERNAL',
        ]
      );

      await connection.commit();

      // 5. Create real notifications (Outside transaction so socket events fire safely)
      if (targetAssignee && targetAssignee !== currentUser.id) {
        await notificationService.createNotification({
          userId: targetAssignee,
          workspaceId,
          title: 'Revision Requested',
          message: `${currentUser.full_name || 'User'} requested revision on "${item.title}": "${reason.trim().slice(0, 60)}..."`,
          type: 'REVISION_REQUESTED',
          link: `/workspace/content?id=${contentId}`,
        });
      }

      if (item.reviewer_id && item.reviewer_id !== currentUser.id && item.reviewer_id !== targetAssignee) {
        await notificationService.createNotification({
          userId: item.reviewer_id,
          workspaceId,
          title: 'Content Revision Flagged',
          message: `Revision requested on "${item.title}".`,
          type: 'REVISION_REQUESTED',
          link: `/workspace/content?id=${contentId}`,
        });
      }

      // Log activity
      await activityService.logActivity({
        workspaceId,
        clientId: item.client_id,
        userId: currentUser.id,
        entityType: 'CONTENT',
        entityId: contentId,
        action: 'REVISION_REQUESTED',
        description: `${currentUser.full_name || 'User'} requested a revision for "${item.title}".`,
      });

      return {
        success: true,
        message: 'Revision request logged successfully.',
        revisionId,
        contentId: parseInt(contentId, 10),
        status: 'REVISION_REQUESTED',
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Start working on revision (IN_PROGRESS).
   */
  async startRevision(currentUser, workspaceId, revisionId) {
    const [revRows] = await db.execute(
      `SELECT r.*, c.title, c.client_id
       FROM revision_requests r
       JOIN content c ON r.content_id = c.id
       WHERE r.id = ? AND r.workspace_id = ? AND r.deleted_at IS NULL`,
      [revisionId, workspaceId]
    );

    if (revRows.length === 0) {
      const error = new Error('Revision request not found.');
      error.status = 404;
      throw error;
    }

    const rev = revRows[0];

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        `UPDATE revision_requests
         SET status = 'IN_PROGRESS', started_at = NOW(), started_by = ?, updated_at = NOW()
         WHERE id = ?`,
        [currentUser.id, revisionId]
      );

      await connection.execute(
        'UPDATE content SET status = "REVISION_IN_PROGRESS", updated_at = NOW() WHERE id = ?',
        [rev.content_id]
      );

      await connection.commit();

      // Log activity
      await activityService.logActivity({
        workspaceId,
        clientId: rev.client_id,
        userId: currentUser.id,
        entityType: 'CONTENT',
        entityId: rev.content_id,
        action: 'REVISION_STARTED',
        description: `${currentUser.full_name || 'User'} started working on revision #${revisionId} for "${rev.title}".`,
      });

      // Notify requester
      if (rev.requested_by && rev.requested_by !== currentUser.id) {
        await notificationService.createNotification({
          userId: rev.requested_by,
          workspaceId,
          relatedContentId: rev.content_id,
          relatedRevisionId: revisionId,
          title: 'Revision Started',
          message: `${currentUser.full_name || 'Team member'} started working on the revision for "${rev.title}".`,
          type: 'REVISION_IN_PROGRESS',
          link: `/workspace/content?id=${rev.content_id}`,
        });
      }

      return {
        success: true,
        message: 'Revision status updated to IN_PROGRESS.',
        revisionId: parseInt(revisionId, 10),
        status: 'IN_PROGRESS',
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Resubmit Content for Approval after completing revisions (MySQL Transaction).
   */
  async resubmitRevision(currentUser, workspaceId, revisionId, payload) {
    const { changesMade, title, caption, mediaAssets } = payload;

    const [revRows] = await db.execute(
      `SELECT r.*, c.title as content_title, c.caption as content_caption, c.client_id, c.reviewer_id
       FROM revision_requests r
       JOIN content c ON r.content_id = c.id
       WHERE r.id = ? AND r.workspace_id = ? AND r.deleted_at IS NULL`,
      [revisionId, workspaceId]
    );

    if (revRows.length === 0) {
      const error = new Error('Revision request not found.');
      error.status = 404;
      throw error;
    }

    const rev = revRows[0];

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Update Content details if modified
      if (title || caption) {
        await connection.execute(
          `UPDATE content
           SET title = COALESCE(?, title),
               caption = COALESCE(?, caption),
               updated_at = NOW()
           WHERE id = ?`,
          [
            title || null,
            caption || null,
            rev.content_id,
          ]
        );
      }

      // 2. Create version snapshot
      const [maxVer] = await connection.execute(
        'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM content_versions WHERE content_id = ?',
        [rev.content_id]
      );
      const nextVer = maxVer[0].next_version;

      await connection.execute(
        `INSERT INTO content_versions (content_id, created_by, version_number, title, body_text, media_assets, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          rev.content_id,
          currentUser.id,
          nextVer,
          title || rev.content_title,
          caption || rev.content_caption,
          mediaAssets ? JSON.stringify(mediaAssets) : null,
        ]
      );

      // 3. Update revision request status to RESUBMITTED
      await connection.execute(
        `UPDATE revision_requests
         SET status = 'RESUBMITTED', resubmitted_at = NOW(), changes_made = ?, updated_at = NOW()
         WHERE id = ?`,
        [changesMade || 'Revisions completed and resubmitted.', revisionId]
      );

      // 4. Update content status to PENDING_APPROVAL / CLIENT_REVIEW
      await connection.execute(
        'UPDATE content SET status = "CLIENT_REVIEW", updated_at = NOW() WHERE id = ?',
        [rev.content_id]
      );

      // 5. Add comment thread record
      await connection.execute(
        `INSERT INTO content_comments (content_id, revision_request_id, user_id, comment_text, comment_type, is_internal, created_at)
         VALUES (?, ?, ?, ?, 'CLIENT', 0, NOW())`,
        [
          rev.content_id,
          revisionId,
          currentUser.id,
          `RESUBMITTED FOR APPROVAL: ${changesMade || 'Updated content per requested revisions.'}`,
        ]
      );

      await connection.commit();

      // 6. Notifications
      if (rev.requested_by) {
        await notificationService.createNotification({
          userId: rev.requested_by,
          workspaceId,
          relatedContentId: rev.content_id,
          relatedRevisionId: revisionId,
          title: 'Content Resubmitted',
          message: `"${rev.content_title}" has been resubmitted for your review: "${changesMade || 'Revisions completed'}"`,
          type: 'CONTENT_RESUBMITTED',
          link: `/workspace/content?id=${rev.content_id}`,
        });
      }

      // Log activity
      await activityService.logActivity({
        workspaceId,
        clientId: rev.client_id,
        userId: currentUser.id,
        entityType: 'CONTENT',
        entityId: rev.content_id,
        action: 'REVISION_RESUBMITTED',
        description: `${currentUser.full_name || 'User'} resubmitted "${rev.content_title}" for approval.`,
      });

      return {
        success: true,
        message: 'Content successfully resubmitted for approval.',
        revisionId: parseInt(revisionId, 10),
        status: 'RESUBMITTED',
        contentStatus: 'CLIENT_REVIEW',
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Resolve Revision Request and Approve Content (MySQL Transaction).
   */
  async resolveAndApprove(currentUser, workspaceId, revisionId, { notes }) {
    const [revRows] = await db.execute(
      `SELECT r.*, c.title as content_title, c.created_by as creator_id, c.created_by, c.assigned_to
       FROM revision_requests r
       JOIN content c ON r.content_id = c.id
       WHERE r.id = ? AND r.workspace_id = ? AND r.deleted_at IS NULL`,
      [revisionId, workspaceId]
    );

    if (revRows.length === 0) {
      const error = new Error('Revision request not found.');
      error.status = 404;
      throw error;
    }

    const rev = revRows[0];

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Update Revision status to RESOLVED
      await connection.execute(
        `UPDATE revision_requests
         SET status = 'RESOLVED', resolved_at = NOW(), resolved_by = ?, updated_at = NOW()
         WHERE id = ?`,
        [currentUser.id, revisionId]
      );

      // 2. Update Content status to APPROVED
      await connection.execute(
        'UPDATE content SET status = "APPROVED", updated_at = NOW() WHERE id = ?',
        [rev.content_id]
      );

      // 3. Log in content_approvals
      await connection.execute(
        `INSERT INTO content_approvals (workspace_id, content_id, reviewer_id, approval_type, status, notes, created_at)
         VALUES (?, ?, ?, ?, 'APPROVED', ?, NOW())`,
        [
          workspaceId,
          rev.content_id,
          currentUser.id,
          currentUser.role.includes('client') ? 'CLIENT' : 'INTERNAL',
          notes || 'Revision verified and approved.',
        ]
      );

      await connection.commit();

      // Notifications
      const notifyUsers = new Set([rev.creator_id, rev.assigned_to, rev.started_by].filter(Boolean));
      for (const uId of notifyUsers) {
        if (uId !== currentUser.id) {
          await notificationService.createNotification({
            userId: uId,
            workspaceId,
            relatedContentId: rev.content_id,
            relatedRevisionId: revisionId,
            title: 'Content Approved! 🎉',
            message: `"${rev.content_title}" was approved by ${currentUser.full_name || 'Client'}. Now ready for calendar scheduling.`,
            type: 'CONTENT_APPROVED',
            link: `/workspace/content?id=${rev.content_id}`,
          });
        }
      }


      // Log activity
      await activityService.logActivity({
        workspaceId,
        clientId: rev.client_id,
        userId: currentUser.id,
        entityType: 'CONTENT',
        entityId: rev.content_id,
        action: 'CONTENT_APPROVED',
        description: `${currentUser.full_name || 'User'} approved "${rev.content_title}".`,
      });

      return {
        success: true,
        message: 'Revision resolved and content approved!',
        revisionId: parseInt(revisionId, 10),
        contentId: rev.content_id,
        status: 'APPROVED',
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Get complete Revision History for a content item.
   */
  async getRevisionHistory(currentUser, workspaceId, contentId) {
    let targetContentId = contentId;
    let targetWorkspaceId = workspaceId;

    if (!contentId && currentUser) {
      targetContentId = currentUser;
      targetWorkspaceId = null;
    }

    let query = `SELECT r.*,
              req.full_name as requester_name, req.avatar_url as requester_avatar,
              asg.full_name as assignee_name, asg.avatar_url as assignee_avatar,
              st.full_name as starter_name, res.full_name as resolver_name
       FROM revision_requests r
       LEFT JOIN users req ON r.requested_by = req.id
       LEFT JOIN users asg ON r.assigned_to = asg.id
       LEFT JOIN users st ON r.started_by = st.id
       LEFT JOIN users res ON r.resolved_by = res.id
       WHERE r.content_id = ? AND r.deleted_at IS NULL`;

    const params = [targetContentId];
    if (targetWorkspaceId) {
      query += ` AND r.workspace_id = ?`;
      params.push(targetWorkspaceId);
    }
    query += ` ORDER BY r.created_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * List assigned revisions for team members or workspace managers.
   */
  async listMyRevisions(currentUser, workspaceId, filters = {}) {
    const { status, priority } = filters;

    let query = `
      SELECT r.*,
             c.title as content_title, c.caption as content_caption, c.status as content_status,
             cl.company_name as client_name,
             req.full_name as requester_name, req.avatar_url as requester_avatar,
             asg.full_name as assignee_name,
             CASE
               WHEN r.due_date < CURDATE() AND r.status IN ('OPEN', 'IN_PROGRESS') THEN 1
               ELSE 0
             END as is_overdue
      FROM revision_requests r
      JOIN content c ON r.content_id = c.id
      JOIN clients cl ON r.client_id = cl.id
      LEFT JOIN users req ON r.requested_by = req.id
      LEFT JOIN users asg ON r.assigned_to = asg.id
      WHERE r.workspace_id = ? AND r.deleted_at IS NULL
    `;
    const params = [workspaceId];

    // Client security check
    const isClientRole = currentUser.role === 'client_user' || currentUser.role === 'client';
    if (isClientRole) {
      query += ' AND r.requested_by = ?';
      params.push(currentUser.id);
    } else if (!['superadmin', 'workspace_manager'].includes(currentUser.role)) {
      // Regular team members see revisions assigned to them or created by them
      query += ' AND (r.assigned_to = ? OR r.requested_by = ?)';
      params.push(currentUser.id, currentUser.id);
    }

    if (status && status !== 'ALL') {
      query += ' AND r.status = ?';
      params.push(status.toUpperCase());
    }

    if (priority && priority !== 'ALL') {
      query += ' AND r.priority = ?';
      params.push(priority.toUpperCase());
    }

    query += ' ORDER BY r.created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }
}

module.exports = new RevisionService();
