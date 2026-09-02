const { db } = require('../src/config/database');

(async () => {
  try {
    const workspaceId = 1;

    // 1. Stats
    const [[{ activeProjects }]] = await db.query(
      "SELECT COUNT(*) as activeProjects FROM projects WHERE workspace_id = ? AND status IN ('ACTIVE', 'PLANNING') AND deleted_at IS NULL",
      [workspaceId]
    );
    const [[{ pendingTasks }]] = await db.query(
      "SELECT COUNT(*) as pendingTasks FROM tasks WHERE workspace_id = ? AND status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'REVIEW', 'REVISION') AND deleted_at IS NULL",
      [workspaceId]
    );
    const [[{ overdueTasks }]] = await db.query(
      "SELECT COUNT(*) as overdueTasks FROM tasks WHERE workspace_id = ? AND status NOT IN ('COMPLETED', 'BLOCKED') AND due_date IS NOT NULL AND due_date < NOW() AND deleted_at IS NULL",
      [workspaceId]
    );
    const [[{ contentInReview }]] = await db.query(
      "SELECT COUNT(*) as contentInReview FROM content WHERE workspace_id = ? AND status = 'INTERNAL_REVIEW' AND deleted_at IS NULL",
      [workspaceId]
    );
    const [[{ pendingClientApproval }]] = await db.query(
      "SELECT COUNT(*) as pendingClientApproval FROM content WHERE workspace_id = ? AND status = 'CLIENT_REVIEW' AND deleted_at IS NULL",
      [workspaceId]
    );
    const [[{ revisionRequired }]] = await db.query(
      "SELECT COUNT(*) as revisionRequired FROM content WHERE workspace_id = ? AND status = 'REVISION_REQUIRED' AND deleted_at IS NULL",
      [workspaceId]
    );
    const [[{ approvedContent }]] = await db.query(
      "SELECT COUNT(*) as approvedContent FROM content WHERE workspace_id = ? AND status = 'APPROVED' AND scheduled_at IS NULL AND deleted_at IS NULL",
      [workspaceId]
    );
    const [[{ scheduledContent }]] = await db.query(
      "SELECT COUNT(*) as scheduledContent FROM content WHERE workspace_id = ? AND (status = 'SCHEDULED' OR (status = 'APPROVED' AND scheduled_at IS NOT NULL)) AND deleted_at IS NULL",
      [workspaceId]
    );
    const [[{ upcomingDeadlines }]] = await db.query(
      `SELECT (
        (SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND status NOT IN ('COMPLETED', 'BLOCKED') AND due_date >= NOW() AND due_date <= DATE_ADD(NOW(), INTERVAL 7 DAY) AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM content WHERE workspace_id = ? AND status NOT IN ('PUBLISHED', 'REJECTED') AND COALESCE(scheduled_at, due_date) >= NOW() AND COALESCE(scheduled_at, due_date) <= DATE_ADD(NOW(), INTERVAL 7 DAY) AND deleted_at IS NULL)
      ) as upcomingDeadlines`,
      [workspaceId, workspaceId]
    );

    console.log('Live Stats for Workspace ' + workspaceId + ':', {
      activeProjects,
      pendingTasks,
      overdueTasks,
      contentInReview,
      pendingClientApproval,
      revisionRequired,
      approvedContent,
      scheduledContent,
      upcomingDeadlines,
    });

    // 2. Team Workload
    const [teamRows] = await db.query(
      `SELECT u.id, u.full_name as name, u.avatar_url as avatar, COALESCE(u.job_title, r.name) as role,
              CAST(COUNT(CASE WHEN t.status IN ('TODO','IN_PROGRESS','IN_REVIEW','REVIEW','REVISION') THEN 1 END) AS UNSIGNED) as activeTasks,
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
    console.log('Team Workload rows count:', teamRows.length);
    console.log('Sample Team Members:', teamRows.slice(0, 3));

    // 3. Upcoming Deadlines
    const [taskDeadlines] = await db.query(
      `SELECT t.id, t.title, 'TASK' as type, t.due_date as dueDate, cli.name as client,
              u.full_name as assignee, u.avatar_url as assigneeAvatar, t.status
       FROM tasks t
       LEFT JOIN clients cli ON t.client_id = cli.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.workspace_id = ? AND t.status NOT IN ('COMPLETED', 'BLOCKED') AND t.due_date >= NOW() AND t.deleted_at IS NULL
       ORDER BY t.due_date ASC LIMIT 5`,
      [workspaceId]
    );

    const [contentDeadlines] = await db.query(
      `SELECT c.id, c.title, 'CONTENT' as type, COALESCE(c.scheduled_at, c.due_date) as dueDate,
              cli.name as client, u.full_name as assignee, u.avatar_url as assigneeAvatar, c.status
       FROM content c
       LEFT JOIN clients cli ON c.client_id = cli.id
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.workspace_id = ? AND c.status NOT IN ('PUBLISHED', 'REJECTED') AND COALESCE(c.scheduled_at, c.due_date) >= NOW() AND c.deleted_at IS NULL
       ORDER BY dueDate ASC LIMIT 5`,
      [workspaceId]
    );

    const allDeadlines = [...taskDeadlines, ...contentDeadlines]
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    console.log('Upcoming Deadlines count:', allDeadlines.length);
    console.log('Sample Deadlines:', allDeadlines);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
