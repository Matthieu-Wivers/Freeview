import {
  getAdminUser,
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '../services/adminUser.service.js';

export async function listAdminUsersController(req, res, next) {
  try {
    const users = await listAdminUsers(req.query ?? {});
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminUserController(req, res, next) {
  try {
    const user = await getAdminUser(req.params.id);
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminUserRoleController(req, res, next) {
  try {
    const user = await updateAdminUserRole(req.user.id, req.params.id, req.body ?? {});
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminUserStatusController(req, res, next) {
  try {
    const user = await updateAdminUserStatus(req.user.id, req.params.id, req.body ?? {});
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}
