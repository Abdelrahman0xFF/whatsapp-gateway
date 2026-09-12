import { activityService } from '../services/activity.service.js';

class ActivityController {
  async getActivities(req, res, next) {
    try {
      const { limit } = req.query;
      const activities = activityService.getActivities(limit);
      const stats = activityService.getStats();

      return res.status(200).json({
        success: true,
        stats,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  }

  async clearActivities(req, res, next) {
    try {
      activityService.clear();
      return res.status(200).json({
        success: true,
        message: 'Activity log cleared successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const activityController = new ActivityController();
