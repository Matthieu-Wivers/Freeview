import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRepository = vi.hoisted(() => ({
  createUserWithEmailPassword: vi.fn(),
  findEmailAuthAccount: vi.fn(),
  findOrCreateGoogleUser: vi.fn(),
  findUserById: vi.fn(),
  recordLogin: vi.fn(),
  updateUserProfileById: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: {
    authJwtSecret: 'unit-test-auth-secret-with-at-least-32-chars',
    authCookieMaxAgeSeconds: 3600,
    authCookieName: 'freeview_session',
  },
}));

vi.mock('../../repositories/user.repository.js', () => userRepository);
vi.mock('../../utils/env.utils.js', () => envMock);

import bcrypt from 'bcryptjs';
import {
  loginWithEmailPassword,
  loginWithGoogleProfile,
  registerWithEmailPassword,
  signAuthToken,
  updateUserProfile,
  verifyAuthToken,
} from '../../services/auth.service.js';

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'matthieu@example.com',
  username: 'Matthieu',
  role: 'USER',
};

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers with a normalized email and a hashed password', async () => {
    userRepository.createUserWithEmailPassword.mockResolvedValue(USER);

    const result = await registerWithEmailPassword({
      email: '  Matthieu@Example.COM  ',
      password: 'StrongPassword123',
      username: 'Matthieu',
    });

    expect(result.user).toBe(USER);
    expect(result.token).toEqual(expect.any(String));
    expect(userRepository.createUserWithEmailPassword).toHaveBeenCalledWith({
      email: 'matthieu@example.com',
      username: 'Matthieu',
      passwordHash: expect.any(String),
    });

    const { passwordHash } = userRepository.createUserWithEmailPassword.mock.calls[0][0];
    await expect(bcrypt.compare('StrongPassword123', passwordHash)).resolves.toBe(true);
    expect(passwordHash).not.toBe('StrongPassword123');
  });

  it.each([
    [{ email: 'bad-email', password: 'StrongPassword123' }, 'INVALID_EMAIL'],
    [{ email: 'matthieu@example.com', password: 'short' }, 'WEAK_PASSWORD'],
  ])('rejects invalid register payloads: %#', async (payload, expectedCode) => {
    await expect(registerWithEmailPassword(payload)).rejects.toMatchObject({
      status: 400,
      code: expectedCode,
    });
    expect(userRepository.createUserWithEmailPassword).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials, records login and signs a JWT', async () => {
    const passwordHash = await bcrypt.hash('StrongPassword123', 4);
    userRepository.findEmailAuthAccount.mockResolvedValue({
      passwordHash,
      user: USER,
    });
    userRepository.recordLogin.mockResolvedValue({ ...USER, lastLoginAt: 'now' });

    const result = await loginWithEmailPassword({
      email: 'Matthieu@Example.COM',
      password: 'StrongPassword123',
    });

    expect(userRepository.findEmailAuthAccount).toHaveBeenCalledWith('matthieu@example.com');
    expect(userRepository.recordLogin).toHaveBeenCalledWith(USER.id);
    expect(result.user).toMatchObject({ id: USER.id, lastLoginAt: 'now' });
    expect(result.token).toEqual(expect.any(String));
  });

  it.each([
    [null, 'StrongPassword123'],
    [{ passwordHash: bcrypt.hashSync('StrongPassword123', 4), user: USER }, 'WrongPassword'],
  ])('rejects invalid credentials without revealing which field failed', async (authAccount, password) => {
    userRepository.findEmailAuthAccount.mockResolvedValue(authAccount);

    await expect(
      loginWithEmailPassword({ email: 'matthieu@example.com', password }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });

    expect(userRepository.recordLogin).not.toHaveBeenCalled();
  });

  it('verifies a valid signed token and returns the persisted user', async () => {
    userRepository.findUserById.mockResolvedValue(USER);

    const token = signAuthToken(USER);

    await expect(verifyAuthToken(token)).resolves.toBe(USER);
    expect(userRepository.findUserById).toHaveBeenCalledWith(USER.id);
  });

  it('returns null for invalid tokens', async () => {
    await expect(verifyAuthToken('not-a-jwt')).resolves.toBeNull();
    expect(userRepository.findUserById).not.toHaveBeenCalled();
  });

  it('delegates Google profile login to the repository and signs a token', async () => {
    userRepository.findOrCreateGoogleUser.mockResolvedValue(USER);

    const result = await loginWithGoogleProfile({ sub: 'google-123', email: USER.email });

    expect(userRepository.findOrCreateGoogleUser).toHaveBeenCalledWith({
      sub: 'google-123',
      email: USER.email,
    });
    expect(result).toMatchObject({ user: USER, token: expect.any(String) });
  });

  it('validates and normalizes profile updates', async () => {
    userRepository.updateUserProfileById.mockResolvedValue({
      ...USER,
      username: 'NewName',
      bio: null,
      avatarUrl: 'https://example.com/avatar.png',
    });

    await updateUserProfile(USER.id, {
      username: ' NewName ',
      bio: '   ',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(userRepository.updateUserProfileById).toHaveBeenCalledWith(USER.id, {
      username: 'NewName',
      bio: null,
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it.each([
    [{ username: 'ab', bio: '', avatarUrl: '' }, 'INVALID_USERNAME'],
    [{ username: 'Matthieu', bio: 'x'.repeat(501), avatarUrl: '' }, 'BIO_TOO_LONG'],
    [{ username: 'Matthieu', bio: '', avatarUrl: 'ftp://example.com/avatar.png' }, 'INVALID_AVATAR_URL'],
  ])('rejects invalid profile updates: %#', async (payload, expectedCode) => {
    await expect(updateUserProfile(USER.id, payload)).rejects.toMatchObject({
      status: 400,
      code: expectedCode,
    });
  });
});
