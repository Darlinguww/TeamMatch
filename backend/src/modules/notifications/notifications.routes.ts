import { Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { NotificationsService } from './notifications.service.js';

const router = Router();
const notificationsService = new NotificationsService();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const notifications = await notificationsService.getUserNotifications(req.user!.userId);
  res.status(200).json({ notifications });
}));

router.patch('/:notificationId/read', requireAuth, asyncHandler(async (req, res) => {
  await notificationsService.markAsRead(req.user!.userId, req.params.notificationId);
  res.status(200).json({ message: 'Notification marked as read' });
}));

export default router;
