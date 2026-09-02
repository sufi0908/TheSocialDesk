const { db, pool } = require('../config/database');
const notificationService = require('./notificationService');
const activityService = require('./activityService');

class CalendarService {
  /**
   * Helper to verify client user restrictions.
   */
  enforceManagerOrTeamRole(currentUser) {
    if (currentUser.role === 'client_user' || currentUser.role === 'client') {
      const error = new Error('Permission denied. Client users cannot schedule, reschedule, or unschedule content.');
      error.status = 403;
      throw error;
    }
  }

  /**
   * Check for schedule conflicts on same client, platform, and date/time.
   */
  async checkConflict(workspaceId, { clientId, contentId, platforms, scheduledAt, date, time }) {
    let scheduledDateTime = scheduledAt;
    if (!scheduledDateTime && date) {
      scheduledDateTime = time ? `${date} ${time}` : `${date} 12:00:00`;
    }
    if (!scheduledDateTime || !clientId) return { hasConflict: false };

    const targetDate = new Date(scheduledDateTime);
    if (isNaN(targetDate.getTime())) return { hasConflict: false };

    // Range window: +/- 30 minutes
    const windowStart = new Date(targetDate.getTime() - 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const windowEnd = new Date(targetDate.getTime() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    let query = `
      SELECT c.id as content_id, c.title, c.scheduled_at, cp.platform
      FROM content c
      JOIN content_platforms cp ON cp.content_id = c.id
      WHERE c.workspace_id = ? AND c.client_id = ?
        AND c.status = 'SCHEDULED'
        AND c.deleted_at IS NULL
        AND c.scheduled_at BETWEEN ? AND ?
    `;
    const params = [workspaceId, clientId, windowStart, windowEnd];

    if (contentId) {
      query += ' AND c.id != ?';
      params.push(contentId);
    }

    const [rows] = await db.execute(query, params);

    if (rows.length === 0) return { hasConflict: false };

    // Filter by platforms if provided
    let conflicts = rows;
    if (Array.isArray(platforms) && platforms.length > 0) {
      const targetPlatforms = platforms.map((p) => p.toUpperCase());
      conflicts = rows.filter((r) => targetPlatforms.includes(r.platform.toUpperCase()));
    }

    if (conflicts.length > 0) {
      return {
        hasConflict: true,
        message: `Another post ("${conflicts[0].title}") is already scheduled for platform ${conflicts[0].platform} around this time.`,
        conflictingPost: conflicts[0],
      };
    }

    return { hasConflict: false };
  }

  /**
   * Get scheduled events for the calendar.
   */
  async listScheduledEvents(workspaceId, filters = {}) {
    const { clientId, startDate, endDate, status, currentUser } = filters;

    let query = `
      SELECT c.id as content_id, c.workspace_id, c.client_id, c.project_id, c.title, c.caption,
             c.content_type, c.status as content_status, c.scheduled_at, c.published_at, c.created_at,
             cli.name as client_name, cli.company_name as client_company_name,
             p.name as project_name,
             u_creator.full_name as creator_name,
             u_reviewer.full_name as reviewer_name,
             u_assignee.full_name as assignee_name, u_assignee.avatar_url as assignee_avatar,
             ce.id as event_id, ce.event_type, ce.start_time, ce.timezone, ce.status as event_status
      FROM content c
      JOIN clients cli ON c.client_id = cli.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN users u_creator ON c.created_by = u_creator.id
      LEFT JOIN users u_reviewer ON c.reviewer_id = u_reviewer.id
      LEFT JOIN users u_assignee ON c.assigned_to = u_assignee.id
      LEFT JOIN calendar_events ce ON ce.content_id = c.id AND ce.deleted_at IS NULL
      WHERE c.workspace_id = ? AND c.deleted_at IS NULL AND c.status IN ('SCHEDULED', 'PUBLISHED')
    `;
    const params = [workspaceId];

    // Client isolation check
    if (currentUser && (currentUser.role === 'client' || currentUser.role === 'client_user')) {
      const [userClients] = await db.execute('SELECT client_id FROM client_team WHERE user_id = ?', [currentUser.id]);
      const allowedClientIds = userClients.map((ct) => ct.client_id);
      if (allowedClientIds.length === 0) return [];
      query += ` AND c.client_id IN (${allowedClientIds.map(() => '?').join(',')})`;
      params.push(...allowedClientIds);
    } else if (clientId) {
      query += ' AND c.client_id = ?';
      params.push(clientId);
    }

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND COALESCE(c.scheduled_at, ce.start_time) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND COALESCE(c.scheduled_at, ce.start_time) <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY COALESCE(c.scheduled_at, ce.start_time) ASC';

    const [rows] = await db.query(query, params);

    if (rows.length === 0) return [];

    const contentIds = rows.map((r) => r.content_id);
    const inPlaceholders = contentIds.map(() => '?').join(',');

    // Bulk platforms query
    const [cpRows] = await db.query(
      `SELECT content_id, platform, status FROM content_platforms WHERE content_id IN (${inPlaceholders})`,
      contentIds
    );
    const platformsMap = {};
    for (const cp of cpRows) {
      if (!platformsMap[cp.content_id]) platformsMap[cp.content_id] = [];
      platformsMap[cp.content_id].push(cp.platform);
    }

    // Bulk assets query
    const [assetRows] = await db.query(
      `SELECT ca.content_id, a.id, a.file_name, a.original_filename, a.file_url, a.file_type, a.file_size, a.mime_type, a.created_at
       FROM content_assets ca
       JOIN assets a ON ca.asset_id = a.id
       WHERE ca.content_id IN (${inPlaceholders}) AND a.deleted_at IS NULL
       UNION ALL
       SELECT a.content_id, a.id, a.file_name, a.original_filename, a.file_url, a.file_type, a.file_size, a.mime_type, a.created_at
       FROM assets a
       WHERE a.content_id IN (${inPlaceholders}) AND a.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM content_assets ca2 WHERE ca2.content_id = a.content_id)
       ORDER BY created_at DESC`,
      [...contentIds, ...contentIds]
    );
    const assetsMap = {};
    for (const asset of assetRows) {
      if (!assetsMap[asset.content_id]) assetsMap[asset.content_id] = [];
      if (!assetsMap[asset.content_id].some((a) => a.id === asset.id)) {
        assetsMap[asset.content_id].push(asset);
      }
    }

    for (const item of rows) {
      item.platforms = platformsMap[item.content_id] || [];
      const itemAssets = assetsMap[item.content_id] || [];
      item.mediaAssets = itemAssets;
      item.mediaUrl = itemAssets.length > 0 ? itemAssets[0].file_url : null;
      item.media = itemAssets.length > 0 ? {
        id: itemAssets[0].id,
        type: (itemAssets[0].file_type || '').toLowerCase() === 'video' || (itemAssets[0].mime_type && itemAssets[0].mime_type.startsWith('video/')) ? 'video' : 'image',
        mimeType: itemAssets[0].mime_type,
        url: itemAssets[0].file_url,
        thumbnailUrl: itemAssets[0].file_url,
        fileName: itemAssets[0].file_name || itemAssets[0].original_filename,
        size: itemAssets[0].file_size ? `${(itemAssets[0].file_size / (1024 * 1024)).toFixed(1)} MB` : 'Media File',
      } : null;
    }

    return rows;
  }

  /**
   * Get approved unscheduled content (APPROVED / UNSCHEDULED).
   */
  async listUnscheduledApproved(workspaceId, filters = {}) {
    const { clientId, search, currentUser } = filters;

    let query = `
      SELECT c.id as content_id, c.workspace_id, c.client_id, c.project_id, c.title, c.caption,
             c.content_type, c.status, c.created_at,
             cli.name as client_name, cli.company_name as client_company_name,
             p.name as project_name,
             u_creator.full_name as creator_name,
             u_reviewer.full_name as reviewer_name,
             u_assignee.full_name as assignee_name, u_assignee.avatar_url as assignee_avatar
      FROM content c
      JOIN clients cli ON c.client_id = cli.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN users u_creator ON c.created_by = u_creator.id
      LEFT JOIN users u_reviewer ON c.reviewer_id = u_reviewer.id
      LEFT JOIN users u_assignee ON c.assigned_to = u_assignee.id
      WHERE c.workspace_id = ? AND c.deleted_at IS NULL AND c.status = 'APPROVED' AND c.scheduled_at IS NULL
    `;
    const params = [workspaceId];

    // Client isolation check
    if (currentUser && (currentUser.role === 'client' || currentUser.role === 'client_user')) {
      const [userClients] = await db.execute('SELECT client_id FROM client_team WHERE user_id = ?', [currentUser.id]);
      const allowedClientIds = userClients.map((ct) => ct.client_id);
      if (allowedClientIds.length === 0) return [];
      query += ` AND c.client_id IN (${allowedClientIds.map(() => '?').join(',')})`;
      params.push(...allowedClientIds);
    } else if (clientId) {
      query += ' AND c.client_id = ?';
      params.push(clientId);
    }

    if (search) {
      query += ' AND (c.title LIKE ? OR c.caption LIKE ? OR cli.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY c.created_at DESC';

    const [rows] = await db.query(query, params);

    if (rows.length === 0) return [];

    const contentIds = rows.map((r) => r.content_id);
    const inPlaceholders = contentIds.map(() => '?').join(',');

    const [cpRows] = await db.query(
      `SELECT content_id, platform, status FROM content_platforms WHERE content_id IN (${inPlaceholders})`,
      contentIds
    );
    const platformsMap = {};
    for (const cp of cpRows) {
      if (!platformsMap[cp.content_id]) platformsMap[cp.content_id] = [];
      platformsMap[cp.content_id].push(cp.platform);
    }

    const [assetRows] = await db.query(
      `SELECT ca.content_id, a.id, a.file_name, a.original_filename, a.file_url, a.file_type, a.file_size, a.mime_type, a.created_at
       FROM content_assets ca
       JOIN assets a ON ca.asset_id = a.id
       WHERE ca.content_id IN (${inPlaceholders}) AND a.deleted_at IS NULL
       UNION ALL
       SELECT a.content_id, a.id, a.file_name, a.original_filename, a.file_url, a.file_type, a.file_size, a.mime_type, a.created_at
       FROM assets a
       WHERE a.content_id IN (${inPlaceholders}) AND a.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM content_assets ca2 WHERE ca2.content_id = a.content_id)
       ORDER BY created_at DESC`,
      [...contentIds, ...contentIds]
    );
    const assetsMap = {};
    for (const asset of assetRows) {
      if (!assetsMap[asset.content_id]) assetsMap[asset.content_id] = [];
      if (!assetsMap[asset.content_id].some((a) => a.id === asset.id)) {
        assetsMap[asset.content_id].push(asset);
      }
    }

    for (const item of rows) {
      item.platforms = platformsMap[item.content_id] || [];
      const itemAssets = assetsMap[item.content_id] || [];
      item.mediaAssets = itemAssets;
      item.mediaUrl = itemAssets.length > 0 ? itemAssets[0].file_url : null;
      item.media = itemAssets.length > 0 ? {
        id: itemAssets[0].id,
        type: (itemAssets[0].file_type || '').toLowerCase() === 'video' || (itemAssets[0].mime_type && itemAssets[0].mime_type.startsWith('video/')) ? 'video' : 'image',
        mimeType: itemAssets[0].mime_type,
        url: itemAssets[0].file_url,
        thumbnailUrl: itemAssets[0].file_url,
        fileName: itemAssets[0].file_name || itemAssets[0].original_filename,
        size: itemAssets[0].file_size ? `${(itemAssets[0].file_size / (1024 * 1024)).toFixed(1)} MB` : 'Media File',
      } : null;
      item.calendarStatus = 'UNSCHEDULED';
    }

    return rows;
  }

  /**
   * Schedule approved content (MySQL Transaction).
   */
  async scheduleContent(currentUser, workspaceId, data) {
    this.enforceManagerOrTeamRole(currentUser);

    const { contentId, id, scheduledAt, date, time, timezone } = data;
    const targetContentId = contentId || id;

    if (!targetContentId) {
      const error = new Error('Content ID is required to schedule.');
      error.status = 400;
      throw error;
    }

    const [contents] = await db.execute(
      'SELECT id, title, client_id, assigned_to, created_by, status FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [targetContentId, workspaceId]
    );

    if (contents.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    const contentItem = contents[0];

    // APPROVAL RULE: Only APPROVED (or already SCHEDULED) content can be scheduled
    if (contentItem.status !== 'APPROVED' && contentItem.status !== 'SCHEDULED') {
      const error = new Error(`Only APPROVED content can be scheduled. Current status: ${contentItem.status}`);
      error.status = 400;
      throw error;
    }

    let scheduledDateTime = scheduledAt;
    if (!scheduledDateTime && date) {
      scheduledDateTime = time ? `${date} ${time}` : `${date} 12:00:00`;
    }

    if (!scheduledDateTime) {
      const error = new Error('Scheduled date/time is required.');
      error.status = 400;
      throw error;
    }

    const tz = timezone || 'UTC';
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Update content record: status = SCHEDULED, scheduled_at
      await connection.execute(
        'UPDATE content SET status = "SCHEDULED", scheduled_at = ?, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [scheduledDateTime, targetContentId, workspaceId]
      );

      // 2. Update content_platforms status = SCHEDULED, scheduled_at
      await connection.execute(
        'UPDATE content_platforms SET status = "SCHEDULED", scheduled_at = ? WHERE content_id = ?',
        [scheduledDateTime, targetContentId]
      );

      // 3. Upsert calendar_events record
      const [existingEvents] = await connection.execute(
        'SELECT id FROM calendar_events WHERE content_id = ? AND workspace_id = ? AND deleted_at IS NULL',
        [targetContentId, workspaceId]
      );

      if (existingEvents.length > 0) {
        await connection.execute(
          `UPDATE calendar_events
           SET start_time = ?, timezone = ?, status = 'SCHEDULED', updated_at = NOW()
           WHERE id = ?`,
          [scheduledDateTime, tz, existingEvents[0].id]
        );
      } else {
        await connection.execute(
          `INSERT INTO calendar_events (workspace_id, client_id, content_id, created_by, title, event_type, start_time, timezone, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'POST_SCHEDULE', ?, ?, 'SCHEDULED', NOW())`,
          [workspaceId, contentItem.client_id, targetContentId, currentUser.id, contentItem.title, scheduledDateTime, tz]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Log Activity
    await activityService.logActivity({
      workspaceId,
      clientId: contentItem.client_id,
      userId: currentUser.id,
      entityType: 'CONTENT',
      entityId: targetContentId,
      action: 'CONTENT_SCHEDULED',
      description: `${currentUser.full_name || 'User'} scheduled "${contentItem.title}" for ${scheduledDateTime}.`,
    });

    // Notify assigned team member
    const recipientId = contentItem.assigned_to || contentItem.created_by;
    if (recipientId && recipientId !== currentUser.id) {
      await notificationService.createNotification({
        userId: recipientId,
        workspaceId,
        relatedContentId: targetContentId,
        title: 'Content Scheduled 📅',
        message: `Content "${contentItem.title}" has been scheduled for ${scheduledDateTime}.`,
        type: 'CALENDAR_EVENT',
        link: '/workspace/calendar',
      });
    }

    return {
      success: true,
      message: 'Content scheduled successfully.',
      contentId: parseInt(targetContentId, 10),
      scheduledAt: scheduledDateTime,
      timezone: tz,
      status: 'SCHEDULED',
    };
  }


  /**
   * Reschedule existing content / event (Drag & Drop or Modal update).
   * Updates existing schedule without creating duplicate records.
   */
  async updateSchedule(currentUser, workspaceId, id, data) {
    this.enforceManagerOrTeamRole(currentUser);

    const { scheduledAt, date, time, timezone } = data;

    // Check if id is content_id or event_id
    let contentId = id;
    const [contents] = await db.execute(
      'SELECT id FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [id, workspaceId]
    );

    if (contents.length === 0) {
      const [events] = await db.execute(
        'SELECT content_id FROM calendar_events WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
        [id, workspaceId]
      );
      if (events.length === 0 || !events[0].content_id) {
        const error = new Error('Scheduled content or event not found.');
        error.status = 404;
        throw error;
      }
      contentId = events[0].content_id;
    }

    return this.scheduleContent(currentUser, workspaceId, {
      contentId,
      scheduledAt,
      date,
      time,
      timezone,
    });
  }

  /**
   * Unschedule content -> returns content status to APPROVED / UNSCHEDULED.
   */
  async unscheduleContent(currentUser, workspaceId, id) {
    this.enforceManagerOrTeamRole(currentUser);

    let contentId = id;
    const [contents] = await db.execute(
      'SELECT id FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [id, workspaceId]
    );

    if (contents.length === 0) {
      const [events] = await db.execute(
        'SELECT content_id FROM calendar_events WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
        [id, workspaceId]
      );
      if (events.length > 0 && events[0].content_id) {
        contentId = events[0].content_id;
      } else {
        const error = new Error('Scheduled content not found.');
        error.status = 404;
        throw error;
      }
    }

    // 1. Reset content status to APPROVED, clear scheduled_at
    await db.execute(
      'UPDATE content SET status = "APPROVED", scheduled_at = NULL, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
      [contentId, workspaceId]
    );

    // 2. Reset content_platforms status to PENDING
    await db.execute(
      'UPDATE content_platforms SET status = "PENDING", scheduled_at = NULL WHERE content_id = ?',
      [contentId]
    );

    // 3. Soft-delete associated calendar event
    await db.execute(
      'UPDATE calendar_events SET deleted_at = NOW() WHERE content_id = ? AND workspace_id = ?',
      [contentId, workspaceId]
    );

    return {
      success: true,
      message: 'Content unscheduled and returned to APPROVED / UNSCHEDULED queue.',
      contentId: parseInt(contentId, 10),
      status: 'APPROVED',
      calendarStatus: 'UNSCHEDULED',
    };
  }

  /**
   * Mark content as PUBLISHED after manual agency publishing on social platforms.
   */
  async markPublished(currentUser, workspaceId, contentId) {
    this.enforceManagerOrTeamRole(currentUser);

    const [contents] = await db.execute(
      'SELECT id FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [contentId, workspaceId]
    );

    if (contents.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    // 1. Update content record
    await db.execute(
      'UPDATE content SET status = "PUBLISHED", published_at = NOW(), updated_at = NOW() WHERE id = ?',
      [contentId]
    );

    // 2. Update content_platforms
    await db.execute(
      'UPDATE content_platforms SET status = "PUBLISHED", published_at = NOW() WHERE content_id = ?',
      [contentId]
    );

    // 3. Update calendar_events status = COMPLETED
    await db.execute(
      'UPDATE calendar_events SET status = "COMPLETED", updated_at = NOW() WHERE content_id = ?',
      [contentId]
    );

    return {
      success: true,
      message: 'Content marked as PUBLISHED successfully.',
      contentId: parseInt(contentId, 10),
      status: 'PUBLISHED',
    };
  }
}

module.exports = new CalendarService();
