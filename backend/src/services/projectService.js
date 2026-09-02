const { db } = require('../config/database');

class ProjectService {
  /**
   * Create a new project in a workspace.
   */
  async createProject(creatorUser, workspaceId, { name, clientId, description, status, startDate, dueDate }) {
    if (!name || !clientId) {
      const error = new Error('Project name and client ID are required.');
      error.status = 400;
      throw error;
    }

    // Verify client belongs to workspace
    const [clients] = await db.execute(
      'SELECT id FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [clientId, workspaceId]
    );
    if (clients.length === 0) {
      const error = new Error('Client not found or does not belong to your workspace.');
      error.status = 404;
      throw error;
    }

    const projectStatus = status || 'ACTIVE';

    const [result] = await db.execute(
      `INSERT INTO projects (workspace_id, client_id, created_by, name, description, status, start_date, due_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        workspaceId,
        clientId,
        creatorUser.id,
        name.trim(),
        description || null,
        projectStatus,
        startDate || null,
        dueDate || null,
      ]
    );

    const projectId = result.insertId;

    return this.getProject(workspaceId, projectId);
  }

  /**
   * List all projects in a workspace.
   */
  async listProjects(workspaceId, { clientId, status, search }) {
    let query = `
      SELECT p.id, p.workspace_id, p.client_id, p.name, p.description, p.status, p.start_date, p.due_date, p.created_at,
             c.name as client_name, c.company_name as client_company_name,
             u.full_name as creator_name,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) as task_count,
             (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p
      JOIN clients c ON p.client_id = c.id
      JOIN users u ON p.created_by = u.id
      WHERE p.workspace_id = ? AND p.deleted_at IS NULL
    `;
    const params = [workspaceId];

    if (clientId) {
      query += ' AND p.client_id = ?';
      params.push(clientId);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR c.name LIKE ? OR p.description LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * Get single project details.
   */
  async getProject(workspaceId, projectId) {
    const [rows] = await db.execute(
      `SELECT p.id, p.workspace_id, p.client_id, p.name, p.description, p.status, p.start_date, p.due_date, p.created_at,
              c.name as client_name, c.company_name as client_company_name,
              u.full_name as creator_name,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) as task_count
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN users u ON p.created_by = u.id
       WHERE p.workspace_id = ? AND p.id = ? AND p.deleted_at IS NULL`,
      [workspaceId, projectId]
    );

    if (rows.length === 0) {
      const error = new Error('Project not found.');
      error.status = 404;
      throw error;
    }

    return rows[0];
  }

  /**
   * Update project details.
   */
  async updateProject(workspaceId, projectId, { name, clientId, description, startDate, dueDate }) {
    const [projects] = await db.execute(
      'SELECT id FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [projectId, workspaceId]
    );
    if (projects.length === 0) {
      const error = new Error('Project not found.');
      error.status = 404;
      throw error;
    }

    if (clientId) {
      const [clients] = await db.execute(
        'SELECT id FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
        [clientId, workspaceId]
      );
      if (clients.length === 0) {
        const error = new Error('Target client not found or does not belong to your workspace.');
        error.status = 404;
        throw error;
      }
    }

    await db.execute(
      `UPDATE projects
       SET name = COALESCE(?, name),
           client_id = COALESCE(?, client_id),
           description = COALESCE(?, description),
           start_date = COALESCE(?, start_date),
           due_date = COALESCE(?, due_date),
           updated_at = NOW()
       WHERE id = ? AND workspace_id = ?`,
      [name || null, clientId || null, description || null, startDate || null, dueDate || null, projectId, workspaceId]
    );

    return this.getProject(workspaceId, projectId);
  }

  /**
   * Update project status.
   */
  async updateProjectStatus(workspaceId, projectId, status) {
    const validStatuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      const error = new Error(`Invalid project status. Allowed: ${validStatuses.join(', ')}`);
      error.status = 400;
      throw error;
    }

    const [projects] = await db.execute(
      'SELECT id FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [projectId, workspaceId]
    );
    if (projects.length === 0) {
      const error = new Error('Project not found.');
      error.status = 404;
      throw error;
    }

    await db.execute('UPDATE projects SET status = ?, updated_at = NOW() WHERE id = ? AND workspace_id = ?', [status, projectId, workspaceId]);

    return { success: true, projectId: parseInt(projectId, 10), status };
  }
}

module.exports = new ProjectService();
