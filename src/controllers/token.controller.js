import { tokenService } from '../services/token.service.js';

class TokenController {
  async listTokens(req, res, next) {
    try {
      const tokens = tokenService.listTokens();
      return res.status(200).json({
        success: true,
        count: tokens.length,
        hasKeys: tokenService.hasKeys(),
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  }

  async generateToken(req, res, next) {
    try {
      const { name } = req.body || {};
      const newToken = tokenService.generateToken(name || 'Default API Token');

      return res.status(201).json({
        success: true,
        message: 'API token generated successfully. Save this token now; you will not be able to view it in plain text later.',
        data: newToken
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeToken(req, res, next) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Token ID is required.'
        });
      }

      const revoked = tokenService.revokeToken(id);
      if (!revoked) {
        return res.status(404).json({
          success: false,
          error: 'Token not found or already revoked.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Token revoked successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const tokenController = new TokenController();
