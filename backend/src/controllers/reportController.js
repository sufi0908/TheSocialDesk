const reportService = require('../services/reportService');

class ReportController {
  extractFilters(req) {
    return {
      dateRange: req.query.dateRange || 'This Month',
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      clientId: req.query.clientId || 'All',
      projectId: req.query.projectId || 'All',
      teamMemberId: req.query.teamMemberId || 'All',
      status: req.query.status || 'All',
    };
  }

  // GET /api/workspace/reports
  async getReports(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const filters = this.extractFilters(req);
      const data = await reportService.getFullReports(workspaceId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/reports/overview
  async getOverview(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const filters = this.extractFilters(req);
      const data = await reportService.getOverview(workspaceId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/reports/team-workload
  async getTeamWorkload(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const filters = this.extractFilters(req);
      const data = await reportService.getTeamWorkload(workspaceId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/reports/project-progress
  async getProjectProgress(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const filters = this.extractFilters(req);
      const data = await reportService.getProjectProgress(workspaceId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/reports/task-completion
  async getTaskCompletion(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const filters = this.extractFilters(req);
      const data = await reportService.getTaskCompletion(workspaceId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/reports/content-status
  async getContentStatus(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const filters = this.extractFilters(req);
      const data = await reportService.getContentStatusPipeline(workspaceId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/reports/approval-status
  async getApprovalStatus(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const filters = this.extractFilters(req);
      const data = await reportService.getApprovalStatus(workspaceId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/reports/deadline-status
  async getDeadlineStatus(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const filters = this.extractFilters(req);
      const data = await reportService.getDeadlineStatus(workspaceId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/reports/client-summary
  async getClientSummary(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const filters = this.extractFilters(req);
      const data = await reportService.getClientWorkSummary(workspaceId, filters);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

const controller = new ReportController();
// Bind methods to preserve `this` context
controller.getReports = controller.getReports.bind(controller);
controller.getOverview = controller.getOverview.bind(controller);
controller.getTeamWorkload = controller.getTeamWorkload.bind(controller);
controller.getProjectProgress = controller.getProjectProgress.bind(controller);
controller.getTaskCompletion = controller.getTaskCompletion.bind(controller);
controller.getContentStatus = controller.getContentStatus.bind(controller);
controller.getApprovalStatus = controller.getApprovalStatus.bind(controller);
controller.getDeadlineStatus = controller.getDeadlineStatus.bind(controller);
controller.getClientSummary = controller.getClientSummary.bind(controller);

module.exports = controller;
