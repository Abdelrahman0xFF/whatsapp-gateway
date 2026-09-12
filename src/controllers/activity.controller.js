import { activityService } from '../services/activity.service.js';

class ActivityController {
  async getActivities(req, res, next) {
    try {
      const { page, limit, type, status, search } = req.query;
      const { activities, pagination } = activityService.getActivities({
        page,
        limit,
        type,
        status,
        search
      });
      const stats = activityService.getStats();

      return res.status(200).json({
        success: true,
        stats,
        pagination,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteActivity(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = activityService.deleteActivity(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Activity entry not found.'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Activity entry deleted.'
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
