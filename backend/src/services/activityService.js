const { db } = require('../config/database');

class ActivityService {
  /**
   * Record audit activity log.
   */
  async logActivity(data) {
    const { workspaceId, clientId, userId, entityType, entityId, action, description, details, isInternal } = data;

    if (!entityType || !entityId || !action) {
      return null;
    }

    const payloadDetails = details || (description ? { description } : null);

    const [result] = await db.execute(
      `INSERT INTO activity_logs (workspace_id, client_id, user_id, entity_type, entity_id, action, is_internal, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        workspaceId || null,
        clientId || null,
        userId || null,
        entityType.toUpperCase(),
        entityId,
        action.toUpperCase(),
        isInternal ? 1 : 0,
        payloadDetails ? JSON.stringify(payloadDetails) : null,
      ]
    );

    return {
      id: result.insertId,
      workspaceId,
      clientId,
      userId,
      entityType,
      entityId,
      action,
      isInternal: Boolean(isInternal),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieve workspace activity logs with privacy security boundary.
   */
  async listActivities(workspaceId, currentUser, filters = {}) {
    const { entityType, userId, clientId, limit = 50 } = filters;

    let query = `
      SELECT al.id, al.workspace_id, al.client_id, al.user_id, al.entity_type, al.entity_id,
             al.action, al.is_internal, al.details, al.created_at,
             u.full_name as user_name, u.email as user_email, r.name as user_role,
             cli.name as client_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN clients cli ON al.client_id = cli.id
      WHERE al.workspace_id = ?
    `;
    const params = [workspaceId];

    // Client Security Guard: Clients CANNOT see internal activities
    if (currentUser && (currentUser.role === 'client_user' || currentUser.role === 'client')) {
      query += ' AND al.is_internal = 0 AND al.client_id IN (SELECT client_id FROM client_team WHERE user_id = ?)';
      params.push(currentUser.id);
    } else {
      if (clientId) {
        query += ' AND al.client_id = ?';
        params.push(clientId);
      }
    }

    if (entityType) {
      query += ' AND al.entity_type = ?';
      params.push(entityType.toUpperCase());
    }

    if (userId) {
      query += ' AND al.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await db.execute(query, params);

    return rows.map((a) => {
      let parsedDetails = a.details;
      if (typeof a.details === 'string') {
        try {
          parsedDetails = JSON.parse(a.details);
        } catch (e) {
          parsedDetails = { description: a.details };
        }
      }
      return {
        id: a.id,
        workspaceId: a.workspace_id,
        clientId: a.client_id,
        clientName: a.client_name,
        userId: a.user_id,
        userName: a.user_name || 'System',
        userRole: a.user_role,
        entityType: a.entity_type,
        entityId: a.entity_id,
        action: a.action,
        isInternal: Boolean(a.is_internal),
        description: parsedDetails?.description || `${a.user_name || 'User'} performed ${a.action} on ${a.entity_type} #${a.entity_id}`,
        details: parsedDetails,
        timestamp: a.created_at,
      };
    });
  }
}

module.exports = new ActivityService();
