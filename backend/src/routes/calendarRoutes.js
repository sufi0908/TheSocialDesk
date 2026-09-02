const express = require('express');
const calendarController = require('../controllers/calendarController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Calendar Endpoints
router.get('/', calendarController.listScheduledEvents);
router.get('/unscheduled', calendarController.listUnscheduledApproved);
router.post('/schedule', calendarController.scheduleContent);
router.post('/check-conflict', calendarController.checkConflict);
router.put('/:id', calendarController.updateSchedule);
router.delete('/:id', calendarController.unscheduleContent);
router.patch('/:id/published', calendarController.markPublished);

module.exports = router;
