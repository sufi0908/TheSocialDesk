const approvalService = require('../services/approvalService');

class ApprovalController {
  // POST /api/content/:id/submit-internal-review
  async submitInternalReview(req, res, next) {
    try {
      const result = await approvalService.submitInternalReview(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/internal-approve
  async internalApprove(req, res, next) {
    try {
      const result = await approvalService.internalApprove(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/internal-revision
  async internalRevision(req, res, next) {
    try {
      const result = await approvalService.internalRevision(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/resubmit
  async resubmitContent(req, res, next) {
    try {
      const result = await approvalService.resubmitContent(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/submit-client-review
  async submitClientReview(req, res, next) {
    try {
      const result = await approvalService.submitClientReview(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/client-approve
  async clientApprove(req, res, next) {
    try {
      const result = await approvalService.clientApprove(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/external-client-approve
  async externalClientApprove(req, res, next) {
    try {
      const result = await approvalService.externalClientApprove(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/client-revision
  async clientRevision(req, res, next) {
    try {
      const result = await approvalService.clientRevision(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/reject
  async rejectContent(req, res, next) {
    try {
      const result = await approvalService.rejectContent(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/content/:id/approvals
  async getApprovalHistory(req, res, next) {
    try {
      const result = await approvalService.getApprovalHistory(req.workspaceId, req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ApprovalController();
