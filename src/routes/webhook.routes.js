import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';
import { adminAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(adminAuth);

router.get('/status', (req, res) => {
  webhookController.getStatus(req, res);
});

router.post('/configure', (req, res) => {
  webhookController.updateWebhook(req, res);
});

router.post('/test', (req, res) => {
  webhookController.testWebhook(req, res);
});

export default router;
