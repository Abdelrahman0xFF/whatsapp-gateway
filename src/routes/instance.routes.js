import { Router } from 'express';
import { instanceController } from '../controllers/instance.controller.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/status', (req, res, next) => {
  instanceController.getStatus(req, res, next);
});

router.get('/qr', (req, res, next) => {
  instanceController.getQr(req, res, next);
});

router.post('/pairing-code', (req, res, next) => {
  instanceController.getPairingCode(req, res, next);
});

router.post('/connect', apiKeyAuth, (req, res, next) => {
  instanceController.connect(req, res, next);
});

router.post('/logout', apiKeyAuth, (req, res, next) => {
  instanceController.logout(req, res, next);
});

router.post('/restart', apiKeyAuth, (req, res, next) => {
  instanceController.restart(req, res, next);
});

export default router;
