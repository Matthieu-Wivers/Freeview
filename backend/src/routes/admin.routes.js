import { Router } from 'express';
import {
  getAdminUserController,
  listAdminUsersController,
  updateAdminUserRoleController,
  updateAdminUserStatusController,
} from '../controllers/adminUser.controller.js';
import { listAdminReportsController, updateAdminReportController } from '../controllers/report.controller.js';
import {
  listModerationActionsController,
  moderateCommentController,
  moderateSharedGameController,
} from '../controllers/moderation.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users', listAdminUsersController);
router.get('/users/:id', getAdminUserController);
router.patch('/users/:id/role', updateAdminUserRoleController);
router.patch('/users/:id/status', updateAdminUserStatusController);

router.get('/reports', listAdminReportsController);
router.patch('/reports/:id', updateAdminReportController);

router.get('/moderation/actions', listModerationActionsController);
router.patch('/shared-games/:id/moderation', moderateSharedGameController);
router.patch('/comments/:id/moderation', moderateCommentController);

export default router;
