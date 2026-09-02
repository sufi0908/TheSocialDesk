const todoService = require('../services/todoService');

class TodoController {
  // GET /api/todos
  async listTodos(req, res, next) {
    try {
      const { status, priority, category, dueDateFilter, search, sortBy, sortOrder } = req.query;
      const result = await todoService.listTodos(req.user.id, req.workspaceId, {
        status,
        priority,
        category,
        dueDateFilter,
        search,
        sortBy,
        sortOrder,
      });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/todos/stats
  async getStats(req, res, next) {
    try {
      const stats = await todoService.getStats(req.user.id, req.workspaceId);
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/todos/:id
  async getTodoById(req, res, next) {
    try {
      const todo = await todoService.getTodoById(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        data: todo,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/todos
  async createTodo(req, res, next) {
    try {
      const todo = await todoService.createTodo(req.user.id, req.workspaceId, req.body);
      return res.status(201).json({
        success: true,
        message: 'To-Do created successfully.',
        data: todo,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/todos/:id
  async updateTodo(req, res, next) {
    try {
      const todo = await todoService.updateTodo(req.user.id, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'To-Do updated successfully.',
        data: todo,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/todos/:id/status
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const todo = await todoService.updateStatus(req.user.id, req.params.id, status);
      return res.status(200).json({
        success: true,
        message: 'To-Do status updated.',
        data: todo,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/todos/:id/complete
  async toggleComplete(req, res, next) {
    try {
      const { isCompleted } = req.body;
      const completedVal = isCompleted !== undefined ? isCompleted : true;
      const todo = await todoService.toggleComplete(req.user.id, req.params.id, completedVal);
      return res.status(200).json({
        success: true,
        message: isCompleted ? 'To-Do marked completed.' : 'To-Do restored to pending.',
        data: todo,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/todos/:id
  async deleteTodo(req, res, next) {
    try {
      const result = await todoService.deleteTodo(req.user.id, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TodoController();
