import { Router } from 'express';
import { deleteCommentController, updateCommentController } from '../controllers/comment.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.patch('/:id', requireAuth, updateCommentController);
router.delete('/:id', requireAuth, deleteCommentController);

export default router;
