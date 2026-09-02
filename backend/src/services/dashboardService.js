const { db } = require('../config/database');

class DashboardService {
  /**
   * Get operational dashboard data for internal workspace roles (Managers, Admins, Team Members).
   */
  async getWorkspaceDashboard(currentUser, workspaceId) {
    // 1. STATS OVERVIEW (Live aggregation queries scoped to workspace)
    const [[{ activeProjects }]] = await db.query(
      `SELECT COUNT(*) as activeProjects 
       FROM projects 
       WHERE workspace_id = ? AND status IN ('ACTIVE', 'PLANNING') AND deleted_at IS NULL`,
      [workspaceId]
    );

    const [[{ pendingTasks }]] = await db.query(
      `SELECT COUNT(*) as pendingTasks 
       FROM tasks 
       WHERE workspace_id = ? AND status IN ('TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'IN_REVIEW', 'REVIEW', 'REVISION') AND deleted_at IS NULL`,
      [workspaceId]
    );

    const [[{ readyForReviewTasks }]] = await db.query(
      `SELECT COUNT(*) as readyForReviewTasks 
       FROM tasks 
       WHERE workspace_id = ? AND status IN ('READY_FOR_REVIEW', 'IN_REVIEW', 'REVIEW') AND deleted_at IS NULL`,
      [workspaceId]
    );

    const [[{ overdueTasks }]] = await db.query(
      `SELECT COUNT(*) as overdueTasks 
       FROM tasks 
       WHERE workspace_id = ? AND status NOT IN ('COMPLETED', 'BLOCKED') AND due_date IS NOT NULL AND due_date < NOW() AND deleted_at IS NULL`,
      [workspaceId]
    );

    const [[{ contentInReview }]] = await db.query(
      `SELECT COUNT(*) as contentInReview 
       FROM content 
       WHERE workspace_id = ? AND status = 'INTERNAL_REVIEW' AND deleted_at IS NULL`,
      [workspaceId]
    );

    const [[{ pendingClientApproval }]] = await db.query(
      `SELECT COUNT(*) as pendingClientApproval 
       FROM content 
       WHERE workspace_id = ? AND status = 'CLIENT_REVIEW' AND deleted_at IS NULL`,
      [workspaceId]
    );

    const [[{ revisionRequired }]] = await db.query(
      `SELECT COUNT(*) as revisionRequired 
       FROM content 
       WHERE workspace_id = ? AND status = 'REVISION_REQUIRED' AND deleted_at IS NULL`,
      [workspaceId]
    );

    const [[{ approvedContent }]] = await db.query(
      `SELECT COUNT(*) as approvedContent 
       FROM content 
       WHERE workspace_id = ? AND status = 'APPROVED' AND scheduled_at IS NULL AND deleted_at IS NULL`,
      [workspaceId]
    );

    const [[{ scheduledContent }]] = await db.query(
      `SELECT COUNT(*) as scheduledContent 
       FROM content 
       WHERE workspace_id = ? AND (status = 'SCHEDULED' OR (status = 'APPROVED' AND scheduled_at IS NOT NULL)) AND deleted_at IS NULL`,
      [workspaceId]
    );

    const [[{ upcomingDeadlinesCount }]] = await db.query(
      `SELECT (
        (SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND status NOT IN ('COMPLETED', 'BLOCKED') AND due_date >= NOW() AND due_date <= DATE_ADD(NOW(), INTERVAL 7 DAY) AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM content WHERE workspace_id = ? AND status NOT IN ('PUBLISHED', 'REJECTED') AND COALESCE(scheduled_at, due_date) >= NOW() AND COALESCE(scheduled_at, due_date) <= DATE_ADD(NOW(), INTERVAL 7 DAY) AND deleted_at IS NULL)
      ) as upcomingDeadlinesCount`,
      [workspaceId, workspaceId]
    );

    // 2. TEAM WORKLOAD & CAPACITY DISTRIBUTION
    const [teamRows] = await db.query(
      `SELECT u.id, u.full_name as name, u.avatar_url as avatar, COALESCE(u.job_title, r.name) as role,
              CAST(COUNT(CASE WHEN t.status IN ('TODO','IN_PROGRESS') THEN 1 END) AS UNSIGNED) as activeTasks,
              CAST(COUNT(CASE WHEN t.status IN ('READY_FOR_REVIEW','IN_REVIEW','REVIEW') THEN 1 END) AS UNSIGNED) as reviewTasks,
              CAST(COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS UNSIGNED) as completedTasks,
              CAST(COUNT(CASE WHEN t.status = 'TODO' THEN 1 END) AS UNSIGNED) as pendingTasks,
              CAST(COUNT(CASE WHEN t.status NOT IN ('COMPLETED','BLOCKED') AND t.due_date < NOW() THEN 1 END) AS UNSIGNED) as overdueTasks
       FROM workspace_users wu
       JOIN users u ON wu.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN tasks t ON t.assigned_to = u.id AND t.workspace_id = wu.workspace_id AND t.deleted_at IS NULL
       WHERE wu.workspace_id = ? AND wu.status = 'ACTIVE' AND u.deleted_at IS NULL
       GROUP BY u.id, u.full_name, u.avatar_url, u.job_title, r.name
       ORDER BY activeTasks DESC, u.full_name ASC`,
      [workspaceId]
    );

    // 3. PERSONAL TO-DO COUNTS & ACTIVE ITEMS (Scoped to current user)
    const [[{ todoTodayCount }]] = await db.query(
      `SELECT COUNT(*) as todoTodayCount
       FROM todos
       WHERE user_id = ? AND workspace_id = ? AND status != 'COMPLETED' AND deleted_at IS NULL
         AND (due_date = CURDATE() OR due_date IS NULL)`,
      [currentUser.id, workspaceId]
    );

    const [[{ todoOverdueCount }]] = await db.query(
      `SELECT COUNT(*) as todoOverdueCount
       FROM todos
       WHERE user_id = ? AND workspace_id = ? AND status != 'COMPLETED' AND deleted_at IS NULL
         AND due_date < CURDATE()`,
      [currentUser.id, workspaceId]
    );

    const [[{ todoCompletedCount }]] = await db.query(
      `SELECT COUNT(*) as todoCompletedCount
       FROM todos
       WHERE user_id = ? AND workspace_id = ? AND status = 'COMPLETED' AND deleted_at IS NULL`,
      [currentUser.id, workspaceId]
    );

    const [todoItems] = await db.query(
      `SELECT id, title, description, status, priority, category, due_date, due_time, created_at
       FROM todos
       WHERE user_id = ? AND workspace_id = ? AND status != 'COMPLETED' AND deleted_at IS NULL
       ORDER BY priority = 'URGENT' DESC, priority = 'HIGH' DESC, due_date ASC, created_at DESC
       LIMIT 5`,
      [currentUser.id, workspaceId]
    );

    // 4. UPCOMING DELIVERABLE DEADLINES (Combined Tasks & Content due soon)
    const [taskDeadlines] = await db.query(
      `SELECT t.id, t.title, 'TASK' as type, t.due_date as dueDate, cli.name as client,
              u.full_name as assignee, u.avatar_url as assigneeAvatar, t.status
       FROM tasks t
       LEFT JOIN clients cli ON t.client_id = cli.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.workspace_id = ? AND t.status NOT IN ('COMPLETED', 'BLOCKED') AND t.due_date >= NOW() AND t.deleted_at IS NULL
       ORDER BY t.due_date ASC
       LIMIT 6`,
      [workspaceId]
    );

    const [contentDeadlines] = await db.query(
      `SELECT c.id, c.title, 'CONTENT' as type, COALESCE(c.scheduled_at, c.due_date) as dueDate,
              cli.name as client, u.full_name as assignee, u.avatar_url as assigneeAvatar, c.status
       FROM content c
       LEFT JOIN clients cli ON c.client_id = cli.id
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.workspace_id = ? AND c.status NOT IN ('PUBLISHED', 'REJECTED') AND COALESCE(c.scheduled_at, c.due_date) >= NOW() AND c.deleted_at IS NULL
       ORDER BY dueDate ASC
       LIMIT 6`,
      [workspaceId]
    );

    const upcomingDeadlines = [...taskDeadlines, ...contentDeadlines]
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);

    // 5. RECENT ACTIVITY STREAM
    const [recentActivity] = await db.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.description, a.created_at as timestamp,
              u.full_name as user, u.avatar_url as avatar
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.workspace_id = ?
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [workspaceId]
    );

    return {
      stats: {
        activeProjects: Number(activeProjects) || 0,
        pendingTasks: Number(pendingTasks) || 0,
        readyForReviewTasks: Number(readyForReviewTasks) || 0,
        overdueTasks: Number(overdueTasks) || 0,
        contentInReview: Number(contentInReview) || 0,
        pendingClientApproval: Number(pendingClientApproval) || 0,
        revisionRequired: Number(revisionRequired) || 0,
        approvedContent: Number(approvedContent) || 0,
        scheduledContent: Number(scheduledContent) || 0,
        upcomingDeadlines: Number(upcomingDeadlinesCount) || 0,
      },
      teamWorkload: teamRows || [],
      personalTodo: {
        stats: {
          today: Number(todoTodayCount) || 0,
          overdue: Number(todoOverdueCount) || 0,
          completed: Number(todoCompletedCount) || 0,
          pending: (Number(todoTodayCount) || 0) + (Number(todoOverdueCount) || 0),
        },
        items: todoItems || [],
      },
      upcomingDeadlines: upcomingDeadlines || [],
      recentActivity: recentActivity || [],
    };
  }

  /**
   * Get client portal dashboard data (Strictly scoped to client's assigned company).
   */
  async getClientDashboard(currentUser, workspaceId) {
    // Find assigned client IDs for this client user
    const [clientMatches] = await db.query(
      'SELECT client_id FROM client_team WHERE user_id = ?',
      [currentUser.id]
    );
    const clientIds = clientMatches.map((m) => m.client_id);

    if (clientIds.length === 0) {
      return {
        stats: {
          pendingApproval: 0,
          approved: 0,
          revisionRequired: 0,
          scheduled: 0,
        },
        recentContent: [],
        scheduledUpcoming: [],
      };
    }

    const inPlaceholders = clientIds.map(() => '?').join(',');

    const [[{ pendingApproval }]] = await db.query(
      `SELECT COUNT(*) as pendingApproval FROM content WHERE workspace_id = ? AND client_id IN (${inPlaceholders}) AND status = 'CLIENT_REVIEW' AND deleted_at IS NULL`,
      [workspaceId, ...clientIds]
    );

    const [[{ approved }]] = await db.query(
      `SELECT COUNT(*) as approved FROM content WHERE workspace_id = ? AND client_id IN (${inPlaceholders}) AND status = 'APPROVED' AND deleted_at IS NULL`,
      [workspaceId, ...clientIds]
    );

    const [[{ revisionRequired }]] = await db.query(
      `SELECT COUNT(*) as revisionRequired FROM content WHERE workspace_id = ? AND client_id IN (${inPlaceholders}) AND status = 'REVISION_REQUIRED' AND deleted_at IS NULL`,
      [workspaceId, ...clientIds]
    );

    const [[{ scheduled }]] = await db.query(
      `SELECT COUNT(*) as scheduled FROM content WHERE workspace_id = ? AND client_id IN (${inPlaceholders}) AND status = 'SCHEDULED' AND deleted_at IS NULL`,
      [workspaceId, ...clientIds]
    );

    const [recentContent] = await db.query(
      `SELECT c.id, c.title, c.caption, c.status, c.content_type, c.created_at, c.scheduled_at
       FROM content c
       WHERE c.workspace_id = ? AND c.client_id IN (${inPlaceholders}) AND c.deleted_at IS NULL
       ORDER BY c.created_at DESC
       LIMIT 6`,
      [workspaceId, ...clientIds]
    );

    return {
      stats: {
        pendingApproval: Number(pendingApproval) || 0,
        approved: Number(approved) || 0,
        revisionRequired: Number(revisionRequired) || 0,
        scheduled: Number(scheduled) || 0,
      },
      recentContent: recentContent || [],
    };
  }
}

module.exports = new DashboardService();
