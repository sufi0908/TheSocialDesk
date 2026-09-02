const express = require('express');
const todoController = require('../controllers/todoController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// Personal To-Do API Endpoints (Strict User Isolation via req.user.id)
router.get('/', todoController.listTodos);
router.get('/stats', todoController.getStats);
router.get('/:id', todoController.getTodoById);
router.post('/', todoController.createTodo);
router.put('/:id', todoController.updateTodo);
router.patch('/:id/status', todoController.updateStatus);
router.patch('/:id/complete', todoController.toggleComplete);
router.delete('/:id', todoController.deleteTodo);

module.exports = router;
