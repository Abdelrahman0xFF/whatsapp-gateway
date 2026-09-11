import { ENV } from '../config/env.js';

export function apiKeyAuth(req, res, next) {
  if (!ENV.GATEWAY_API_KEY) {
    return next();
  }

  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  
  const clientKey = 
    req.headers['x-api-key'] ||
    req.headers['apikey'] ||
    req.query.api_key ||
    bearerToken;

  if (!clientKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing API Key. Provide "x-api-key" header or Bearer token.'
    });
  }

  const validKeys = ENV.GATEWAY_API_KEY.split(',').map(k => k.trim()).filter(Boolean);
  if (!validKeys.includes(clientKey)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid API Key provided.'
    });
  }

  next();
}
