const revisionService = require('../services/revisionService');

class RevisionController {
  async createRevisionRequest(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const contentId = req.params.contentId;
      const result = await revisionService.createRevisionRequest(req.user, workspaceId, contentId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async startRevision(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const revisionId = req.params.id;
      const result = await revisionService.startRevision(req.user, workspaceId, revisionId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async resubmitRevision(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const revisionId = req.params.id;
      const result = await revisionService.resubmitRevision(req.user, workspaceId, revisionId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async resolveAndApprove(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const revisionId = req.params.id;
      const result = await revisionService.resolveAndApprove(req.user, workspaceId, revisionId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getRevisionHistory(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const contentId = req.params.contentId;
      const history = await revisionService.getRevisionHistory(req.user, workspaceId, contentId);
      res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  }

  async listMyRevisions(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const revisions = await revisionService.listMyRevisions(req.user, workspaceId, req.query);
      res.status(200).json(revisions);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RevisionController();
