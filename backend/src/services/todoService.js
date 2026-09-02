const { db } = require('../config/database');

class TodoService {
  /**
   * Fetch personal To-Dos for the authenticated user only.
   */
  async listTodos(userId, workspaceId, filters = {}) {
    const { status, priority, category, dueDateFilter, search, sortBy, sortOrder } = filters;

    let query = `
      SELECT t.id, t.user_id, t.workspace_id, t.title, t.description, t.status, t.priority,
             t.category, t.due_date, t.due_time, t.completed_at, t.related_task_id, t.related_content_id,
             t.created_at, t.updated_at,
             tk.title as related_task_title,
             cnt.title as related_content_title
      FROM todos t
      LEFT JOIN tasks tk ON t.related_task_id = tk.id
      LEFT JOIN content cnt ON t.related_content_id = cnt.id
      WHERE t.user_id = ? AND t.deleted_at IS NULL
    `;
    const params = [userId];

    if (workspaceId) {
      query += ' AND (t.workspace_id = ? OR t.workspace_id IS NULL)';
      params.push(workspaceId);
    }

    if (status && status !== 'ALL') {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (priority && priority !== 'ALL') {
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    if (category && category !== 'ALL') {
      query += ' AND t.category = ?';
      params.push(category);
    }

    // Dynamic Due Date Filters
    if (dueDateFilter === 'today') {
      query += ' AND t.due_date = CURDATE() AND t.status != "COMPLETED"';
    } else if (dueDateFilter === 'overdue') {
      query += ' AND t.due_date < CURDATE() AND t.status != "COMPLETED"';
    } else if (dueDateFilter === 'upcoming') {
      query += ' AND t.due_date > CURDATE() AND t.status != "COMPLETED"';
    } else if (dueDateFilter === 'completed') {
      query += ' AND t.status = "COMPLETED"';
    }

    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ? OR t.category LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // Sorting
    let orderByClause = ' ORDER BY CASE WHEN t.status = "COMPLETED" THEN 1 ELSE 0 END ASC';
    if (sortBy === 'due_date') {
      const order = sortOrder && sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      orderByClause += `, t.due_date ${order}, t.due_time ${order}`;
    } else if (sortBy === 'priority') {
      orderByClause += `, FIELD(t.priority, 'URGENT', 'HIGH', 'MEDIUM', 'LOW') ASC`;
    } else if (sortBy === 'created_at') {
      const order = sortOrder && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      orderByClause += `, t.created_at ${order}`;
    } else {
      orderByClause += `, COALESCE(t.due_date, '9999-12-31') ASC, t.created_at DESC`;
    }

    query += orderByClause;

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * Get real To-Do counters for user dashboard & headers.
   */
  async getStats(userId, workspaceId) {
    let wsCondition = '';
    const params = [userId];
    if (workspaceId) {
      wsCondition = ' AND (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }

    const [todayRows] = await db.execute(
      `SELECT COUNT(*) as count FROM todos WHERE user_id = ? ${wsCondition} AND deleted_at IS NULL AND due_date = CURDATE() AND status != 'COMPLETED'`,
      params
    );

    const [overdueRows] = await db.execute(
      `SELECT COUNT(*) as count FROM todos WHERE user_id = ? ${wsCondition} AND deleted_at IS NULL AND due_date < CURDATE() AND status != 'COMPLETED'`,
      params
    );

    const [completedRows] = await db.execute(
      `SELECT COUNT(*) as count FROM todos WHERE user_id = ? ${wsCondition} AND deleted_at IS NULL AND status = 'COMPLETED'`,
      params
    );

    const [pendingRows] = await db.execute(
      `SELECT COUNT(*) as count FROM todos WHERE user_id = ? ${wsCondition} AND deleted_at IS NULL AND status IN ('TODO', 'IN_PROGRESS')`,
      params
    );

    return {
      today: todayRows[0]?.count || 0,
      overdue: overdueRows[0]?.count || 0,
      completed: completedRows[0]?.count || 0,
      pending: pendingRows[0]?.count || 0,
    };
  }

  /**
   * Get single To-Do.
   */
  async getTodoById(userId, todoId) {
    const [rows] = await db.execute(
      `SELECT * FROM todos WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [todoId, userId]
    );
    if (rows.length === 0) {
      const error = new Error('To-Do item not found.');
      error.status = 404;
      throw error;
    }
    return rows[0];
  }

  /**
   * Create a personal To-Do item.
   */
  async createTodo(userId, workspaceId, data) {
    const { title, description, priority, category, dueDate, dueTime, status, relatedTaskId, relatedContentId } = data;

    if (!title || !title.trim()) {
      const error = new Error('To-Do title is required.');
      error.status = 400;
      throw error;
    }

    const itemStatus = status || 'TODO';
    const itemPriority = priority || 'MEDIUM';
    const itemCategory = category || 'General';
    const itemDueDate = dueDate || null;
    const itemDueTime = dueTime || null;
    const completedAt = itemStatus === 'COMPLETED' ? new Date() : null;

    const [result] = await db.execute(
      `INSERT INTO todos (user_id, workspace_id, title, description, status, priority, category, due_date, due_time, completed_at, related_task_id, related_content_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        workspaceId || null,
        title.trim(),
        description || null,
        itemStatus,
        itemPriority,
        itemCategory,
        itemDueDate,
        itemDueTime,
        completedAt,
        relatedTaskId || null,
        relatedContentId || null,
      ]
    );

    return this.getTodoById(userId, result.insertId);
  }

  /**
   * Update personal To-Do item.
   */
  async updateTodo(userId, todoId, data) {
    await this.getTodoById(userId, todoId); // Verify ownership

    const { title, description, priority, category, dueDate, dueTime, status, relatedTaskId, relatedContentId } = data;

    if (!title || !title.trim()) {
      const error = new Error('To-Do title is required.');
      error.status = 400;
      throw error;
    }

    let completedAtUpdate = '';
    if (status === 'COMPLETED') {
      completedAtUpdate = ', completed_at = COALESCE(completed_at, NOW())';
    } else if (status) {
      completedAtUpdate = ', completed_at = NULL';
    }

    await db.execute(
      `UPDATE todos
       SET title = ?, description = ?, priority = ?, category = ?, due_date = ?, due_time = ?,
           status = COALESCE(?, status), related_task_id = ?, related_content_id = ?, updated_at = NOW() ${completedAtUpdate}
       WHERE id = ? AND user_id = ?`,
      [
        title.trim(),
        description || null,
        priority || 'MEDIUM',
        category || 'General',
        dueDate || null,
        dueTime || null,
        status || 'TODO',
        relatedTaskId || null,
        relatedContentId || null,
        todoId,
        userId,
      ]
    );

    return this.getTodoById(userId, todoId);
  }

  /**
   * Toggle completion checkbox.
   */
  async toggleComplete(userId, todoId, isCompleted = true) {
    await this.getTodoById(userId, todoId);

    const newStatus = isCompleted ? 'COMPLETED' : 'TODO';
    const completedAt = isCompleted ? new Date() : null;

    await db.execute(
      `UPDATE todos SET status = ?, completed_at = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
      [newStatus, completedAt, todoId, userId]
    );

    return this.getTodoById(userId, todoId);
  }

  /**
   * Update status string.
   */
  async updateStatus(userId, todoId, status) {
    await this.getTodoById(userId, todoId);

    const isCompleted = status === 'COMPLETED';
    const completedAt = isCompleted ? new Date() : null;

    await db.execute(
      `UPDATE todos SET status = ?, completed_at = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
      [status, completedAt, todoId, userId]
    );

    return this.getTodoById(userId, todoId);
  }

  /**
   * Delete personal To-Do item.
   */
  async deleteTodo(userId, todoId) {
    await this.getTodoById(userId, todoId);

    await db.execute(
      `UPDATE todos SET deleted_at = NOW() WHERE id = ? AND user_id = ?`,
      [todoId, userId]
    );

    return { success: true, message: 'To-Do item deleted successfully.' };
  }
}

module.exports = new TodoService();
