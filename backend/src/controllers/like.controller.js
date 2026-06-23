import { getLikesForSharedGame, likeSharedGame, unlikeSharedGame } from '../services/like.service.js';

export async function likeSharedGameController(req, res, next) {
  try {
    const likes = await likeSharedGame(req.user.id, req.params.id);
    return res.status(201).json({ likes });
  } catch (error) {
    return next(error);
  }
}

export async function unlikeSharedGameController(req, res, next) {
  try {
    const likes = await unlikeSharedGame(req.user.id, req.params.id);
    return res.json({ likes });
  } catch (error) {
    return next(error);
  }
}

export async function getSharedGameLikesController(req, res, next) {
  try {
    const likes = await getLikesForSharedGame(req.params.id, req.user ?? null);
    return res.json({ likes });
  } catch (error) {
    return next(error);
  }
}
