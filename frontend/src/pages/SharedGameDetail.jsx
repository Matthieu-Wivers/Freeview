import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import SharedReviewPanel from '../components/community/SharedReviewPanel';
import {
  createComment,
  createReport,
  deleteComment,
  deleteSharedGame,
  getSharedGame,
  likeSharedGame,
  listComments,
  moderateSharedGame,
  unlikeSharedGame,
  updateComment,
} from '../services/freeviewApi';
import {
  formatDate,
  getAuthor,
  getCommentCount,
  getLikeCount,
  getSharedGameId,
  getSharedGameTitle,
  getUserDisplayName,
} from '../utils/pgn';
import { hasSharedReview } from '../utils/sharedReview';

function sameId(left, right) {
  return Boolean(left && right && String(left) === String(right));
}

function getCommentId(comment) {
  return comment.id ?? comment.commentId ?? comment.comment_id;
}

function getCommentUserId(comment) {
  return comment.userId ?? comment.user_id ?? comment.author?.id ?? comment.author_id;
}

function getCommentAuthor(comment) {
  return (
    comment.username ??
    comment.author?.username ??
    comment.authorName ??
    comment.author_name ??
    comment.user?.username ??
    'Unknown user'
  );
}

export default function SharedGameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [sharedGame, setSharedGame] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [localLiked, setLocalLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(0);
  const [moderationBusy, setModerationBusy] = useState(false);

  const viewerId = user?.id ?? user?.userId ?? user?.user_id;
  const isAdmin = user?.role === 'ADMIN';
  const sharedGameId = sharedGame ? getSharedGameId(sharedGame) : id;
  const ownerId = sharedGame?.userId ?? sharedGame?.user_id;
  const canManageSharedGame = sameId(ownerId, viewerId) || isAdmin;
  const reviewed = hasSharedReview(sharedGame);
  const author = useMemo(() => getAuthor(sharedGame), [sharedGame]);

  async function loadSharedGame() {
    setLoading(true);
    setError('');

    try {
      const data = await getSharedGame(id);
      setSharedGame(data);
      setLocalLiked(Boolean(data.likedByMe ?? data.liked_by_me));
      setLocalLikeCount(getLikeCount(data));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The shared review could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
    setCommentsLoading(true);

    try {
      const data = await listComments(id);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    void loadSharedGame();
    void loadComments();
  }, [id]);

  async function handleToggleLike() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setLikeBusy(true);

    try {
      if (localLiked) {
        await unlikeSharedGame(sharedGameId);
        setLocalLiked(false);
        setLocalLikeCount((value) => Math.max(0, value - 1));
      } else {
        await likeSharedGame(sharedGameId);
        setLocalLiked(true);
        setLocalLikeCount((value) => value + 1);
      }
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'The like action failed.');
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleCreateComment(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!newComment.trim()) {
      setCommentError('Comment cannot be empty.');
      return;
    }

    setCommentBusy(true);
    setCommentError('');

    try {
      const created = await createComment(sharedGameId, newComment.trim());
      setComments((value) => [...value, created]);
      setNewComment('');
    } catch (createError) {
      setCommentError(createError instanceof Error ? createError.message : 'The comment could not be posted.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleUpdateComment(commentId) {
    if (!editingContent.trim()) {
      setCommentError('Comment cannot be empty.');
      return;
    }

    setCommentBusy(true);
    setCommentError('');

    try {
      const updated = await updateComment(commentId, editingContent.trim());
      setComments((value) =>
        value.map((comment) => (sameId(getCommentId(comment), commentId) ? updated : comment)),
      );
      setEditingCommentId(null);
      setEditingContent('');
    } catch (updateError) {
      setCommentError(updateError instanceof Error ? updateError.message : 'The comment could not be updated.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleDeleteComment(commentId) {
    setCommentBusy(true);
    setCommentError('');

    try {
      await deleteComment(commentId);
      setComments((value) => value.filter((comment) => !sameId(getCommentId(comment), commentId)));
    } catch (deleteError) {
      setCommentError(deleteError instanceof Error ? deleteError.message : 'The comment could not be deleted.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleReport(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setReportBusy(true);
    setReportStatus('');

    try {
      await createReport({
        target_type: 'shared_game',
        targetType: 'shared_game',
        shared_game_id: sharedGameId,
        sharedGameId,
        reason: reportReason,
        details: reportDetails,
      });

      setReportDetails('');
      setReportOpen(false);
      setReportStatus('Report sent.');
    } catch (reportError) {
      setReportStatus(reportError instanceof Error ? reportError.message : 'The report could not be sent.');
    } finally {
      setReportBusy(false);
    }
  }

  async function handleModerate(status) {
    setModerationBusy(true);

    try {
      const updated = await moderateSharedGame(sharedGameId, status);
      setSharedGame(updated);
    } catch (moderationError) {
      setError(moderationError instanceof Error ? moderationError.message : 'Moderation failed.');
    } finally {
      setModerationBusy(false);
    }
  }

  async function handleDeleteSharedGame() {
    setModerationBusy(true);

    try {
      await deleteSharedGame(sharedGameId);
      navigate('/community');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The shared review could not be deleted.');
    } finally {
      setModerationBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="community-page">
        <section className="community-state">
          <h1>Loading shared review...</h1>
        </section>
      </main>
    );
  }

  if (error && !sharedGame) {
    return (
      <main className="community-page">
        <section className="community-state community-state--error">
          <h1>Shared review unavailable</h1>
          <p>{error}</p>
          <Link className="btn btn--primary" to="/community">
            Back to Community
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="community-page shared-review-page">
      <article className="shared-review-post">
        <button
          className="flag-button"
          type="button"
          aria-label="Report this post"
          title="Report this post"
          onClick={() => setReportOpen((value) => !value)}
        >
          ⚑
        </button>

        <header className="shared-review-post__header">
          <div>
            <div className="shared-detail-kicker">
              <span className="badge">{reviewed ? 'Shared review' : 'Shared game'}</span>
              <span className="badge badge--muted">{sharedGame.visibility ?? 'public'}</span>
              {sharedGame.moderationStatus !== 'visible' && sharedGame.moderation_status !== 'visible' ? (
                <span className="badge badge--warning">
                  {sharedGame.moderationStatus ?? sharedGame.moderation_status}
                </span>
              ) : null}
            </div>

            <h1>{getSharedGameTitle(sharedGame)}</h1>

            <div className="post-author-line">
              <span>By {getUserDisplayName(author)}</span>
              <span>{formatDate(sharedGame.created_at || sharedGame.createdAt)}</span>
            </div>
          </div>

          <div className="shared-review-post__actions">
            <button
              className={`btn ${localLiked ? 'btn--primary' : 'btn--ghost'}`}
              type="button"
              onClick={handleToggleLike}
              disabled={likeBusy}
            >
              {localLiked ? 'Liked' : 'Like'} · {localLikeCount}
            </button>

            {canManageSharedGame ? (
              <button
                className="btn btn--danger"
                type="button"
                onClick={handleDeleteSharedGame}
                disabled={moderationBusy}
              >
                Delete
              </button>
            ) : null}
          </div>
        </header>

        {reportOpen ? (
          <form className="report-popover" onSubmit={handleReport}>
            <label className="form-field">
              <span>Reason</span>
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                <option value="Inappropriate content">Inappropriate content</option>
                <option value="Spam">Spam</option>
                <option value="Harassment">Harassment</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="form-field">
              <span>Details</span>
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={3}
                placeholder="Add context for moderators..."
              />
            </label>

            {reportStatus ? <p className="inline-note">{reportStatus}</p> : null}

            <div className="input-actions">
              <button className="btn btn--primary" type="submit" disabled={reportBusy}>
                {reportBusy ? 'Sending...' : 'Send report'}
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => setReportOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {reportStatus && !reportOpen ? <p className="inline-note">{reportStatus}</p> : null}

        {sharedGame.description ? (
          <p className="shared-review-post__description">{sharedGame.description}</p>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}

        <section className="shared-review-post__review">
          {reviewed ? (
            <SharedReviewPanel sharedGame={sharedGame} />
          ) : (
            <section className="community-state">
              <h2>No review available</h2>
              <p>This shared post does not contain a saved review payload.</p>
            </section>
          )}
        </section>
      </article>

      <section className="comments-under-post">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Discussion</p>
            <h2>Comments</h2>
          </div>
          <span className="badge">{getCommentCount(sharedGame) || comments.length}</span>
        </div>

        {isAuthenticated ? (
          <form className="comment-form comment-form--wide" onSubmit={handleCreateComment}>
            <textarea
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Share your thoughts about this review..."
              rows={4}
            />

            {commentError ? <p className="error-text">{commentError}</p> : null}

            <button className="btn btn--primary" type="submit" disabled={commentBusy}>
              {commentBusy ? 'Posting...' : 'Post comment'}
            </button>
          </form>
        ) : (
          <p className="inline-note">
            <Link to="/login">Log in</Link> to comment on this review.
          </p>
        )}

        <div className="comment-list comment-list--wide">
          {commentsLoading ? <p className="inline-note">Loading comments...</p> : null}

          {!commentsLoading && comments.length === 0 ? (
            <p className="inline-note">No comments yet. Start the discussion.</p>
          ) : null}

          {comments.map((comment) => {
            const commentId = getCommentId(comment);
            const canManageComment = sameId(getCommentUserId(comment), viewerId) || isAdmin;
            const isEditing = sameId(editingCommentId, commentId);

            return (
              <article className="comment-card comment-card--framed" key={commentId}>
                <header className="comment-card__header">
                  <strong>{getCommentAuthor(comment)}</strong>
                  <span>{formatDate(comment.created_at || comment.createdAt)}</span>
                </header>

                {isEditing ? (
                  <div className="comment-edit-box">
                    <textarea
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      rows={4}
                    />

                    <div className="comment-card__actions">
                      <button
                        className="btn btn--primary"
                        type="button"
                        onClick={() => void handleUpdateComment(commentId)}
                        disabled={commentBusy}
                      >
                        Save
                      </button>

                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingContent('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>{comment.content}</p>
                )}

                {canManageComment && !isEditing ? (
                  <div className="comment-card__actions">
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={() => {
                        setEditingCommentId(commentId);
                        setEditingContent(comment.content ?? '');
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="btn btn--danger"
                      type="button"
                      onClick={() => void handleDeleteComment(commentId)}
                      disabled={commentBusy}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {isAdmin ? (
        <section className="admin-card admin-card--wide">
          <div>
            <p className="eyebrow">Admin</p>
            <h2>Moderation</h2>
          </div>

          <div className="admin-card__actions">
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => void handleModerate('visible')}
              disabled={moderationBusy}
            >
              Mark visible
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => void handleModerate('hidden')}
              disabled={moderationBusy}
            >
              Hide
            </button>

            <button
              className="btn btn--danger"
              type="button"
              onClick={() => void handleModerate('deleted')}
              disabled={moderationBusy}
            >
              Mark deleted
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}