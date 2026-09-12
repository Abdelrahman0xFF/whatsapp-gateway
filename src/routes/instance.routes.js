import { Router } from 'express';
import { instanceController } from '../controllers/instance.controller.js';
import { adminAuth, apiKeyAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/status', apiKeyAuth, (req, res, next) => {
  instanceController.getStatus(req, res, next);
});

router.get('/qr', adminAuth, (req, res, next) => {
  instanceController.getQr(req, res, next);
});

router.post('/pairing-code', adminAuth, (req, res, next) => {
  instanceController.getPairingCode(req, res, next);
});

router.post('/connect', adminAuth, (req, res, next) => {
  instanceController.connect(req, res, next);
});

router.post('/logout', adminAuth, (req, res, next) => {
  instanceController.logout(req, res, next);
});

router.post('/restart', adminAuth, (req, res, next) => {
  instanceController.restart(req, res, next);
});

export default router;
