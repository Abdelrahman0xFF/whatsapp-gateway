import { Router } from 'express';
import { tokenController } from '../controllers/token.controller.js';

const router = Router();

router.get('/', (req, res, next) => {
  tokenController.listTokens(req, res, next);
});

router.post('/generate', (req, res, next) => {
  tokenController.generateToken(req, res, next);
});

router.delete('/:id', (req, res, next) => {
  tokenController.revokeToken(req, res, next);
});

export default router;
