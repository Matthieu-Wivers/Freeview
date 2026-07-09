import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminUserRepository = vi.hoisted(() => ({
  findUserForAdmin: vi.fn(),
  listUsersForAdmin: vi.fn(),
  updateUserDisabledStatusRecord: vi.fn(),
  updateUserRoleRecord: vi.fn(),
}));

vi.mock('../../repositories/adminUser.repository.js', () => adminUserRepository);

import {
  getAdminUser,
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '../../services/adminUser.service.js';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

describe('adminUser.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists users with sanitized pagination and search', async () => {
    const rows = [{ id: USER_ID }];
    adminUserRepository.listUsersForAdmin.mockResolvedValue(rows);

    await expect(listAdminUsers({ limit: '15', offset: '3', q: '  matthieu  ' })).resolves.toBe(rows);

    expect(adminUserRepository.listUsersForAdmin).toHaveBeenCalledWith({
      limit: 15,
      offset: 3,
      search: 'matthieu',
    });
  });

  it('reads one user for admin', async () => {
    const user = { id: USER_ID, role: 'USER' };
    adminUserRepository.findUserForAdmin.mockResolvedValue(user);

    await expect(getAdminUser(USER_ID)).resolves.toBe(user);
  });

  it('throws 404 when admin user lookup misses', async () => {
    adminUserRepository.findUserForAdmin.mockResolvedValue(null);

    await expect(getAdminUser(USER_ID)).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });

  it('updates a user role', async () => {
    const updated = { id: USER_ID, role: 'ADMIN' };
    adminUserRepository.updateUserRoleRecord.mockResolvedValue(updated);

    await expect(updateAdminUserRole(ADMIN_ID, USER_ID, { role: 'ADMIN' })).resolves.toBe(updated);

    expect(adminUserRepository.updateUserRoleRecord).toHaveBeenCalledWith(USER_ID, 'ADMIN');
  });

  it('rejects invalid roles and self-demotion', async () => {
    await expect(updateAdminUserRole(ADMIN_ID, USER_ID, { role: 'OWNER' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_ROLE',
    });

    await expect(updateAdminUserRole(ADMIN_ID, ADMIN_ID, { role: 'USER' })).rejects.toMatchObject({
      status: 400,
      code: 'CANNOT_REMOVE_OWN_ADMIN_ROLE',
    });
  });

  it('throws 404 when role update misses', async () => {
    adminUserRepository.updateUserRoleRecord.mockResolvedValue(null);

    await expect(updateAdminUserRole(ADMIN_ID, USER_ID, { role: 'USER' })).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });

  it('updates disabled status from boolean-like payloads', async () => {
    const updated = { id: USER_ID, disabled: true };
    adminUserRepository.updateUserDisabledStatusRecord.mockResolvedValue(updated);

    await expect(updateAdminUserStatus(ADMIN_ID, USER_ID, { disabled: 'true' })).resolves.toBe(updated);

    expect(adminUserRepository.updateUserDisabledStatusRecord).toHaveBeenCalledWith(USER_ID, true);
  });

  it('rejects invalid disabled status and self-disable', async () => {
    await expect(updateAdminUserStatus(ADMIN_ID, USER_ID, { disabled: 'maybe' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_DISABLED_STATUS',
    });

    await expect(updateAdminUserStatus(ADMIN_ID, ADMIN_ID, { disabled: true })).rejects.toMatchObject({
      status: 400,
      code: 'CANNOT_DISABLE_SELF',
    });
  });

  it('throws 404 when status update misses', async () => {
    adminUserRepository.updateUserDisabledStatusRecord.mockResolvedValue(null);

    await expect(updateAdminUserStatus(ADMIN_ID, USER_ID, { isDisabled: false })).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});
