const { db } = require('../config/database');

class CollaborationService {
  // --- VERSIONING METHODS ---

  /**
   * Create a new content version snapshot.
   */
  async createVersion(currentUser, workspaceId, contentId, { title, caption, bodyText, mediaAssets }) {
    const [contents] = await db.execute(
      'SELECT id, title, caption, body_text FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [contentId, workspaceId]
    );

    if (contents.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    const currentContent = contents[0];
    const versionTitle = title || currentContent.title;
    const versionBody = caption || bodyText || currentContent.caption || currentContent.body_text;

    // Get next version number
    const [maxRows] = await db.execute(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM content_versions WHERE content_id = ?',
      [contentId]
    );
    const versionNumber = maxRows[0].next_version;

    const [result] = await db.execute(
      `INSERT INTO content_versions (content_id, created_by, version_number, title, body_text, media_assets, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        contentId,
        currentUser.id,
        versionNumber,
        versionTitle,
        versionBody,
        mediaAssets ? JSON.stringify(mediaAssets) : null,
      ]
    );

    const versionId = result.insertId;
    return this.getVersion(workspaceId, contentId, versionId);
  }

  /**
   * List version history for a content item.
   */
  async listVersions(workspaceId, contentId) {
    const [contents] = await db.execute(
      'SELECT id FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [contentId, workspaceId]
    );

    if (contents.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    const [rows] = await db.execute(
      `SELECT cv.id, cv.content_id, cv.version_number, cv.title, cv.body_text as caption, cv.media_assets, cv.created_at,
              u.full_name as creator_name, u.avatar_url as creator_avatar
       FROM content_versions cv
       JOIN users u ON cv.created_by = u.id
       WHERE cv.content_id = ?
       ORDER BY cv.version_number DESC`,
      [contentId]
    );

    return rows;
  }

  /**
   * Get specific version details.
   */
  async getVersion(workspaceId, contentId, versionId) {
    const [rows] = await db.execute(
      `SELECT cv.id, cv.content_id, cv.version_number, cv.title, cv.body_text as caption, cv.media_assets, cv.created_at,
              u.full_name as creator_name, u.avatar_url as creator_avatar
       FROM content_versions cv
       JOIN users u ON cv.created_by = u.id
       WHERE cv.content_id = ? AND cv.id = ?`,
      [contentId, versionId]
    );

    if (rows.length === 0) {
      const error = new Error('Version not found.');
      error.status = 404;
      throw error;
    }

    return rows[0];
  }

  /**
   * Restore content to a historical version.
   */
  async restoreVersion(currentUser, workspaceId, contentId, versionId) {
    const targetVersion = await this.getVersion(workspaceId, contentId, versionId);

    // Update content table to match target version
    await db.execute(
      `UPDATE content
       SET title = ?, caption = ?, body_text = ?, updated_at = NOW()
       WHERE id = ? AND workspace_id = ?`,
      [targetVersion.title, targetVersion.caption, targetVersion.caption, contentId, workspaceId]
    );

    // Create a new version snapshot reflecting the restored state
    const newVersion = await this.createVersion(currentUser, workspaceId, contentId, {
      title: targetVersion.title,
      caption: targetVersion.caption,
      mediaAssets: targetVersion.media_assets,
    });

    return {
      success: true,
      message: `Content restored to Version ${targetVersion.version_number} successfully.`,
      restoredFromVersion: targetVersion.version_number,
      newVersionNumber: newVersion.version_number,
    };
  }

  // --- COMMENTS METHODS ---

  /**
   * Create comment on content item.
   */
  async createComment(currentUser, workspaceId, contentId, { commentText, comment, commentType, isInternal, parentId }) {
    const text = commentText || comment;
    if (!text || !text.trim()) {
      const error = new Error('Comment text is required.');
      error.status = 400;
      throw error;
    }

    const [contents] = await db.execute(
      'SELECT id FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [contentId, workspaceId]
    );

    if (contents.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    // Determine comment_type: CLIENT users cannot post INTERNAL comments
    const isClientRole = currentUser.role === 'client_user' || currentUser.role === 'client';
    let type = commentType ? commentType.toString().toUpperCase() : isInternal ? 'INTERNAL' : 'CLIENT';
    if (isClientRole) {
      type = 'CLIENT';
    }

    const flagInternal = type === 'INTERNAL' ? 1 : 0;

    const [result] = await db.execute(
      `INSERT INTO content_comments (content_id, user_id, parent_id, comment_text, comment_type, is_internal, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [contentId, currentUser.id, parentId || null, text.trim(), type, flagInternal]
    );

    const commentId = result.insertId;

    const [rows] = await db.execute(
      `SELECT cc.id, cc.content_id, cc.user_id, cc.parent_id, cc.comment_text, cc.comment_type, cc.is_internal, cc.created_at,
              u.full_name as author_name, u.avatar_url as author_avatar, r.name as author_role
       FROM content_comments cc
       JOIN users u ON cc.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE cc.id = ?`,
      [commentId]
    );

    return rows[0];
  }

  /**
   * List comments for content item with Privacy Filtering.
   */
  async listComments(currentUser, workspaceId, contentId) {
    const [contents] = await db.execute(
      'SELECT id FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [contentId, workspaceId]
    );

    if (contents.length === 0) {
      const error = new Error('Content item not found.');
      error.status = 404;
      throw error;
    }

    let query = `
      SELECT cc.id, cc.content_id, cc.user_id, cc.parent_id, cc.comment_text, cc.comment_type, cc.is_internal, cc.created_at, cc.updated_at,
             u.full_name as author_name, u.avatar_url as author_avatar, r.name as author_role
      FROM content_comments cc
      JOIN users u ON cc.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE cc.content_id = ? AND cc.deleted_at IS NULL
    `;
    const params = [contentId];

    // PRIVACY SECURITY GUARD: Client users must NEVER receive INTERNAL comments!
    const isClientRole = currentUser.role === 'client_user' || currentUser.role === 'client';
    if (isClientRole) {
      query += " AND cc.comment_type != 'INTERNAL' AND cc.is_internal = 0";
    }

    query += ' ORDER BY cc.created_at ASC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * Update comment text.
   */
  async updateComment(currentUser, workspaceId, commentId, { commentText, comment }) {
    const text = commentText || comment;
    if (!text || !text.trim()) {
      const error = new Error('Comment text is required.');
      error.status = 400;
      throw error;
    }

    const [rows] = await db.execute(
      'SELECT cc.id, cc.user_id, cc.content_id FROM content_comments cc WHERE cc.id = ? AND cc.deleted_at IS NULL',
      [commentId]
    );

    if (rows.length === 0) {
      const error = new Error('Comment not found.');
      error.status = 404;
      throw error;
    }

    const targetComment = rows[0];

    // Authorization: User can edit their own comment; Managers can moderate
    const isManager = currentUser.role === 'superadmin' || currentUser.role === 'workspace_manager';
    if (!isManager && targetComment.user_id !== currentUser.id) {
      const error = new Error('Permission denied. You can only edit your own comments.');
      error.status = 403;
      throw error;
    }

    await db.execute(
      'UPDATE content_comments SET comment_text = ?, updated_at = NOW() WHERE id = ?',
      [text.trim(), commentId]
    );

    const [updatedRows] = await db.execute(
      `SELECT cc.id, cc.content_id, cc.user_id, cc.parent_id, cc.comment_text, cc.comment_type, cc.is_internal, cc.created_at, cc.updated_at,
              u.full_name as author_name, u.avatar_url as author_avatar
       FROM content_comments cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.id = ?`,
      [commentId]
    );

    return updatedRows[0];
  }

  /**
   * Delete comment (soft delete).
   */
  async deleteComment(currentUser, workspaceId, commentId) {
    const [rows] = await db.execute(
      'SELECT cc.id, cc.user_id FROM content_comments cc WHERE cc.id = ? AND cc.deleted_at IS NULL',
      [commentId]
    );

    if (rows.length === 0) {
      const error = new Error('Comment not found.');
      error.status = 404;
      throw error;
    }

    const targetComment = rows[0];

    const isManager = currentUser.role === 'superadmin' || currentUser.role === 'workspace_manager';
    if (!isManager && targetComment.user_id !== currentUser.id) {
      const error = new Error('Permission denied. You can only delete your own comments.');
      error.status = 403;
      throw error;
    }

    await db.execute('UPDATE content_comments SET deleted_at = NOW() WHERE id = ?', [commentId]);

    return {
      success: true,
      message: 'Comment deleted successfully.',
      commentId: parseInt(commentId, 10),
    };
  }
}

module.exports = new CollaborationService();
