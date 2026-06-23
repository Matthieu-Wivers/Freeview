import { getModerationActions, moderateComment, moderateSharedGame } from '../services/moderation.service.js';

export async function moderateSharedGameController(req, res, next) {
  try {
    const sharedGame = await moderateSharedGame(req.user.id, req.params.id, req.body ?? {});
    return res.json({ sharedGame });
  } catch (error) {
    return next(error);
  }
}

export async function moderateCommentController(req, res, next) {
  try {
    const comment = await moderateComment(req.user.id, req.params.id, req.body ?? {});
    return res.json({ comment });
  } catch (error) {
    return next(error);
  }
}

export async function listModerationActionsController(req, res, next) {
  try {
    const actions = await getModerationActions(req.query ?? {});
    return res.json({ actions });
  } catch (error) {
    return next(error);
  }
}
