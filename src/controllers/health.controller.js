import { ENV } from '../config/env.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { tokenService } from '../services/token.service.js';
import { activityService } from '../services/activity.service.js';

class HealthController {
  async getHealth(req, res) {
    const uptimeSeconds = Math.floor(process.uptime());
    let whatsappStatus = 'unknown';

    try {
      const status = await whatsappService.checkConnection();
      whatsappStatus = status.connected ? 'connected' : status.state;
    } catch {
      whatsappStatus = 'unreachable';
    }

    res.status(200).json({
      status: 'ok',
      service: 'whatsapp-rest-gateway',
      version: '2.0.0',
      uptime: `${uptimeSeconds}s`,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      engine: ENV.WHATSAPP_ENGINE,
      whatsapp: {
        status: whatsappStatus,
        mode: ENV.WHATSAPP_ENGINE === 'baileys' ? 'embedded (1-container)' : 'remote-evolution'
      },
      auth: {
        apiKeyProtected: tokenService.hasKeys(),
        tokenCount: tokenService.listTokens().length
      },
      stats: activityService.getStats()
    });
  }
}

export const healthController = new HealthController();
