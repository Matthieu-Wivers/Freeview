import {
  createSharedGame,
  deleteSharedGame,
  getSharedGame,
  listCommunitySharedGames,
  listMySharedGames,
  updateSharedGame,
} from '../services/sharedGame.service.js';

export async function createSharedGameController(req, res, next) {
  try {
    const sharedGame = await createSharedGame(req.user.id, req.body ?? {});
    return res.status(201).json({ sharedGame });
  } catch (error) {
    return next(error);
  }
}

export async function listSharedGamesController(req, res, next) {
  try {
    const sharedGames = await listCommunitySharedGames(req.query ?? {}, req.user ?? null);
    return res.json({ sharedGames });
  } catch (error) {
    return next(error);
  }
}

export async function listMySharedGamesController(req, res, next) {
  try {
    const sharedGames = await listMySharedGames(req.user.id, req.query ?? {});
    return res.json({ sharedGames });
  } catch (error) {
    return next(error);
  }
}

export async function getSharedGameController(req, res, next) {
  try {
    const sharedGame = await getSharedGame(req.params.id, req.user ?? null);
    return res.json({ sharedGame });
  } catch (error) {
    return next(error);
  }
}

export async function updateSharedGameController(req, res, next) {
  try {
    const sharedGame = await updateSharedGame(req.user.id, req.params.id, req.body ?? {});
    return res.json({ sharedGame });
  } catch (error) {
    return next(error);
  }
}

export async function deleteSharedGameController(req, res, next) {
  try {
    await deleteSharedGame(req.user.id, req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
