import { Router } from 'express';
import { analyzeStockfish, analyzeStockfishStream } from '../controllers/stockfish.controller.js';

const router = Router();

router.post('/analyze', analyzeStockfish);
router.post('/analyze-stream', analyzeStockfishStream);

export default router;
