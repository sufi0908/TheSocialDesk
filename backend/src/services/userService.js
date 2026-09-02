const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { db } = require('../config/database');

class UserService {
  /**
   * Helper to generate a random 12-char secure temporary password
   */
  generateTemporaryPassword() {
    return 'Temp#' + crypto.randomBytes(4).toString('hex') + '!';
  }

  /**
   * Create user account (Admin Controlled).
   */
  async createUser(creatorUser, { fullName, email, roleName, workspaceId }) {
    if (!fullName || !email || !roleName) {
      const error = new Error('Full name, email, and role are required.');
      error.status = 400;
      throw error;
    }

    const isSuperadmin = creatorUser.role === 'superadmin';
    const isWorkspaceManager = creatorUser.role === 'workspace_manager';

    if (!isSuperadmin && !isWorkspaceManager) {
      const error = new Error('Permission denied. Only authorized administrators can create accounts.');
      error.status = 403;
      throw error;
    }

    if (isWorkspaceManager) {
      if (roleName === 'superadmin' || roleName === 'workspace_manager') {
        const error = new Error('Workspace Managers cannot create Superadmin or Workspace Manager accounts.');
        error.status = 403;
        throw error;
      }
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      const error = new Error('A valid email address is required.');
      error.status = 400;
      throw error;
    }

    if (isWorkspaceManager && workspaceId !== undefined && workspaceId !== null) {
      const [memberships] = await db.execute(
        `SELECT workspace_id
         FROM workspace_users
         WHERE workspace_id = ? AND user_id = ? AND status = 'ACTIVE'`,
        [workspaceId, creatorUser.id]
      );
      if (memberships.length === 0) {
        const error = new Error('Permission denied. You can only create users in your workspace.');
        error.status = 403;
        throw error;
      }
    }

    // Ensure email is unique
    const [existingUsers] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existingUsers.length > 0) {
      const error = new Error('An account with this email address already exists.');
      error.status = 409;
      throw error;
    }

    // Map agency sub-roles to core system roles
    const roleMapping = {
      social_media_manager: 'team_member',
      graphic_team_head: 'team_member',
      graphic_designer: 'team_member',
      video_editor: 'team_member',
      content_writer: 'team_member',
      reviewer: 'team_member',
      client: 'client_user',
    };

    const targetRoleName = roleMapping[roleName] || roleName;

    // Find role_id
    const [roles] = await db.execute('SELECT id, name FROM roles WHERE name = ? OR name = ?', [
      targetRoleName,
      targetRoleName.toLowerCase(),
    ]);
    if (roles.length === 0) {
      const error = new Error(`Invalid role specified: ${roleName}`);
      error.status = 400;
      throw error;
    }
    const roleId = roles[0].id;
    const finalRoleName = roles[0].name;

    // Generate temporary password
    const tempPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Insert user into database with must_change_password = 1
    const [userResult] = await db.execute(
      `INSERT INTO users (role_id, full_name, email, password_hash, status, must_change_password, created_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', 1, NOW())`,
      [roleId, fullName.trim(), email.trim(), passwordHash]
    );
    const newUserId = userResult.insertId;

    // Attach user to workspace if workspaceId provided or creator is Workspace Manager
    let targetWorkspaceId = workspaceId;
    if (isWorkspaceManager && !targetWorkspaceId) {
      const [userWorkspaces] = await db.execute(
        'SELECT workspace_id FROM workspace_users WHERE user_id = ? LIMIT 1',
        [creatorUser.id]
      );
      if (userWorkspaces.length > 0) {
        targetWorkspaceId = userWorkspaces[0].workspace_id;
      }
    }

    if (targetWorkspaceId) {
      const wuRole = roleName === 'client' || roleName === 'client_user' ? 'GUEST' : 'MEMBER';
      await db.execute(
        `INSERT INTO workspace_users (workspace_id, user_id, role, status, created_at)
         VALUES (?, ?, ?, 'ACTIVE', NOW())`,
        [targetWorkspaceId, newUserId, wuRole]
      );
    }

    return {
      user: {
        id: newUserId,
        fullName: fullName.trim(),
        email: email.trim(),
        role: roleName,
        mustChangePassword: true,
      },
      temporaryPassword: tempPassword,
    };
  }

  /**
   * Upload / Update user avatar.
   */
  async updateAvatar(currentUser, file) {
    if (!file) {
      const error = new Error('An image file is required.');
      error.status = 400;
      throw error;
    }

    const { uploadRoot, cleanupUploadedFile } = require('../middleware/uploadMiddleware');
    const path = require('path');
    const fs = require('fs');
    const crypto = require('crypto');

    const extension = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(extension)) {
      await cleanupUploadedFile(file);
      const error = new Error('Avatar must be an image (JPG, PNG, WEBP, SVG).');
      error.status = 400;
      throw error;
    }

    // Get current user avatar to delete old file if it was a local storage file
    const [users] = await db.execute('SELECT id, avatar_url FROM users WHERE id = ?', [currentUser.id]);
    if (users.length === 0) {
      await cleanupUploadedFile(file);
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }

    const profilesDir = path.join(uploadRoot, 'profiles');
    await fs.promises.mkdir(profilesDir, { recursive: true });
    const storageName = `avatar_${currentUser.id}_${crypto.randomUUID()}${extension}`;
    const storagePath = path.join(profilesDir, storageName);
    await fs.promises.rename(file.path, storagePath);

    const avatarUrl = `/api/users/${currentUser.id}/avatar`;
    await db.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, currentUser.id]);

    return {
      success: true,
      message: 'Avatar uploaded successfully.',
      avatarUrl,
      userId: currentUser.id,
    };
  }

  /**
   * Remove user avatar.
   */
  async removeAvatar(currentUser) {
    await db.execute('UPDATE users SET avatar_url = NULL WHERE id = ?', [currentUser.id]);
    return {
      success: true,
      message: 'Avatar removed successfully.',
      avatarUrl: null,
      userId: currentUser.id,
    };
  }

  /**
   * Get user avatar file.
   */
  async getAvatarFile(userId) {
    const { uploadRoot } = require('../middleware/uploadMiddleware');
    const path = require('path');
    const fs = require('fs');

    const profilesDir = path.join(uploadRoot, 'profiles');
    await fs.promises.mkdir(profilesDir, { recursive: true });

    // Look for matching avatar file for this user in profiles/
    const files = await fs.promises.readdir(profilesDir);
    const userAvatar = files.find((f) => f.startsWith(`avatar_${userId}_`));

    if (!userAvatar) {
      const error = new Error('Avatar image not found.');
      error.status = 404;
      throw error;
    }

    const filePath = path.join(profilesDir, userAvatar);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    return {
      filePath,
      mimeType: mimeMap[ext] || 'application/octet-stream',
    };
  }
}

module.exports = new UserService();

