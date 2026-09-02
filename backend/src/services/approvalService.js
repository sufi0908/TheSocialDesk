const { db, pool } = require('../config/database');
const notificationService = require('./notificationService');
const activityService = require('./activityService');

class ApprovalService {
  /**
   * Centralized permission validator for internal approval authority.
   * Allowed: Superadmin, Workspace Manager, Graphic Team Head, or designated reviewer (if not the executor).
   * Denied: Graphic Designer, Video Editor, Content Writer, Social Media Manager, Team Member, Client.
   */
  canApproveInternal(currentUser, item) {
    const approverRoles = ['superadmin', 'workspace_manager', 'graphic_team_head'];
    if (approverRoles.includes(currentUser?.role)) {
      return true;
    }
    if (item?.reviewer_id && Number(item.reviewer_id) === Number(currentUser?.id) && Number(item.assigned_to) !== Number(currentUser?.id)) {
      return true;
    }
    return false;
  }

  /**
   * Centralized permission validator for client review approval authority.
   * Allowed: Client Users belonging to the client account, or Workspace Managers recording external client approvals.
   */
  canApproveClient(currentUser, item) {
    if (currentUser?.role === 'superadmin' || currentUser?.role === 'workspace_manager') {
      return true;
    }
    if (currentUser?.role === 'client_user' || currentUser?.role === 'client') {
      return true;
    }
    return false;
  }

  /**
   * Helper to fetch content item and verify workspace access & client assignment.
   */
  async verifyAndGetContent(currentUser, workspaceId, contentId) {
    const [rows] = await db.execute(
      `SELECT c.id, c.workspace_id, c.client_id, c.title, c.caption, c.status, c.assigned_to, c.reviewer_id, c.created_by,
              cli.name as client_name, cli.company_name as client_company_name
       FROM content c
       JOIN clients cli ON c.client_id = cli.id
       WHERE c.id = ? AND c.workspace_id = ? AND c.deleted_at IS NULL`,
      [contentId, workspaceId]
    );

    if (rows.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    const item = rows[0];

    // Client Security Check: Client users can only review content for their assigned client
    if (currentUser.role === 'client_user' || currentUser.role === 'client') {
      const [clientMatches] = await db.execute(
        'SELECT id FROM client_team WHERE user_id = ? AND client_id = ?',
        [currentUser.id, item.client_id]
      );
      if (clientMatches.length === 0) {
        const error = new Error('Permission denied. You can only review content for your assigned client.');
        error.status = 403;
        throw error;
      }
    }

    return item;
  }

  /**
   * Helper to log approval history record inside a connection transaction or pool.
   */
  async recordApprovalLog(executor, workspaceId, contentId, reviewerId, approvalType, status, notes) {
    const runner = executor || db;
    await runner.execute(
      `INSERT INTO content_approvals (workspace_id, content_id, reviewer_id, approval_type, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [workspaceId, contentId, reviewerId, approvalType, status, notes || null]
    );
  }

  /**
   * 1. Submit content for Internal Review (DRAFT / IN_PROGRESS / REVISION_REQUIRED -> INTERNAL_REVIEW).
   */
  async submitInternalReview(currentUser, workspaceId, contentId, data = {}) {
    const item = await this.verifyAndGetContent(currentUser, workspaceId, contentId);
    const notes = data.notes || data.comment || 'Submitted for internal review.';

    if (item.status === 'APPROVED' || item.status === 'SCHEDULED' || item.status === 'PUBLISHED') {
      const error = new Error(`Cannot submit content that is already ${item.status}.`);
      error.status = 400;
      throw error;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE content SET status = "INTERNAL_REVIEW", updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [contentId, workspaceId]
      );

      // If resubmitting from REVISION_REQUIRED, update open revision requests
      if (item.status === 'REVISION_REQUIRED') {
        await connection.execute(
          `UPDATE revision_requests
           SET status = 'RESUBMITTED', resubmitted_at = NOW(), changes_made = ?, updated_at = NOW()
           WHERE content_id = ? AND workspace_id = ? AND status = 'OPEN'`,
          [notes, contentId, workspaceId]
        );
      }

      await this.recordApprovalLog(connection, workspaceId, contentId, currentUser.id, 'INTERNAL', 'SUBMITTED_INTERNAL', notes);

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Activity Log
    await activityService.logActivity({
      workspaceId,
      clientId: item.client_id,
      userId: currentUser.id,
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'SUBMITTED_INTERNAL_REVIEW',
      description: `${currentUser.full_name || 'User'} submitted "${item.title}" for internal review.`,
      isInternal: true,
    });

    // Notify Reviewer & Workspace Managers
    if (item.reviewer_id && item.reviewer_id !== currentUser.id) {
      await notificationService.createNotification({
        userId: item.reviewer_id,
        workspaceId,
        relatedContentId: contentId,
        title: 'Approval Requested 📋',
        message: `Content "${item.title}" was submitted for your internal review.`,
        type: 'APPROVAL_REQUESTED',
        link: '/workspace/approvals',
      });
    }

    await notificationService.notifyWorkspaceManagers(workspaceId, {
      title: 'Internal Review Requested 📋',
      message: `Content "${item.title}" was submitted for internal review.`,
      type: 'APPROVAL_REQUESTED',
      link: '/workspace/approvals',
    });

    return {
      success: true,
      message: 'Content submitted for internal review successfully.',
      contentId: parseInt(contentId, 10),
      status: 'INTERNAL_REVIEW',
    };
  }

  /**
   * 2. Internal Reviewer / Manager approves content -> Moves to CLIENT_REVIEW.
   */
  async internalApprove(currentUser, workspaceId, contentId, data = {}) {
    const item = await this.verifyAndGetContent(currentUser, workspaceId, contentId);

    // Strict RBAC Authority Check: Graphic Designers / execution team members CANNOT approve internal content
    if (!this.canApproveInternal(currentUser, item)) {
      const error = new Error('Permission denied. Only Workspace Managers, Graphic Team Heads, or authorized reviewers have authority to perform internal approvals.');
      error.status = 403;
      throw error;
    }

    const notes = data.notes || data.comment || 'Passed internal review. Sent to client review.';

    if (item.status !== 'INTERNAL_REVIEW') {
      const error = new Error(`Only content in INTERNAL_REVIEW can be internally approved. Current status: ${item.status}`);
      error.status = 400;
      throw error;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE content SET status = "CLIENT_REVIEW", updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [contentId, workspaceId]
      );

      await this.recordApprovalLog(connection, workspaceId, contentId, currentUser.id, 'INTERNAL', 'INTERNAL_APPROVED', notes);

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Activity Log
    await activityService.logActivity({
      workspaceId,
      clientId: item.client_id,
      userId: currentUser.id,
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'CONTENT_INTERNALLY_APPROVED',
      description: `${currentUser.full_name || 'Reviewer'} internally approved "${item.title}" and sent it to client.`,
      isInternal: true,
    });

    // Notify Client Users & Creator
    await notificationService.notifyClientUsers(item.client_id, workspaceId, {
      title: 'New Content Ready for Approval 🌟',
      message: `Content "${item.title}" is ready for your review and sign-off.`,
      type: 'APPROVAL_REQUESTED',
      link: '/client/content',
    });

    const recipientId = item.assigned_to || item.created_by;
    if (recipientId && recipientId !== currentUser.id) {
      await notificationService.createNotification({
        userId: recipientId,
        workspaceId,
        relatedContentId: contentId,
        title: 'Passed Internal Review ✅',
        message: `Content "${item.title}" passed internal review and was sent to client.`,
        type: 'APPROVAL_PASSED',
        link: '/workspace/content',
      });
    }

    return {
      success: true,
      message: 'Content internal approval granted. Moved to client review stage.',
      contentId: parseInt(contentId, 10),
      status: 'CLIENT_REVIEW',
    };
  }

  /**
   * 3. Internal Reviewer / Manager requests revision -> Moves to REVISION_REQUIRED.
   */
  async internalRevision(currentUser, workspaceId, contentId, data = {}) {
    const item = await this.verifyAndGetContent(currentUser, workspaceId, contentId);

    // Strict RBAC Authority Check: Graphic Designers / execution team members CANNOT request internal revisions
    if (!this.canApproveInternal(currentUser, item)) {
      const error = new Error('Permission denied. Only Workspace Managers, Graphic Team Heads, or authorized reviewers have authority to request internal revisions.');
      error.status = 403;
      throw error;
    }

    const revisionNotes = data.notes || data.comment || data.reason;

    if (!revisionNotes || !revisionNotes.trim()) {
      const error = new Error('Revision comments/feedback are required when requesting revisions.');
      error.status = 400;
      throw error;
    }

    if (item.status !== 'INTERNAL_REVIEW') {
      const error = new Error(`Only content in INTERNAL_REVIEW can have an internal revision requested. Current status: ${item.status}`);
      error.status = 400;
      throw error;
    }

    const connection = await pool.getConnection();
    let revId;

    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE content SET status = "REVISION_REQUIRED", scheduled_at = NULL, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [contentId, workspaceId]
      );

      // Cancel any active calendar schedule
      await connection.execute(
        'UPDATE calendar_events SET status = "CANCELLED", updated_at = NOW() WHERE content_id = ? AND workspace_id = ? AND status = "SCHEDULED"',
        [contentId, workspaceId]
      );

      await this.recordApprovalLog(connection, workspaceId, contentId, currentUser.id, 'INTERNAL', 'REVISION_REQUIRED', revisionNotes.trim());

      // Save revision comment in content_comments
      await connection.execute(
        `INSERT INTO content_comments (content_id, user_id, comment_text, comment_type, is_internal, created_at)
         VALUES (?, ?, ?, 'INTERNAL', 1, NOW())`,
        [contentId, currentUser.id, `INTERNAL REVISION: ${revisionNotes.trim()}`]
      );

      // Insert record into revision_requests table
      const [revResult] = await connection.execute(
        `INSERT INTO revision_requests (workspace_id, content_id, client_id, requested_by, assigned_to, reason, priority, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'HIGH', 'OPEN', NOW())`,
        [workspaceId, contentId, item.client_id, currentUser.id, item.assigned_to || item.created_by, revisionNotes.trim()]
      );
      revId = revResult.insertId;

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Activity Log
    await activityService.logActivity({
      workspaceId,
      clientId: item.client_id,
      userId: currentUser.id,
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'INTERNAL_REVISION_REQUESTED',
      description: `${currentUser.full_name || 'Reviewer'} requested internal revision on "${item.title}": "${revisionNotes.trim()}".`,
      isInternal: true,
    });

    // Notify assigned team member / creator
    const recipientId = item.assigned_to || item.created_by;
    if (recipientId && recipientId !== currentUser.id) {
      await notificationService.createNotification({
        userId: recipientId,
        workspaceId,
        relatedContentId: contentId,
        relatedRevisionId: revId,
        title: 'Internal Revision Requested ⚠️',
        message: `Internal revision requested for "${item.title}": ${revisionNotes.trim()}`,
        type: 'REVISION_REQUESTED',
        link: '/workspace/content',
      });
    }

    return {
      success: true,
      message: 'Internal revision requested. Content status updated to REVISION_REQUIRED.',
      contentId: parseInt(contentId, 10),
      status: 'REVISION_REQUIRED',
    };
  }

  /**
   * 4. Team Member resubmits content after revision -> Moves to INTERNAL_REVIEW.
   */
  async resubmitContent(currentUser, workspaceId, contentId, data = {}) {
    return this.submitInternalReview(currentUser, workspaceId, contentId, {
      notes: data.notes || data.comment || 'Content resubmitted for internal review.',
    });
  }

  /**
   * 5. Submit content directly for Client Review.
   */
  async submitClientReview(currentUser, workspaceId, contentId, data = {}) {
    const item = await this.verifyAndGetContent(currentUser, workspaceId, contentId);

    const allowedSenders = ['superadmin', 'workspace_manager', 'graphic_team_head'];
    if (!allowedSenders.includes(currentUser.role)) {
      const error = new Error('Permission denied. Only Workspace Managers or Graphic Team Heads can send content directly to Client Review.');
      error.status = 403;
      throw error;
    }

    const notes = data.notes || data.comment || 'Submitted for client review.';

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE content SET status = "CLIENT_REVIEW", updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [contentId, workspaceId]
      );

      await this.recordApprovalLog(connection, workspaceId, contentId, currentUser.id, 'CLIENT', 'SUBMITTED_CLIENT', notes);

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Activity Log
    await activityService.logActivity({
      workspaceId,
      clientId: item.client_id,
      userId: currentUser.id,
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'SUBMITTED_CLIENT_REVIEW',
      description: `${currentUser.full_name || 'User'} sent "${item.title}" for client review.`,
    });

    await notificationService.notifyClientUsers(item.client_id, workspaceId, {
      title: 'Content Ready for Approval 🌟',
      message: `Content "${item.title}" was submitted for your review.`,
      type: 'APPROVAL_REQUESTED',
      link: '/client/content',
    });

    return {
      success: true,
      message: 'Content submitted for client review.',
      contentId: parseInt(contentId, 10),
      status: 'CLIENT_REVIEW',
    };
  }

  /**
   * 6. Client approves content inside SocialDesk -> Moves to APPROVED (Ready to Schedule).
   */
  async clientApprove(currentUser, workspaceId, contentId, data = {}) {
    const item = await this.verifyAndGetContent(currentUser, workspaceId, contentId);

    if (!this.canApproveClient(currentUser, item)) {
      const error = new Error('Permission denied. Only client stakeholders or workspace managers have authority to grant client approval.');
      error.status = 403;
      throw error;
    }

    const notes = data.notes || data.comment || 'Approved by client.';

    if (item.status === 'APPROVED') {
      const error = new Error('Content is already approved.');
      error.status = 400;
      throw error;
    }

    if (item.status !== 'CLIENT_REVIEW') {
      const error = new Error(`Only content in CLIENT_REVIEW can be approved. Current status: ${item.status}`);
      error.status = 400;
      throw error;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE content SET status = "APPROVED", updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [contentId, workspaceId]
      );

      // Resolve open revision requests
      await connection.execute(
        `UPDATE revision_requests
         SET status = 'RESOLVED', resolved_at = NOW(), resolved_by = ?, updated_at = NOW()
         WHERE content_id = ? AND workspace_id = ? AND status IN ('OPEN', 'RESUBMITTED')`,
        [currentUser.id, contentId, workspaceId]
      );

      await this.recordApprovalLog(connection, workspaceId, contentId, currentUser.id, 'CLIENT', 'APPROVED', notes);

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Activity Log
    await activityService.logActivity({
      workspaceId,
      clientId: item.client_id,
      userId: currentUser.id,
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'CLIENT_APPROVED',
      description: `${currentUser.full_name || 'Client'} approved "${item.title}". Now ready for calendar scheduling.`,
    });

    // Notify assigned creator & Workspace Managers
    const recipientId = item.assigned_to || item.created_by;
    if (recipientId && recipientId !== currentUser.id) {
      await notificationService.createNotification({
        userId: recipientId,
        workspaceId,
        relatedContentId: contentId,
        title: 'Content Approved by Client! 🎉',
        message: `Client approved "${item.title}". It is now ready to be scheduled on the social calendar.`,
        type: 'APPROVAL_PASSED',
        link: '/workspace/calendar',
      });
    }

    await notificationService.notifyWorkspaceManagers(workspaceId, {
      title: 'Content Approved by Client! 🎉',
      message: `Client approved "${item.title}". Now available in the unscheduled calendar queue.`,
      type: 'APPROVAL_PASSED',
      link: '/workspace/calendar',
    });

    return {
      success: true,
      message: 'Content approved by client! Now available for calendar scheduling.',
      contentId: parseInt(contentId, 10),
      status: 'APPROVED',
      calendarStatus: 'UNSCHEDULED',
    };
  }

  /**
   * 7. External Client Approval (WhatsApp / Email / Phone / In-Person).
   */
  async externalClientApprove(currentUser, workspaceId, contentId, data = {}) {
    if (currentUser.role !== 'superadmin' && currentUser.role !== 'workspace_manager') {
      const error = new Error('Permission denied. Only Workspace Managers can record external client approvals.');
      error.status = 403;
      throw error;
    }

    const item = await this.verifyAndGetContent(currentUser, workspaceId, contentId);
    const source = data.approvalSource || data.source || 'WhatsApp';
    const notes = data.notes || data.comment || `Approved by client via ${source}.`;
    const approvedBy = data.approvedBy || item.client_name || 'Client';

    const fullNote = `[External Approval via ${source}] Confirmed by: ${approvedBy}. Note: ${notes}`;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE content SET status = "APPROVED", updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [contentId, workspaceId]
      );

      // Resolve open revision requests
      await connection.execute(
        `UPDATE revision_requests
         SET status = 'RESOLVED', resolved_at = NOW(), resolved_by = ?, updated_at = NOW()
         WHERE content_id = ? AND workspace_id = ? AND status IN ('OPEN', 'RESUBMITTED')`,
        [currentUser.id, contentId, workspaceId]
      );

      await this.recordApprovalLog(connection, workspaceId, contentId, currentUser.id, 'CLIENT', 'APPROVED_EXTERNAL', fullNote);

      // Log in content_comments
      await connection.execute(
        `INSERT INTO content_comments (content_id, user_id, comment_text, comment_type, is_internal, created_at)
         VALUES (?, ?, ?, 'INTERNAL', 1, NOW())`,
        [contentId, currentUser.id, `EXTERNAL CLIENT APPROVAL RECORDED (${source}): ${notes}`]
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Activity Log
    await activityService.logActivity({
      workspaceId,
      clientId: item.client_id,
      userId: currentUser.id,
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'EXTERNAL_CLIENT_APPROVED',
      description: `${currentUser.full_name || 'Manager'} recorded client approval from ${source} for "${item.title}".`,
    });

    // Notify Creator
    const recipientId = item.assigned_to || item.created_by;
    if (recipientId && recipientId !== currentUser.id) {
      await notificationService.createNotification({
        userId: recipientId,
        workspaceId,
        relatedContentId: contentId,
        title: `Client Approved via ${source}! 🎉`,
        message: `Manager recorded client approval (${source}) for "${item.title}". Ready for scheduling.`,
        type: 'APPROVAL_PASSED',
        link: '/workspace/calendar',
      });
    }

    return {
      success: true,
      message: `Client approval recorded from ${source}. Content is now APPROVED and ready for calendar scheduling.`,
      contentId: parseInt(contentId, 10),
      status: 'APPROVED',
      calendarStatus: 'UNSCHEDULED',
      approvalSource: source,
    };
  }

  /**
   * 8. Client requests revision on content -> Moves to REVISION_REQUIRED.
   */
  async clientRevision(currentUser, workspaceId, contentId, data = {}) {
    const item = await this.verifyAndGetContent(currentUser, workspaceId, contentId);

    if (!this.canApproveClient(currentUser, item)) {
      const error = new Error('Permission denied. Only client stakeholders or workspace managers have authority to request client revisions.');
      error.status = 403;
      throw error;
    }

    const revisionNotes = data.notes || data.comment || data.reason;

    if (!revisionNotes || !revisionNotes.trim()) {
      const error = new Error('Revision comments/feedback are required when requesting revisions.');
      error.status = 400;
      throw error;
    }

    const connection = await pool.getConnection();
    let revId;

    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE content SET status = "REVISION_REQUIRED", scheduled_at = NULL, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [contentId, workspaceId]
      );

      // Cancel any scheduled calendar events
      await connection.execute(
        'UPDATE calendar_events SET status = "CANCELLED", updated_at = NOW() WHERE content_id = ? AND workspace_id = ? AND status = "SCHEDULED"',
        [contentId, workspaceId]
      );

      await this.recordApprovalLog(connection, workspaceId, contentId, currentUser.id, 'CLIENT', 'REVISION_REQUESTED', revisionNotes.trim());

      // Save revision comment in content_comments
      await connection.execute(
        `INSERT INTO content_comments (content_id, user_id, comment_text, comment_type, is_internal, created_at)
         VALUES (?, ?, ?, 'CLIENT', 0, NOW())`,
        [contentId, currentUser.id, `CLIENT REVISION: ${revisionNotes.trim()}`]
      );

      // Insert record into revision_requests table
      const [revResult] = await connection.execute(
        `INSERT INTO revision_requests (workspace_id, content_id, client_id, requested_by, assigned_to, reason, priority, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'HIGH', 'OPEN', NOW())`,
        [workspaceId, contentId, item.client_id, currentUser.id, item.assigned_to || item.created_by, revisionNotes.trim()]
      );
      revId = revResult.insertId;

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Activity Log
    await activityService.logActivity({
      workspaceId,
      clientId: item.client_id,
      userId: currentUser.id,
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'CLIENT_REVISION_REQUESTED',
      description: `${currentUser.full_name || 'Client'} requested changes on "${item.title}": "${revisionNotes.trim()}".`,
    });

    // Notify Creator & Workspace Managers
    const recipientId = item.assigned_to || item.created_by;
    if (recipientId && recipientId !== currentUser.id) {
      await notificationService.createNotification({
        userId: recipientId,
        workspaceId,
        relatedContentId: contentId,
        relatedRevisionId: revId,
        title: 'Client Requested Revision ⚠️',
        message: `Client requested changes on "${item.title}": ${revisionNotes.trim()}`,
        type: 'REVISION_REQUESTED',
        link: '/workspace/content',
      });
    }

    await notificationService.notifyWorkspaceManagers(workspaceId, {
      title: 'Client Requested Revision ⚠️',
      message: `Client requested revision on "${item.title}": ${revisionNotes.trim()}`,
      type: 'REVISION_REQUESTED',
      link: '/workspace/approvals',
    });

    return {
      success: true,
      message: 'Revision request logged. Content status updated to REVISION_REQUIRED.',
      contentId: parseInt(contentId, 10),
      status: 'REVISION_REQUIRED',
    };
  }

  /**
   * 9. Reject Content (Cancelled/Archived).
   */
  async rejectContent(currentUser, workspaceId, contentId, data = {}) {
    const item = await this.verifyAndGetContent(currentUser, workspaceId, contentId);
    const reason = data.reason || data.notes || 'Content rejected.';

    const allowedRejectors = ['superadmin', 'workspace_manager', 'graphic_team_head', 'client_user', 'client'];
    if (!allowedRejectors.includes(currentUser.role)) {
      const error = new Error('Permission denied. You do not have authority to reject this content.');
      error.status = 403;
      throw error;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE content SET status = "REJECTED", scheduled_at = NULL, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [contentId, workspaceId]
      );

      await this.recordApprovalLog(connection, workspaceId, contentId, currentUser.id, 'INTERNAL', 'REJECTED', reason);

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    await activityService.logActivity({
      workspaceId,
      clientId: item.client_id,
      userId: currentUser.id,
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'CONTENT_REJECTED',
      description: `${currentUser.full_name || 'User'} rejected "${item.title}".`,
    });

    return {
      success: true,
      message: 'Content rejected successfully.',
      contentId: parseInt(contentId, 10),
      status: 'REJECTED',
    };
  }

  /**
   * 10. Get Approval History for a content item.
   */
  async getApprovalHistory(workspaceId, contentId) {
    const [rows] = await db.execute(
      `SELECT ca.id, ca.content_id, ca.reviewer_id, ca.approval_type, ca.status, ca.notes, ca.created_at,
              u.full_name as reviewer_name, u.avatar_url as reviewer_avatar, r.name as reviewer_role
       FROM content_approvals ca
       JOIN users u ON ca.reviewer_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE ca.content_id = ? AND ca.workspace_id = ?
       ORDER BY ca.created_at DESC`,
      [contentId, workspaceId]
    );

    return rows;
  }
}

module.exports = new ApprovalService();
