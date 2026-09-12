import { webhookService } from '../services/webhook.service.js';

class WebhookController {
  getStatus(req, res) {
    return res.status(200).json({
      success: true,
      data: webhookService.getStatus()
    });
  }

  updateWebhook(req, res) {
    const { url } = req.body || {};
    if (url && typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook URL provided.'
      });
    }

    const trimmedUrl = url ? url.trim() : '';
    if (trimmedUrl) {
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return res.status(400).json({
            success: false,
            error: 'Webhook URL must use HTTP or HTTPS protocol.'
          });
        }
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Malformed webhook URL provided.'
        });
      }
    }

    webhookService.setWebhookUrl(trimmedUrl);
    return res.status(200).json({
      success: true,
      message: trimmedUrl ? 'Webhook URL updated successfully.' : 'Webhook disabled.',
      data: webhookService.getStatus()
    });
  }

  async testWebhook(req, res) {
    const status = webhookService.getStatus();
    if (!status.url) {
      return res.status(400).json({
        success: false,
        error: 'No webhook URL is currently configured.'
      });
    }

    try {
      await webhookService.dispatch('test.ping', {
        test: true,
        message: 'This is a test webhook payload from WhatsApp REST Gateway.'
      });

      return res.status(200).json({
        success: true,
        message: `Test webhook dispatched to ${status.url}`
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: `Failed to dispatch test webhook: ${err.message}`
      });
    }
  }
}

export const webhookController = new WebhookController();
