import { apiRequest, asArray, asObject, buildQuery } from './apiClient';

export async function getCurrentUser() {
  const payload = await apiRequest('/auth/me');
  return asObject(payload, ['user']);
}

export async function updateCurrentUser(values) {
  const payload = await apiRequest('/auth/me', {
    method: 'PATCH',
    body: values,
  });
  return asObject(payload, ['user']);
}

export async function listMyGames() {
  const payload = await apiRequest('/games/me');
  return asArray(payload, ['games']);
}

export async function getGame(gameId) {
  const payload = await apiRequest(`/games/${gameId}`);
  return asObject(payload, ['game']);
}

export async function importGame(values) {
  const payload = await apiRequest('/games/import', {
    method: 'POST',
    body: values,
  });
  return asObject(payload, ['game']);
}

export async function deleteGame(gameId) {
  return apiRequest(`/games/${gameId}`, { method: 'DELETE' });
}

export async function listSharedGames(params = {}) {
  const payload = await apiRequest(`/shared-games${buildQuery(params)}`);
  return asArray(payload, ['sharedGames', 'shared_games', 'games']);
}

export async function getSharedGame(sharedGameId) {
  const payload = await apiRequest(`/shared-games/${sharedGameId}`);
  return asObject(payload, ['sharedGame', 'shared_game', 'game']);
}

export async function createSharedGame(values) {
  const body = {
    ...values,
    game_id: values.game_id || values.gameId,
    gameId: values.gameId || values.game_id,
  };

  const payload = await apiRequest('/shared-games', {
    method: 'POST',
    body,
  });
  return asObject(payload, ['sharedGame', 'shared_game']);
}

export async function updateSharedGame(sharedGameId, values) {
  const payload = await apiRequest(`/shared-games/${sharedGameId}`, {
    method: 'PATCH',
    body: values,
  });
  return asObject(payload, ['sharedGame', 'shared_game']);
}

export async function deleteSharedGame(sharedGameId) {
  return apiRequest(`/shared-games/${sharedGameId}`, { method: 'DELETE' });
}

export async function likeSharedGame(sharedGameId) {
  const payload = await apiRequest(`/shared-games/${sharedGameId}/like`, { method: 'POST' });
  return asObject(payload, ['like', 'sharedGame', 'shared_game']);
}

export async function unlikeSharedGame(sharedGameId) {
  return apiRequest(`/shared-games/${sharedGameId}/like`, { method: 'DELETE' });
}

export async function getSharedGameLikes(sharedGameId) {
  const payload = await apiRequest(`/shared-games/${sharedGameId}/likes`);
  return asObject(payload, ['likes']);
}

export async function listComments(sharedGameId) {
  const payload = await apiRequest(`/shared-games/${sharedGameId}/comments`);
  return asArray(payload, ['comments']);
}

export async function createComment(sharedGameId, content) {
  const payload = await apiRequest(`/shared-games/${sharedGameId}/comments`, {
    method: 'POST',
    body: { content },
  });
  return asObject(payload, ['comment']);
}

export async function updateComment(commentId, content) {
  const payload = await apiRequest(`/comments/${commentId}`, {
    method: 'PATCH',
    body: { content },
  });
  return asObject(payload, ['comment']);
}

export async function deleteComment(commentId) {
  return apiRequest(`/comments/${commentId}`, { method: 'DELETE' });
}

export async function createReport(values) {
  const payload = await apiRequest('/reports', {
    method: 'POST',
    body: values,
  });
  return asObject(payload, ['report']);
}

export async function listAdminReports(params = {}) {
  const payload = await apiRequest(`/admin/reports${buildQuery(params)}`);
  return asArray(payload, ['reports']);
}

export async function updateAdminReport(reportId, values) {
  const payload = await apiRequest(`/admin/reports/${reportId}`, {
    method: 'PATCH',
    body: values,
  });
  return asObject(payload, ['report']);
}

export async function moderateSharedGame(sharedGameId, moderationStatus) {
  const payload = await apiRequest(`/admin/shared-games/${sharedGameId}/moderation`, {
    method: 'PATCH',
    body: { moderation_status: moderationStatus, moderationStatus },
  });
  return asObject(payload, ['sharedGame', 'shared_game']);
}

export async function moderateComment(commentId, moderationStatus) {
  const payload = await apiRequest(`/admin/comments/${commentId}/moderation`, {
    method: 'PATCH',
    body: { moderation_status: moderationStatus, moderationStatus },
  });
  return asObject(payload, ['comment']);
}

export async function listAdminUsers() {
  const payload = await apiRequest('/admin/users');
  return asArray(payload, ['users']);
}

export async function updateAdminUserStatus(userId, values) {
  const payload = await apiRequest(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: values,
  });
  return asObject(payload, ['user']);
}
