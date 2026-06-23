import { createComment, deleteComment, listComments, updateComment } from '../services/comment.service.js';

export async function createCommentController(req, res, next) {
  try {
    const comment = await createComment(req.user.id, req.params.id, req.body ?? {});
    return res.status(201).json({ comment });
  } catch (error) {
    return next(error);
  }
}

export async function listCommentsController(req, res, next) {
  try {
    const comments = await listComments(req.params.id, req.user ?? null);
    return res.json({ comments });
  } catch (error) {
    return next(error);
  }
}

export async function updateCommentController(req, res, next) {
  try {
    const comment = await updateComment(req.user.id, req.params.id, req.body ?? {});
    return res.json({ comment });
  } catch (error) {
    return next(error);
  }
}

export async function deleteCommentController(req, res, next) {
  try {
    await deleteComment(req.user.id, req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
