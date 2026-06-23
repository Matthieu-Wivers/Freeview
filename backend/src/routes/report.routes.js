import { Router } from 'express';
import { createReportController } from '../controllers/report.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', requireAuth, createReportController);

export default router;
