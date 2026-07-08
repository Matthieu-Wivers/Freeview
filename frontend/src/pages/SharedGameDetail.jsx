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
  moderateComment,
  moderateSharedGame,
  unlikeSharedGame,
  updateComment,
} from '../services/freeviewApi';
import {
  formatDate,
  getAuthor,
  getCommentCount,
  getLikeCount,
  getSharedGameTitle,
  getUserDisplayName,
  userOwnsResource,
} from '../utils/pgn';
import { hasSharedReview } from '../utils/sharedReview';

function sameId(left, right) {
  return Boolean(left && right && String(left) === String(right));
}

function getCommentAuthor(comment) {
  return {
    username:
      comment.username ||
      comment.user?.username ||
      comment.author?.username ||
      comment.authorName ||
      comment.author_name,
    email:
      comment.email ||
      comment.user?.email ||
      comment.author?.email,
  };
}

function getCommentId(comment) {
  return comment.id || comment.commentId || comment.comment_id;
}

function getCommentOwnerId(comment) {
  return (
    comment.user_id ||
    comment.userId ||
    comment.user?.id ||
    comment.author?.id ||
    null
  );
}

function getSharedGameAuthor(sharedGame) {
  const author = getAuthor(sharedGame || {});

  if (author && Object.keys(author).length > 0) {
    return author;
  }

  return {
    username: sharedGame?.username,
    email: sharedGame?.email,
  };
}

export default function SharedGameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();

  const [sharedGame, setSharedGame] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportReason, setReportReason] = useState('inappropriate_content');
  const [reportOpen, setReportOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentBusy, setCommentBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const author = useMemo(() => getSharedGameAuthor(sharedGame), [sharedGame]);
  const reviewed = hasSharedReview(sharedGame);
  const canManageSharedGame = isAdmin || userOwnsResource(user, sharedGame || {});

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const [nextSharedGame, nextComments] = await Promise.all([
        getSharedGame(id),
        listComments(id).catch(() => []),
      ]);

      setSharedGame(nextSharedGame);
      setComments(Array.isArray(nextComments) ? nextComments : []);
      setLikeCount(getLikeCount(nextSharedGame));
      setIsLiked(
        Boolean(
          nextSharedGame.viewer_has_liked ||
            nextSharedGame.viewerHasLiked ||
            nextSharedGame.likedByCurrentUser ||
            nextSharedGame.likedByMe ||
            nextSharedGame.liked_by_me,
        ),
      );
    } catch (apiError) {
      setError(apiError.message || 'The shared review could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, [id]);

  async function handleLike() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const nextLiked = !isLiked;

    setIsLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));

    try {
      if (nextLiked) {
        await likeSharedGame(id);
      } else {
        await unlikeSharedGame(id);
      }
    } catch (apiError) {
      setIsLiked(!nextLiked);
      setLikeCount((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
      setError(apiError.message || 'The like action failed.');
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!commentContent.trim()) {
      setError('Comment cannot be empty.');
      return;
    }

    setCommentBusy(true);
    setError('');

    try {
      const newComment = await createComment(id, commentContent.trim());
      setComments((items) => [...items, newComment]);
      setCommentContent('');
      setMessage('Comment posted.');
    } catch (apiError) {
      setError(apiError.message || 'The comment could not be posted.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleCommentUpdate(commentId) {
    if (!editingContent.trim()) {
      setError('Comment cannot be empty.');
      return;
    }

    setCommentBusy(true);
    setError('');

    try {
      const updatedComment = await updateComment(commentId, editingContent.trim());

      setComments((items) =>
        items.map((comment) =>
          sameId(getCommentId(comment), commentId)
            ? { ...comment, ...updatedComment }
            : comment,
        ),
      );

      setEditingCommentId(null);
      setEditingContent('');
      setMessage('Comment updated.');
    } catch (apiError) {
      setError(apiError.message || 'The comment could not be updated.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleCommentDelete(commentId) {
    setCommentBusy(true);
    setError('');

    try {
      await deleteComment(commentId);
      setComments((items) => items.filter((comment) => !sameId(getCommentId(comment), commentId)));
      setMessage('Comment deleted.');
    } catch (apiError) {
      setError(apiError.message || 'The comment could not be deleted.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleReport(targetType, targetId) {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setReportBusy(true);
    setError('');

    try {
      await createReport({
        target_type: targetType,
        targetType,
        target_id: targetId,
        targetId,

        shared_game_id: targetType === 'shared_game' ? id : undefined,
        sharedGameId: targetType === 'shared_game' ? id : undefined,

        comment_id: targetType === 'comment' ? targetId : undefined,
        commentId: targetType === 'comment' ? targetId : undefined,

        reason: reportReason,
        details: reportDetails || 'Reported from the shared review page.',
      });

      setReportDetails('');
      setReportOpen(false);
      setMessage('Report sent to moderation.');
    } catch (apiError) {
      setError(apiError.message || 'The report could not be sent.');
    } finally {
      setReportBusy(false);
    }
  }

  async function handleSharedGameModeration(status) {
    setModerationBusy(true);
    setError('');

    try {
      const updated = await moderateSharedGame(id, status);
      setSharedGame((current) => ({
        ...current,
        ...updated,
        moderation_status: status,
        moderationStatus: status,
      }));
      setMessage('Post moderation updated.');
    } catch (apiError) {
      setError(apiError.message || 'Post moderation failed.');
    } finally {
      setModerationBusy(false);
    }
  }

  async function handleCommentModeration(commentId, status) {
    setModerationBusy(true);
    setError('');

    try {
      await moderateComment(commentId, status);

      setComments((items) =>
        items.map((comment) =>
          sameId(getCommentId(comment), commentId)
            ? { ...comment, moderation_status: status, moderationStatus: status }
            : comment,
        ),
      );

      setMessage('Comment moderation updated.');
    } catch (apiError) {
      setError(apiError.message || 'Comment moderation failed.');
    } finally {
      setModerationBusy(false);
    }
  }

  async function handleDeleteSharedGame() {
    setModerationBusy(true);
    setError('');

    try {
      await deleteSharedGame(id);
      navigate('/community');
    } catch (apiError) {
      setError(apiError.message || 'The shared review could not be deleted.');
    } finally {
      setModerationBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="community-page">
        <section className="community-state">
          <h1>Loading shared review...</h1>
          <p>The board and comments are being prepared.</p>
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
          <div className="shared-review-post__title-block">
            <div className="shared-detail-kicker">
              <span className="badge">{reviewed ? 'Shared review' : 'Shared game'}</span>
              <span className="badge badge--muted">{sharedGame.visibility || 'public'}</span>
            </div>

            <h1>{getSharedGameTitle(sharedGame)}</h1>

            <div className="post-author-line">
              <span>By {getUserDisplayName(author)}</span>
              <span>{formatDate(sharedGame.created_at || sharedGame.createdAt)}</span>
            </div>
          </div>

          <div className="shared-review-post__actions">
            <button
              className={`btn ${isLiked ? 'btn--primary' : 'btn--ghost'}`}
              type="button"
              onClick={handleLike}
            >
              {isLiked ? 'Liked' : 'Like'} · {likeCount}
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
          <form
            className="report-popover"
            onSubmit={(event) => {
              event.preventDefault();
              void handleReport('shared_game', id);
            }}
          >
            <label className="form-field">
              <span>Reason</span>
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
              >
                <option value="inappropriate_content">Inappropriate content</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="form-field">
              <span>Details</span>
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                placeholder="Add context for moderators..."
              />
            </label>

            <div className="input-actions">
              <button className="btn btn--primary" type="submit" disabled={reportBusy}>
                {reportBusy ? 'Sending...' : 'Send report'}
              </button>

              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => setReportOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {sharedGame.description ? (
          <p className="shared-review-post__description">{sharedGame.description}</p>
        ) : null}

        {(message || error) ? (
          <p className={error ? 'feedback-message feedback-message--error' : 'feedback-message'}>
            {error || message}
          </p>
        ) : null}

        <section className="shared-review-post__review">
          {reviewed ? (
            <SharedReviewPanel sharedGame={sharedGame} />
          ) : (
            <section className="community-state">
              <h2>No review payload found</h2>
              <p>This post was shared before review payloads were saved.</p>
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
          <form className="comment-form comment-form--wide" onSubmit={handleCommentSubmit}>
            <textarea
              value={commentContent}
              onChange={(event) => setCommentContent(event.target.value)}
              placeholder="Share a useful thought about the position, the plan, or the mistake..."
              rows={4}
            />

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
          {comments.length === 0 ? (
            <p className="inline-note">No comments yet. Start the discussion.</p>
          ) : null}

          {comments.map((comment) => {
            const commentId = getCommentId(comment);
            const ownsComment =
              userOwnsResource(user, comment) ||
              sameId(user?.id || user?.user_id || user?.userId, getCommentOwnerId(comment));
            const commentAuthor = getCommentAuthor(comment);
            const isEditing = sameId(editingCommentId, commentId);

            return (
              <article key={commentId} className="comment-card comment-card--framed">
                <header className="comment-card__header">
                  <strong>{getUserDisplayName(commentAuthor)}</strong>
                  <span>{formatDate(comment.created_at || comment.createdAt)}</span>
                </header>

                {isEditing ? (
                  <div className="comment-edit-box">
                    <textarea
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      rows={4}
                    />

                    <div className="input-actions">
                      <button
                        className="btn btn--primary"
                        type="button"
                        onClick={() => void handleCommentUpdate(commentId)}
                        disabled={commentBusy}
                      >
                        Save
                      </button>

                      <button
                        className="btn btn--secondary"
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

                <div className="comment-card__actions">
                  {ownsComment && !isEditing ? (
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={() => {
                        setEditingCommentId(commentId);
                        setEditingContent(comment.content || '');
                      }}
                    >
                      Edit
                    </button>
                  ) : null}

                  {(ownsComment || isAdmin) ? (
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={() => void handleCommentDelete(commentId)}
                      disabled={commentBusy}
                    >
                      Delete
                    </button>
                  ) : null}

                  {isAuthenticated ? (
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={() => void handleReport('comment', commentId)}
                      disabled={reportBusy}
                    >
                      Report
                    </button>
                  ) : null}

                  {isAdmin ? (
                    <>
                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => void handleCommentModeration(commentId, 'hidden')}
                        disabled={moderationBusy}
                      >
                        Hide
                      </button>

                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => void handleCommentModeration(commentId, 'visible')}
                        disabled={moderationBusy}
                      >
                        Restore
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {isAdmin ? (
        <section className="admin-card admin-card--wide">
          <div>
            <p className="eyebrow">Admin</p>
            <h2>Post moderation</h2>
          </div>

          <div className="admin-card__actions">
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => void handleSharedGameModeration('hidden')}
              disabled={moderationBusy}
            >
              Hide
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => void handleSharedGameModeration('visible')}
              disabled={moderationBusy}
            >
              Restore
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}