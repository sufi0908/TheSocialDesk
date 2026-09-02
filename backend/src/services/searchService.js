const { db } = require('../config/database');

class SearchService {
  /**
   * Safe whitelisted sorting helper to prevent SQL injection.
   */
  getSafeSortClause(sortBy, sortOrder, defaultColumn = 'created_at', defaultOrder = 'DESC') {
    const ALLOWED_COLUMNS = ['created_at', 'updated_at', 'due_date', 'scheduled_at', 'title', 'name', 'status', 'priority', 'id'];
    const ALLOWED_ORDERS = ['ASC', 'DESC'];

    const col = ALLOWED_COLUMNS.includes(sortBy) ? sortBy : defaultColumn;
    const ord = ALLOWED_ORDERS.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : defaultOrder;

    return `ORDER BY ${col} ${ord}`;
  }

  /**
   * Helper for standardized pagination metadata.
   */
  getPaginationMeta(page = 1, limit = 10, total = 0) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const totalPages = Math.ceil(total / l) || 1;
    const offset = (p - 1) * l;

    return { page: p, limit: l, total, totalPages, offset };
  }

  /**
   * Perform unified global search across Clients, Projects, Tasks, Content, Assets, and Team.
   */
  async globalSearch(workspaceId, currentUser, queryStr = '') {
    const q = queryStr ? queryStr.trim() : '';

    if (!q) {
      return {
        clients: [],
        projects: [],
        tasks: [],
        content: [],
        assets: [],
        teamMembers: [],
        totalResults: 0,
      };
    }

    const term = `%${q}%`;
    const isClient = currentUser.role === 'client_user' || currentUser.role === 'client';

    // 1. Search Clients
    let clientsQuery = `
      SELECT id, name, company_name, email, status
      FROM clients
      WHERE workspace_id = ? AND deleted_at IS NULL AND (name LIKE ? OR company_name LIKE ? OR email LIKE ?)
    `;
    const clientsParams = [workspaceId, term, term, term];
    if (isClient) {
      clientsQuery += ' AND id IN (SELECT client_id FROM client_team WHERE user_id = ?)';
      clientsParams.push(currentUser.id);
    }
    const [clientsRows] = await db.execute(clientsQuery, clientsParams);

    // 2. Search Projects
    let projectsQuery = `
      SELECT p.id, p.name, p.status, cli.name as client_name
      FROM projects p
      JOIN clients cli ON p.client_id = cli.id
      WHERE p.workspace_id = ? AND p.deleted_at IS NULL AND (p.name LIKE ? OR p.description LIKE ? OR cli.name LIKE ?)
    `;
    const projectsParams = [workspaceId, term, term, term];
    if (isClient) {
      projectsQuery += ' AND p.client_id IN (SELECT client_id FROM client_team WHERE user_id = ?)';
      projectsParams.push(currentUser.id);
    }
    const [projectsRows] = await db.execute(projectsQuery, projectsParams);

    // 3. Search Tasks
    let tasksQuery = `
      SELECT t.id, t.title, t.status, t.priority, cli.name as client_name, u.full_name as assignee_name
      FROM tasks t
      LEFT JOIN clients cli ON t.client_id = cli.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.workspace_id = ? AND t.deleted_at IS NULL AND (t.title LIKE ? OR t.description LIKE ? OR cli.name LIKE ?)
    `;
    const tasksParams = [workspaceId, term, term, term];
    if (isClient) {
      tasksQuery += ' AND t.client_id IN (SELECT client_id FROM client_team WHERE user_id = ?)';
      tasksParams.push(currentUser.id);
    }
    const [tasksRows] = await db.execute(tasksQuery, tasksParams);

    // 4. Search Content
    let contentQuery = `
      SELECT c.id, c.title, c.caption, c.content_type, c.status, cli.name as client_name
      FROM content c
      JOIN clients cli ON c.client_id = cli.id
      WHERE c.workspace_id = ? AND c.deleted_at IS NULL AND (c.title LIKE ? OR c.caption LIKE ? OR cli.name LIKE ?)
    `;
    const contentParams = [workspaceId, term, term, term];
    if (isClient) {
      contentQuery += ' AND c.client_id IN (SELECT client_id FROM client_team WHERE user_id = ?)';
      contentParams.push(currentUser.id);
    }
    const [contentRows] = await db.execute(contentQuery, contentParams);

    // 5. Search Assets
    let assetsQuery = `
      SELECT a.id, a.file_name, a.file_type, a.file_size, cli.name as client_name
      FROM assets a
      LEFT JOIN clients cli ON a.client_id = cli.id
      WHERE a.workspace_id = ? AND a.deleted_at IS NULL AND (a.file_name LIKE ? OR a.category LIKE ? OR cli.name LIKE ?)
    `;
    const assetsParams = [workspaceId, term, term, term];
    if (isClient) {
      assetsQuery += ' AND a.client_id IN (SELECT client_id FROM client_team WHERE user_id = ?)';
      assetsParams.push(currentUser.id);
    }
    const [assetsRows] = await db.execute(assetsQuery, assetsParams);

    // 6. Search Team Members
    let teamRows = [];
    if (!isClient) {
      const [tRows] = await db.execute(
        `SELECT u.id, u.full_name, u.email, r.name as role, u.status
         FROM users u
         JOIN workspace_users wu ON u.id = wu.user_id
         JOIN roles r ON u.role_id = r.id
         WHERE wu.workspace_id = ? AND u.deleted_at IS NULL AND (u.full_name LIKE ? OR u.email LIKE ? OR r.name LIKE ?)`,
        [workspaceId, term, term, term]
      );
      teamRows = tRows;
    }

    const clients = clientsRows.map((c) => ({
      id: c.id,
      title: c.company_name || c.name,
      subtitle: `Contact: ${c.name} (${c.email})`,
      type: 'Client',
      path: '/workspace/clients',
      status: c.status,
    }));

    const projects = projectsRows.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `Client: ${p.client_name} • Status: ${p.status}`,
      type: 'Project',
      path: '/workspace/projects',
      status: p.status,
    }));

    const tasks = tasksRows.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: `Client: ${t.client_name || 'N/A'} • Assignee: ${t.assignee_name || 'Unassigned'}`,
      type: 'Task',
      path: '/workspace/tasks',
      status: t.status,
    }));

    const content = contentRows.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: `Client: ${c.client_name} • Type: ${c.content_type || 'Post'}`,
      type: 'Content',
      path: '/workspace/content',
      status: c.status,
    }));

    const assets = assetsRows.map((a) => ({
      id: a.id,
      title: a.file_name,
      subtitle: `Client: ${a.client_name || 'General'} • Type: ${a.file_type}`,
      type: 'Asset',
      path: '/workspace/assets',
      status: a.file_type,
    }));

    const teamMembers = teamRows.map((m) => ({
      id: m.id,
      title: m.full_name,
      subtitle: `Role: ${m.role} • Email: ${m.email}`,
      type: 'Team Member',
      path: '/workspace/team',
      status: m.status,
    }));

    const totalResults =
      clients.length + projects.length + tasks.length + content.length + assets.length + teamMembers.length;

    return {
      clients,
      projects,
      tasks,
      content,
      assets,
      teamMembers,
      totalResults,
    };
  }
}

module.exports = new SearchService();
