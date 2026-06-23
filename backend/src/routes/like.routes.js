import { Router } from 'express';
import {
  getSharedGameLikesController,
  likeSharedGameController,
  unlikeSharedGameController,
} from '../controllers/like.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { optionalAuth } from '../middlewares/optionalAuth.middleware.js';

const router = Router();

router.post('/:id/like', requireAuth, likeSharedGameController);
router.delete('/:id/like', requireAuth, unlikeSharedGameController);
router.get('/:id/likes', optionalAuth, getSharedGameLikesController);

export default router;
