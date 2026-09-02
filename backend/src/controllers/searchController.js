const searchService = require('../services/searchService');

class SearchController {
  // GET /api/search
  async globalSearch(req, res, next) {
    try {
      const { q, query } = req.query;
      const searchString = q || query || '';
      const result = await searchService.globalSearch(req.workspaceId, req.user, searchString);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SearchController();
