import {
  deleteMyGame,
  getGameForOwnerOrAdmin,
  importGame,
  listMyGames,
  updateMyGame,
} from '../services/game.service.js';

export async function createGame(req, res, next) {
  try {
    const game = await importGame(req.user.id, req.body ?? {});
    return res.status(201).json({ game });
  } catch (error) {
    return next(error);
  }
}

export async function getMyGames(req, res, next) {
  try {
    const games = await listMyGames(req.user.id, req.query ?? {});
    return res.json({ games });
  } catch (error) {
    return next(error);
  }
}

export async function getGame(req, res, next) {
  try {
    const game = await getGameForOwnerOrAdmin(req.user, req.params.id);
    return res.json({ game });
  } catch (error) {
    return next(error);
  }
}

export async function updateGame(req, res, next) {
  try {
    const game = await updateMyGame(req.user.id, req.params.id, req.body ?? {});
    return res.json({ game });
  } catch (error) {
    return next(error);
  }
}

export async function deleteGame(req, res, next) {
  try {
    await deleteMyGame(req.user.id, req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
