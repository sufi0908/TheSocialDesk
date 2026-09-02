const { db } = require('../config/database');
const notificationService = require('./notificationService');

class ChatService {
  /**
   * Helper to normalize a message into a single canonical structure
   * containing both camelCase and snake_case properties for 100% frontend compatibility.
   */
  normalizeMessage(rawMsg, attachments = [], reactions = []) {
    if (!rawMsg) return null;

    const id = Number(rawMsg.id);
    const groupId = Number(rawMsg.group_id || rawMsg.groupId);
    const senderId = Number(rawMsg.sender_id || rawMsg.senderId);
    const senderName = rawMsg.sender_name || rawMsg.senderName || 'Team Member';
    const senderAvatar = rawMsg.sender_avatar || rawMsg.senderAvatar || '';
    const senderRole = rawMsg.sender_role || rawMsg.senderRole || '';
    const messageType = rawMsg.message_type || rawMsg.messageType || 'TEXT';
    const messageText = rawMsg.message !== undefined && rawMsg.message !== null ? String(rawMsg.message) : '';

    const normalizedAttachments = (attachments || []).map((att) => {
      const attId = Number(att.id);
      const assetId = att.asset_id ? Number(att.asset_id) : null;
      const fileName = att.file_name || att.fileName || 'attachment';
      const fileSize = Number(att.file_size || att.fileSize || 0);
      const mimeType = att.mime_type || att.mimeType || 'application/octet-stream';
      const storagePath = (att.storage_path || att.storagePath || '').replace(/\\/g, '/');
      const duration = att.duration !== undefined && att.duration !== null ? Number(att.duration) : null;

      const url = assetId
        ? `/api/assets/${assetId}/file`
        : storagePath
        ? `/api/chat/files/view?path=${encodeURIComponent(storagePath)}`
        : '';

      return {
        id: attId,
        messageId: id,
        message_id: id,
        assetId,
        asset_id: assetId,
        fileName,
        file_name: fileName,
        fileSize,
        file_size: fileSize,
        mimeType,
        mime_type: mimeType,
        storagePath,
        storage_path: storagePath,
        url,
        thumbnailUrl: mimeType.startsWith('image/') ? url : null,
        thumbnail_url: mimeType.startsWith('image/') ? url : null,
        duration,
      };
    });

    const normalizedReactions = (reactions || []).map((r) => ({
      id: Number(r.id),
      messageId: id,
      message_id: id,
      userId: Number(r.user_id || r.userId),
      user_id: Number(r.user_id || r.userId),
      userName: r.full_name || r.userName || 'User',
      full_name: r.full_name || r.userName || 'User',
      reaction: r.reaction,
      createdAt: r.created_at || r.createdAt,
      created_at: r.created_at || r.createdAt,
    }));

    const replyToId = rawMsg.reply_to_message_id ? Number(rawMsg.reply_to_message_id) : null;
    const replyTo = replyToId
      ? {
          id: replyToId,
          message: rawMsg.reply_message || '',
          senderName: rawMsg.reply_sender_name || 'Member',
          sender_name: rawMsg.reply_sender_name || 'Member',
        }
      : null;

    return {
      id,
      groupId,
      group_id: groupId,
      senderId,
      sender_id: senderId,
      senderName,
      sender_name: senderName,
      senderAvatar,
      sender_avatar: senderAvatar,
      senderRole,
      sender_role: senderRole,
      messageType,
      message_type: messageType,
      message: messageText,
      contentId: rawMsg.content_id ? Number(rawMsg.content_id) : null,
      content_id: rawMsg.content_id ? Number(rawMsg.content_id) : null,
      contentTitle: rawMsg.content_title || null,
      content_title: rawMsg.content_title || null,
      contentPlatform: rawMsg.content_platform || null,
      content_platform: rawMsg.content_platform || null,
      contentStatus: rawMsg.content_status || null,
      content_status: rawMsg.content_status || null,
      taskId: rawMsg.task_id ? Number(rawMsg.task_id) : null,
      task_id: rawMsg.task_id ? Number(rawMsg.task_id) : null,
      taskTitle: rawMsg.task_title || null,
      task_title: rawMsg.task_title || null,
      taskStatus: rawMsg.task_status || null,
      task_status: rawMsg.task_status || null,
      taskPriority: rawMsg.task_priority || null,
      task_priority: rawMsg.task_priority || null,
      assetId: rawMsg.asset_id ? Number(rawMsg.asset_id) : null,
      asset_id: rawMsg.asset_id ? Number(rawMsg.asset_id) : null,
      assetName: rawMsg.asset_name || rawMsg.asset_file_name || null,
      asset_name: rawMsg.asset_name || rawMsg.asset_file_name || null,
      replyToMessageId: replyToId,
      reply_to_message_id: replyToId,
      replyTo,
      reply_to: replyTo,
      isEdited: Boolean(rawMsg.is_edited),
      is_edited: rawMsg.is_edited ? 1 : 0,
      attachments: normalizedAttachments,
      reactions: normalizedReactions,
      createdAt: rawMsg.created_at,
      created_at: rawMsg.created_at,
      updatedAt: rawMsg.updated_at,
      updated_at: rawMsg.updated_at,
    };
  }

  /**
   * List all accessible groups for a user in a workspace with latest message and unread count.
   */
  async getUserGroups(workspaceId, userId, search = '') {
    let query = `
      SELECT 
        cg.id,
        cg.workspace_id,
        cg.name,
        cg.description,
        cg.image,
        cg.group_type,
        cg.created_by,
        cg.created_at,
        cg.updated_at,
        cgm.role as my_role,
        cgm.is_muted,
        cgm.mute_until,
        cgm.is_pinned,
        cgm.joined_at,
        (
          SELECT COUNT(*) 
          FROM chat_group_members 
          WHERE group_id = cg.id AND left_at IS NULL
        ) as member_count,
        (
          SELECT cm.id 
          FROM chat_messages cm 
          WHERE cm.group_id = cg.id AND cm.deleted_at IS NULL 
          ORDER BY cm.id DESC LIMIT 1
        ) as last_message_id,
        (
          SELECT cm.message 
          FROM chat_messages cm 
          WHERE cm.group_id = cg.id AND cm.deleted_at IS NULL 
          ORDER BY cm.id DESC LIMIT 1
        ) as last_message,
        (
          SELECT cm.message_type 
          FROM chat_messages cm 
          WHERE cm.group_id = cg.id AND cm.deleted_at IS NULL 
          ORDER BY cm.id DESC LIMIT 1
        ) as last_message_type,
        (
          SELECT cm.created_at 
          FROM chat_messages cm 
          WHERE cm.group_id = cg.id AND cm.deleted_at IS NULL 
          ORDER BY cm.id DESC LIMIT 1
        ) as last_message_at,
        (
          SELECT u.full_name 
          FROM chat_messages cm 
          JOIN users u ON cm.sender_id = u.id
          WHERE cm.group_id = cg.id AND cm.deleted_at IS NULL 
          ORDER BY cm.id DESC LIMIT 1
        ) as last_message_sender,
        (
          SELECT COUNT(*)
          FROM chat_messages cm
          LEFT JOIN chat_message_reads cmr ON cmr.group_id = cg.id AND cmr.user_id = ?
          WHERE cm.group_id = cg.id 
            AND cm.sender_id != ? 
            AND cm.deleted_at IS NULL
            AND cm.id > COALESCE(cmr.last_read_message_id, 0)
        ) as unread_count
      FROM chat_groups cg
      JOIN chat_group_members cgm ON cg.id = cgm.group_id
      WHERE cg.workspace_id = ? 
        AND cgm.user_id = ? 
        AND cgm.left_at IS NULL 
        AND cg.archived_at IS NULL
    `;

    const params = [userId, userId, workspaceId, userId];

    if (search && search.trim() !== '') {
      query += ` AND (cg.name LIKE ? OR cg.description LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    query += ` ORDER BY cgm.is_pinned DESC, last_message_at DESC, cg.created_at DESC`;

    const [groups] = await db.execute(query, params);
    return groups;
  }

  /**
   * Verify if a user is an active member of a group in a given workspace.
   */
  async verifyGroupMember(workspaceId, userId, groupId) {
    const [rows] = await db.execute(
      `SELECT cgm.id, cgm.role, cgm.is_muted, cgm.mute_until, cgm.is_pinned, cg.workspace_id, cg.archived_at, cg.name as group_name
       FROM chat_group_members cgm
       JOIN chat_groups cg ON cgm.group_id = cg.id
       WHERE cg.id = ? AND cg.workspace_id = ? AND cgm.user_id = ? AND cgm.left_at IS NULL`,
      [groupId, workspaceId, userId]
    );

    if (!rows || rows.length === 0) {
      const err = new Error('Access denied. You are not a member of this chat group.');
      err.status = 403;
      throw err;
    }

    if (rows[0].archived_at) {
      const err = new Error('This chat group has been archived.');
      err.status = 400;
      throw err;
    }

    return rows[0];
  }

  /**
   * Create a new group.
   */
  async createGroup(workspaceId, creatorId, creatorRole, { name, description, image, group_type = 'General', member_ids = [] }) {
    if (!name || name.trim() === '') {
      const err = new Error('Group name is required.');
      err.status = 400;
      throw err;
    }

    const cleanGroupType = ['General', 'Department', 'Project', 'Client Collaboration', 'Announcement', 'Custom'].includes(group_type)
      ? group_type
      : 'General';

    // Verify creator belongs to the workspace
    const uniqueMemberIds = Array.from(new Set([creatorId, ...member_ids.map(Number)])).filter(
      (id) => !isNaN(id) && id > 0
    );

    const [validUsers] = await db.query(
      `SELECT wu.user_id, u.full_name, u.email 
       FROM workspace_users wu
       JOIN users u ON wu.user_id = u.id
       WHERE wu.workspace_id = ? AND wu.user_id IN (?) AND wu.status = 'ACTIVE' AND u.deleted_at IS NULL`,
      [workspaceId, uniqueMemberIds]
    );

    const validUserIds = validUsers.map((u) => u.user_id);
    if (!validUserIds.includes(creatorId)) {
      const err = new Error('Creator does not belong to this workspace.');
      err.status = 403;
      throw err;
    }

    // Insert group into database
    const [result] = await db.execute(
      `INSERT INTO chat_groups (workspace_id, name, description, image, group_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [workspaceId, name.trim(), description ? description.trim() : null, image ? image.trim() : null, cleanGroupType, creatorId]
    );

    const groupId = result.insertId;

    // Insert creator as ADMIN and all other valid members as MEMBER
    const memberValues = validUserIds.map((uid) => [
      groupId,
      uid,
      uid === creatorId ? 'ADMIN' : 'MEMBER',
    ]);

    await db.query(
      `INSERT INTO chat_group_members (group_id, user_id, role) VALUES ?`,
      [memberValues]
    );

    // Fetch creator user details
    const [creator] = await db.execute(`SELECT full_name FROM users WHERE id = ?`, [creatorId]);
    const creatorName = creator[0]?.full_name || 'Admin';

    // Insert system message for group creation
    await db.execute(
      `INSERT INTO chat_messages (group_id, sender_id, message_type, message)
       VALUES (?, ?, 'SYSTEM', ?)`,
      [groupId, creatorId, `Group "${name.trim()}" created by ${creatorName}`]
    );

    // Create notifications for all invited members (except creator)
    for (const u of validUsers) {
      if (u.user_id !== creatorId) {
        notificationService.createNotification({
          recipientId: u.user_id,
          workspaceId,
          senderId: creatorId,
          type: 'CHAT_GROUP_ADDED',
          title: 'Added to Chat Group',
          message: `${creatorName} added you to the group "${name.trim()}".`,
          link: `/workspace/chat?group=${groupId}`,
        }).catch((e) => console.warn('Notification error on group create:', e.message));
      }
    }

    return this.getGroupDetails(workspaceId, creatorId, groupId);
  }

  /**
   * Get detailed group metadata, including members with roles and online presence info.
   */
  async getGroupDetails(workspaceId, userId, groupId) {
    await this.verifyGroupMember(workspaceId, userId, groupId);

    const [groups] = await db.execute(
      `SELECT cg.*, u.full_name as creator_name
       FROM chat_groups cg
       LEFT JOIN users u ON cg.created_by = u.id
       WHERE cg.id = ? AND cg.workspace_id = ?`,
      [groupId, workspaceId]
    );

    if (groups.length === 0) {
      const err = new Error('Group not found.');
      err.status = 404;
      throw err;
    }

    const group = groups[0];

    // Fetch members with user details and roles
    const [members] = await db.execute(
      `SELECT 
        cgm.id as member_id,
        cgm.user_id,
        cgm.role as group_role,
        cgm.joined_at,
        cgm.is_muted,
        cgm.mute_until,
        cgm.is_pinned,
        u.full_name,
        u.email,
        u.avatar_url,
        u.job_title,
        u.department,
        u.status as user_status,
        r.name as system_role,
        r.display_name as system_role_label
       FROM chat_group_members cgm
       JOIN users u ON cgm.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE cgm.group_id = ? AND cgm.left_at IS NULL
       ORDER BY cgm.role ASC, u.full_name ASC`,
      [groupId]
    );

    group.members = members;
    return group;
  }

  /**
   * Get all active members in a group.
   */
  async getGroupMembers(workspaceId, userId, groupId) {
    await this.verifyGroupMember(workspaceId, userId, groupId);
    const details = await this.getGroupDetails(workspaceId, userId, groupId);
    return details.members || [];
  }

  /**
   * Get eligible workspace users to add to a group (active workspace members not already in the group).
   */
  async getWorkspaceEligibleUsers(workspaceId, userId, groupId, search = '') {
    await this.verifyGroupMember(workspaceId, userId, groupId);

    let query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.avatar_url,
        u.job_title,
        u.department,
        r.name as role_name,
        r.display_name as role_display_name
      FROM workspace_users wu
      JOIN users u ON wu.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE wu.workspace_id = ? 
        AND wu.status = 'ACTIVE' 
        AND u.deleted_at IS NULL
        AND u.id NOT IN (
          SELECT user_id FROM chat_group_members WHERE group_id = ? AND left_at IS NULL
        )
    `;

    const params = [workspaceId, groupId];

    if (search && search.trim() !== '') {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.job_title LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY u.full_name ASC LIMIT 50`;

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * Update group details (ADMIN / Workspace Manager only).
   */
  async updateGroup(workspaceId, userId, userRole, groupId, { name, description, image, group_type }) {
    const member = await this.verifyGroupMember(workspaceId, userId, groupId);
    const isManager = ['superadmin', 'workspace_manager', 'agency_admin'].includes(userRole);
    const isAdmin = member.role === 'ADMIN' || isManager;

    if (!isAdmin) {
      const err = new Error('Permission denied. Only group admins can update group details.');
      err.status = 403;
      throw err;
    }

    const [currentGroup] = await db.execute(`SELECT name FROM chat_groups WHERE id = ?`, [groupId]);
    const oldName = currentGroup[0]?.name;

    await db.execute(
      `UPDATE chat_groups 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           image = COALESCE(?, image),
           group_type = COALESCE(?, group_type),
           updated_at = NOW()
       WHERE id = ? AND workspace_id = ?`,
      [
        name?.trim() || null,
        description !== undefined ? description : null,
        image !== undefined ? image : null,
        group_type || null,
        groupId,
        workspaceId,
      ]
    );

    // If group name changed, add a system message
    if (name && name.trim() && name.trim() !== oldName) {
      const [updater] = await db.execute(`SELECT full_name FROM users WHERE id = ?`, [userId]);
      const updaterName = updater[0]?.full_name || 'Admin';
      await db.execute(
        `INSERT INTO chat_messages (group_id, sender_id, message_type, message)
         VALUES (?, ?, 'SYSTEM', ?)`,
        [groupId, userId, `Group name changed to "${name.trim()}" by ${updaterName}`]
      );
    }

    return this.getGroupDetails(workspaceId, userId, groupId);
  }

  /**
   * Archive group (ADMIN / Workspace Manager only).
   */
  async archiveGroup(workspaceId, userId, userRole, groupId) {
    const member = await this.verifyGroupMember(workspaceId, userId, groupId);
    const isManager = ['superadmin', 'workspace_manager', 'agency_admin'].includes(userRole);

    if (member.role !== 'ADMIN' && !isManager) {
      const err = new Error('Permission denied. Only group admins can archive this group.');
      err.status = 403;
      throw err;
    }

    await db.execute(
      `UPDATE chat_groups SET archived_at = NOW() WHERE id = ? AND workspace_id = ?`,
      [groupId, workspaceId]
    );

    return { success: true, message: 'Group archived successfully.', groupId: Number(groupId) };
  }

  /**
   * Add members to an existing group. Enforces workspace isolation.
   */
  async addMembers(workspaceId, userId, userRole, groupId, memberIds = []) {
    const member = await this.verifyGroupMember(workspaceId, userId, groupId);
    const isManager = ['superadmin', 'workspace_manager', 'agency_admin'].includes(userRole);

    if (member.role !== 'ADMIN' && !isManager) {
      const err = new Error('Permission denied. Only group admins can add members.');
      err.status = 403;
      throw err;
    }

    const cleanIds = memberIds.map(Number).filter((id) => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      const err = new Error('No valid member IDs provided.');
      err.status = 400;
      throw err;
    }

    // Verify all memberIds belong to the workspace
    const [validUsers] = await db.query(
      `SELECT wu.user_id, u.full_name 
       FROM workspace_users wu
       JOIN users u ON wu.user_id = u.id
       WHERE wu.workspace_id = ? AND wu.user_id IN (?) AND wu.status = 'ACTIVE' AND u.deleted_at IS NULL`,
      [workspaceId, cleanIds]
    );

    if (validUsers.length === 0) {
      const err = new Error('None of the selected users belong to this workspace.');
      err.status = 400;
      throw err;
    }

    const [adminUser] = await db.execute(`SELECT full_name FROM users WHERE id = ?`, [userId]);
    const adminName = adminUser[0]?.full_name || 'Admin';

    for (const u of validUsers) {
      await db.execute(
        `INSERT INTO chat_group_members (group_id, user_id, role, left_at, joined_at)
         VALUES (?, ?, 'MEMBER', NULL, NOW())
         ON DUPLICATE KEY UPDATE left_at = NULL, joined_at = NOW(), role = 'MEMBER'`,
        [groupId, u.user_id]
      );

      // System message per added user
      await db.execute(
        `INSERT INTO chat_messages (group_id, sender_id, message_type, message)
         VALUES (?, ?, 'SYSTEM', ?)`,
        [groupId, userId, `${u.full_name} was added to ${member.group_name || 'the group'} by ${adminName}`]
      );

      // Create notification
      notificationService.createNotification({
        recipientId: u.user_id,
        workspaceId,
        senderId: userId,
        type: 'CHAT_GROUP_ADDED',
        title: 'Added to Chat Group',
        message: `${adminName} added you to ${member.group_name || 'a chat group'}.`,
        link: `/workspace/chat?group=${groupId}`,
      }).catch((e) => console.warn('Notification error on addMember:', e.message));
    }

    const groupDetails = await this.getGroupDetails(workspaceId, userId, groupId);
    return {
      group: groupDetails,
      addedUserIds: validUsers.map((u) => u.user_id),
    };
  }

  /**
   * Remove member or leave group.
   */
  async removeMember(workspaceId, userId, userRole, groupId, targetUserId) {
    const member = await this.verifyGroupMember(workspaceId, userId, groupId);
    const isSelf = Number(userId) === Number(targetUserId);
    const isManager = ['superadmin', 'workspace_manager', 'agency_admin'].includes(userRole);

    if (!isSelf && member.role !== 'ADMIN' && !isManager) {
      const err = new Error('Permission denied. You can only remove yourself or be an admin.');
      err.status = 403;
      throw err;
    }

    // Protection check: if the last admin tries to leave / be removed, ensure another admin exists
    const [adminRows] = await db.execute(
      `SELECT user_id FROM chat_group_members WHERE group_id = ? AND role = 'ADMIN' AND left_at IS NULL`,
      [groupId]
    );

    const [totalMemberRows] = await db.execute(
      `SELECT user_id FROM chat_group_members WHERE group_id = ? AND left_at IS NULL`,
      [groupId]
    );

    const isTargetAdmin = adminRows.some((a) => Number(a.user_id) === Number(targetUserId));
    if (isTargetAdmin && adminRows.length === 1 && totalMemberRows.length > 1) {
      const err = new Error('Cannot leave or remove the only group admin. Please promote another member to admin first.');
      err.status = 400;
      throw err;
    }

    await db.execute(
      `UPDATE chat_group_members SET left_at = NOW() WHERE group_id = ? AND user_id = ?`,
      [groupId, targetUserId]
    );

    const [targetUser] = await db.execute(`SELECT full_name FROM users WHERE id = ?`, [targetUserId]);
    const targetName = targetUser[0]?.full_name || 'Member';

    const [actorUser] = await db.execute(`SELECT full_name FROM users WHERE id = ?`, [userId]);
    const actorName = actorUser[0]?.full_name || 'Admin';

    const systemMsg = isSelf
      ? `${targetName} left the group.`
      : `${targetName} was removed from the group by ${actorName}.`;

    await db.execute(
      `INSERT INTO chat_messages (group_id, sender_id, message_type, message)
       VALUES (?, ?, 'SYSTEM', ?)`,
      [groupId, userId, systemMsg]
    );

    if (!isSelf) {
      notificationService.createNotification({
        recipientId: Number(targetUserId),
        workspaceId,
        senderId: userId,
        type: 'CHAT_GROUP_REMOVED',
        title: 'Removed from Chat Group',
        message: `You were removed from "${member.group_name || 'the group'}" by ${actorName}.`,
        link: `/workspace/chat`,
      }).catch((e) => console.warn('Notification error on removeMember:', e.message));
    }

    return {
      success: true,
      message: systemMsg,
      groupId: Number(groupId),
      userId: Number(targetUserId),
      isSelf,
    };
  }

  /**
   * Promote or demote a group member (ADMIN / MEMBER).
   */
  async updateMemberRole(workspaceId, userId, userRole, groupId, targetUserId, newRole) {
    const member = await this.verifyGroupMember(workspaceId, userId, groupId);
    const isManager = ['superadmin', 'workspace_manager', 'agency_admin'].includes(userRole);

    if (member.role !== 'ADMIN' && !isManager) {
      const err = new Error('Permission denied. Only group admins can change member roles.');
      err.status = 403;
      throw err;
    }

    const cleanRole = String(newRole).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'MEMBER';

    // Last admin protection if demoting
    if (cleanRole === 'MEMBER') {
      const [adminRows] = await db.execute(
        `SELECT user_id FROM chat_group_members WHERE group_id = ? AND role = 'ADMIN' AND left_at IS NULL`,
        [groupId]
      );
      if (adminRows.length === 1 && Number(adminRows[0].user_id) === Number(targetUserId)) {
        const err = new Error('Cannot demote the only group admin. Please promote another member first.');
        err.status = 400;
        throw err;
      }
    }

    await db.execute(
      `UPDATE chat_group_members SET role = ? WHERE group_id = ? AND user_id = ? AND left_at IS NULL`,
      [cleanRole, groupId, targetUserId]
    );

    const [targetUser] = await db.execute(`SELECT full_name FROM users WHERE id = ?`, [targetUserId]);
    const targetName = targetUser[0]?.full_name || 'Member';

    const systemMsg = cleanRole === 'ADMIN'
      ? `${targetName} is now a group admin.`
      : `${targetName} is no longer a group admin.`;

    await db.execute(
      `INSERT INTO chat_messages (group_id, sender_id, message_type, message)
       VALUES (?, ?, 'SYSTEM', ?)`,
      [groupId, userId, systemMsg]
    );

    // Send notification
    notificationService.createNotification({
      recipientId: Number(targetUserId),
      workspaceId,
      senderId: userId,
      type: 'CHAT_ROLE_UPDATED',
      title: cleanRole === 'ADMIN' ? 'Promoted to Group Admin' : 'Group Role Updated',
      message: systemMsg,
      link: `/workspace/chat?group=${groupId}`,
    }).catch((e) => console.warn('Notification error on updateMemberRole:', e.message));

    const updatedGroup = await this.getGroupDetails(workspaceId, userId, groupId);
    return {
      group: updatedGroup,
      userId: Number(targetUserId),
      role: cleanRole,
      systemMessage: systemMsg,
    };
  }

  /**
   * Toggle pin / mute preferences for a user in a group.
   */
  async updatePreferences(workspaceId, userId, groupId, { is_pinned, is_muted, mute_duration }) {
    await this.verifyGroupMember(workspaceId, userId, groupId);

    let muteUntilSql = null;
    if (is_muted) {
      if (mute_duration === '1_hour') {
        muteUntilSql = new Date(Date.now() + 60 * 60 * 1000);
      } else if (mute_duration === '8_hours') {
        muteUntilSql = new Date(Date.now() + 8 * 60 * 60 * 1000);
      } else if (mute_duration === 'until_tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        muteUntilSql = tomorrow;
      }
    }

    await db.execute(
      `UPDATE chat_group_members 
       SET is_pinned = COALESCE(?, is_pinned),
           is_muted = COALESCE(?, is_muted),
           mute_until = ?
       WHERE group_id = ? AND user_id = ?`,
      [
        is_pinned !== undefined ? (is_pinned ? 1 : 0) : null,
        is_muted !== undefined ? (is_muted ? 1 : 0) : null,
        muteUntilSql,
        groupId,
        userId,
      ]
    );

    return { success: true, is_pinned, is_muted, mute_until: muteUntilSql };
  }

  /**
   * Get message history for a group (paginated via cursor `before_id`).
   */
  async getMessages(workspaceId, userId, groupId, options = {}) {
    await this.verifyGroupMember(workspaceId, userId, groupId);

    const limit = Math.min(parseInt(options.limit, 10) || 50, 100);
    const beforeId = options.before_id ? parseInt(options.before_id, 10) : null;
    const search = options.search ? options.search.trim() : null;

    let query = `
      SELECT 
        cm.id,
        cm.group_id,
        cm.sender_id,
        cm.message_type,
        cm.message,
        cm.content_id,
        cm.task_id,
        cm.asset_id,
        cm.reply_to_message_id,
        cm.is_edited,
        cm.created_at,
        cm.updated_at,
        u.full_name as sender_name,
        u.avatar_url as sender_avatar,
        r.display_name as sender_role,
        c.title as content_title,
        (SELECT GROUP_CONCAT(cp.platform SEPARATOR ', ') FROM content_platforms cp WHERE cp.content_id = c.id) as content_platform,
        c.status as content_status,
        t.title as task_title,
        t.status as task_status,
        t.priority as task_priority,
        a.display_name as asset_name,
        a.file_name as asset_file_name,
        rm.message as reply_message,
        ru.full_name as reply_sender_name
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN content c ON cm.content_id = c.id
      LEFT JOIN tasks t ON cm.task_id = t.id
      LEFT JOIN assets a ON cm.asset_id = a.id
      LEFT JOIN chat_messages rm ON cm.reply_to_message_id = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      WHERE cm.group_id = ? AND cm.deleted_at IS NULL
    `;

    const params = [groupId];

    if (beforeId) {
      query += ` AND cm.id < ?`;
      params.push(beforeId);
    }

    if (search) {
      query += ` AND (cm.message LIKE ? OR c.title LIKE ? OR t.title LIKE ? OR a.display_name LIKE ?)`;
      const sTerm = `%${search}%`;
      params.push(sTerm, sTerm, sTerm, sTerm);
    }

    query += ` ORDER BY cm.id DESC LIMIT ?`;
    params.push(limit + 1); // Query 1 extra to check hasMore

    const [rows] = await db.execute(query, params);
    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit);

    // If messages found, attach attachments & reactions
    if (messages.length > 0) {
      const messageIds = messages.map((m) => m.id);

      // Attachments query
      const [attachments] = await db.query(
        `SELECT * FROM chat_message_attachments WHERE message_id IN (?) ORDER BY id ASC`,
        [messageIds]
      );

      // Reactions query
      const [reactions] = await db.query(
        `SELECT cmr.*, u.full_name 
         FROM chat_message_reactions cmr
         JOIN users u ON cmr.user_id = u.id
         WHERE cmr.message_id IN (?)`,
        [messageIds]
      );

      const attachmentMap = {};
      attachments.forEach((att) => {
        if (!attachmentMap[att.message_id]) attachmentMap[att.message_id] = [];
        attachmentMap[att.message_id].push(att);
      });

      const reactionMap = {};
      reactions.forEach((r) => {
        if (!reactionMap[r.message_id]) reactionMap[r.message_id] = [];
        reactionMap[r.message_id].push(r);
      });

      const normalizedList = messages.map((m) =>
        this.normalizeMessage(m, attachmentMap[m.id] || [], reactionMap[m.id] || [])
      );

      // Reverse to chronological order (oldest to newest for rendering)
      return {
        messages: normalizedList.reverse(),
        hasMore,
      };
    }

    return {
      messages: [],
      hasMore: false,
    };
  }

  /**
   * Send a new message into a group.
   */
  async sendMessage(workspaceId, userId, groupId, data) {
    await this.verifyGroupMember(workspaceId, userId, groupId);

    const {
      message_type = 'TEXT',
      message = '',
      content_id = null,
      task_id = null,
      asset_id = null,
      reply_to_message_id = null,
      attachments = [],
    } = data;

    // Sanitize text message
    let sanitizedText = message !== undefined && message !== null ? String(message).trim() : '';
    sanitizedText = sanitizedText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    const [result] = await db.execute(
      `INSERT INTO chat_messages 
        (group_id, sender_id, message_type, message, content_id, task_id, asset_id, reply_to_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupId,
        userId,
        message_type,
        sanitizedText || null,
        content_id || null,
        task_id || null,
        asset_id || null,
        reply_to_message_id || null,
      ]
    );

    const messageId = result.insertId;

    // Handle file attachments if present
    if (Array.isArray(attachments) && attachments.length > 0) {
      const attValues = attachments.map((att) => [
        messageId,
        att.asset_id || att.assetId || null,
        att.file_name || att.fileName || 'attachment',
        att.file_size || att.fileSize || 0,
        att.mime_type || att.mimeType || 'application/octet-stream',
        att.storage_path || att.storagePath || '',
        att.duration !== undefined && att.duration !== null ? att.duration : null,
      ]);

      await db.query(
        `INSERT INTO chat_message_attachments 
          (message_id, asset_id, file_name, file_size, mime_type, storage_path, duration)
         VALUES ?`,
        [attValues]
      );
    }

    // Auto-update read cursor for sender
    await this.markGroupAsRead(workspaceId, userId, groupId, messageId);

    // Process mentions (e.g. @Username)
    this.processMentions(workspaceId, userId, groupId, messageId, sanitizedText).catch((err) => {
      console.error('Error processing mentions:', err);
    });

    // Notify other group members
    this.notifyGroupMembersOnMessage(workspaceId, userId, groupId, sanitizedText, attachments).catch((err) => {
      console.warn('Error notifying group members:', err.message);
    });

    // Fetch full saved canonical message
    const res = await this.getMessages(workspaceId, userId, groupId, { limit: 5 });
    const fullMsg = res.messages.find((m) => m.id === messageId) || res.messages[res.messages.length - 1];
    return fullMsg;
  }

  /**
   * Notify inactive/unopened members of new messages.
   */
  async notifyGroupMembersOnMessage(workspaceId, senderId, groupId, text, attachments = []) {
    const [sender] = await db.execute(`SELECT full_name FROM users WHERE id = ?`, [senderId]);
    const senderName = sender[0]?.full_name || 'Team Member';

    const [group] = await db.execute(`SELECT name FROM chat_groups WHERE id = ?`, [groupId]);
    const groupName = group[0]?.name || 'Chat Group';

    const [members] = await db.execute(
      `SELECT cgm.user_id, cgm.is_muted, cgm.mute_until 
       FROM chat_group_members cgm
       WHERE cgm.group_id = ? AND cgm.user_id != ? AND cgm.left_at IS NULL`,
      [groupId, senderId]
    );

    const now = new Date();
    const snippet = text
      ? (text.length > 60 ? text.substring(0, 60) + '...' : text)
      : attachments.length > 0
      ? `Sent ${attachments.length} attachment(s)`
      : 'New message';

    for (const m of members) {
      // Check if muted
      const isMuted = m.is_muted && (!m.mute_until || new Date(m.mute_until) > now);
      if (isMuted) continue;

      notificationService.createNotification({
        recipientId: m.user_id,
        workspaceId,
        senderId,
        type: 'CHAT_MESSAGE',
        title: `${senderName} in ${groupName}`,
        message: snippet,
        link: `/workspace/chat?group=${groupId}`,
      }).catch(() => {});
    }
  }

  /**
   * Process @mentions in message text and trigger system notifications.
   */
  async processMentions(workspaceId, senderId, groupId, messageId, text) {
    if (!text || !text.includes('@')) return;

    const mentionRegex = /@([A-Za-z0-9_.\s]+?)(?=\s|$|@)/g;
    const matches = Array.from(text.matchAll(mentionRegex)).map((m) => m[1].trim());

    if (matches.length === 0) return;

    // Find active group members matching mentioned names
    const [members] = await db.query(
      `SELECT u.id, u.full_name 
       FROM chat_group_members cgm
       JOIN users u ON cgm.user_id = u.id
       WHERE cgm.group_id = ? AND cgm.user_id != ? AND cgm.left_at IS NULL`,
      [groupId, senderId]
    );

    const [sender] = await db.execute(`SELECT full_name FROM users WHERE id = ?`, [senderId]);
    const senderName = sender[0]?.full_name || 'Someone';

    for (const m of members) {
      const isMentioned = matches.some(
        (matchName) =>
          m.full_name.toLowerCase().includes(matchName.toLowerCase()) ||
          matchName.toLowerCase().includes(m.full_name.toLowerCase())
      );

      if (isMentioned) {
        notificationService.createNotification({
          recipientId: m.id,
          workspaceId,
          senderId,
          type: 'CHAT_MENTION',
          title: 'Mentioned in Chat',
          message: `${senderName} mentioned you in a chat message.`,
          link: `/workspace/chat?group=${groupId}`,
        }).catch((e) => console.warn('Error creating mention notification:', e.message));
      }
    }
  }

  /**
   * Edit sender's text message.
   */
  async editMessage(workspaceId, userId, messageId, text) {
    const [messages] = await db.execute(
      `SELECT cm.*, cg.workspace_id 
       FROM chat_messages cm
       JOIN chat_groups cg ON cm.group_id = cg.id
       WHERE cm.id = ? AND cm.deleted_at IS NULL`,
      [messageId]
    );

    if (messages.length === 0) {
      const err = new Error('Message not found.');
      err.status = 404;
      throw err;
    }

    const msg = messages[0];
    if (Number(msg.sender_id) !== Number(userId)) {
      const err = new Error('Permission denied. You can only edit your own messages.');
      err.status = 403;
      throw err;
    }

    const sanitized = String(text || '').trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    await db.execute(
      `UPDATE chat_messages 
       SET message = ?, is_edited = 1, updated_at = NOW() 
       WHERE id = ?`,
      [sanitized, messageId]
    );

    const res = await this.getMessages(workspaceId, userId, msg.group_id, { limit: 1, before_id: messageId + 1 });
    return res.messages.find((m) => m.id === messageId) || res.messages[0];
  }

  /**
   * Delete message for sender / admin.
   */
  async deleteMessage(workspaceId, userId, userRole, messageId) {
    const [messages] = await db.execute(
      `SELECT cm.*, cgm.role as group_role 
       FROM chat_messages cm
       JOIN chat_group_members cgm ON cm.group_id = cgm.group_id AND cgm.user_id = ?
       WHERE cm.id = ? AND cm.deleted_at IS NULL`,
      [userId, messageId]
    );

    if (messages.length === 0) {
      const err = new Error('Message not found or access denied.');
      err.status = 404;
      throw err;
    }

    const msg = messages[0];
    const isManager = ['superadmin', 'workspace_manager', 'agency_admin'].includes(userRole);
    const isSender = Number(msg.sender_id) === Number(userId);
    const isAdmin = msg.group_role === 'ADMIN' || isManager;

    if (!isSender && !isAdmin) {
      const err = new Error('Permission denied. You can only delete your own messages or be an admin.');
      err.status = 403;
      throw err;
    }

    await db.execute(`UPDATE chat_messages SET deleted_at = NOW() WHERE id = ?`, [messageId]);
    return { success: true, messageId: Number(messageId), groupId: msg.group_id };
  }

  /**
   * Toggle message emoji reaction.
   */
  async toggleReaction(workspaceId, userId, messageId, reaction) {
    const [messages] = await db.execute(
      `SELECT group_id FROM chat_messages WHERE id = ? AND deleted_at IS NULL`,
      [messageId]
    );

    if (messages.length === 0) {
      const err = new Error('Message not found.');
      err.status = 404;
      throw err;
    }

    await this.verifyGroupMember(workspaceId, userId, messages[0].group_id);

    const cleanReaction = String(reaction || '👍').trim();

    const [existing] = await db.execute(
      `SELECT id FROM chat_message_reactions WHERE message_id = ? AND user_id = ? AND reaction = ?`,
      [messageId, userId, cleanReaction]
    );

    let action = '';
    if (existing.length > 0) {
      await db.execute(`DELETE FROM chat_message_reactions WHERE id = ?`, [existing[0].id]);
      action = 'removed';
    } else {
      await db.execute(
        `INSERT INTO chat_message_reactions (message_id, user_id, reaction) VALUES (?, ?, ?)`,
        [messageId, userId, cleanReaction]
      );
      action = 'added';
    }

    const [reactions] = await db.execute(
      `SELECT cmr.*, u.full_name 
       FROM chat_message_reactions cmr
       JOIN users u ON cmr.user_id = u.id
       WHERE cmr.message_id = ?`,
      [messageId]
    );

    return {
      messageId: Number(messageId),
      groupId: messages[0].group_id,
      action,
      reactions: reactions.map((r) => ({
        id: Number(r.id),
        messageId: Number(messageId),
        userId: Number(r.user_id),
        user_id: Number(r.user_id),
        userName: r.full_name,
        full_name: r.full_name,
        reaction: r.reaction,
        createdAt: r.created_at,
        created_at: r.created_at,
      })),
    };
  }

  /**
   * Update read cursor for user in group.
   */
  async markGroupAsRead(workspaceId, userId, groupId, lastReadMessageId = null) {
    await this.verifyGroupMember(workspaceId, userId, groupId);

    let targetId = lastReadMessageId;

    if (!targetId) {
      const [maxMsg] = await db.execute(
        `SELECT MAX(id) as max_id FROM chat_messages WHERE group_id = ? AND deleted_at IS NULL`,
        [groupId]
      );
      targetId = maxMsg[0]?.max_id || 0;
    }

    if (targetId > 0) {
      await db.execute(
        `INSERT INTO chat_message_reads (group_id, user_id, last_read_message_id, read_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE last_read_message_id = GREATEST(last_read_message_id, VALUES(last_read_message_id)), read_at = NOW()`,
        [groupId, userId, targetId]
      );
    }

    return { success: true, groupId: Number(groupId), lastReadMessageId: targetId };
  }

  /**
   * Get all shared media items for a conversation (Photos, Videos, Documents, Voice Notes).
   */
  async getGroupSharedMedia(workspaceId, userId, groupId) {
    await this.verifyGroupMember(workspaceId, userId, groupId);

    const [attachments] = await db.execute(
      `SELECT 
        cma.id,
        cma.message_id,
        cma.asset_id,
        cma.file_name,
        cma.file_size,
        cma.mime_type,
        cma.storage_path,
        cma.duration,
        cma.created_at,
        u.full_name as sender_name,
        u.avatar_url as sender_avatar
       FROM chat_message_attachments cma
       JOIN chat_messages cm ON cma.message_id = cm.id
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.group_id = ? AND cm.deleted_at IS NULL
       ORDER BY cma.id DESC`,
      [groupId]
    );

    const mediaList = attachments.map((att) => {
      const storagePath = (att.storage_path || '').replace(/\\/g, '/');
      const url = att.asset_id
        ? `/api/assets/${att.asset_id}/file`
        : storagePath
        ? `/api/chat/files/view?path=${encodeURIComponent(storagePath)}`
        : '';

      const isImage = att.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|jfif)$/i.test(att.file_name || storagePath);
      const isVideo = att.mime_type?.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(att.file_name || storagePath);
      const isAudio = att.mime_type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(att.file_name || storagePath);

      let mediaCategory = 'document';
      if (isImage) mediaCategory = 'image';
      else if (isVideo) mediaCategory = 'video';
      else if (isAudio) mediaCategory = 'audio';

      return {
        id: Number(att.id),
        messageId: Number(att.message_id),
        assetId: att.asset_id ? Number(att.asset_id) : null,
        fileName: att.file_name,
        file_name: att.file_name,
        fileSize: Number(att.file_size || 0),
        file_size: Number(att.file_size || 0),
        mimeType: att.mime_type,
        mime_type: att.mime_type,
        storagePath,
        storage_path: storagePath,
        url,
        thumbnailUrl: isImage ? url : null,
        duration: att.duration ? Number(att.duration) : null,
        mediaCategory,
        senderName: att.sender_name,
        senderAvatar: att.sender_avatar,
        createdAt: att.created_at,
      };
    });

    return {
      all: mediaList,
      images: mediaList.filter((m) => m.mediaCategory === 'image'),
      videos: mediaList.filter((m) => m.mediaCategory === 'video'),
      documents: mediaList.filter((m) => m.mediaCategory === 'document'),
      audio: mediaList.filter((m) => m.mediaCategory === 'audio'),
    };
  }

  /**
   * Get workspace total unread chat count for current user.
   */
  async getWorkspaceUnreadCount(workspaceId, userId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as total_unread
       FROM chat_messages cm
       JOIN chat_group_members cgm ON cm.group_id = cgm.group_id AND cgm.user_id = ? AND cgm.left_at IS NULL
       JOIN chat_groups cg ON cm.group_id = cg.id AND cg.workspace_id = ? AND cg.archived_at IS NULL
       LEFT JOIN chat_message_reads cmr ON cmr.group_id = cm.group_id AND cmr.user_id = ?
       WHERE cm.sender_id != ?
         AND cm.deleted_at IS NULL
         AND cm.id > COALESCE(cmr.last_read_message_id, 0)`,
      [userId, workspaceId, userId, userId]
    );

    return rows[0]?.total_unread || 0;
  }
}

module.exports = new ChatService();
