import { tokenService } from '../services/token.service.js';

export function apiKeyAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  
  const clientKey = 
    req.headers['x-api-key'] ||
    req.headers['apikey'] ||
    req.query.api_key ||
    bearerToken;

  const validation = tokenService.validateToken(clientKey);

  if (validation.valid) {
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
