import crypto from 'node:crypto';
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
      const { numbers, message, messages, async: runAsync = false, delayMs = 1000 } = req.body || {};

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

      const batchId = `batch_${crypto.randomBytes(6).toString('hex')}`;
      const safeDelay = Math.max(parseInt(delayMs, 10) || 1000, 500);

      const processBatch = async () => {
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

          // Anti-ban randomized jitter delay between dispatches
          const jitter = Math.floor(Math.random() * 400);
          await new Promise(resolve => setTimeout(resolve, safeDelay + jitter));
        }

        return {
          batchId,
          total: tasks.length,
          sent: sentCount,
          failed: failedCount,
          results
        };
      };

      if (runAsync) {
        // Return 202 Accepted immediately to prevent HTTP proxy timeouts
        processBatch().catch(err => {
          console.error(`[MessageController] Bulk batch ${batchId} error:`, err);
        });

        return res.status(202).json({
          success: true,
          status: 'QUEUED',
          message: 'Bulk dispatch accepted and processing asynchronously in background.',
          batchId,
          total: tasks.length
        });
      }

      // Synchronous execution for smaller batches
      const outcome = await processBatch();
      return res.status(200).json({
        success: true,
        batchId: outcome.batchId,
        summary: {
          total: outcome.total,
          sent: outcome.sent,
          failed: outcome.failed
        },
        results: outcome.results
      });
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
