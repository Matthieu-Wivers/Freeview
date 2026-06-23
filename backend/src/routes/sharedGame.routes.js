import { Router } from 'express';
import {
  createSharedGameController,
  deleteSharedGameController,
  getSharedGameController,
  listMySharedGamesController,
  listSharedGamesController,
  updateSharedGameController,
} from '../controllers/sharedGame.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { optionalAuth } from '../middlewares/optionalAuth.middleware.js';

const router = Router();

router.get('/', optionalAuth, listSharedGamesController);
router.post('/', requireAuth, createSharedGameController);
router.get('/me', requireAuth, listMySharedGamesController);
router.get('/:id', optionalAuth, getSharedGameController);
router.patch('/:id', requireAuth, updateSharedGameController);
router.delete('/:id', requireAuth, deleteSharedGameController);

export default router;
