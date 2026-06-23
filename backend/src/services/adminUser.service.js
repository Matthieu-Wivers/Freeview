import { assertUuid, createHttpError } from '../utils/httpError.utils.js';
import { cleanString, parseBooleanQuery, parsePagination } from '../utils/request.utils.js';
import {
  findUserForAdmin,
  listUsersForAdmin,
  updateUserDisabledStatusRecord,
  updateUserRoleRecord,
} from '../repositories/adminUser.repository.js';

const ROLES = new Set(['USER', 'ADMIN']);

export async function listAdminUsers(query) {
  const pagination = parsePagination(query);
  const search = cleanString(query.search ?? query.q ?? '', { maxLength: 120 });
  return listUsersForAdmin({ ...pagination, search });
}

export async function getAdminUser(userId) {
  const id = assertUuid(userId, 'userId');
  const user = await findUserForAdmin(id);

  if (!user) {
    throw createHttpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }

  return user;
}

export async function updateAdminUserRole(currentAdminId, userId, payload) {
  const id = assertUuid(userId, 'userId');
  const role = cleanString(payload.role, { maxLength: 20 });

  if (!ROLES.has(role)) {
    throw createHttpError(400, 'INVALID_ROLE', 'Rôle utilisateur invalide.');
  }

  if (currentAdminId === id && role !== 'ADMIN') {
    throw createHttpError(400, 'CANNOT_REMOVE_OWN_ADMIN_ROLE', 'Tu ne peux pas retirer ton propre rôle admin.');
  }

  const user = await updateUserRoleRecord(id, role);

  if (!user) {
    throw createHttpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }

  return user;
}

export async function updateAdminUserStatus(currentAdminId, userId, payload) {
  const id = assertUuid(userId, 'userId');
  const disabled = parseBooleanQuery(payload.disabled ?? payload.isDisabled);

  if (disabled === null) {
    throw createHttpError(400, 'INVALID_DISABLED_STATUS', 'Le champ disabled doit être un booléen.');
  }

  if (currentAdminId === id && disabled) {
    throw createHttpError(400, 'CANNOT_DISABLE_SELF', 'Tu ne peux pas désactiver ton propre compte admin.');
  }

  const user = await updateUserDisabledStatusRecord(id, disabled);

  if (!user) {
    throw createHttpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }

  return user;
}
