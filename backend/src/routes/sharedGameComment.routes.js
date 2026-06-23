import { Router } from 'express';
import { createCommentController, listCommentsController } from '../controllers/comment.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { optionalAuth } from '../middlewares/optionalAuth.middleware.js';

const router = Router();

router.get('/:id/comments', optionalAuth, listCommentsController);
router.post('/:id/comments', requireAuth, createCommentController);

export default router;
