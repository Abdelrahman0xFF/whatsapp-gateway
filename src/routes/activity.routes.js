import { Router } from 'express';
import { activityController } from '../controllers/activity.controller.js';

const router = Router();

router.get('/', (req, res, next) => {
  activityController.getActivities(req, res, next);
});

router.delete('/clear', (req, res, next) => {
  activityController.clearActivities(req, res, next);
});

router.delete('/:id', (req, res, next) => {
  activityController.deleteActivity(req, res, next);
});

export default router;
