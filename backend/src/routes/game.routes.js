import { Router } from 'express';
import { createGame, deleteGame, getGame, getMyGames, updateGame } from '../controllers/game.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/import', requireAuth, createGame);
router.get('/me', requireAuth, getMyGames);
router.get('/:id', requireAuth, getGame);
router.patch('/:id', requireAuth, updateGame);
router.delete('/:id', requireAuth, deleteGame);

export default router;
