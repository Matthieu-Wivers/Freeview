import { Router } from 'express';

import {
  googleCallback,
  googleStart,
  login,
  logout,
  me,
  register,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.get('/google', googleStart);
router.get('/google/callback', googleCallback);

export default router;
