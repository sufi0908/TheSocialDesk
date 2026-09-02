const fs = require('fs');
const userService = require('../services/userService');

class UserController {
  /**
   * POST /api/users/create (Admin Controlled Account Creation)
   */
  async createUser(req, res, next) {
    try {
      const { fullName, email, roleName, workspaceId } = req.body;
      const result = await userService.createUser(req.user, {
        fullName,
        email,
        roleName,
        workspaceId,
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully with temporary credentials.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/users/me/avatar
  async uploadAvatar(req, res, next) {
    try {
      const result = await userService.updateAvatar(req.user, req.file);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/users/me/avatar
  async removeAvatar(req, res, next) {
    try {
      const result = await userService.removeAvatar(req.user);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/users/:id/avatar
  async getAvatar(req, res, next) {
    try {
      const { filePath, mimeType } = await userService.getAvatarFile(req.params.id);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => {
        if (!res.headersSent) next(err);
      });
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();

