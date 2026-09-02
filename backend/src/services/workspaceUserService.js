const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../config/database');
const activityService = require('./activityService');
const { cleanupUploadedFile, uploadRoot, validateFileSignature } = require('../middleware/uploadMiddleware');

const CREATABLE_TEAM_MEMBER_ROLES = [
  'social_media_manager',
  'graphic_team_head',
  'graphic_designer',
  'video_editor',
  'content_writer',
  'reviewer',
];

const ALL_WORKSPACE_ROLES = [
  'workspace_manager',
  'team_member',
  'social_media_manager',
  'graphic_team_head',
  'graphic_designer',
  'video_editor',
  'content_writer',
  'reviewer',
];

const TEAM_MEMBER_ROLES = ALL_WORKSPACE_ROLES;

const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const PASSWORD_POLICY_MESSAGE = 'Password must be at least 12 characters and include uppercase, lowercase, and a number.';

function normalizeStatus(status) {
  if (!status) return 'ACTIVE';
  const normalized = String(status).trim().toUpperCase();
  return USER_STATUSES.includes(normalized) ? normalized : null;
}

function validatePassword(password) {
  return typeof password === 'string'
    && password.length >= 12
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password);
}

function validatePhone(phone) {
  return !phone || /^[+()\-\s0-9]{7,30}$/.test(String(phone).trim());
}

function toPublicUser(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    avatar: row.avatar || '',
    role: row.role,
    roleDisplayName: row.role_display_name,
    workspaceRole: row.workspace_role,
    jobTitle: row.job_title || '',
    department: row.department || '',
    bio: row.bio || '',
    status: row.status,
    assignedClientsCount: Number(row.assigned_clients_count || 0),
    activeTasksCount: Number(row.active_tasks_count || 0),
    assignedTasksCount: Number(row.assigned_tasks_count || 0),
    assignedContentCount: Number(row.assigned_content_count || 0),
    activityCount: Number(row.activity_count || 0),
    createdAt: row.created_at,
    assignedClients: row.assignedClients || [],
  };
}

class WorkspaceUserService {
  async getManagerWorkspaceId(creatorUser) {
    const [rows] = await db.execute(
      `SELECT wu.workspace_id
       FROM workspace_users wu
       JOIN workspaces w ON wu.workspace_id = w.id
       WHERE wu.user_id = ? AND wu.status = 'ACTIVE' AND w.status = 'ACTIVE' AND w.deleted_at IS NULL
       ORDER BY wu.created_at ASC
       LIMIT 1`,
      [creatorUser.id]
    );

    if (rows.length === 0) {
      const error = new Error('Workspace access denied. Manager is not assigned to an active workspace.');
      error.status = 403;
      throw error;
    }

    return rows[0].workspace_id;
  }

  validateTeamMemberPayload(data, { requirePassword = true } = {}) {
    const name = data.name || data.fullName;
    const email = data.email ? String(data.email).trim().toLowerCase() : '';
    const role = data.role ? String(data.role).trim() : '';
    const status = normalizeStatus(data.status);
    const password = data.password;
    const confirmPassword = data.confirmPassword;
    const phone = data.phone ? String(data.phone).trim() : '';

    if (!name || !String(name).trim()) {
      const error = new Error('Name is required.');
      error.status = 400;
      throw error;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      const error = new Error('A valid email address is required.');
      error.status = 400;
      throw error;
    }

    if (requirePassword) {
      if (!password) {
        const error = new Error('Password is required.');
        error.status = 400;
        throw error;
      }

      if (!validatePassword(password)) {
        const error = new Error(PASSWORD_POLICY_MESSAGE);
        error.status = 400;
        throw error;
      }

      if (password !== confirmPassword) {
        const error = new Error('Passwords do not match.');
        error.status = 400;
        throw error;
      }
    }

    if (!CREATABLE_TEAM_MEMBER_ROLES.includes(role)) {
      const error = new Error('Invalid role selected.');
      error.status = 400;
      throw error;
    }

    if (!status) {
      const error = new Error('Invalid user status.');
      error.status = 400;
      throw error;
    }

    if (!validatePhone(phone)) {
      const error = new Error('Please enter a valid phone number.');
      error.status = 400;
      throw error;
    }

    return {
      name: String(name).trim(),
      email,
      password,
      role,
      phone: phone || null,
      jobTitle: data.jobTitle || data.job_title || null,
      department: data.department || null,
      bio: data.bio || null,
      status,
    };
  }

  async storeProfileImage(userId, file) {
    if (!file) return null;

    const extension = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
      await cleanupUploadedFile(file);
      const error = new Error('Profile image must be a JPG, PNG, or WEBP image.');
      error.status = 400;
      throw error;
    }

    await validateFileSignature(file).catch(async () => {
      await cleanupUploadedFile(file);
      const error = new Error('Uploaded profile image is invalid.');
      error.status = 400;
      throw error;
    });

    const profilesDir = path.join(uploadRoot, 'profiles');
    await fs.promises.mkdir(profilesDir, { recursive: true });
    const storageName = `avatar_${userId}_${crypto.randomUUID()}${extension}`;
    const storagePath = path.join(profilesDir, storageName);
    await fs.promises.rename(file.path, storagePath);

    return `/api/users/${userId}/avatar`;
  }

  async loadAssignedClients(workspaceId, users) {
    if (!users.length) return users;

    const userIds = users.map((u) => u.id);
    const [rows] = await db.query(
      `SELECT ct.user_id, c.id, c.name, c.company_name as companyName, c.status
       FROM client_team ct
       JOIN clients c ON ct.client_id = c.id
       WHERE c.workspace_id = ? AND c.deleted_at IS NULL AND ct.user_id IN (?)`,
      [workspaceId, userIds]
    );

    const byUser = rows.reduce((acc, client) => {
      acc[client.user_id] = acc[client.user_id] || [];
      acc[client.user_id].push({
        id: client.id,
        name: client.companyName || client.name,
        status: client.status,
      });
      return acc;
    }, {});

    return users.map((user) => ({
      ...user,
      assignedClients: byUser[user.id] || [],
    }));
  }

  /**
   * Workspace Manager directly creates a Team Member account.
   */
  async createTeamMember(creatorUser, _workspaceId, data, profileImageFile) {
    if (creatorUser.role !== 'workspace_manager') {
      const error = new Error('Permission denied. Only Workspace Managers can add team members.');
      error.status = 403;
      throw error;
    }

    const workspaceId = await this.getManagerWorkspaceId(creatorUser);
    const payload = this.validateTeamMemberPayload(data, { requirePassword: true });

    const [existing] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL', [payload.email]);
    if (existing.length > 0) {
      const error = new Error('This email is already registered.');
      error.status = 409;
      throw error;
    }

    let avatarUrl = null;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [roles] = await connection.execute('SELECT id, display_name FROM roles WHERE name = ?', [payload.role]);
      if (roles.length === 0) {
        const error = new Error('Invalid role selected.');
        error.status = 400;
        throw error;
      }

      const passwordHash = await bcrypt.hash(payload.password, 10);
      const [userResult] = await connection.execute(
        `INSERT INTO users
         (role_id, full_name, email, password_hash, avatar_url, phone, job_title, department, bio, status, must_change_password, created_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, NOW())`,
        [
          roles[0].id,
          payload.name,
          payload.email,
          passwordHash,
          payload.phone,
          payload.jobTitle ? String(payload.jobTitle).trim() : null,
          payload.department ? String(payload.department).trim() : null,
          payload.bio ? String(payload.bio).trim() : null,
          payload.status,
        ]
      );

      const newUserId = userResult.insertId;
      avatarUrl = await this.storeProfileImage(newUserId, profileImageFile);

      if (avatarUrl) {
        await connection.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, newUserId]);
      }

      await connection.execute(
        `INSERT INTO workspace_users (workspace_id, user_id, role, status, created_at)
         VALUES (?, ?, 'MEMBER', 'ACTIVE', NOW())`,
        [workspaceId, newUserId]
      );

      await connection.execute(
        `INSERT INTO activity_logs (workspace_id, user_id, entity_type, entity_id, action, is_internal, details, created_at)
         VALUES (?, ?, 'USER', ?, 'CREATED', 1, ?, NOW())`,
        [
          workspaceId,
          creatorUser.id,
          newUserId,
          JSON.stringify({
            description: `Workspace Manager created team member ${payload.name}.`,
            created_by: creatorUser.id,
            user_id: newUserId,
          }),
        ]
      );

      await connection.commit();

      return {
        user: {
          id: newUserId,
          workspaceId,
          name: payload.name,
          email: payload.email,
          avatar: avatarUrl || '',
          role: payload.role,
          roleDisplayName: roles[0].display_name,
          phone: payload.phone || '',
          jobTitle: payload.jobTitle || '',
          department: payload.department || '',
          bio: payload.bio || '',
          status: payload.status,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      await connection.rollback();
      if (avatarUrl) {
        const avatarFileName = path.basename(avatarUrl);
        fs.promises.unlink(path.join(uploadRoot, 'profiles', avatarFileName)).catch(() => undefined);
      }
      if (profileImageFile?.path) {
        await cleanupUploadedFile(profileImageFile);
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Workspace Manager creates a Client (Client record + Client user account).
   */
  async createClient(creatorUser, workspaceId, data, file = null) {
    const {
      clientName,
      companyName,
      brandName,
      contactName,
      contactPerson,
      email,
      phone,
      whatsapp,
      industry,
      category,
      website,
      address,
      city,
      country,
      services,
      campaignPreferences,
      contentPreferences,
      socialProfiles,
      notes,
      description,
      status,
      password,
      confirmPassword,
      logoUrl,
    } = data || {};

    const finalClientName = clientName || companyName || brandName || contactName || data?.name;
    const finalContactName = contactName || contactPerson || finalClientName;

    if (!finalClientName || !email) {
      const error = new Error('Client/company name and email are required.');
      error.status = 400;
      throw error;
    }

    if (creatorUser.role !== 'superadmin' && creatorUser.role !== 'workspace_manager') {
      const error = new Error('Permission denied. Only Workspace Managers can add clients.');
      error.status = 403;
      throw error;
    }

    if (!/^\S+@\S+\.\S+$/.test(String(email).trim())) {
      const error = new Error('A valid email address is required.');
      error.status = 400;
      throw error;
    }

    if (phone && !validatePhone(phone)) {
      const error = new Error('Please enter a valid phone number.');
      error.status = 400;
      throw error;
    }

    const finalPassword = password || `Client#${Math.floor(100000 + Math.random() * 900000)}!`;

    if (password && confirmPassword && password !== confirmPassword) {
      const error = new Error('Passwords do not match.');
      error.status = 400;
      throw error;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existingClient] = await db.execute(
      'SELECT id FROM clients WHERE LOWER(email) = LOWER(?) AND workspace_id = ? AND deleted_at IS NULL',
      [normalizedEmail, workspaceId]
    );
    if (existingClient.length > 0) {
      const error = new Error('This email is already registered for another client in this workspace.');
      error.status = 409;
      throw error;
    }

    let finalLogoUrl = logoUrl || null;
    if (file) {
      const assetService = require('./assetService');
      const uploadedAsset = await assetService.createUploadedAsset(creatorUser, workspaceId, file, {
        category: 'BRAND',
        name: `${finalClientName.trim()} Logo`,
        tags: ['Logo', 'BrandKit'],
      });
      finalLogoUrl = uploadedAsset.file_url;
    }

    const clientStatus = status && ['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status.toUpperCase())
      ? status.toUpperCase()
      : 'ACTIVE';

    const socialProfilesJson = socialProfiles
      ? (typeof socialProfiles === 'string' ? socialProfiles : JSON.stringify(socialProfiles))
      : null;

    const campaignPrefsJson = campaignPreferences
      ? (typeof campaignPreferences === 'string' ? campaignPreferences : JSON.stringify(campaignPreferences))
      : null;

    const contentPrefsJson = contentPreferences
      ? (typeof contentPreferences === 'string' ? contentPreferences : JSON.stringify(contentPreferences))
      : null;

    // 1. Create record in clients table
    const [clientResult] = await db.execute(
      `INSERT INTO clients (
        workspace_id, name, company_name, email, phone, whatsapp, industry, category,
        website, address, city, country, services, campaign_preferences, content_preferences,
        social_profiles, contact_name, logo_url, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        workspaceId,
        finalClientName.trim(),
        companyName ? companyName.trim() : finalClientName.trim(),
        normalizedEmail,
        phone ? phone.trim() : null,
        whatsapp ? whatsapp.trim() : null,
        industry ? industry.trim() : null,
        category ? category.trim() : null,
        website ? website.trim() : null,
        address ? address.trim() : null,
        city ? city.trim() : null,
        country ? country.trim() : null,
        services || null,
        campaignPrefsJson,
        contentPrefsJson,
        socialProfilesJson,
        finalContactName.trim(),
        finalLogoUrl,
        clientStatus,
        notes || description || null,
      ]
    );
    const clientId = clientResult.insertId;

    // 2. Auto-provision initial Brand Kit
    try {
      await db.execute(
        `INSERT INTO brand_kits (client_id, brand_name, industry, website, description, primary_color, secondary_color, accent_color, logo_url, created_at)
         VALUES (?, ?, ?, ?, ?, '#4F39F6', '#000000', '#FFFFFF', ?, NOW())`,
        [
          clientId,
          finalClientName.trim(),
          industry ? industry.trim() : null,
          website ? website.trim() : null,
          notes || description || null,
          finalLogoUrl,
        ]
      );
    } catch (bkErr) {
      console.warn('Brand kit auto-provision warning:', bkErr.message);
    }

    // 3. Check if user account exists or create a new client user account
    let clientUserId;
    const [existingUser] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL', [normalizedEmail]);

    if (existingUser.length > 0) {
      clientUserId = existingUser[0].id;
    } else {
      const [roles] = await db.execute('SELECT id FROM roles WHERE name = "client_user" OR name = "client"');
      const roleId = roles[0] ? roles[0].id : 4;

      const passwordHash = await bcrypt.hash(finalPassword, 10);

      const [userResult] = await db.execute(
        `INSERT INTO users (role_id, full_name, email, password_hash, phone, status, must_change_password, created_at)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE', 0, NOW())`,
        [roleId, finalContactName.trim(), normalizedEmail, passwordHash, phone || null]
      );
      clientUserId = userResult.insertId;
    }

    // Link user to workspace as GUEST / CLIENT
    await db.execute(
      `INSERT INTO workspace_users (workspace_id, user_id, role, status, created_at)
       VALUES (?, ?, 'GUEST', 'ACTIVE', NOW())
       ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
      [workspaceId, clientUserId]
    );

    await db.execute(
      `INSERT INTO client_team (client_id, user_id, role, created_at)
       VALUES (?, ?, 'CLIENT_REPRESENTATIVE', NOW())
       ON DUPLICATE KEY UPDATE role = 'CLIENT_REPRESENTATIVE'`,
      [clientId, clientUserId]
    );

    // Also assign creator to client team
    if (creatorUser?.id && creatorUser.id !== clientUserId) {
      try {
        await db.execute(
          `INSERT INTO client_team (client_id, user_id, role, created_at)
           VALUES (?, ?, 'MANAGER', NOW())
           ON DUPLICATE KEY UPDATE role = 'MANAGER'`,
          [clientId, creatorUser.id]
        );
      } catch (e) {}
    }

    const createdClient = await this.getWorkspaceClient(workspaceId, clientId, creatorUser);

    return {
      client: createdClient,
      temporaryPassword: finalPassword,
      user: {
        id: clientUserId,
        email: normalizedEmail,
        fullName: finalContactName.trim(),
      },
    };
  }

  generateTemporaryPassword() {
    return 'Temp#' + crypto.randomBytes(4).toString('hex') + '!';
  }

  /**
   * List all real team members in workspace.
   */
  async listWorkspaceUsers(workspaceId, { search, role, status } = {}) {
    let query = `
      SELECT u.id, wu.workspace_id, u.full_name as name, u.email, u.phone, u.avatar_url as avatar, u.status,
             u.job_title, u.department, u.bio, u.created_at,
             r.name as role, r.display_name as role_display_name, wu.role as workspace_role,
             (SELECT COUNT(*) FROM client_team ct JOIN clients c ON c.id = ct.client_id WHERE ct.user_id = u.id AND c.workspace_id = wu.workspace_id AND c.deleted_at IS NULL) as assigned_clients_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.workspace_id = wu.workspace_id AND t.deleted_at IS NULL) as assigned_tasks_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.workspace_id = wu.workspace_id AND t.status <> 'COMPLETED' AND t.deleted_at IS NULL) as active_tasks_count,
             (SELECT COUNT(*) FROM content c WHERE c.assigned_to = u.id AND c.workspace_id = wu.workspace_id AND c.deleted_at IS NULL) as assigned_content_count,
             (SELECT COUNT(*) FROM activity_logs al WHERE al.user_id = u.id AND al.workspace_id = wu.workspace_id) as activity_count
      FROM workspace_users wu
      JOIN users u ON wu.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE wu.workspace_id = ? AND u.deleted_at IS NULL
        AND r.name IN (${TEAM_MEMBER_ROLES.map(() => '?').join(',')})
    `;
    const params = [workspaceId, ...TEAM_MEMBER_ROLES];

    const cleanStatus = status && typeof status === 'string' ? status.trim() : '';
    const isAllStatus = !cleanStatus || cleanStatus.toLowerCase() === 'all' || cleanStatus.toLowerCase() === 'all status' || cleanStatus.toLowerCase() === 'all statuses';
    const normalizedStatus = isAllStatus ? null : normalizeStatus(cleanStatus);

    if (!isAllStatus && !normalizedStatus) {
      const error = new Error('Invalid user status.');
      error.status = 400;
      throw error;
    }

    if (normalizedStatus) {
      query += ' AND u.status = ?';
      params.push(normalizedStatus);
    }

    const cleanRole = role && typeof role === 'string' ? role.trim() : '';
    const isAllRole = !cleanRole || cleanRole.toLowerCase() === 'all' || cleanRole.toLowerCase() === 'all roles';

    if (!isAllRole) {
      if (!TEAM_MEMBER_ROLES.includes(cleanRole)) {
        const error = new Error('Invalid role selected.');
        error.status = 400;
        throw error;
      }
      query += ' AND r.name = ?';
      params.push(cleanRole);
    }

    if (search && String(search).trim()) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.department LIKE ?)';
      const term = `%${String(search).trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY u.created_at DESC';

    const [rows] = await db.execute(query, params);
    const users = await this.loadAssignedClients(workspaceId, rows);
    return users.map(toPublicUser);
  }

  /**
   * Get single workspace team member.
   */
  async getWorkspaceUser(workspaceId, userId) {
    const [rows] = await db.execute(
      `SELECT u.id, wu.workspace_id, u.full_name as name, u.email, u.phone, u.avatar_url as avatar, u.status,
              u.job_title, u.department, u.bio, u.must_change_password, u.created_at,
              r.name as role, r.display_name as role_display_name, wu.role as workspace_role,
              (SELECT COUNT(*) FROM client_team ct JOIN clients c ON c.id = ct.client_id WHERE ct.user_id = u.id AND c.workspace_id = wu.workspace_id AND c.deleted_at IS NULL) as assigned_clients_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.workspace_id = wu.workspace_id AND t.deleted_at IS NULL) as assigned_tasks_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.workspace_id = wu.workspace_id AND t.status <> 'COMPLETED' AND t.deleted_at IS NULL) as active_tasks_count,
              (SELECT COUNT(*) FROM content c WHERE c.assigned_to = u.id AND c.workspace_id = wu.workspace_id AND c.deleted_at IS NULL) as assigned_content_count,
              (SELECT COUNT(*) FROM activity_logs al WHERE al.user_id = u.id AND al.workspace_id = wu.workspace_id) as activity_count
       FROM workspace_users wu
       JOIN users u ON wu.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE wu.workspace_id = ? AND u.id = ? AND u.deleted_at IS NULL
         AND r.name IN (${TEAM_MEMBER_ROLES.map(() => '?').join(',')})`,
      [workspaceId, userId, ...TEAM_MEMBER_ROLES]
    );

    if (rows.length === 0) {
      const error = new Error('Team member not found in this workspace.');
      error.status = 404;
      throw error;
    }

    const [withClients] = await this.loadAssignedClients(workspaceId, rows);
    return toPublicUser(withClients);
  }

  /**
   * Update workspace team member details.
   */
  async updateWorkspaceUser(workspaceId, userId, data, profileImageFile) {
    await this.getWorkspaceUser(workspaceId, userId);

    const nextStatus = data.status !== undefined ? normalizeStatus(data.status) : undefined;
    if (data.status !== undefined && !nextStatus) {
      const error = new Error('Invalid user status.');
      error.status = 400;
      throw error;
    }

    const nextRole = data.role !== undefined ? String(data.role).trim() : undefined;
    if (nextRole !== undefined && !TEAM_MEMBER_ROLES.includes(nextRole)) {
      const error = new Error('Invalid role selected.');
      error.status = 400;
      throw error;
    }

    if (!validatePhone(data.phone)) {
      const error = new Error('Please enter a valid phone number.');
      error.status = 400;
      throw error;
    }

    let roleId = null;
    if (nextRole) {
      const [roles] = await db.execute('SELECT id FROM roles WHERE name = ?', [nextRole]);
      if (roles.length === 0) {
        const error = new Error('Invalid role selected.');
        error.status = 400;
        throw error;
      }
      roleId = roles[0].id;
    }

    const avatarUrl = await this.storeProfileImage(userId, profileImageFile);
    const updatedName = data.fullName || data.name;

    await db.execute(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           phone = ?,
           job_title = ?,
           department = ?,
           bio = ?,
           role_id = COALESCE(?, role_id),
           avatar_url = COALESCE(?, avatar_url),
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [
        updatedName ? String(updatedName).trim() : null,
        data.phone !== undefined ? (data.phone ? String(data.phone).trim() : null) : undefined,
        data.jobTitle !== undefined || data.job_title !== undefined ? (data.jobTitle || data.job_title || null) : undefined,
        data.department !== undefined ? (data.department || null) : undefined,
        data.bio !== undefined ? (data.bio || null) : undefined,
        roleId,
        avatarUrl,
        nextStatus,
        userId,
      ].map((value) => (value === undefined ? null : value))
    );

    return this.getWorkspaceUser(workspaceId, userId);
  }

  /**
   * Update workspace user status.
   */
  async updateWorkspaceUserStatus(workspaceId, userId, status) {
    await this.getWorkspaceUser(workspaceId, userId);

    const nextStatus = normalizeStatus(status);
    if (!nextStatus) {
      const error = new Error('Invalid user status.');
      error.status = 400;
      throw error;
    }

    await db.execute('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL', [nextStatus, userId]);
    return { success: true, userId: parseInt(userId, 10), status: nextStatus };
  }

  async resetWorkspaceUserPassword(workspaceId, userId, newPassword, confirmPassword) {
    await this.getWorkspaceUser(workspaceId, userId);

    if (!newPassword) {
      const error = new Error('New password is required.');
      error.status = 400;
      throw error;
    }

    if (!validatePassword(newPassword)) {
      const error = new Error(PASSWORD_POLICY_MESSAGE);
      error.status = 400;
      throw error;
    }

    if (newPassword !== confirmPassword) {
      const error = new Error('Passwords do not match.');
      error.status = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [passwordHash, userId]
    );

    await activityService.logActivity({
      workspaceId,
      userId,
      entityType: 'USER',
      entityId: userId,
      action: 'PASSWORD_RESET',
      description: 'Workspace Manager reset a team member password.',
      isInternal: true,
    });

    return { success: true };
  }

  async loadClientAssignedTeams(workspaceId, clients) {
    if (!Array.isArray(clients) || clients.length === 0) return clients;

    const clientIds = clients.map((c) => c.id);
    const [rows] = await db.query(
      `SELECT ct.client_id, ct.role as assignment_role, ct.created_at as assigned_at,
              u.id as user_id, u.full_name as name, u.email, u.phone, u.avatar_url as avatar,
              r.name as role, r.display_name as role_display_name
       FROM client_team ct
       JOIN users u ON ct.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       JOIN workspace_users wu ON wu.user_id = u.id AND wu.workspace_id = ?
       WHERE ct.client_id IN (?) AND u.deleted_at IS NULL
       ORDER BY ct.created_at ASC`,
      [workspaceId, clientIds]
    );

    const byClient = rows.reduce((acc, row) => {
      acc[row.client_id] = acc[row.client_id] || [];
      acc[row.client_id].push({
        id: row.user_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        avatar: row.avatar,
        role: row.assignment_role && row.assignment_role !== 'MEMBER' && row.assignment_role !== 'CLIENT_REPRESENTATIVE'
          ? row.assignment_role
          : row.role,
        role_display: row.role_display_name,
        assignedAt: row.assigned_at,
      });
      return acc;
    }, {});

    return clients.map((client) => ({
      ...client,
      assignedTeam: byClient[client.id] || [],
    }));
  }

  /**
   * List all clients in workspace (filtered by user assignment for team members) with real metric counters.
   */
  async listWorkspaceClients(workspaceId, { search, status } = {}, currentUser = null) {
    let query = `
      SELECT c.id, c.name, c.company_name as companyName, c.email, c.phone, c.whatsapp,
             c.industry, c.category, c.website, c.address, c.city, c.country, c.services,
             c.campaign_preferences as campaignPreferences, c.content_preferences as contentPreferences,
             c.social_profiles as socialProfiles, c.contact_name as contactPerson,
             c.logo_url as logoUrl, c.status, c.notes, c.created_at, c.updated_at, c.archived_at,
             (SELECT COUNT(*) FROM client_team ct WHERE ct.client_id = c.id) as team_count,
             (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id AND p.workspace_id = c.workspace_id AND p.deleted_at IS NULL) as active_projects_count,
             (SELECT COUNT(*) FROM content cnt WHERE cnt.client_id = c.id AND cnt.workspace_id = c.workspace_id AND cnt.deleted_at IS NULL) as total_content_count,
             (SELECT COUNT(*) FROM content cnt WHERE cnt.client_id = c.id AND cnt.workspace_id = c.workspace_id AND cnt.status IN ('CLIENT_REVIEW', 'IN_REVIEW', 'REVIEW') AND cnt.deleted_at IS NULL) as pending_approvals_count,
             (SELECT COUNT(*) FROM content cnt WHERE cnt.client_id = c.id AND cnt.workspace_id = c.workspace_id AND cnt.status = 'APPROVED' AND cnt.deleted_at IS NULL) as approved_content_count,
             (SELECT COUNT(*) FROM content cnt WHERE cnt.client_id = c.id AND cnt.workspace_id = c.workspace_id AND cnt.status = 'SCHEDULED' AND cnt.deleted_at IS NULL) as scheduled_content_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.client_id = c.id AND t.workspace_id = c.workspace_id AND t.deleted_at IS NULL) as total_tasks_count
      FROM clients c
      WHERE c.workspace_id = ? AND c.deleted_at IS NULL
    `;
    const params = [workspaceId];

    const isManagerOrAdmin = currentUser && (currentUser.role === 'workspace_manager' || currentUser.role === 'superadmin');
    if (!isManagerOrAdmin && currentUser?.id) {
      query += ' AND c.id IN (SELECT client_id FROM client_team WHERE user_id = ?)';
      params.push(currentUser.id);
    }

    const cleanStatus = status && typeof status === 'string' ? status.trim() : '';
    const isAllStatus = !cleanStatus || cleanStatus.toLowerCase() === 'all' || cleanStatus.toLowerCase() === 'all status' || cleanStatus.toLowerCase() === 'all statuses';
    const normalizedStatus = isAllStatus ? null : normalizeStatus(cleanStatus);

    if (normalizedStatus) {
      query += ' AND c.status = ?';
      params.push(normalizedStatus);
    }

    if (search && String(search).trim()) {
      query += ' AND (c.name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR c.contact_name LIKE ? OR c.industry LIKE ? OR c.category LIKE ?)';
      const term = `%${String(search).trim()}%`;
      params.push(term, term, term, term, term, term);
    }

    query += ' ORDER BY c.created_at DESC';

    const [rows] = await db.execute(query, params);
    const clientsWithTeam = await this.loadClientAssignedTeams(workspaceId, rows);
    return clientsWithTeam.map((c) => ({
      ...c,
      socialProfiles: typeof c.socialProfiles === 'string' ? JSON.parse(c.socialProfiles) : (c.socialProfiles || null),
      campaignPreferences: typeof c.campaignPreferences === 'string' ? JSON.parse(c.campaignPreferences) : (c.campaignPreferences || null),
      contentPreferences: typeof c.contentPreferences === 'string' ? JSON.parse(c.contentPreferences) : (c.contentPreferences || null),
      activeProjectsCount: Number(c.active_projects_count || 0),
      totalContentCount: Number(c.total_content_count || 0),
      pendingApprovalsCount: Number(c.pending_approvals_count || 0),
      approvedContentCount: Number(c.approved_content_count || 0),
      scheduledContentCount: Number(c.scheduled_content_count || 0),
      totalTasksCount: Number(c.total_tasks_count || 0),
    }));
  }

  /**
   * Get single client details (with assignment authorization check).
   */
  async getWorkspaceClient(workspaceId, clientId, currentUser = null) {
    const isManagerOrAdmin = currentUser && (currentUser.role === 'workspace_manager' || currentUser.role === 'superadmin');
    if (!isManagerOrAdmin && currentUser?.id) {
      const [assignment] = await db.execute(
        'SELECT id FROM client_team WHERE client_id = ? AND user_id = ?',
        [clientId, currentUser.id]
      );
      if (assignment.length === 0) {
        const error = new Error('Access denied. You are not assigned to this client.');
        error.status = 403;
        throw error;
      }
    }

    const [rows] = await db.execute(
      `SELECT c.id, c.name, c.company_name as companyName, c.email, c.phone, c.whatsapp,
              c.industry, c.category, c.website, c.address, c.city, c.country, c.services,
              c.campaign_preferences as campaignPreferences, c.content_preferences as contentPreferences,
              c.social_profiles as socialProfiles, c.contact_name as contactPerson,
              c.logo_url as logoUrl, c.status, c.notes, c.created_at, c.updated_at, c.archived_at,
              (SELECT COUNT(*) FROM client_team ct WHERE ct.client_id = c.id) as team_count,
              (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id AND p.workspace_id = c.workspace_id AND p.deleted_at IS NULL) as active_projects_count,
              (SELECT COUNT(*) FROM content cnt WHERE cnt.client_id = c.id AND cnt.workspace_id = c.workspace_id AND cnt.deleted_at IS NULL) as total_content_count,
              (SELECT COUNT(*) FROM content cnt WHERE cnt.client_id = c.id AND cnt.workspace_id = c.workspace_id AND cnt.status IN ('CLIENT_REVIEW', 'IN_REVIEW', 'REVIEW') AND cnt.deleted_at IS NULL) as pending_approvals_count,
              (SELECT COUNT(*) FROM content cnt WHERE cnt.client_id = c.id AND cnt.workspace_id = c.workspace_id AND cnt.status = 'APPROVED' AND cnt.deleted_at IS NULL) as approved_content_count,
              (SELECT COUNT(*) FROM content cnt WHERE cnt.client_id = c.id AND cnt.workspace_id = c.workspace_id AND cnt.status = 'SCHEDULED' AND cnt.deleted_at IS NULL) as scheduled_content_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.client_id = c.id AND t.workspace_id = c.workspace_id AND t.deleted_at IS NULL) as total_tasks_count
       FROM clients c
       WHERE c.workspace_id = ? AND c.id = ? AND c.deleted_at IS NULL`,
      [workspaceId, clientId]
    );

    if (rows.length === 0) {
      const error = new Error('Client not found.');
      error.status = 404;
      throw error;
    }

    const [withTeam] = await this.loadClientAssignedTeams(workspaceId, rows);
    return {
      ...withTeam,
      socialProfiles: typeof withTeam.socialProfiles === 'string' ? JSON.parse(withTeam.socialProfiles) : (withTeam.socialProfiles || null),
      campaignPreferences: typeof withTeam.campaignPreferences === 'string' ? JSON.parse(withTeam.campaignPreferences) : (withTeam.campaignPreferences || null),
      contentPreferences: typeof withTeam.contentPreferences === 'string' ? JSON.parse(withTeam.contentPreferences) : (withTeam.contentPreferences || null),
      activeProjectsCount: Number(withTeam.active_projects_count || 0),
      totalContentCount: Number(withTeam.total_content_count || 0),
      pendingApprovalsCount: Number(withTeam.pending_approvals_count || 0),
      approvedContentCount: Number(withTeam.approved_content_count || 0),
      scheduledContentCount: Number(withTeam.scheduled_content_count || 0),
      totalTasksCount: Number(withTeam.total_tasks_count || 0),
    };
  }

  /**
   * Update client details with full profile fields.
   */
  async updateWorkspaceClient(workspaceId, clientId, data, file = null, currentUser = null) {
    const {
      name,
      companyName,
      contactName,
      contactPerson,
      email,
      phone,
      whatsapp,
      industry,
      category,
      website,
      address,
      city,
      country,
      services,
      campaignPreferences,
      contentPreferences,
      socialProfiles,
      notes,
      description,
      status,
      logoUrl,
    } = data || {};

    const [existing] = await db.execute(
      'SELECT id, name, logo_url FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [clientId, workspaceId]
    );

    if (existing.length === 0) {
      const error = new Error('Client not found.');
      error.status = 404;
      throw error;
    }

    let finalLogoUrl = logoUrl !== undefined ? logoUrl : existing[0].logo_url;
    if (file) {
      const assetService = require('./assetService');
      const uploadedAsset = await assetService.createUploadedAsset(currentUser, workspaceId, file, {
        clientId,
        category: 'BRAND',
        name: `${(name || existing[0].name)} Logo`,
        tags: ['Logo', 'BrandKit'],
      });
      finalLogoUrl = uploadedAsset.file_url;
    }

    const clientName = name || companyName;
    const finalContact = contactName || contactPerson;
    const socialProfilesJson = socialProfiles !== undefined
      ? (socialProfiles ? (typeof socialProfiles === 'string' ? socialProfiles : JSON.stringify(socialProfiles)) : null)
      : undefined;

    const campaignPrefsJson = campaignPreferences !== undefined
      ? (campaignPreferences ? (typeof campaignPreferences === 'string' ? campaignPreferences : JSON.stringify(campaignPreferences)) : null)
      : undefined;

    const contentPrefsJson = contentPreferences !== undefined
      ? (contentPreferences ? (typeof contentPreferences === 'string' ? contentPreferences : JSON.stringify(contentPreferences)) : null)
      : undefined;

    await db.execute(
      `UPDATE clients
       SET name = COALESCE(?, name),
           company_name = COALESCE(?, company_name),
           contact_name = COALESCE(?, contact_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           whatsapp = COALESCE(?, whatsapp),
           industry = COALESCE(?, industry),
           category = COALESCE(?, category),
           website = COALESCE(?, website),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           country = COALESCE(?, country),
           services = COALESCE(?, services),
           campaign_preferences = CASE WHEN ? IS NOT NULL THEN ? ELSE campaign_preferences END,
           content_preferences = CASE WHEN ? IS NOT NULL THEN ? ELSE content_preferences END,
           social_profiles = CASE WHEN ? IS NOT NULL THEN ? ELSE social_profiles END,
           notes = COALESCE(?, notes),
           status = COALESCE(?, status),
           logo_url = ?,
           updated_at = NOW()
       WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
      [
        clientName || null,
        companyName || null,
        finalContact || null,
        email || null,
        phone || null,
        whatsapp || null,
        industry || null,
        category || null,
        website || null,
        address || null,
        city || null,
        country || null,
        services || null,
        campaignPrefsJson !== undefined ? 'SET' : null,
        campaignPrefsJson || null,
        contentPrefsJson !== undefined ? 'SET' : null,
        contentPrefsJson || null,
        socialProfilesJson !== undefined ? 'SET' : null,
        socialProfilesJson || null,
        notes || description || null,
        status || null,
        finalLogoUrl || null,
        clientId,
        workspaceId,
      ]
    );

    // Sync brand_kits logo_url & brand_name
    if (finalLogoUrl !== undefined || clientName) {
      try {
        await db.execute(
          `UPDATE brand_kits
           SET logo_url = COALESCE(?, logo_url),
               brand_name = COALESCE(?, brand_name),
               updated_at = NOW()
           WHERE client_id = ?`,
          [finalLogoUrl || null, clientName || null, clientId]
        );
      } catch (e) {}
    }

    return this.getWorkspaceClient(workspaceId, clientId, currentUser);
  }

  /**
   * Upload / replace client logo directly.
   */
  async uploadClientLogo(currentUser, workspaceId, clientId, file) {
    if (!file) {
      const error = new Error('No logo file provided.');
      error.status = 400;
      throw error;
    }

    const client = await this.getWorkspaceClient(workspaceId, clientId, currentUser);
    const assetService = require('./assetService');
    const uploadedAsset = await assetService.createUploadedAsset(currentUser, workspaceId, file, {
      clientId,
      category: 'BRAND',
      name: `${client.name} Logo`,
      tags: ['Logo', 'BrandKit', 'PrimaryLogo'],
    });

    const logoUrl = uploadedAsset.file_url;
    await db.execute(
      'UPDATE clients SET logo_url = ?, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
      [logoUrl, clientId, workspaceId]
    );

    try {
      await db.execute(
        'UPDATE brand_kits SET logo_url = ?, updated_at = NOW() WHERE client_id = ?',
        [logoUrl, clientId]
      );
    } catch (e) {}

    return {
      success: true,
      message: 'Client logo updated successfully.',
      logoUrl,
      asset: uploadedAsset,
    };
  }

  /**
   * Remove client logo.
   */
  async removeClientLogo(workspaceId, clientId) {
    await db.execute(
      'UPDATE clients SET logo_url = NULL, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
      [clientId, workspaceId]
    );

    try {
      await db.execute(
        'UPDATE brand_kits SET logo_url = NULL, updated_at = NOW() WHERE client_id = ?',
        [clientId]
      );
    } catch (e) {}

    return { success: true, message: 'Client logo removed successfully.' };
  }

  /**
   * Update client status (Active, Inactive, Archived).
   */
  async updateWorkspaceClientStatus(workspaceId, clientId, status) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];
    if (!validStatuses.includes(status?.toUpperCase())) {
      const error = new Error('Invalid client status.');
      error.status = 400;
      throw error;
    }

    await db.execute(
      'UPDATE clients SET status = ?, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
      [status.toUpperCase(), clientId, workspaceId]
    );

    return { success: true, clientId: parseInt(clientId, 10), status: status.toUpperCase() };
  }

  /**
   * Soft delete client (preserves assets, content, projects, tasks).
   */
  async deleteWorkspaceClient(workspaceId, clientId) {
    const [existing] = await db.execute(
      'SELECT id, name FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [clientId, workspaceId]
    );

    if (existing.length === 0) {
      const error = new Error('Client not found.');
      error.status = 404;
      throw error;
    }

    await db.execute(
      'UPDATE clients SET deleted_at = NOW(), status = "ARCHIVED", updated_at = NOW() WHERE id = ? AND workspace_id = ?',
      [clientId, workspaceId]
    );

    return {
      success: true,
      message: `Client "${existing[0].name}" archived successfully.`,
      clientId: parseInt(clientId, 10),
    };
  }

  /**
   * Client 360 Overview Aggregator.
   */
  async getClientOverview(workspaceId, clientId, currentUser) {
    const client = await this.getWorkspaceClient(workspaceId, clientId, currentUser);

    // 1. Projects aggregation
    const [projectRows] = await db.execute(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
       FROM projects
       WHERE client_id = ? AND workspace_id = ? AND deleted_at IS NULL`,
      [clientId, workspaceId]
    );

    // 2. Content aggregation
    const [contentRows] = await db.execute(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status IN ('CLIENT_REVIEW', 'IN_REVIEW', 'REVIEW') THEN 1 ELSE 0 END) as pending_approval,
         SUM(CASE WHEN status = 'REVISION_REQUIRED' THEN 1 ELSE 0 END) as revision_required,
         SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
         SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled,
         SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) as published,
         SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as drafts
       FROM content
       WHERE client_id = ? AND workspace_id = ? AND deleted_at IS NULL`,
      [clientId, workspaceId]
    );

    // 3. Tasks aggregation
    const [taskRows] = await db.execute(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status != 'COMPLETED' AND status != 'CANCELLED' THEN 1 ELSE 0 END) as open_tasks,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_tasks,
         SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress_tasks
       FROM tasks
       WHERE client_id = ? AND workspace_id = ? AND deleted_at IS NULL`,
      [clientId, workspaceId]
    );

    // 4. Upcoming Deadlines (Tasks & Scheduled Content)
    const [upcomingTasks] = await db.execute(
      `SELECT t.id, t.title, t.due_date, t.priority, t.status, 'TASK' as item_type,
              u.full_name as assigned_name, u.avatar_url as assigned_avatar
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.client_id = ? AND t.workspace_id = ? AND t.status != 'COMPLETED' AND t.due_date IS NOT NULL AND t.deleted_at IS NULL
       ORDER BY t.due_date ASC LIMIT 5`,
      [clientId, workspaceId]
    );

    const [upcomingPosts] = await db.execute(
      `SELECT c.id, c.title, c.scheduled_at as due_date, c.status, 'CONTENT' as item_type,
              c.content_type,
              (SELECT a.file_url FROM content_assets ca JOIN assets a ON ca.asset_id = a.id WHERE ca.content_id = c.id LIMIT 1) as thumbnail_url
       FROM content c
       WHERE c.client_id = ? AND c.workspace_id = ? AND c.status = 'SCHEDULED' AND c.scheduled_at IS NOT NULL AND c.deleted_at IS NULL
       ORDER BY c.scheduled_at ASC LIMIT 5`,
      [clientId, workspaceId]
    );

    // 5. Recent Activity
    const activityService = require('./activityService');
    const recentActivity = await activityService.listActivities(workspaceId, currentUser, {
      clientId,
      limit: 8,
    });

    // 6. Recent Content items
    const recentContent = await this.getClientContent(workspaceId, clientId, currentUser, { limit: 6 });

    // 7. Recent Tasks
    const recentTasks = await this.getClientTasks(workspaceId, clientId, currentUser);

    // 8. Brand Kit Summary
    const brandKitService = require('./brandKitService');
    let brandKit = null;
    try {
      brandKit = await brandKitService.getBrandKit(workspaceId, clientId, currentUser);
    } catch (e) {}

    return {
      client,
      metrics: {
        projects: {
          total: Number(projectRows[0]?.total || 0),
          active: Number(projectRows[0]?.active || 0),
          completed: Number(projectRows[0]?.completed || 0),
        },
        content: {
          total: Number(contentRows[0]?.total || 0),
          pendingApproval: Number(contentRows[0]?.pending_approval || 0),
          revisionRequired: Number(contentRows[0]?.revision_required || 0),
          approved: Number(contentRows[0]?.approved || 0),
          scheduled: Number(contentRows[0]?.scheduled || 0),
          published: Number(contentRows[0]?.published || 0),
          drafts: Number(contentRows[0]?.drafts || 0),
        },
        tasks: {
          total: Number(taskRows[0]?.total || 0),
          open: Number(taskRows[0]?.open_tasks || 0),
          completed: Number(taskRows[0]?.completed_tasks || 0),
          inProgress: Number(taskRows[0]?.in_progress_tasks || 0),
        },
      },
      upcomingDeadlines: [...upcomingTasks, ...upcomingPosts].sort(
        (a, b) => new Date(a.due_date) - new Date(b.due_date)
      ),
      recentContent: recentContent.slice(0, 6),
      recentTasks: recentTasks.slice(0, 6),
      recentActivity,
      brandKit,
    };
  }

  /**
   * Client Content items query.
   */
  async getClientContent(workspaceId, clientId, currentUser, filters = {}) {
    await this.getWorkspaceClient(workspaceId, clientId, currentUser);
    const { status, platform, search, limit = 50 } = filters;

    let query = `
      SELECT c.id, c.workspace_id, c.client_id, c.project_id, c.title, c.caption, c.content_type,
             c.status, c.scheduled_at as scheduled_publish_time, c.published_at as published_time,
             (SELECT a.file_url FROM content_assets ca JOIN assets a ON ca.asset_id = a.id WHERE ca.content_id = c.id LIMIT 1) as thumbnail_url,
             c.created_at, c.updated_at,
             p.name as project_name,
             u.full_name as author_name, u.avatar_url as author_avatar,
             (SELECT GROUP_CONCAT(DISTINCT cp.platform) FROM content_platforms cp WHERE cp.content_id = c.id) as platforms
      FROM content c
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.workspace_id = ? AND c.client_id = ? AND c.deleted_at IS NULL
    `;
    const params = [workspaceId, clientId];

    if (status && status !== 'All') {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (search && String(search).trim()) {
      query += ' AND (c.title LIKE ? OR c.caption LIKE ?)';
      const term = `%${String(search).trim()}%`;
      params.push(term, term);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await db.execute(query, params);
    return rows.map((r) => ({
      ...r,
      platforms: r.platforms ? r.platforms.split(',') : [],
    }));
  }

  /**
   * Client Projects query.
   */
  async getClientProjects(workspaceId, clientId, currentUser) {
    await this.getWorkspaceClient(workspaceId, clientId, currentUser);
    const [rows] = await db.execute(
      `SELECT p.id, p.name, p.description, p.status, p.start_date, p.due_date, p.created_at, p.updated_at,
              (SELECT COUNT(*) FROM content c WHERE c.project_id = p.id AND c.deleted_at IS NULL) as content_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) as task_count,
              (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
       FROM projects p
       WHERE p.workspace_id = ? AND p.client_id = ? AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`,
      [workspaceId, clientId]
    );
    return rows;
  }

  /**
   * Client Tasks query.
   */
  async getClientTasks(workspaceId, clientId, currentUser, filters = {}) {
    await this.getWorkspaceClient(workspaceId, clientId, currentUser);
    const { status, priority, limit = 50 } = filters;

    let query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at, t.updated_at,
             p.name as project_name,
             u.id as assignee_id, u.full_name as assignee_name, u.avatar_url as assignee_avatar,
             creator.full_name as creator_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.workspace_id = ? AND t.client_id = ? AND t.deleted_at IS NULL
    `;
    const params = [workspaceId, clientId];

    if (status && status !== 'All') {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (priority && priority !== 'All') {
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * Client Assets query.
   */
  async getClientAssets(workspaceId, clientId, currentUser, filters = {}) {
    await this.getWorkspaceClient(workspaceId, clientId, currentUser);
    const { type, limit = 60 } = filters;

    let query = `
      SELECT a.id, a.display_name, a.file_name, a.file_url, a.file_type, a.file_size, a.mime_type,
             a.category, a.tags, a.created_at,
             u.full_name as uploader_name
      FROM assets a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.workspace_id = ? AND a.client_id = ? AND a.deleted_at IS NULL
    `;
    const params = [workspaceId, clientId];

    if (type && type !== 'All') {
      query += ' AND a.file_type = ?';
      params.push(type.toUpperCase());
    }

    query += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await db.execute(query, params);
    return rows;
  }
}

module.exports = new WorkspaceUserService();
module.exports.TEAM_MEMBER_ROLES = TEAM_MEMBER_ROLES;
