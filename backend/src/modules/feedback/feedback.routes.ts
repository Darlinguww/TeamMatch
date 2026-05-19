import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/auth.routes.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import FeedbackService from './feedback.service.js';

const router = Router();
const service = new FeedbackService();

// POST /feedback
// Body: { projectId, toUserId, score, comment }
router.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const result = await service.submitFeedback(req.user!.userId, req.body ?? {});
  res.status(201).json(result);
}));

// POST /projects/:id/close -> close project and enable feedback window (leader only)
router.post('/projects/:id/close', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const result = await service.closeProjectAndEnableFeedback(req.user!.userId, req.params.id, Number(req.body.windowDays ?? 7));
  res.status(200).json(result);
}));

export default router;
