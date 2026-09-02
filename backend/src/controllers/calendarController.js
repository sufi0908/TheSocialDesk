const calendarService = require('../services/calendarService');

class CalendarController {
  // GET /api/calendar
  async listScheduledEvents(req, res, next) {
    try {
      const { clientId, startDate, endDate, status } = req.query;
      const result = await calendarService.listScheduledEvents(req.workspaceId, {
        clientId,
        startDate,
        endDate,
        status,
        currentUser: req.user,
      });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/calendar/unscheduled
  async listUnscheduledApproved(req, res, next) {
    try {
      const { clientId, search } = req.query;
      const result = await calendarService.listUnscheduledApproved(req.workspaceId, {
        clientId,
        search,
        currentUser: req.user,
      });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/calendar/schedule
  async scheduleContent(req, res, next) {
    try {
      const result = await calendarService.scheduleContent(req.user, req.workspaceId, req.body);
      return res.status(200).json({
        success: true,
        message: 'Content scheduled successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/calendar/:id
  async updateSchedule(req, res, next) {
    try {
      const result = await calendarService.updateSchedule(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Schedule updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/calendar/:id
  async unscheduleContent(req, res, next) {
    try {
      const result = await calendarService.unscheduleContent(req.user, req.workspaceId, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/calendar/check-conflict
  async checkConflict(req, res, next) {
    try {
      const result = await calendarService.checkConflict(req.workspaceId, req.body);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/calendar/:id/published
  async markPublished(req, res, next) {
    try {
      const result = await calendarService.markPublished(req.user, req.workspaceId, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Content marked as published.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CalendarController();
