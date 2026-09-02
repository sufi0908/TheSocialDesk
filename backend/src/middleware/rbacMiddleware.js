const { db } = require('../config/database');

/**
 * Middleware to restrict access by role.
 * Supports core system roles (superadmin, workspace_manager, team_member, client_user)
 * and sub-role aliases.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = req.user.role; // e.g. 'superadmin', 'workspace_manager', 'team_member', 'client_user'

    const isAllowed = allowedRoles.some((role) => {
      if (role === userRole) return true;
      // Handle legacy & sub-role aliases
      if (
        role === 'team_member' &&
        [
          'social_media_manager',
          'graphic_team_head',
          'graphic_designer',
          'video_editor',
          'content_writer',
          'reviewer',
        ].includes(userRole)
      ) {
        return true;
      }
      if (role === 'client' && (userRole === 'client_user' || userRole === 'client')) return true;
      if (role === 'client_user' && (userRole === 'client' || userRole === 'client_user')) return true;
      return false;
    });

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. You are not authorized to access this resource.',
      });
    }

    next();
  };
}

/**
 * Helper to safely extract integer ID from params, query, body, or headers
 */
function getRequestedId(req, paramKey, queryKey, bodyKey) {
  const paramVal = req.params ? req.params[paramKey] : undefined;
  const queryVal = req.query ? (req.query[queryKey] ?? req.query[paramKey]) : undefined;
  const bodyVal = req.body ? (req.body[bodyKey] ?? req.body[paramKey]) : undefined;
  const headerKey1 = `x-${String(paramKey || '').toLowerCase()}`;
  const headerKey2 = `x-${String(queryKey || '').replace(/_/g, '-').toLowerCase()}`;
  const headerVal = req.headers ? (req.headers[headerKey1] ?? req.headers[headerKey2]) : undefined;

  const val = paramVal ?? queryVal ?? bodyVal ?? headerVal;
  if (
    val === undefined ||
    val === null ||
    val === '' ||
    val === 'undefined' ||
    val === 'null' ||
    val === 'NaN' ||
    val === '[object Object]'
  ) {
    return null;
  }
  const normalized = String(val).trim();
  return /^\d+$/.test(normalized) && Number(normalized) > 0 ? Number(normalized) : NaN;
}

/**
 * Middleware to enforce workspace isolation.
 * Ensures users can only access data belonging to their workspace.
 */
async function requireWorkspaceAccess(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const requestedWorkspaceId = getRequestedId(req, 'workspaceId', 'workspace_id', 'workspace_id');

    // Superadmin has global access
    if (req.user.role === 'superadmin') {
      if (requestedWorkspaceId && !Number.isNaN(requestedWorkspaceId)) {
        req.workspaceId = requestedWorkspaceId;
      } else {
        const [ws] = await db.execute('SELECT id FROM workspaces WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 1');
        req.workspaceId = ws[0] ? ws[0].id : 1;
      }
      return next();
    }

    // Fetch workspace memberships for current user
    const [memberships] = await db.execute(
      `SELECT wu.workspace_id, w.status as workspace_status
       FROM workspace_users wu
       JOIN workspaces w ON wu.workspace_id = w.id
       WHERE wu.user_id = ? AND wu.status = 'ACTIVE' AND w.deleted_at IS NULL`,
      [req.user.id]
    );

    if (memberships.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Workspace access denied. User is not assigned to an active workspace.',
      });
    }

    const userWorkspaceIds = memberships.map((m) => m.workspace_id);

    // If frontend explicitly requests a valid specific workspace ID, verify access
    let selectedMembership;
    if (requestedWorkspaceId && !Number.isNaN(requestedWorkspaceId)) {
      selectedMembership = memberships.find((m) => m.workspace_id === requestedWorkspaceId);
      if (!selectedMembership) {
        return res.status(403).json({
          success: false,
          message: 'Workspace access denied. Unauthorized workspace data request.',
        });
      }
      req.workspaceId = requestedWorkspaceId;
    } else {
      // Default to user's primary workspace
      selectedMembership = memberships[0];
      req.workspaceId = selectedMembership.workspace_id;
    }

    // Check if workspace is suspended or inactive
    if (selectedMembership.workspace_status === 'SUSPENDED' || selectedMembership.workspace_status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        code: 'WORKSPACE_SUSPENDED',
        message: 'Your workspace has been temporarily suspended by the administrator. Please contact your workspace administrator.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to enforce client data isolation.
 * Prevents Client A from accessing Client B data.
 */
async function requireClientAccess(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userRole = req.user.role;
    const isClientRole = userRole === 'client' || userRole === 'client_user';
    const requestedClientId = getRequestedId(req, 'clientId', 'client_id', 'client_id');

    if (Number.isNaN(requestedClientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID.' });
    }

    if (isClientRole) {
      // Find assigned client profile for this client user
      const [clientRecords] = await db.execute(
        `SELECT id FROM clients 
         WHERE (LOWER(email) = LOWER(?) OR id IN (SELECT client_id FROM client_team WHERE user_id = ?))
           AND deleted_at IS NULL
         LIMIT 1`,
        [req.user.email, req.user.id]
      );

      if (clientRecords.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Client access denied. No associated client profile found.',
        });
      }

      const assignedClientId = clientRecords[0].id;

      if (requestedClientId && requestedClientId !== assignedClientId) {
        return res.status(403).json({
          success: false,
          message: 'Client access denied. Cannot access another client data.',
        });
      }

      req.clientId = assignedClientId;
      return next();
    }

    // For agency members (Workspace Manager / Team Member), verify requested client belongs to user's workspace
    if (requestedClientId) {
      const [clients] = await db.execute(
        `SELECT id, workspace_id FROM clients WHERE id = ? AND deleted_at IS NULL`,
        [requestedClientId]
      );

      if (clients.length === 0) {
        return res.status(404).json({ success: false, message: 'Client not found.' });
      }

      if (
        req.user.role !== 'superadmin' &&
        req.workspaceId &&
        clients[0].workspace_id !== req.workspaceId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Client access denied. Client belongs to another workspace.',
        });
      }

      req.clientId = requestedClientId;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Composite permission check helper.
 */
function requirePermission(permissionName) {
  return (req, res, next) => {
    const permissions = req.user && req.user.permissions;
    if (!Array.isArray(permissions) || !permissions.includes(permissionName)) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    next();
  };
}

module.exports = {
  requireRole,
  requireWorkspaceAccess,
  requireClientAccess,
  requirePermission,
};
