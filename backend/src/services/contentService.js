const { db, pool } = require('../config/database');
const notificationService = require('./notificationService');
const activityService = require('./activityService');

class ContentService {
  /**
   * Helper to normalize platform name strings (e.g. 'instagram' -> 'INSTAGRAM', 'x' -> 'X').
   */
  normalizePlatform(p) {
    if (!p) return null;
    const str = p.toString().toUpperCase().trim();
    if (str === 'TWITTER' || str === 'X') return 'X';
    return str;
  }

  /**
   * Helper to extract numerical asset IDs from various request formats (assetId, assetIds, mediaAssetIds, mediaAssets, mediaUrl).
   */
  extractAssetIds(data) {
    let ids = [];
    if (Array.isArray(data.mediaAssetIds) && data.mediaAssetIds.length > 0) {
      ids = data.mediaAssetIds;
    } else if (Array.isArray(data.assetIds) && data.assetIds.length > 0) {
      ids = data.assetIds;
    } else if (Array.isArray(data.mediaAssets) && data.mediaAssets.length > 0) {
      ids = data.mediaAssets.map((m) => (typeof m === 'object' ? m.id || m.asset_id : m)).filter(Boolean);
    } else if (data.assetId !== undefined && data.assetId !== null && data.assetId !== '') {
      ids = [data.assetId];
    } else if (data.mediaUrl && typeof data.mediaUrl === 'string') {
      const match = data.mediaUrl.match(/\/api\/assets\/(\d+)\/file/);
      if (match) {
        ids = [match[1]];
      }
    }

    return ids
      .map((val) => parseInt(val, 10))
      .filter((id) => !isNaN(id) && id > 0);
  }

  /**
   * Create content item + multi-platform relations.
   */
  async createContent(creatorUser, workspaceId, data) {
    const {
      title,
      caption,
      bodyText,
      contentType,
      clientId,
      projectId,
      assignedTo,
      reviewerId,
      dueDate,
      status,
      internalNotes,
      platforms,
    } = data;

    if (!title || !clientId) {
      const error = new Error('Title and client ID are required.');
      error.status = 400;
      throw error;
    }

    // Client security check: If user is client, ensure client_id matches their client access
    if (creatorUser.role === 'client_user' || creatorUser.role === 'client') {
      const [userClient] = await db.execute(
        'SELECT client_id FROM client_team WHERE user_id = ? AND client_id = ?',
        [creatorUser.id, clientId]
      );
      if (userClient.length === 0) {
        const error = new Error('Permission denied. Clients cannot create content for other clients.');
        error.status = 403;
        throw error;
      }
    }

    // Verify client belongs to workspace and retrieve name
    const [clients] = await db.execute(
      'SELECT id, name, company_name FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [clientId, workspaceId]
    );
    if (clients.length === 0) {
      const error = new Error('Client not found or does not belong to your workspace.');
      error.status = 404;
      throw error;
    }
    const clientObj = clients[0];
    const clientName = clientObj.name || clientObj.company_name || 'Client';

    // Verify project if provided
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

    // Verify assigned user if provided
    if (assignedTo) {
      const [users] = await db.execute(
        `SELECT u.id, u.full_name
         FROM users u
         JOIN workspace_users wu ON u.id = wu.user_id
         WHERE u.id = ? AND wu.workspace_id = ? AND u.deleted_at IS NULL`,
        [assignedTo, workspaceId]
      );
      if (users.length === 0) {
        const error = new Error('Assigned user does not belong to your workspace.');
        error.status = 400;
        throw error;
      }
    }

    const contentStatus = status || 'DRAFT';
    const cType = contentType || 'POST';
    const finalCaption = caption || bodyText || null;

    const connection = await pool.getConnection();
    let contentId;

    try {
      await connection.beginTransaction();

      // Insert content record
      const [result] = await connection.execute(
        `INSERT INTO content (workspace_id, client_id, project_id, created_by, assigned_to, reviewer_id, title, caption, body_text, content_type, internal_notes, status, due_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          workspaceId,
          clientId,
          projectId || null,
          creatorUser.id,
          assignedTo || null,
          reviewerId || null,
          title.trim(),
          finalCaption,
          finalCaption,
          cType,
          internalNotes || null,
          contentStatus,
          dueDate || null,
        ]
      );

      contentId = result.insertId;

      // Link uploaded media assets if provided
      let assetIds = this.extractAssetIds(data);

      // Fallback: If no asset ID was explicitly passed, check for recent unlinked asset in workspace
      if (assetIds.length === 0) {
        const [recentUnlinked] = await connection.execute(
          `SELECT id FROM assets
           WHERE workspace_id = ? AND uploaded_by = ? AND content_id IS NULL AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL 5 MINUTE
           ORDER BY created_at DESC LIMIT 1`,
          [workspaceId, creatorUser.id]
        );
        if (recentUnlinked.length > 0) {
          assetIds = [recentUnlinked[0].id];
        }
      }

      for (const aId of assetIds) {
        if (aId && !isNaN(aId)) {
          await connection.execute(
            `INSERT INTO content_assets (content_id, asset_id, created_at)
             VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE asset_id = VALUES(asset_id)`,
            [contentId, aId]
          );
          await connection.execute('UPDATE assets SET content_id = ? WHERE id = ? AND workspace_id = ?', [contentId, aId, workspaceId]);
        }
      }

      // Insert multi-platform records in content_platforms
      if (Array.isArray(platforms) && platforms.length > 0) {
        for (const rawP of platforms) {
          const normP = this.normalizePlatform(rawP);
          if (normP) {
            await connection.execute(
              `INSERT INTO content_platforms (content_id, platform, status, created_at)
               VALUES (?, ?, 'PENDING', NOW())
               ON DUPLICATE KEY UPDATE platform = VALUES(platform)`,
              [contentId, normP]
            );
          }
        }
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
      clientId,
      userId: creatorUser.id,
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'CONTENT_CREATED',
      description: `${creatorUser.full_name || 'User'} created content "${title.trim()}".`,
      isInternal: true,
    });

    // Create Notification for assigned team member
    if (assignedTo) {
      await notificationService.createNotification({
        userId: assignedTo,
        workspaceId,
        relatedContentId: contentId,
        title: 'New Content Assigned to You',
        message: `Content "${title.trim()}" for ${clientName} was assigned to you by ${creatorUser.full_name || 'Workspace Manager'}.`,
        type: 'CONTENT_ASSIGNED',
        link: '/workspace/content',
      });
    }

    return this.getContent(workspaceId, contentId, creatorUser);
  }


  /**
   * List content items with filtering & target platforms list.
   */
  async listContent(workspaceId, filters = {}) {
    const { clientId, projectId, status, platform, assignedTo, contentType, date, search, page, limit, currentUser } = filters;

    let query = `
      SELECT c.id, c.workspace_id, c.client_id, c.project_id, c.created_by, c.assigned_to, c.reviewer_id,
             c.title, c.caption, c.content_type, c.internal_notes, c.status, c.due_date, c.scheduled_at, c.published_at, c.created_at,
             cli.name as client_name, cli.company_name as client_company_name,
             p.name as project_name,
             u_creator.full_name as creator_name,
             u_assignee.full_name as assignee_name, u_assignee.avatar_url as assignee_avatar,
             u_reviewer.full_name as reviewer_name
      FROM content c
      JOIN clients cli ON c.client_id = cli.id
      LEFT JOIN projects p ON c.project_id = p.id
      JOIN users u_creator ON c.created_by = u_creator.id
      LEFT JOIN users u_assignee ON c.assigned_to = u_assignee.id
      LEFT JOIN users u_reviewer ON c.reviewer_id = u_reviewer.id
    `;

    const whereClauses = ['c.workspace_id = ?', 'c.deleted_at IS NULL'];
    const params = [workspaceId];

    const isAll = (val) => !val || String(val).trim().toLowerCase() === 'all';

    if (!isAll(platform)) {
      const normP = this.normalizePlatform(platform);
      query += ' JOIN content_platforms cp ON c.id = cp.content_id';
      whereClauses.push('cp.platform = ?');
      params.push(normP);
    }

    if (!isAll(clientId)) {
      whereClauses.push('c.client_id = ?');
      params.push(clientId);
    }

    if (!isAll(projectId)) {
      whereClauses.push('c.project_id = ?');
      params.push(projectId);
    }

    if (!isAll(status)) {
      whereClauses.push('c.status = ?');
      params.push(status.toUpperCase());
    }

    if (!isAll(assignedTo)) {
      whereClauses.push('c.assigned_to = ?');
      params.push(assignedTo);
    }

    if (!isAll(contentType)) {
      whereClauses.push('c.content_type = ?');
      params.push(contentType);
    }

    if (date) {
      whereClauses.push('DATE(c.due_date) = DATE(?)');
      params.push(date);
    }

    if (search) {
      whereClauses.push('(c.title LIKE ? OR c.caption LIKE ? OR cli.name LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 100;
    const offset = (pageNum - 1) * limitNum;

    query += ' WHERE ' + whereClauses.join(' AND ') + ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return [];
    }

    const contentIds = rows.map((r) => r.id);
    const inPlaceholders = contentIds.map(() => '?').join(',');

    // 1. Bulk query platforms in ONE fast indexed query
    const [cpRows] = await db.query(
      `SELECT content_id, platform, status FROM content_platforms WHERE content_id IN (${inPlaceholders})`,
      contentIds
    );
    const platformsMap = {};
    for (const cp of cpRows) {
      if (!platformsMap[cp.content_id]) platformsMap[cp.content_id] = [];
      platformsMap[cp.content_id].push(cp.platform);
    }

    // 2. Bulk query assets in ONE fast indexed UNION query
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
      // Prevent duplicate asset mapping for same content item
      if (!assetsMap[asset.content_id].some((a) => a.id === asset.id)) {
        assetsMap[asset.content_id].push(asset);
      }
    }

    // 3. Attach relationships in memory (O(1) lookups)
    for (const item of rows) {
      item.platforms = platformsMap[item.id] || [];
      const itemAssets = assetsMap[item.id] || [];
      item.mediaAssets = itemAssets;
      item.media_assets = itemAssets;
      item.mediaUrl = itemAssets.length > 0 ? itemAssets[0].file_url : null;
      item.media_url = itemAssets.length > 0 ? itemAssets[0].file_url : null;
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
   * Get single content details.
   */
  async getContent(workspaceId, contentId, currentUser) {
    const [rows] = await db.execute(
      `SELECT c.id, c.workspace_id, c.client_id, c.project_id, c.created_by, c.assigned_to, c.reviewer_id,
              c.title, c.caption, c.content_type, c.internal_notes, c.status, c.due_date, c.scheduled_at, c.published_at, c.created_at,
              cli.name as client_name, cli.company_name as client_company_name,
              p.name as project_name,
              u_creator.full_name as creator_name,
              u_assignee.full_name as assignee_name, u_assignee.avatar_url as assignee_avatar,
              u_reviewer.full_name as reviewer_name
       FROM content c
       JOIN clients cli ON c.client_id = cli.id
       LEFT JOIN projects p ON c.project_id = p.id
       JOIN users u_creator ON c.created_by = u_creator.id
       LEFT JOIN users u_assignee ON c.assigned_to = u_assignee.id
       LEFT JOIN users u_reviewer ON c.reviewer_id = u_reviewer.id
       WHERE c.workspace_id = ? AND c.id = ? AND c.deleted_at IS NULL`,
      [workspaceId, contentId]
    );

    if (rows.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    const item = rows[0];

    // Fetch target platforms
    const [cpRows] = await db.execute('SELECT platform, status, scheduled_at, published_at FROM content_platforms WHERE content_id = ?', [contentId]);
    item.platforms = cpRows.map((row) => row.platform);
    item.platformDetails = cpRows;

    // Fetch attached media assets
    const [assetRows] = await db.execute(
      `SELECT a.id, a.file_name, a.original_filename, a.file_url, a.file_type, a.file_size, a.mime_type
       FROM assets a
       WHERE (a.id IN (SELECT asset_id FROM content_assets WHERE content_id = ?)
              OR (a.content_id = ? AND NOT EXISTS (SELECT 1 FROM content_assets WHERE content_id = ?)))
         AND a.deleted_at IS NULL
       ORDER BY a.created_at DESC`,
      [contentId, contentId, contentId]
    );
    item.mediaAssets = assetRows;
    item.media_assets = assetRows;
    item.mediaUrl = assetRows.length > 0 ? assetRows[0].file_url : null;
    item.media_url = assetRows.length > 0 ? assetRows[0].file_url : null;
    item.media = assetRows.length > 0 ? {
      id: assetRows[0].id,
      type: (assetRows[0].file_type || '').toLowerCase() === 'video' || (assetRows[0].mime_type && assetRows[0].mime_type.startsWith('video/')) ? 'video' : 'image',
      mimeType: assetRows[0].mime_type,
      url: assetRows[0].file_url,
      thumbnailUrl: assetRows[0].file_url,
      fileName: assetRows[0].file_name || assetRows[0].original_filename,
      size: assetRows[0].file_size ? `${(assetRows[0].file_size / (1024 * 1024)).toFixed(1)} MB` : 'Media File',
    } : null;

    return item;
  }


  /**
   * Update content details.
   */
  async updateContent(currentUser, workspaceId, contentId, data) {
    const item = await this.getContent(workspaceId, contentId, currentUser);

    // Client Security restriction: Client role cannot edit internal fields unless allowed
    if (currentUser.role === 'client_user' || currentUser.role === 'client') {
      if (item.status === 'APPROVED' || item.status === 'PUBLISHED') {
        const error = new Error('Permission denied. Clients cannot edit content that is approved or published.');
        error.status = 403;
        throw error;
      }
    }

    const {
      title,
      caption,
      contentType,
      clientId,
      projectId,
      assignedTo,
      reviewerId,
      dueDate,
      status,
      internalNotes,
      platforms,
    } = data;

    const finalCaption = caption !== undefined ? caption : item.caption;

    await db.execute(
      `UPDATE content
       SET title = COALESCE(?, title),
           caption = COALESCE(?, caption),
           body_text = COALESCE(?, body_text),
           content_type = COALESCE(?, content_type),
           client_id = COALESCE(?, client_id),
           project_id = COALESCE(?, project_id),
           assigned_to = COALESCE(?, assigned_to),
           reviewer_id = COALESCE(?, reviewer_id),
           due_date = COALESCE(?, due_date),
           status = COALESCE(?, status),
           internal_notes = COALESCE(?, internal_notes),
           updated_at = NOW()
       WHERE id = ? AND workspace_id = ?`,
      [
        title || null,
        finalCaption || null,
        finalCaption || null,
        contentType || null,
        clientId || null,
        projectId || null,
        assignedTo || null,
        reviewerId || null,
        dueDate || null,
        status || null,
        internalNotes || null,
        contentId,
        workspaceId,
      ]
    );

    // Update platforms if provided
    if (Array.isArray(platforms)) {
      await db.execute('DELETE FROM content_platforms WHERE content_id = ?', [contentId]);
      for (const rawP of platforms) {
        const normP = this.normalizePlatform(rawP);
        if (normP) {
          await db.execute(
            `INSERT INTO content_platforms (content_id, platform, status, created_at)
             VALUES (?, ?, 'PENDING', NOW())`,
            [contentId, normP]
          );
        }
      }
    }

    // Update media assets if provided
    const newAssetIds = this.extractAssetIds(data);
    if (newAssetIds.length > 0 || data.mediaAssetIds !== undefined || data.assetIds !== undefined || data.assetId !== undefined || data.mediaAssets !== undefined) {
      await db.execute('DELETE FROM content_assets WHERE content_id = ?', [contentId]);
      await db.execute('UPDATE assets SET content_id = NULL WHERE content_id = ? AND workspace_id = ?', [contentId, workspaceId]);
      for (const aId of newAssetIds) {
        if (aId && !isNaN(aId)) {
          await db.execute(
            `INSERT INTO content_assets (content_id, asset_id, created_at)
             VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE asset_id = VALUES(asset_id)`,
            [contentId, aId]
          );
          await db.execute('UPDATE assets SET content_id = ? WHERE id = ? AND workspace_id = ?', [contentId, aId, workspaceId]);
        }
      }
    }

    return this.getContent(workspaceId, contentId, currentUser);
  }


  /**
   * Update content status.
   */
  async updateContentStatus(currentUser, workspaceId, contentId, status) {
    const validStatuses = [
      'DRAFT',
      'IN_PROGRESS',
      'INTERNAL_REVIEW',
      'CLIENT_REVIEW',
      'REVISION_REQUIRED',
      'APPROVED',
      'SCHEDULED',
      'PUBLISHED',
      'REJECTED',
    ];

    if (!validStatuses.includes(status)) {
      const error = new Error(`Invalid content status. Allowed: ${validStatuses.join(', ')}`);
      error.status = 400;
      throw error;
    }

    const item = await this.getContent(workspaceId, contentId, currentUser);

    // 1. Creator self-approval restriction
    if (status === 'APPROVED' && item.created_by === currentUser.id && currentUser.role !== 'workspace_manager' && currentUser.role !== 'superadmin') {
      const error = new Error('Permission denied. Content creators cannot approve their own content.');
      error.status = 403;
      throw error;
    }

    // 2. Scheduling restriction: Only approved content can be scheduled
    if (status === 'SCHEDULED' && item.status !== 'APPROVED') {
      const error = new Error('Only approved content can be scheduled.');
      error.status = 400;
      throw error;
    }

    await db.execute(
      'UPDATE content SET status = ?, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
      [status, contentId, workspaceId]
    );

    return { success: true, contentId: parseInt(contentId, 10), status };
  }

  /**
   * Delete content (soft delete).
   */
  async deleteContent(workspaceId, contentId) {
    const [rows] = await db.execute('SELECT id FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL', [contentId, workspaceId]);
    if (rows.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    await db.execute('UPDATE content SET deleted_at = NOW() WHERE id = ? AND workspace_id = ?', [contentId, workspaceId]);
    return { success: true, message: 'Content item deleted successfully.', contentId: parseInt(contentId, 10) };
  }
}

module.exports = new ContentService();
