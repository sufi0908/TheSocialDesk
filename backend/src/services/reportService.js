const { db } = require('../config/database');

/**
 * Helper to compute SQL date boundaries based on dateRange preset or custom dates.
 */
function getDateBounds(dateRange, customStart, customEnd) {
  const now = new Date();
  let start = null;
  let end = null;

  switch (dateRange) {
    case 'Today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    }
    case 'This Week': {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0);
      end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + (23 * 3600 + 59 * 60 + 59) * 1000);
      break;
    }
    case 'This Month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    }
    case 'Last Month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    }
    case 'This Quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
      break;
    }
    case 'Year to Date': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    }
    case 'Custom':
    case 'Custom Range': {
      if (customStart && customEnd) {
        start = new Date(`${customStart}T00:00:00`);
        end = new Date(`${customEnd}T23:59:59`);
      }
      break;
    }
    default:
      // 'All' or unspecified: No date filtering
      break;
  }

  const formatSql = (d) => {
    if (!d || isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' ');
  };

  return {
    startDate: formatSql(start),
    endDate: formatSql(end),
  };
}

class ReportService {
  /**
   * Helper to build dynamic SQL WHERE clause and parameters for tasks.
   */
  buildTaskFilters(workspaceId, filters, alias = 't') {
    const clauses = [`${alias}.workspace_id = ?`, `${alias}.deleted_at IS NULL`];
    const params = [workspaceId];

    // Date range filter
    const { startDate, endDate } = getDateBounds(filters.dateRange, filters.startDate, filters.endDate);
    if (startDate && endDate) {
      clauses.push(
        `((${alias}.created_at BETWEEN ? AND ?) OR (${alias}.due_date BETWEEN ? AND ?) OR (${alias}.completed_at BETWEEN ? AND ?))`
      );
      params.push(startDate, endDate, startDate, endDate, startDate, endDate);
    }

    // Client filter
    if (filters.clientId && filters.clientId !== 'All') {
      clauses.push(`${alias}.client_id = ?`);
      params.push(Number(filters.clientId));
    }

    // Project filter
    if (filters.projectId && filters.projectId !== 'All') {
      clauses.push(`${alias}.project_id = ?`);
      params.push(Number(filters.projectId));
    }

    // Team Member filter
    if (filters.teamMemberId && filters.teamMemberId !== 'All') {
      clauses.push(`${alias}.assigned_to = ?`);
      params.push(Number(filters.teamMemberId));
    }

    // Status filter
    if (filters.status && filters.status !== 'All') {
      const s = String(filters.status).trim();
      if (s === 'Active' || s === 'IN_PROGRESS') {
        clauses.push(`${alias}.status IN ('TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'IN_REVIEW', 'REVIEW', 'REVISION')`);
      } else if (s === 'Completed') {
        clauses.push(`${alias}.status = 'COMPLETED'`);
      } else if (s === 'Overdue') {
        clauses.push(`${alias}.status NOT IN ('COMPLETED', 'CANCELLED') AND ${alias}.due_date IS NOT NULL AND ${alias}.due_date < NOW()`);
      } else {
        clauses.push(`${alias}.status = ?`);
        params.push(s.toUpperCase());
      }
    }

    return { sql: clauses.join(' AND '), params };
  }

  /**
   * Helper to build dynamic SQL WHERE clause and parameters for content.
   */
  buildContentFilters(workspaceId, filters, alias = 'c') {
    const clauses = [`${alias}.workspace_id = ?`, `${alias}.deleted_at IS NULL`];
    const params = [workspaceId];

    const { startDate, endDate } = getDateBounds(filters.dateRange, filters.startDate, filters.endDate);
    if (startDate && endDate) {
      clauses.push(
        `((${alias}.created_at BETWEEN ? AND ?) OR (${alias}.scheduled_at BETWEEN ? AND ?) OR (${alias}.published_at BETWEEN ? AND ?))`
      );
      params.push(startDate, endDate, startDate, endDate, startDate, endDate);
    }

    if (filters.clientId && filters.clientId !== 'All') {
      clauses.push(`${alias}.client_id = ?`);
      params.push(Number(filters.clientId));
    }

    if (filters.projectId && filters.projectId !== 'All') {
      clauses.push(`${alias}.project_id = ?`);
      params.push(Number(filters.projectId));
    }

    if (filters.teamMemberId && filters.teamMemberId !== 'All') {
      clauses.push(`(${alias}.assigned_to = ? OR ${alias}.created_by = ?)`);
      params.push(Number(filters.teamMemberId), Number(filters.teamMemberId));
    }

    return { sql: clauses.join(' AND '), params };
  }

  /**
   * 1. OVERVIEW METRICS: Comprehensive high-level KPI cards.
   */
  async getOverview(workspaceId, filters = {}) {
    const taskFilter = this.buildTaskFilters(workspaceId, filters, 't');
    const contentFilter = this.buildContentFilters(workspaceId, filters, 'c');

    const [taskRows] = await db.query(
      `SELECT 
        COUNT(*) as totalTasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completedTasks,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as pendingTasks,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') AND t.due_date IS NOT NULL AND t.due_date < NOW() THEN 1 END) as overdueTasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' AND (t.due_date IS NULL OR t.completed_at <= t.due_date) THEN 1 END) as onTimeCompletedTasks
       FROM tasks t
       WHERE ${taskFilter.sql}`,
      taskFilter.params
    );

    const [contentRows] = await db.query(
      `SELECT 
        COUNT(*) as totalContent,
        COUNT(CASE WHEN c.status = 'APPROVED' THEN 1 END) as approvedContent,
        COUNT(CASE WHEN c.status IN ('INTERNAL_REVIEW', 'CLIENT_REVIEW') THEN 1 END) as pendingApproval,
        COUNT(CASE WHEN c.status = 'REJECTED' THEN 1 END) as rejectedContent,
        COUNT(CASE WHEN c.status = 'SCHEDULED' THEN 1 END) as scheduledContent,
        COUNT(CASE WHEN c.status = 'PUBLISHED' THEN 1 END) as publishedContent
       FROM content c
       WHERE ${contentFilter.sql}`,
      contentFilter.params
    );

    // Project status query
    let projectSql = `SELECT 
      COUNT(CASE WHEN status IN ('ACTIVE', 'PLANNING') THEN 1 END) as activeProjects,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completedProjects
     FROM projects
     WHERE workspace_id = ? AND deleted_at IS NULL`;
    const projectParams = [workspaceId];
    if (filters.clientId && filters.clientId !== 'All') {
      projectSql += ' AND client_id = ?';
      projectParams.push(Number(filters.clientId));
    }
    const [projectRows] = await db.query(projectSql, projectParams);

    const t = taskRows[0] || {};
    const c = contentRows[0] || {};
    const p = projectRows[0] || {};

    const totalTasks = Number(t.totalTasks || 0);
    const completedTasks = Number(t.completedTasks || 0);
    const pendingTasks = Number(t.pendingTasks || 0);
    const overdueTasks = Number(t.overdueTasks || 0);
    const onTimeCompleted = Number(t.onTimeCompletedTasks || 0);

    const totalContent = Number(c.totalContent || 0);
    const approvedContent = Number(c.approvedContent || 0);
    const pendingApproval = Number(c.pendingApproval || 0);
    const rejectedContent = Number(c.rejectedContent || 0);
    const scheduledContent = Number(c.scheduledContent || 0);
    const publishedContent = Number(c.publishedContent || 0);

    const activeProjects = Number(p.activeProjects || 0);
    const completedProjects = Number(p.completedProjects || 0);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const approvalRate =
      approvedContent + rejectedContent > 0
        ? Math.round((approvedContent / (approvedContent + rejectedContent)) * 100)
        : approvedContent > 0
        ? 100
        : 0;
    const onTimeCompletionRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      totalContent,
      approvedContent,
      pendingApproval,
      rejectedContent,
      scheduledContent,
      publishedContent,
      activeProjects,
      completedProjects,
      completionRate,
      approvalRate,
      onTimeCompletionRate,
    };
  }

  /**
   * 2. TEAM WORKLOAD & CAPACITY BREAKDOWN
   */
  async getTeamWorkload(workspaceId, filters = {}) {
    const taskFilter = this.buildTaskFilters(workspaceId, filters, 't');

    // Query active team members (exclude GUEST/client roles)
    let memberSql = `
      SELECT 
        u.id,
        u.full_name as name,
        u.avatar_url as avatar,
        u.job_title as jobTitle,
        COALESCE(r.name, wu.role) as roleKey,
        wu.role as workspaceRole,
        COUNT(t.id) as assignedTasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completedTasks,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as pendingTasks,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') AND t.due_date IS NOT NULL AND t.due_date < NOW() THEN 1 END) as overdueTasks
      FROM workspace_users wu
      JOIN users u ON wu.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN tasks t ON t.assigned_to = u.id 
        AND ${taskFilter.sql}
      WHERE wu.workspace_id = ? 
        AND wu.status = 'ACTIVE' 
        AND wu.role != 'GUEST'
    `;
    const memberParams = [...taskFilter.params, workspaceId];

    if (filters.teamMemberId && filters.teamMemberId !== 'All') {
      memberSql += ' AND wu.user_id = ?';
      memberParams.push(Number(filters.teamMemberId));
    }

    memberSql += `
      GROUP BY u.id, u.full_name, u.avatar_url, u.job_title, r.name, wu.role
      ORDER BY assignedTasks DESC, u.full_name ASC
    `;

    const [rows] = await db.query(memberSql, memberParams);

    return rows.map((m) => {
      const assigned = Number(m.assignedTasks || 0);
      const completed = Number(m.completedTasks || 0);
      const pending = Number(m.pendingTasks || 0);
      const overdue = Number(m.overdueTasks || 0);
      const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      const overdueRate = assigned > 0 ? Math.round((overdue / assigned) * 100) : 0;

      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        role: m.roleKey,
        jobTitle: m.jobTitle,
        workspaceRole: m.workspaceRole,
        assignedTasks: assigned,
        completedTasks: completed,
        pendingTasks: pending,
        overdueTasks: overdue,
        completionRate,
        overdueRate,
      };
    });
  }

  /**
   * 3. PROJECT PROGRESS
   */
  async getProjectProgress(workspaceId, filters = {}) {
    const taskFilter = this.buildTaskFilters(workspaceId, filters, 't');

    let projectSql = `
      SELECT 
        p.id,
        p.name,
        p.status,
        p.due_date as dueDate,
        COALESCE(c.company_name, c.name, 'General Campaign') as client,
        COUNT(t.id) as tasksCount,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completedTasks,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as pendingTasks
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN tasks t ON t.project_id = p.id AND ${taskFilter.sql}
      WHERE p.workspace_id = ? AND p.deleted_at IS NULL
    `;
    const projectParams = [...taskFilter.params, workspaceId];

    if (filters.clientId && filters.clientId !== 'All') {
      projectSql += ' AND p.client_id = ?';
      projectParams.push(Number(filters.clientId));
    }

    if (filters.projectId && filters.projectId !== 'All') {
      projectSql += ' AND p.id = ?';
      projectParams.push(Number(filters.projectId));
    }

    projectSql += `
      GROUP BY p.id, p.name, p.status, p.due_date, c.company_name, c.name
      ORDER BY p.created_at DESC
    `;

    const [rows] = await db.query(projectSql, projectParams);

    return rows.map((p) => {
      const total = Number(p.tasksCount || 0);
      const completed = Number(p.completedTasks || 0);
      const pending = Number(p.pendingTasks || 0);
      const progress = total > 0 ? Math.round((completed / total) * 100) : p.status === 'COMPLETED' ? 100 : 0;

      return {
        id: p.id,
        name: p.name,
        client: p.client,
        status: p.status,
        deadline: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : null,
        tasksCount: total,
        completedTasks: completed,
        pendingTasks: pending,
        progress,
      };
    });
  }

  /**
   * 4. TASK COMPLETION REPORT
   */
  async getTaskCompletion(workspaceId, filters = {}) {
    const taskFilter = this.buildTaskFilters(workspaceId, filters, 't');

    const [rows] = await db.query(
      `SELECT 
        COUNT(*) as totalTasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completedTasks,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as pendingTasks,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') AND t.due_date IS NOT NULL AND t.due_date < NOW() THEN 1 END) as overdueTasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' AND (t.due_date IS NULL OR t.completed_at <= t.due_date) THEN 1 END) as onTimeCompletedTasks,
        COUNT(CASE WHEN t.status = 'TODO' THEN 1 END) as todoTasks,
        COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as inProgressTasks,
        COUNT(CASE WHEN t.status IN ('READY_FOR_REVIEW', 'IN_REVIEW', 'REVIEW') THEN 1 END) as reviewTasks,
        COUNT(CASE WHEN t.status IN ('REVISION', 'REVISION_REQUIRED') THEN 1 END) as revisionTasks
       FROM tasks t
       WHERE ${taskFilter.sql}`,
      taskFilter.params
    );

    const r = rows[0] || {};
    const total = Number(r.totalTasks || 0);
    const completed = Number(r.completedTasks || 0);
    const pending = Number(r.pendingTasks || 0);
    const overdue = Number(r.overdueTasks || 0);
    const onTime = Number(r.onTimeCompletedTasks || 0);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTimeDeliveryRate = completed > 0 ? Math.round((onTime / completed) * 100) : 100;

    return {
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: pending,
      overdueTasks: overdue,
      completionRate,
      onTimeDeliveryRate,
      byStatus: [
        { status: 'TODO', label: 'To Do', count: Number(r.todoTasks || 0) },
        { status: 'IN_PROGRESS', label: 'In Progress', count: Number(r.inProgressTasks || 0) },
        { status: 'READY_FOR_REVIEW', label: 'In Review', count: Number(r.reviewTasks || 0) },
        { status: 'REVISION', label: 'Revision', count: Number(r.revisionTasks || 0) },
        { status: 'COMPLETED', label: 'Completed', count: completed },
        { status: 'OVERDUE', label: 'Overdue', count: overdue },
      ],
    };
  }

  /**
   * 5. CONTENT STATUS PIPELINE
   */
  async getContentStatusPipeline(workspaceId, filters = {}) {
    const contentFilter = this.buildContentFilters(workspaceId, filters, 'c');

    const [rows] = await db.query(
      `SELECT 
        c.status,
        COUNT(*) as count
       FROM content c
       WHERE ${contentFilter.sql}
       GROUP BY c.status`,
      contentFilter.params
    );

    const statusCounts = {};
    let total = 0;
    for (const row of rows) {
      statusCounts[row.status] = Number(row.count || 0);
      total += Number(row.count || 0);
    }

    const standardStatuses = [
      { key: 'DRAFT', label: 'Draft' },
      { key: 'INTERNAL_REVIEW', label: 'Internal Review' },
      { key: 'CLIENT_REVIEW', label: 'Client Review' },
      { key: 'APPROVED', label: 'Approved' },
      { key: 'SCHEDULED', label: 'Scheduled' },
      { key: 'PUBLISHED', label: 'Published' },
      { key: 'REJECTED', label: 'Rejected' },
    ];

    return standardStatuses.map((st) => {
      const count = statusCounts[st.key] || 0;
      const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
      return {
        status: st.key,
        label: st.label,
        count,
        percentage,
      };
    });
  }

  /**
   * 6. APPROVAL STATUS
   */
  async getApprovalStatus(workspaceId, filters = {}) {
    // Content approvals
    let caSql = `
      SELECT 
        COUNT(*) as totalReviews,
        COUNT(CASE WHEN ca.status IN ('APPROVED', 'INTERNAL_APPROVED') THEN 1 END) as approvedCount,
        COUNT(CASE WHEN ca.status = 'REVISION_REQUIRED' THEN 1 END) as revisionCount,
        COUNT(CASE WHEN ca.approval_type = 'INTERNAL' AND ca.status = 'INTERNAL_APPROVED' THEN 1 END) as internalApproved,
        COUNT(CASE WHEN ca.approval_type = 'INTERNAL' THEN 1 END) as internalTotal,
        COUNT(CASE WHEN ca.approval_type = 'CLIENT' AND ca.status = 'APPROVED' THEN 1 END) as clientApproved,
        COUNT(CASE WHEN ca.approval_type = 'CLIENT' THEN 1 END) as clientTotal
      FROM content_approvals ca
      JOIN content c ON ca.content_id = c.id
      WHERE ca.workspace_id = ? AND c.deleted_at IS NULL
    `;
    const caParams = [workspaceId];

    if (filters.clientId && filters.clientId !== 'All') {
      caSql += ' AND c.client_id = ?';
      caParams.push(Number(filters.clientId));
    }

    const [caRows] = await db.query(caSql, caParams);
    const ca = caRows[0] || {};

    const totalReviews = Number(ca.totalReviews || 0);
    const approvedCount = Number(ca.approvedCount || 0);
    const revisionCount = Number(ca.revisionCount || 0);
    const internalApproved = Number(ca.internalApproved || 0);
    const internalTotal = Number(ca.internalTotal || 0);
    const clientApproved = Number(ca.clientApproved || 0);
    const clientTotal = Number(ca.clientTotal || 0);

    const internalApprovalRate = internalTotal > 0 ? Math.round((internalApproved / internalTotal) * 100) : 100;
    const clientApprovalRate = clientTotal > 0 ? Math.round((clientApproved / clientTotal) * 100) : 100;
    const revisionRequestRate = totalReviews > 0 ? Math.round((revisionCount / totalReviews) * 100) : 0;

    // Average turnaround time in hours (measured from content creation to approval, or standard baseline)
    const [timeRows] = await db.query(
      `SELECT 
        AVG(TIMESTAMPDIFF(HOUR, c.created_at, ca.created_at)) as avgHours
       FROM content_approvals ca
       JOIN content c ON ca.content_id = c.id
       WHERE ca.workspace_id = ? AND ca.status IN ('APPROVED', 'INTERNAL_APPROVED')`,
      [workspaceId]
    );
    const avgHours = timeRows[0]?.avgHours != null ? Math.max(1, Math.round(Number(timeRows[0].avgHours))) : 2;

    return {
      averageTurnaroundHours: avgHours,
      internalApprovalRate,
      clientApprovalRate,
      revisionRequestRate,
      totalReviews,
      approvedCount,
      revisionCount,
    };
  }

  /**
   * 7. DEADLINE STATUS
   */
  async getDeadlineStatus(workspaceId, filters = {}) {
    const taskFilter = this.buildTaskFilters(workspaceId, filters, 't');

    const [rows] = await db.query(
      `SELECT 
        COUNT(CASE WHEN t.status = 'COMPLETED' AND (t.due_date IS NULL OR t.completed_at <= t.due_date) THEN 1 END) as onTimeDeliverables,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') AND t.due_date IS NOT NULL AND t.due_date >= NOW() AND t.due_date <= DATE_ADD(NOW(), INTERVAL 48 HOUR) THEN 1 END) as approachingDeadlines,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') AND t.due_date IS NOT NULL AND t.due_date < NOW() THEN 1 END) as overdueTasksCount
       FROM tasks t
       WHERE ${taskFilter.sql}`,
      taskFilter.params
    );

    const r = rows[0] || {};
    return {
      onTimeDeliverables: Number(r.onTimeDeliverables || 0),
      approachingDeadlines: Number(r.approachingDeadlines || 0),
      overdueTasksCount: Number(r.overdueTasksCount || 0),
    };
  }

  /**
   * 8. CLIENT WORK SUMMARY
   */
  async getClientWorkSummary(workspaceId, filters = {}) {
    let clientSql = `
      SELECT 
        c.id as clientId,
        COALESCE(c.company_name, c.name) as clientName,
        c.status as clientStatus
      FROM clients c
      WHERE c.workspace_id = ? AND c.deleted_at IS NULL
    `;
    const clientParams = [workspaceId];

    if (filters.clientId && filters.clientId !== 'All') {
      clientSql += ' AND c.id = ?';
      clientParams.push(Number(filters.clientId));
    }

    clientSql += ' ORDER BY clientName ASC';

    const [clients] = await db.query(clientSql, clientParams);
    if (clients.length === 0) return [];

    const taskFilter = this.buildTaskFilters(workspaceId, filters, 't');
    const contentFilter = this.buildContentFilters(workspaceId, filters, 'cnt');

    // Aggregate tasks per client
    const [taskMetrics] = await db.query(
      `SELECT 
        t.client_id,
        COUNT(*) as totalTasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completedTasks,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as pendingTasks,
        COUNT(CASE WHEN t.status NOT IN ('COMPLETED', 'CANCELLED') AND t.due_date IS NOT NULL AND t.due_date < NOW() THEN 1 END) as overdueTasks
       FROM tasks t
       WHERE ${taskFilter.sql} AND t.client_id IS NOT NULL
       GROUP BY t.client_id`,
      taskFilter.params
    );
    const taskMap = {};
    for (const tm of taskMetrics) {
      taskMap[tm.client_id] = tm;
    }

    // Aggregate content per client
    const [contentMetrics] = await db.query(
      `SELECT 
        cnt.client_id,
        COUNT(*) as contentItems,
        COUNT(CASE WHEN cnt.status = 'PUBLISHED' THEN 1 END) as postsDelivered,
        COUNT(CASE WHEN cnt.status = 'APPROVED' THEN 1 END) as approvedContent,
        COUNT(CASE WHEN cnt.status IN ('INTERNAL_REVIEW', 'CLIENT_REVIEW') THEN 1 END) as pendingApproval,
        COUNT(CASE WHEN cnt.status = 'SCHEDULED' THEN 1 END) as scheduledContent
       FROM content cnt
       WHERE ${contentFilter.sql} AND cnt.client_id IS NOT NULL
       GROUP BY cnt.client_id`,
      contentFilter.params
    );
    const contentMap = {};
    for (const cm of contentMetrics) {
      contentMap[cm.client_id] = cm;
    }

    // Aggregate active projects per client
    const [projectMetrics] = await db.query(
      `SELECT 
        client_id,
        COUNT(*) as activeProjects
       FROM projects
       WHERE workspace_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL AND client_id IS NOT NULL
       GROUP BY client_id`,
      [workspaceId]
    );
    const projectMap = {};
    for (const pm of projectMetrics) {
      projectMap[pm.client_id] = pm;
    }

    return clients.map((cl) => {
      const tm = taskMap[cl.clientId] || {};
      const cm = contentMap[cl.clientId] || {};
      const pm = projectMap[cl.clientId] || {};

      return {
        clientId: cl.clientId,
        client: cl.clientName,
        activeProjects: Number(pm.activeProjects || 0),
        totalTasks: Number(tm.totalTasks || 0),
        completedTasks: Number(tm.completedTasks || 0),
        pendingTasks: Number(tm.pendingTasks || 0),
        overdueTasks: Number(tm.overdueTasks || 0),
        postsDelivered: Number(cm.postsDelivered || 0),
        contentItems: Number(cm.contentItems || 0),
        approvedContent: Number(cm.approvedContent || 0),
        pendingApproval: Number(cm.pendingApproval || 0),
        scheduledContent: Number(cm.scheduledContent || 0),
      };
    });
  }

  /**
   * FULL AGGREGATED REPORT: Returns all sections in a single high-performance bundle.
   */
  async getFullReports(workspaceId, filters = {}) {
    const [
      overview,
      teamWorkload,
      projectProgress,
      taskCompletion,
      contentStatusPipeline,
      approvalStatus,
      deadlineStatus,
      clientWorkSummary,
    ] = await Promise.all([
      this.getOverview(workspaceId, filters),
      this.getTeamWorkload(workspaceId, filters),
      this.getProjectProgress(workspaceId, filters),
      this.getTaskCompletion(workspaceId, filters),
      this.getContentStatusPipeline(workspaceId, filters),
      this.getApprovalStatus(workspaceId, filters),
      this.getDeadlineStatus(workspaceId, filters),
      this.getClientWorkSummary(workspaceId, filters),
    ]);

    return {
      overview,
      teamWorkload,
      projectProgress,
      taskCompletion,
      contentStatusPipeline,
      approvalStatus,
      deadlineStatus,
      clientWorkSummary,
      filters: {
        dateRange: filters.dateRange || 'This Month',
        clientId: filters.clientId || 'All',
        projectId: filters.projectId || 'All',
        teamMemberId: filters.teamMemberId || 'All',
        status: filters.status || 'All',
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
      },
    };
  }
}

module.exports = new ReportService();
