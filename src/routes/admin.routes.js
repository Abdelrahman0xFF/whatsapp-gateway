import { Router } from 'express';
import { adminService } from '../services/admin.service.js';
import { adminAuth } from '../middlewares/auth.middleware.js';
import { adminRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/verify', adminRateLimiter, (req, res) => {
  const candidateKey = 
    req.body?.key || 
    req.headers['x-admin-key'] || 
    req.headers['x-api-key'] ||
    '';

  if (!candidateKey || typeof candidateKey !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Please provide the Master Admin Key to verify.'
    });
  }

  if (adminService.validateAdminKey(candidateKey)) {
    return res.status(200).json({
      success: true,
      message: 'Admin Master Key verified successfully.',
      source: adminService.getKeySource(),
      maskedKey: adminService.getMaskedAdminKey()
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid Master Admin Key provided.',
    code: 'ERR_ADMIN_FORBIDDEN'
  });
});

router.get('/status', adminAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    authenticated: true,
    source: adminService.getKeySource(),
    maskedKey: adminService.getMaskedAdminKey()
  });
});

export default router;
