import { tokenService } from '../services/token.service.js';
import { adminService } from '../services/admin.service.js';

function extractCandidateKey(req) {
  const authHeader = req.headers['authorization'] || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const bearerToken = bearerMatch ? bearerMatch[1].trim() : null;

  return (
    req.headers['x-admin-key'] ||
    req.headers['x-api-key'] ||
    req.headers['apikey'] ||
    bearerToken ||
    ''
  );
}

/**
 * Strict Master Admin Authorization Middleware
 * Enforced on management endpoints: token generation/revocation, activity audit, instance pairing/QR, webhooks.
 */
export function adminAuth(req, res, next) {
  const candidateKey = extractCandidateKey(req);

  if (!candidateKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Master Admin Key required. Provide "x-admin-key" header or "Authorization: Bearer <admin-key>".',
      code: 'ERR_ADMIN_UNAUTHORIZED'
    });
  }

  if (adminService.validateAdminKey(candidateKey)) {
    req.isAdmin = true;
    req.authRole = 'admin';
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden: Invalid Master Admin Key provided.',
    code: 'ERR_ADMIN_FORBIDDEN'
  });
}

/**
 * Gateway API Key Authorization Middleware
 * Enforced on messaging and OTP endpoints.
 * Accepts either:
 *  1. The Master Admin Key (for administrative testing & dispatch)
 *  2. Any active client API token generated via Token Studio
 */
export function apiKeyAuth(req, res, next) {
  const candidateKey = extractCandidateKey(req);

  // 1. Check if caller provided the Master Admin Key
  if (candidateKey && adminService.validateAdminKey(candidateKey)) {
    req.isAdmin = true;
    req.authRole = 'admin';
    return next();
  }

  // 2. Validate against client tokens
  const validation = tokenService.validateToken(candidateKey);

  if (validation.valid) {
    req.isAdmin = false;
    req.authRole = 'client';
    if (validation.token) {
      req.tokenInfo = validation.token;
    }
    return next();
  }

  if (validation.reason === 'Missing API key') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing API Key. Provide "x-api-key" header or "Authorization: Bearer <token>".',
      code: 'ERR_UNAUTHORIZED'
    });
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden: Invalid API Key provided.',
    code: 'ERR_FORBIDDEN'
  });
}
