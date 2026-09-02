const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { db } = require('../config/database');

class SuperadminService {
  generateTemporaryPassword() {
    return 'Temp#' + crypto.randomBytes(4).toString('hex') + '!';
  }

  generateSlug(name) {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Date.now()
    );
  }

  /**
   * Create a new workspace.
   */
  /**
   * Create a new workspace and onboard its Workspace Manager in a single MySQL transaction.
   */
  async createWorkspace(superadminUser, { name, companyName, email, phone, address, logoUrl, status, managerName, managerEmail, managerPassword }) {
    const workspaceName = name || companyName;
    if (!workspaceName) {
      const error = new Error('Workspace or company name is required.');
      error.status = 400;
      throw error;
    }

    if (!managerName || !managerEmail || !managerPassword) {
      const error = new Error('Workspace manager name, email, and password are required.');
      error.status = 400;
      throw error;
    }

    const slug = this.generateSlug(workspaceName);
    const workspaceStatus = status || 'ACTIVE';

    const settings = JSON.stringify({
      companyName: companyName || workspaceName,
      email: email || '',
      phone: phone || '',
      address: address || '',
    });

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Check unique email for manager
      const [existingUsers] = await connection.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [managerEmail.trim()]);
      if (existingUsers.length > 0) {
        const error = new Error('A user with this email address already exists.');
        error.status = 409;
        throw error;
      }

      // 2. Hash manager password with bcrypt
      const passwordHash = await bcrypt.hash(managerPassword, 10);

      // 3. Find workspace_manager role_id
      const [roles] = await connection.execute('SELECT id FROM roles WHERE name = "workspace_manager"');
      if (roles.length === 0) {
        const error = new Error('Role "workspace_manager" not configured in database.');
        error.status = 500;
        throw error;
      }
      const roleId = roles[0].id;

      // 4. Create Workspace Manager user (must_change_password = 0 since they set their password)
      const [userResult] = await connection.execute(
        `INSERT INTO users (role_id, full_name, email, password_hash, phone, status, must_change_password, created_at)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE', 0, NOW())`,
        [roleId, managerName.trim(), managerEmail.trim(), passwordHash, phone || null]
      );
      const managerId = userResult.insertId;

      // 5. Create workspace record
      const [wsResult] = await connection.execute(
        `INSERT INTO workspaces (owner_id, name, slug, logo_url, status, settings, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [managerId, workspaceName, slug, logoUrl || null, workspaceStatus, settings]
      );
      const workspaceId = wsResult.insertId;

      // 6. Link manager to workspace as OWNER
      await connection.execute(
        `INSERT INTO workspace_users (workspace_id, user_id, role, status, created_at)
         VALUES (?, ?, 'OWNER', 'ACTIVE', NOW())`,
        [workspaceId, managerId]
      );

      await connection.commit();

      return {
        id: workspaceId,
        name: workspaceName,
        slug,
        logoUrl: logoUrl || null,
        status: workspaceStatus,
        settings: JSON.parse(settings),
        manager: {
          id: managerId,
          name: managerName.trim(),
          email: managerEmail.trim(),
          role: 'workspace_manager',
        }
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * List all Workspace Managers and their associated workspaces.
   */
  async listManagers() {
    const [rows] = await db.execute(`
      SELECT u.id, u.full_name as name, u.email, u.phone, u.status, u.created_at as joinedAt,
             w.name as companyName
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN workspaces w ON w.owner_id = u.id
      WHERE r.name = 'workspace_manager' AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `);
    return rows;
  }

  /**
   * Get global SaaS metrics for Superadmin.
   */
  async getMetrics() {
    const [[{ total_workspaces }]] = await db.execute('SELECT COUNT(*) as total_workspaces FROM workspaces WHERE deleted_at IS NULL');
    const [[{ active_workspaces }]] = await db.execute('SELECT COUNT(*) as active_workspaces FROM workspaces WHERE status = "ACTIVE" AND deleted_at IS NULL');
    const [[{ inactive_workspaces }]] = await db.execute('SELECT COUNT(*) as inactive_workspaces FROM workspaces WHERE status = "INACTIVE" AND deleted_at IS NULL');
    
    // Find role_id for workspace_manager
    const [roles] = await db.execute('SELECT id FROM roles WHERE name = "workspace_manager"');
    const roleId = roles[0]?.id || 2;
    const [[{ total_managers }]] = await db.execute('SELECT COUNT(*) as total_managers FROM users WHERE role_id = ? AND deleted_at IS NULL', [roleId]);

    return {
      total_workspaces,
      active_workspaces,
      inactive_workspaces,
      total_managers,
    };
  }


  /**
   * Create initial Workspace Manager for a workspace.
   */
  async createWorkspaceManager(superadminUser, workspaceId, { name, email, phone }) {
    if (!name || !email) {
      const error = new Error('Manager name and email are required.');
      error.status = 400;
      throw error;
    }

    const [workspaces] = await db.execute('SELECT id FROM workspaces WHERE id = ? AND deleted_at IS NULL', [workspaceId]);
    if (workspaces.length === 0) {
      const error = new Error('Workspace not found.');
      error.status = 404;
      throw error;
    }

    const [existingUsers] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existingUsers.length > 0) {
      const error = new Error('A user with this email address already exists.');
      error.status = 409;
      throw error;
    }

    const [roles] = await db.execute('SELECT id FROM roles WHERE name = "workspace_manager"');
    const roleId = roles[0].id;

    const tempPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [userResult] = await db.execute(
      `INSERT INTO users (role_id, full_name, email, password_hash, phone, status, must_change_password, created_at)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', 1, NOW())`,
      [roleId, name.trim(), email.trim(), passwordHash, phone || null]
    );

    const managerId = userResult.insertId;

    await db.execute(
      `INSERT INTO workspace_users (workspace_id, user_id, role, status, created_at)
       VALUES (?, ?, 'OWNER', 'ACTIVE', NOW())
       ON DUPLICATE KEY UPDATE role = 'OWNER'`,
      [workspaceId, managerId]
    );

    await db.execute('UPDATE workspaces SET owner_id = ? WHERE id = ?', [managerId, workspaceId]);

    return {
      manager: {
        id: managerId,
        name: name.trim(),
        email: email.trim(),
        role: 'workspace_manager',
        mustChangePassword: true,
      },
      workspaceId: parseInt(workspaceId, 10),
      temporaryPassword: tempPassword,
    };
  }

  /**
   * List all workspaces with real counts and search/filter support.
   */
  async listWorkspaces({ search, status } = {}) {
    let query = `
      SELECT w.id, w.name, w.slug, w.logo_url, w.status, w.settings, w.created_at, w.updated_at,
             u.id as manager_id, u.full_name as manager_name, u.email as manager_email, u.phone as manager_phone,
             (SELECT COUNT(*) FROM workspace_users wu WHERE wu.workspace_id = w.id) as team_count,
             (SELECT COUNT(*) FROM clients c WHERE c.workspace_id = w.id AND c.deleted_at IS NULL) as client_count,
             (SELECT COUNT(*) FROM projects p WHERE p.workspace_id = w.id AND p.deleted_at IS NULL) as project_count,
             (SELECT COUNT(*) FROM content co WHERE co.workspace_id = w.id AND co.deleted_at IS NULL) as content_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.workspace_id = w.id AND t.deleted_at IS NULL) as task_count
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      WHERE w.deleted_at IS NULL
    `;
    const params = [];

    const cleanStatus = status && typeof status === 'string' ? status.trim() : '';
    const isAllStatus = !cleanStatus || cleanStatus.toLowerCase() === 'all' || cleanStatus.toLowerCase() === 'all status' || cleanStatus.toLowerCase() === 'all statuses';

    if (!isAllStatus) {
      const upper = cleanStatus.toUpperCase();
      const normalizedStatus = upper === 'SUSPENDED' ? 'SUSPENDED' : (upper === 'ACTIVE' ? 'ACTIVE' : (upper === 'INACTIVE' ? 'INACTIVE' : upper));
      query += ' AND w.status = ?';
      params.push(normalizedStatus);
    }

    if (search && search.trim()) {
      query += ' AND (w.name LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY w.created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows.map((w) => {
      let parsedSettings = w.settings;
      if (typeof w.settings === 'string') {
        try {
          parsedSettings = JSON.parse(w.settings);
        } catch (e) {
          parsedSettings = {};
        }
      }
      return {
        id: w.id,
        name: w.name,
        slug: w.slug,
        logoUrl: w.logo_url || null,
        status: w.status,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
        managerId: w.manager_id,
        managerName: w.manager_name || 'Unassigned',
        managerEmail: w.manager_email || '',
        managerPhone: w.manager_phone || '',
        teamCount: parseInt(w.team_count || 0, 10),
        clientCount: parseInt(w.client_count || 0, 10),
        projectCount: parseInt(w.project_count || 0, 10),
        contentCount: parseInt(w.content_count || 0, 10),
        taskCount: parseInt(w.task_count || 0, 10),
        settings: parsedSettings || {},
        email: parsedSettings?.email || w.manager_email || '',
        phone: parsedSettings?.phone || w.manager_phone || '',
        address: parsedSettings?.address || '',
        companyName: parsedSettings?.companyName || w.name,
      };
    });
  }

  /**
   * Get single workspace details with full real counts and metadata.
   */
  async getWorkspace(workspaceId) {
    const [rows] = await db.execute(
      `SELECT w.id, w.name, w.slug, w.logo_url, w.status, w.settings, w.created_at, w.updated_at,
              u.id as manager_id, u.full_name as manager_name, u.email as manager_email, u.phone as manager_phone, u.avatar_url as manager_avatar,
              (SELECT COUNT(*) FROM workspace_users wu WHERE wu.workspace_id = w.id) as team_count,
              (SELECT COUNT(*) FROM clients c WHERE c.workspace_id = w.id AND c.deleted_at IS NULL) as client_count,
              (SELECT COUNT(*) FROM projects p WHERE p.workspace_id = w.id AND p.deleted_at IS NULL) as project_count,
              (SELECT COUNT(*) FROM content co WHERE co.workspace_id = w.id AND co.deleted_at IS NULL) as content_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.workspace_id = w.id AND t.deleted_at IS NULL) as task_count
       FROM workspaces w
       LEFT JOIN users u ON w.owner_id = u.id
       WHERE w.id = ? AND w.deleted_at IS NULL`,
      [workspaceId]
    );

    if (rows.length === 0) {
      const error = new Error('Workspace not found.');
      error.status = 404;
      throw error;
    }

    const w = rows[0];
    let parsedSettings = w.settings;
    if (typeof w.settings === 'string') {
      try {
        parsedSettings = JSON.parse(w.settings);
      } catch (e) {
        parsedSettings = {};
      }
    }

    return {
      id: w.id,
      name: w.name,
      slug: w.slug,
      logoUrl: w.logo_url || null,
      status: w.status,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
      managerId: w.manager_id,
      managerName: w.manager_name || 'Unassigned',
      managerEmail: w.manager_email || '',
      managerPhone: w.manager_phone || '',
      managerAvatar: w.manager_avatar || null,
      teamCount: parseInt(w.team_count || 0, 10),
      clientCount: parseInt(w.client_count || 0, 10),
      projectCount: parseInt(w.project_count || 0, 10),
      contentCount: parseInt(w.content_count || 0, 10),
      taskCount: parseInt(w.task_count || 0, 10),
      settings: parsedSettings || {},
      email: parsedSettings?.email || w.manager_email || '',
      phone: parsedSettings?.phone || w.manager_phone || '',
      address: parsedSettings?.address || '',
      companyName: parsedSettings?.companyName || w.name,
    };
  }

  /**
   * Get all team members belonging to a workspace.
   */
  async getWorkspaceTeam(workspaceId) {
    const [existing] = await db.execute('SELECT id, name, status FROM workspaces WHERE id = ? AND deleted_at IS NULL', [workspaceId]);
    if (existing.length === 0) {
      const error = new Error('Workspace not found.');
      error.status = 404;
      throw error;
    }

    const [rows] = await db.execute(
      `SELECT wu.id as membership_id, wu.role as workspace_role, wu.status as membership_status, wu.created_at as joined_at,
              u.id as user_id, u.full_name as name, u.email, u.phone, u.avatar_url as avatar, u.status as user_status,
              r.name as system_role, r.display_name as system_role_name
       FROM workspace_users wu
       JOIN users u ON wu.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE wu.workspace_id = ? AND u.deleted_at IS NULL
       ORDER BY (wu.role = 'OWNER') DESC, (wu.role = 'MANAGER') DESC, u.full_name ASC`,
      [workspaceId]
    );

    return {
      workspace: {
        id: existing[0].id,
        name: existing[0].name,
        status: existing[0].status,
      },
      team: rows.map((m) => ({
        membershipId: m.membership_id,
        userId: m.user_id,
        name: m.name,
        email: m.email,
        phone: m.phone || '',
        avatar: m.avatar || '',
        role: m.workspace_role || m.system_role_name || 'Member',
        workspaceRole: m.workspace_role,
        systemRole: m.system_role,
        systemRoleName: m.system_role_name,
        userStatus: m.user_status,
        membershipStatus: m.membership_status,
        joinedAt: m.joined_at,
      })),
    };
  }

  /**
   * Update workspace details.
   */
  async updateWorkspace(workspaceId, { name, companyName, logoUrl, email, phone, address, settings }) {
    const [existing] = await db.execute('SELECT id, name, logo_url, settings FROM workspaces WHERE id = ? AND deleted_at IS NULL', [workspaceId]);
    if (existing.length === 0) {
      const error = new Error('Workspace not found.');
      error.status = 404;
      throw error;
    }

    const currentSettings = typeof existing[0].settings === 'string' ? JSON.parse(existing[0].settings || '{}') : (existing[0].settings || {});
    const updatedName = name || companyName || existing[0].name;
    const mergedSettings = {
      ...currentSettings,
      ...(settings || {}),
      companyName: companyName || updatedName,
      email: email !== undefined ? email : currentSettings.email || '',
      phone: phone !== undefined ? phone : currentSettings.phone || '',
      address: address !== undefined ? address : currentSettings.address || '',
    };

    await db.execute(
      `UPDATE workspaces
       SET name = ?,
           logo_url = ?,
           settings = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        updatedName,
        logoUrl !== undefined ? logoUrl : existing[0].logo_url,
        JSON.stringify(mergedSettings),
        workspaceId,
      ]
    );

    return this.getWorkspace(workspaceId);
  }

  /**
   * Update workspace status with audit logging.
   */
  async updateWorkspaceStatus(workspaceId, status, actorUser) {
    const normalized = String(status || '').trim().toUpperCase();
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'ARCHIVED'];
    if (!validStatuses.includes(normalized)) {
      const error = new Error(`Invalid workspace status. Valid options: ${validStatuses.join(', ')}.`);
      error.status = 400;
      throw error;
    }

    const [existing] = await db.execute('SELECT id, name, status FROM workspaces WHERE id = ? AND deleted_at IS NULL', [workspaceId]);
    if (existing.length === 0) {
      const error = new Error('Workspace not found.');
      error.status = 404;
      throw error;
    }

    await db.execute('UPDATE workspaces SET status = ?, updated_at = NOW() WHERE id = ?', [normalized, workspaceId]);

    // Record audit activity log
    try {
      const action = normalized === 'SUSPENDED' 
        ? 'WORKSPACE_SUSPENDED' 
        : (normalized === 'ACTIVE' ? 'WORKSPACE_ACTIVATED' : `WORKSPACE_${normalized}`);
      const description = normalized === 'SUSPENDED' 
        ? `Workspace "${existing[0].name}" suspended by Superadmin` 
        : (normalized === 'ACTIVE' 
            ? `Workspace "${existing[0].name}" activated by Superadmin` 
            : `Workspace "${existing[0].name}" status set to ${normalized} by Superadmin`);

      await db.execute(
        `INSERT INTO activity_logs (workspace_id, user_id, entity_type, entity_id, action, is_internal, details, created_at)
         VALUES (?, ?, 'WORKSPACE', ?, ?, 1, ?, NOW())`,
        [
          workspaceId,
          actorUser?.id || null,
          workspaceId,
          action,
          JSON.stringify({ description, previousStatus: existing[0].status, newStatus: normalized, actor: actorUser?.name || 'Superadmin' }),
        ]
      );
    } catch (logErr) {
      console.warn('Failed to record workspace status audit log:', logErr.message);
    }

    return {
      success: true,
      workspaceId: parseInt(workspaceId, 10),
      workspaceName: existing[0].name,
      status: normalized,
    };
  }

  /**
   * Permanently delete a workspace and its dependent records atomically.
   */
  async deleteWorkspace(workspaceId, actorUser) {
    const [existing] = await db.execute('SELECT id, name, owner_id FROM workspaces WHERE id = ? AND deleted_at IS NULL', [workspaceId]);
    if (existing.length === 0) {
      const error = new Error('Workspace not found.');
      error.status = 404;
      throw error;
    }
    const ws = existing[0];

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Audit Log record before destructive deletion
      try {
        await connection.execute(
          `INSERT INTO activity_logs (workspace_id, user_id, entity_type, entity_id, action, is_internal, details, created_at)
           VALUES (?, ?, 'WORKSPACE', ?, 'WORKSPACE_DELETED', 1, ?, NOW())`,
          [
            ws.id,
            actorUser?.id || null,
            ws.id,
            JSON.stringify({ description: `Workspace "${ws.name}" deleted by Superadmin`, actor: actorUser?.name || 'Superadmin', deletedAt: new Date().toISOString() }),
          ]
        );
      } catch (logErr) {
        console.warn('Audit log write before delete:', logErr.message);
      }

      // 2. Identify users that belong exclusively to this workspace (and are not superadmin role_id = 1)
      const [wsUsers] = await connection.execute(
        `SELECT wu.user_id FROM workspace_users wu
         JOIN users u ON wu.user_id = u.id
         WHERE wu.workspace_id = ? AND u.role_id != 1`,
        [ws.id]
      );
      const userIds = wsUsers.map((r) => r.user_id);

      const exclusiveUserIds = [];
      for (const uid of userIds) {
        const [[{ count }]] = await connection.execute(
          'SELECT COUNT(*) as count FROM workspace_users WHERE user_id = ?',
          [uid]
        );
        if (count <= 1) {
          exclusiveUserIds.push(uid);
        }
      }

      // 3. Delete Chat data
      await connection.execute(
        `DELETE cmr FROM chat_message_reactions cmr
         JOIN chat_messages cm ON cmr.message_id = cm.id
         JOIN chat_groups cg ON cm.group_id = cg.id
         WHERE cg.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute(
        `DELETE cma FROM chat_message_attachments cma
         JOIN chat_messages cm ON cma.message_id = cm.id
         JOIN chat_groups cg ON cm.group_id = cg.id
         WHERE cg.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute(
        `DELETE cmread FROM chat_message_reads cmread
         JOIN chat_groups cg ON cmread.group_id = cg.id
         WHERE cg.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute(
        `DELETE cm FROM chat_messages cm
         JOIN chat_groups cg ON cm.group_id = cg.id
         WHERE cg.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute(
        `DELETE cgm FROM chat_group_members cgm
         JOIN chat_groups cg ON cgm.group_id = cg.id
         WHERE cg.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute('DELETE FROM chat_groups WHERE workspace_id = ?', [ws.id]);

      // 4. Delete Content data
      await connection.execute(
        `DELETE ca FROM content_assets ca
         JOIN content c ON ca.content_id = c.id
         WHERE c.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute(
        `DELETE cv FROM content_versions cv
         JOIN content c ON cv.content_id = c.id
         WHERE c.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute(
        `DELETE cc FROM content_comments cc
         JOIN content c ON cc.content_id = c.id
         WHERE c.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute('DELETE FROM revision_requests WHERE workspace_id = ?', [ws.id]);
      await connection.execute('DELETE FROM content_approvals WHERE workspace_id = ?', [ws.id]);
      await connection.execute(
        `DELETE cp FROM content_platforms cp
         JOIN content c ON cp.content_id = c.id
         WHERE c.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute('DELETE FROM content WHERE workspace_id = ?', [ws.id]);

      // 5. Delete Task data
      try {
        await connection.execute(
          `DELETE tc FROM task_comments tc
           JOIN tasks t ON tc.task_id = t.id
           WHERE t.workspace_id = ?`,
          [ws.id]
        );
      } catch (ignored) {}
      await connection.execute('DELETE FROM tasks WHERE workspace_id = ?', [ws.id]);

      // 6. Delete Todos
      await connection.execute('DELETE FROM todos WHERE workspace_id = ?', [ws.id]);

      // 7. Delete Notifications
      await connection.execute('DELETE FROM notifications WHERE workspace_id = ?', [ws.id]);

      // 8. Delete Activity logs
      await connection.execute('DELETE FROM activity_logs WHERE workspace_id = ?', [ws.id]);

      // 9. Delete Projects & Members
      await connection.execute(
        `DELETE pm FROM project_members pm
         JOIN projects p ON pm.project_id = p.id
         WHERE p.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute('DELETE FROM projects WHERE workspace_id = ?', [ws.id]);

      // 10. Delete Client data, Brand Assets, Brand Kits
      await connection.execute(
        `DELETE ct FROM client_team ct
         JOIN clients c ON ct.client_id = c.id
         WHERE c.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute(
        `DELETE ba FROM brand_assets ba
         JOIN brand_kits bk ON ba.brand_kit_id = bk.id
         JOIN clients c ON bk.client_id = c.id
         WHERE c.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute(
        `DELETE bk FROM brand_kits bk
         JOIN clients c ON bk.client_id = c.id
         WHERE c.workspace_id = ?`,
        [ws.id]
      );
      await connection.execute('DELETE FROM clients WHERE workspace_id = ?', [ws.id]);

      // 11. Delete Calendar events, Assets, Asset folders
      await connection.execute('DELETE FROM calendar_events WHERE workspace_id = ?', [ws.id]);
      await connection.execute('DELETE FROM assets WHERE workspace_id = ?', [ws.id]);
      await connection.execute('DELETE FROM asset_folders WHERE workspace_id = ?', [ws.id]);

      // 12. Delete legacy / ancillary tables if present
      const legacyTables = ['activities', 'approvals', 'comments', 'social_accounts', 'tags', 'team_members', 'workspace_managers'];
      for (const table of legacyTables) {
        try {
          await connection.execute(`DELETE FROM \`${table}\` WHERE workspace_id = ?`, [ws.id]);
        } catch (ignored) {}
      }

      // 13. Delete workspace_users junction entries
      await connection.execute('DELETE FROM workspace_users WHERE workspace_id = ?', [ws.id]);

      // 14. Delete the workspace row
      await connection.execute('DELETE FROM workspaces WHERE id = ?', [ws.id]);

      // 15. Delete exclusive users who belonged only to this deleted workspace (and are not superadmin)
      if (exclusiveUserIds.length > 0) {
        const placeholders = exclusiveUserIds.map(() => '?').join(',');
        await connection.execute(
          `DELETE FROM users WHERE id IN (${placeholders}) AND role_id != 1`,
          exclusiveUserIds
        );
      }

      await connection.commit();

      return {
        success: true,
        message: `Workspace "${ws.name}" and all associated data deleted successfully.`,
        workspaceId: parseInt(workspaceId, 10),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get manager for a workspace.
   */
  async getWorkspaceManager(workspaceId) {
    const [rows] = await db.execute(
      `SELECT u.id, u.full_name, u.email, u.phone, u.status, u.avatar_url, u.must_change_password, u.created_at
       FROM workspaces w
       JOIN users u ON w.owner_id = u.id
       WHERE w.id = ? AND w.deleted_at IS NULL`,
      [workspaceId]
    );

    if (rows.length === 0) {
      const error = new Error('Workspace manager not found.');
      error.status = 404;
      throw error;
    }

    return rows[0];
  }

  /**
   * Update user account details (Superadmin management).
   */
  async updateUser(userId, { fullName, email, phone, avatarUrl }) {
    const [existing] = await db.execute('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (existing.length === 0) {
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }

    await db.execute(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           avatar_url = COALESCE(?, avatar_url),
           updated_at = NOW()
       WHERE id = ?`,
      [fullName || null, email || null, phone || null, avatarUrl || null, userId]
    );

    return { success: true, userId: parseInt(userId, 10) };
  }

  /**
   * Update user status (ACTIVE, INACTIVE, SUSPENDED).
   */
  async updateUserStatus(userId, status) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid user status.');
      error.status = 400;
      throw error;
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (existing.length === 0) {
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }

    await db.execute('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', [status, userId]);
    return { success: true, userId: parseInt(userId, 10), status };
  }

  /**
   * Reset password for Workspace Manager or User.
   */
  async resetManagerPassword(userId, newPassword) {
    const [existing] = await db.execute('SELECT id, full_name, email FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (existing.length === 0) {
      const error = new Error('Workspace manager user not found.');
      error.status = 404;
      throw error;
    }

    const passwordToSet = newPassword && String(newPassword).trim() ? String(newPassword).trim() : this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(passwordToSet, 10);

    await db.execute(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE id = ?',
      [passwordHash, userId]
    );

    return {
      success: true,
      userId: parseInt(userId, 10),
      userName: existing[0].full_name,
      userEmail: existing[0].email,
      newPassword: passwordToSet,
    };
  }
}

module.exports = new SuperadminService();

