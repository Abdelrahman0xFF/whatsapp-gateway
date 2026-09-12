import { whatsappService } from '../services/whatsapp.service.js';

class MessageController {
  async sendMessage(req, res, next) {
    try {
      const { number, message } = req.validated;
      const result = await whatsappService.sendTextMessage(number, message);

      return res.status(200).json({
        success: true,
        message: 'WhatsApp message sent successfully.',
        data: {
          recipient: result.recipient,
          messageId: result.messageId,
          status: result.status,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async sendMedia(req, res, next) {
    try {
      const validated = req.validated;
      const result = await whatsappService.sendMediaMessage(validated);

      return res.status(200).json({
        success: true,
        message: 'WhatsApp media message sent successfully.',
        data: {
          recipient: result.recipient,
          type: result.type,
          messageId: result.messageId,
          status: result.status,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async sendBulk(req, res, next) {
    try {
      const { numbers, message, messages } = req.body || {};

      let tasks = [];
      if (Array.isArray(messages) && messages.length > 0) {
        tasks = messages;
      } else if (Array.isArray(numbers) && message) {
        tasks = numbers.map(num => ({ number: num, message }));
      } else {
        return res.status(400).json({
          success: false,
          error: 'Provide either "messages": [{ number, message }] or "numbers": [...] with a "message".'
        });
      }

      if (tasks.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Bulk batch size exceeds maximum limit of 50 messages per request.'
        });
      }

      const results = [];
      let sentCount = 0;
      let failedCount = 0;

      for (const item of tasks) {
        const cleanNumber = String(item.number || item.phone || '').replace(/\D/g, '');
        const text = item.message || item.text || message;

        if (!cleanNumber || !text) {
          results.push({ number: item.number, success: false, error: 'Missing phone number or message' });
          failedCount++;
          continue;
        }

        try {
          const sent = await whatsappService.sendTextMessage(cleanNumber, text);
          results.push({
            number: cleanNumber,
            success: true,
            messageId: sent.messageId
          });
          sentCount++;
        } catch (err) {
          results.push({
            number: cleanNumber,
            success: false,
            error: err.message
          });
          failedCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 400));
      }

      return res.status(200).json({
        success: true,
        summary: {
          total: tasks.length,
          sent: sentCount,
          failed: failedCount
        },
        results
      });
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
