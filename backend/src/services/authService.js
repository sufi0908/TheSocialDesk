const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const authQueries = require('../queries/authQueries');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production.');
}

const jwtSecret = JWT_SECRET || 'development-only-socialdesk-jwt-secret';

/**
 * Service to handle authentication business logic.
 */
class AuthService {
  /**
   * Authenticate user with email and password.
   */
  async login(email, password) {
    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.status = 400;
      throw error;
    }

    // Fetch user by email
    const [users] = await db.execute(authQueries.FIND_USER_BY_EMAIL, [email.trim()]);
    const user = users[0];

    // Generic error message to prevent account enumeration
    if (!user) {
      const error = new Error('Invalid email or password.');
      error.status = 401;
      throw error;
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      const error = new Error(`Account authentication failed. Account status: ${user.status}.`);
      error.status = 403;
      throw error;
    }

    // Compare password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password.');
      error.status = 401;
      throw error;
    }

    // Fetch primary workspace and check status
    const [workspaces] = await db.execute(authQueries.GET_USER_WORKSPACE, [user.id]);
    const workspace = workspaces[0] || null;

    if (user.role_name !== 'superadmin' && workspace && (workspace.workspace_status === 'SUSPENDED' || workspace.workspace_status !== 'ACTIVE')) {
      const error = new Error('Your workspace has been temporarily suspended by the administrator. Please contact your workspace administrator.');
      error.status = 403;
      error.code = 'WORKSPACE_SUSPENDED';
      throw error;
    }

    // Generate JWT Token with minimal necessary claims
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role_name,
    };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' });

    // If client user, fetch associated client company details
    let clientId = null;
    let clientName = null;
    if (user.role_name === 'client_user' || user.role_name === 'client') {
      const [clientRows] = await db.execute(
        `SELECT c.id, c.company_name, c.name FROM clients c
         JOIN client_team ct ON c.id = ct.client_id
         WHERE ct.user_id = ? AND c.deleted_at IS NULL LIMIT 1`,
        [user.id]
      );
      if (clientRows[0]) {
        clientId = clientRows[0].id;
        clientName = clientRows[0].company_name || clientRows[0].name;
      }
    }

    // Safe user object (never return password_hash)
    const safeUser = {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role_name,
      roleDisplayName: user.role_display_name,
      status: user.status,
      mustChangePassword: Boolean(user.must_change_password),
      avatar: user.avatar_url || '',
      phone: user.phone || '',
      jobTitle: user.job_title || '',
      department: user.department || '',
      bio: user.bio || '',
      clientId,
      clientName,
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            role: workspace.workspace_role,
            status: workspace.workspace_status,
          }
        : null,
    };

    return {
      token,
      user: safeUser,
    };
  }

  /**
   * Get current authenticated user details.
   */
  async getCurrentUser(userId) {
    const [users] = await db.execute(authQueries.FIND_USER_BY_ID, [userId]);
    const user = users[0];

    if (!user) {
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }

    const [workspaces] = await db.execute(authQueries.GET_USER_WORKSPACE, [user.id]);
    const workspace = workspaces[0] || null;

    // If client user, fetch associated client company details
    let clientId = null;
    let clientName = null;
    if (user.role_name === 'client_user' || user.role_name === 'client') {
      const [clientRows] = await db.execute(
        `SELECT c.id, c.company_name, c.name FROM clients c
         JOIN client_team ct ON c.id = ct.client_id
         WHERE ct.user_id = ? AND c.deleted_at IS NULL LIMIT 1`,
        [user.id]
      );
      if (clientRows[0]) {
        clientId = clientRows[0].id;
        clientName = clientRows[0].company_name || clientRows[0].name;
      }
    }

    return {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role_name,
      roleDisplayName: user.role_display_name,
      status: user.status,
      mustChangePassword: Boolean(user.must_change_password),
      avatar: user.avatar_url || '',
      phone: user.phone || '',
      jobTitle: user.job_title || '',
      department: user.department || '',
      bio: user.bio || '',
      clientId,
      clientName,
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            role: workspace.workspace_role,
            status: workspace.workspace_status,
          }
        : null,
    };
  }

  /**
   * Change current user's password.
   */
  async changePassword(userId, currentPassword, newPassword, confirmNewPassword) {
    if (!currentPassword || !newPassword) {
      const error = new Error('Current password and new password are required.');
      error.status = 400;
      throw error;
    }

    if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
      const error = new Error('New password and password confirmation do not match.');
      error.status = 400;
      throw error;
    }

    if (newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      const error = new Error('New password must be at least 12 characters and include uppercase, lowercase, and a number.');
      error.status = 400;
      throw error;
    }

    // Fetch user password hash
    const [users] = await db.execute(
      'SELECT id, password_hash FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    );
    const user = users[0];

    if (!user) {
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      const error = new Error('Current password is incorrect.');
      error.status = 400;
      throw error;
    }

    // Hash new password and clear must_change_password flag
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.execute(authQueries.UPDATE_USER_PASSWORD, [newHash, userId]);

    return { success: true, message: 'Password changed successfully.' };
  }

  /**
   * Architecture for forgot password request.
   */
  async requestPasswordReset(email) {
    if (!email) {
      const error = new Error('Email address is required.');
      error.status = 400;
      throw error;
    }

    const [users] = await db.execute('SELECT id, email FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL', [email.trim()]);
    const user = users[0];

    if (user) {
      console.log(`[Auth Architecture] Password reset link requested for user ${user.email}`);
    }

    return {
      success: true,
      message: 'If an account with that email exists, reset instructions have been sent.',
    };
  }

  /**
   * Architecture for resetting password using reset token.
   */
  async resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      const error = new Error('Token and new password are required.');
      error.status = 400;
      throw error;
    }

    if (newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      const error = new Error('New password must be at least 12 characters and include uppercase, lowercase, and a number.');
      error.status = 400;
      throw error;
    }

    const error = new Error('Password reset is not available until a valid reset token provider is configured.');
    error.status = 501;
    throw error;
  }
}

module.exports = new AuthService();
