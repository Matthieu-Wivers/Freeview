import { Router } from 'express';
import { analyzeStockfish } from '../controllers/stockfish.controller.js';

const router = Router();

router.post('/analyze', analyzeStockfish);

export default router;
