const { db } = require('../config/database');
const notificationService = require('./notificationService');

class AssignmentService {
  /**
   * Assign single team member or sync bulk team to a client.
   */
  async assignTeamMemberToClient(workspaceId, clientId, data = {}) {
    // 1. Verify client belongs to workspace
    const [clients] = await db.execute(
      'SELECT id, name, company_name FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [clientId, workspaceId]
    );
    if (clients.length === 0) {
      const error = new Error('Client not found or does not belong to your workspace.');
      error.status = 404;
      throw error;
    }
    const clientName = clients[0].company_name || clients[0].name;

    // Handle Bulk Sync if teamMemberIds or team array is provided
    const teamArray = Array.isArray(data.team)
      ? data.team
      : Array.isArray(data.teamMemberIds)
        ? data.teamMemberIds.map((id) => ({ id, role: 'MEMBER' }))
        : Array.isArray(data.team_members)
          ? data.team_members
          : null;

    if (teamArray) {
      // Filter user IDs and verify workspace membership
      const validMembers = [];
      for (const item of teamArray) {
        const uId = typeof item === 'object' ? item.id : item;
        const uRole = typeof item === 'object' ? item.role : 'MEMBER';
        if (uId && !isNaN(uId)) {
          const parsedId = parseInt(uId, 10);
          const [wu] = await db.execute(
            'SELECT user_id FROM workspace_users WHERE user_id = ? AND workspace_id = ? AND status = "ACTIVE"',
            [parsedId, workspaceId]
          );
          if (wu.length > 0) {
            validMembers.push({ id: parsedId, role: uRole || 'MEMBER' });
          }
        }
      }

      // Delete non-client-representative assignments for this client
      await db.execute(
        'DELETE FROM client_team WHERE client_id = ? AND role <> "CLIENT_REPRESENTATIVE"',
        [clientId]
      );

      // Insert new team member assignments & send notifications
      for (const m of validMembers) {
        await db.execute(
          `INSERT INTO client_team (client_id, user_id, role, created_at)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE role = VALUES(role)`,
          [clientId, m.id, m.role]
        );

        // Notify assigned team member
        try {
          await notificationService.createNotification({
            userId: m.id,
            workspaceId,
            title: 'New Client Assigned',
            message: `${clientName} has been assigned to you.`,
            type: 'CLIENT_ASSIGNMENT',
            link: '/workspace/clients',
          });
        } catch (e) {
          console.warn('Failed to send client assignment notification:', e.message);
        }
      }

      const assignedTeam = await this.getClientTeam(workspaceId, clientId);
      return {
        success: true,
        message: 'Client team assigned successfully.',
        clientId: parseInt(clientId, 10),
        assignedTeam,
      };
    }

    // Handle Single User Assignment
    const userId = data.userId || data.id;
    const role = data.role || 'MEMBER';

    if (!userId) {
      const error = new Error('User ID is required.');
      error.status = 400;
      throw error;
    }

    // Verify target user belongs to workspace
    const [workspaceUsers] = await db.execute(
      'SELECT user_id FROM workspace_users WHERE user_id = ? AND workspace_id = ? AND status = "ACTIVE"',
      [userId, workspaceId]
    );
    if (workspaceUsers.length === 0) {
      const error = new Error('Target user does not belong to your workspace.');
      error.status = 400;
      throw error;
    }

    // Insert or update assignment in client_team
    await db.execute(
      `INSERT INTO client_team (client_id, user_id, role, created_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [clientId, userId, role]
    );

    // Notify assigned team member
    try {
      await notificationService.createNotification({
        userId,
        workspaceId,
        title: 'New Client Assigned',
        message: `${clientName} has been assigned to you.`,
        type: 'CLIENT_ASSIGNMENT',
        link: '/workspace/clients',
      });
    } catch (e) {
      console.warn('Failed to send client assignment notification:', e.message);
    }

    const assignedTeam = await this.getClientTeam(workspaceId, clientId);
    return {
      success: true,
      message: 'Team member assigned to client successfully.',
      clientId: parseInt(clientId, 10),
      userId: parseInt(userId, 10),
      role,
      assignedTeam,
    };
  }

  /**
   * Remove team member from client.
   */
  async removeTeamMemberFromClient(workspaceId, clientId, userId) {
    // Verify client belongs to workspace
    const [clients] = await db.execute(
      'SELECT id, name, company_name FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [clientId, workspaceId]
    );
    if (clients.length === 0) {
      const error = new Error('Client not found or does not belong to your workspace.');
      error.status = 404;
      throw error;
    }
    const clientName = clients[0].company_name || clients[0].name;

    await db.execute('DELETE FROM client_team WHERE client_id = ? AND user_id = ?', [clientId, userId]);

    // Notify user of assignment removal
    try {
      await notificationService.createNotification({
        userId,
        workspaceId,
        title: 'Client Assignment Removed',
        message: `Your assignment to ${clientName} has been removed.`,
        type: 'CLIENT_ASSIGNMENT_REMOVED',
        link: '/workspace/clients',
      });
    } catch (e) {
      console.warn('Failed to send removal notification:', e.message);
    }

    return {
      success: true,
      message: 'Team member removed from client assignment.',
      clientId: parseInt(clientId, 10),
      userId: parseInt(userId, 10),
    };
  }

  /**
   * Get assigned team for a client.
   */
  async getClientTeam(workspaceId, clientId) {
    const [clients] = await db.execute(
      'SELECT id FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [clientId, workspaceId]
    );
    if (clients.length === 0) {
      const error = new Error('Client not found or does not belong to your workspace.');
      error.status = 404;
      throw error;
    }

    const [rows] = await db.execute(
      `SELECT ct.id as assignment_id, ct.role as assignment_role, ct.created_at as assigned_at,
              u.id as user_id, u.full_name as name, u.email, u.phone, u.avatar_url as avatar,
              r.name as system_role, r.display_name as system_role_display
       FROM client_team ct
       JOIN users u ON ct.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE ct.client_id = ? AND u.deleted_at IS NULL
       ORDER BY ct.created_at ASC`,
      [clientId]
    );

    return rows;
  }

  /**
   * Get team member's assigned clients.
   */
  async getUserAssignedClients(workspaceId, userId) {
    const [rows] = await db.execute(
      `SELECT c.id, c.name, c.company_name as companyName, c.email, c.phone, c.logo_url as logoUrl, c.status, ct.role as assigned_role
       FROM client_team ct
       JOIN clients c ON ct.client_id = c.id
       WHERE ct.user_id = ? AND c.workspace_id = ? AND c.deleted_at IS NULL
       ORDER BY c.name ASC`,
      [userId, workspaceId]
    );

    return rows;
  }

  /**
   * Assign member to project.
   */
  async assignMemberToProject(workspaceId, projectId, { userId, role }) {
    if (!userId) {
      const error = new Error('User ID is required.');
      error.status = 400;
      throw error;
    }

    const [projects] = await db.execute(
      'SELECT id, name FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [projectId, workspaceId]
    );
    if (projects.length === 0) {
      const error = new Error('Project not found or does not belong to your workspace.');
      error.status = 404;
      throw error;
    }

    const [workspaceUsers] = await db.execute(
      'SELECT user_id FROM workspace_users WHERE user_id = ? AND workspace_id = ? AND status = "ACTIVE"',
      [userId, workspaceId]
    );
    if (workspaceUsers.length === 0) {
      const error = new Error('Target user does not belong to your workspace.');
      error.status = 400;
      throw error;
    }

    await db.execute(
      `INSERT INTO project_members (project_id, user_id, role, created_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [projectId, userId, role || 'MEMBER']
    );

    return {
      success: true,
      message: 'Member assigned to project successfully.',
      projectId: parseInt(projectId, 10),
      userId: parseInt(userId, 10),
      role: role || 'MEMBER',
    };
  }

  /**
   * Remove member from project.
   */
  async removeMemberFromProject(workspaceId, projectId, userId) {
    const [projects] = await db.execute(
      'SELECT id FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [projectId, workspaceId]
    );
    if (projects.length === 0) {
      const error = new Error('Project not found or does not belong to your workspace.');
      error.status = 404;
      throw error;
    }

    await db.execute('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);

    return {
      success: true,
      message: 'Member removed from project assignment.',
      projectId: parseInt(projectId, 10),
      userId: parseInt(userId, 10),
    };
  }

  /**
   * Get project members.
   */
  async getProjectMembers(workspaceId, projectId) {
    const [projects] = await db.execute(
      'SELECT id FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [projectId, workspaceId]
    );
    if (projects.length === 0) {
      const error = new Error('Project not found or does not belong to your workspace.');
      error.status = 404;
      throw error;
    }

    const [rows] = await db.execute(
      `SELECT pm.id as assignment_id, pm.role as assignment_role, pm.created_at as assigned_at,
              u.id as user_id, u.full_name as name, u.email, u.phone, u.avatar_url as avatar,
              r.name as system_role, r.display_name as system_role_display
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE pm.project_id = ? AND u.deleted_at IS NULL
       ORDER BY pm.created_at ASC`,
      [projectId]
    );

    return rows;
  }
}

module.exports = new AssignmentService();
