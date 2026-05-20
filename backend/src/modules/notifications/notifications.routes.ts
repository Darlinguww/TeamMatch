import { Router } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { ParticipationRepository } from '../participation/participation.repository.js';
import { ParticipationService } from '../participation/participation.service.js';
import { NotificationsService } from './notifications.service.js';

const router = Router();
const notificationsService = new NotificationsService();
const participationService = new ParticipationService(new ParticipationRepository());

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const notifications = await notificationsService.getUserNotifications(req.user!.userId);
  res.status(200).json({ notifications });
}));

router.patch('/:notificationId/read', requireAuth, asyncHandler(async (req, res) => {
  await notificationsService.markAsRead(req.user!.userId, req.params.notificationId);
  res.status(200).json({ message: 'Notification marked as read' });
}));

router.post('/:notificationId/respond', requireAuth, asyncHandler(async (req, res) => {
  const result = await participationService.respondToNotification(
    req.user!.userId,
    req.params.notificationId,
    req.body?.decision
  );
  res.status(200).json(result);
}));

export default router;
