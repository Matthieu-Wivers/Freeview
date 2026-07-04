import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import ChessPreview from '../components/community/ChessPreview';
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
  summarizePgn,
  userOwnsResource,
} from '../utils/pgn';

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
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const pgn = sharedGame?.pgn || sharedGame?.game?.pgn || '';
  const summary = useMemo(() => summarizePgn(pgn), [pgn]);
  const author = getAuthor(sharedGame || {});
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
      setComments(nextComments);
      setLikeCount(getLikeCount(nextSharedGame));
      setIsLiked(Boolean(nextSharedGame.viewer_has_liked || nextSharedGame.viewerHasLiked || nextSharedGame.likedByCurrentUser));
    } catch (apiError) {
      setError(apiError.message || 'Impossible de charger la partie partagée.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, [id]);

  async function handleLike() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((count) => count + (nextLiked ? 1 : -1));

    try {
      if (nextLiked) {
        await likeSharedGame(id);
      } else {
        await unlikeSharedGame(id);
      }
    } catch (apiError) {
      setIsLiked(!nextLiked);
      setLikeCount((count) => count + (nextLiked ? -1 : 1));
      setError(apiError.message || 'Action impossible sur le like.');
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!commentContent.trim()) {
      return;
    }

    try {
      const newComment = await createComment(id, commentContent.trim());
      setComments((items) => [newComment, ...items]);
      setCommentContent('');
      setMessage('Commentaire ajouté.');
    } catch (apiError) {
      setError(apiError.message || 'Impossible d’ajouter le commentaire.');
    }
  }

  async function handleCommentUpdate(commentId) {
    if (!editingContent.trim()) {
      return;
    }

    try {
      const updatedComment = await updateComment(commentId, editingContent.trim());
      setComments((items) => items.map((comment) => (String(comment.id) === String(commentId) ? { ...comment, ...updatedComment } : comment)));
      setEditingCommentId(null);
      setEditingContent('');
    } catch (apiError) {
      setError(apiError.message || 'Impossible de modifier le commentaire.');
    }
  }

  async function handleCommentDelete(commentId) {
    try {
      await deleteComment(commentId);
      setComments((items) => items.filter((comment) => String(comment.id) !== String(commentId)));
    } catch (apiError) {
      setError(apiError.message || 'Impossible de supprimer le commentaire.');
    }
  }

  async function handleReport(targetType, targetId) {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await createReport({
        target_type: targetType,
        targetType,
        target_id: targetId,
        targetId,
        reason: 'inappropriate_content',
        details: reportDetails || 'Signalement depuis la page détail.',
      });
      setReportDetails('');
      setMessage('Signalement envoyé à la modération.');
    } catch (apiError) {
      setError(apiError.message || 'Impossible d’envoyer le signalement.');
    }
  }

  async function handleSharedGameModeration(status) {
    try {
      const updated = await moderateSharedGame(id, status);
      setSharedGame((current) => ({ ...current, ...updated, moderation_status: status }));
    } catch (apiError) {
      setError(apiError.message || 'Modération impossible.');
    }
  }

  async function handleCommentModeration(commentId, status) {
    try {
      await moderateComment(commentId, status);
      setComments((items) => items.map((comment) => (String(comment.id) === String(commentId) ? { ...comment, moderation_status: status } : comment)));
    } catch (apiError) {
      setError(apiError.message || 'Modération du commentaire impossible.');
    }
  }

  async function handleDeleteSharedGame() {
    try {
      await deleteSharedGame(id);
      navigate('/community');
    } catch (apiError) {
      setError(apiError.message || 'Suppression impossible.');
    }
  }

  if (loading) {
    return <p className="panel community-state">Chargement de la partie...</p>;
  }

  if (error && !sharedGame) {
    return (
      <div className="panel community-empty">
        <h1>Partie introuvable</h1>
        <p>{error}</p>
        <Link className="btn btn--secondary" to="/community">Retour communauté</Link>
      </div>
    );
  }

  return (
    <div className="community-page">
      <section className="shared-detail-grid">
        <article className="panel shared-detail-main">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Partie partagée</p>
              <h1>{getSharedGameTitle(sharedGame)}</h1>
              <p className="subtle">
                Par {getUserDisplayName(author)} · {formatDate(sharedGame.created_at || sharedGame.createdAt)}
              </p>
            </div>
            <button className={isLiked ? 'btn btn--primary' : 'btn btn--secondary'} type="button" onClick={handleLike}>
              {isLiked ? '♥ Liké' : '♡ Liker'} · {likeCount}
            </button>
          </div>

          <p className="shared-detail-description">{sharedGame.description || 'Aucune description.'}</p>

          <div className="community-meta-list community-meta-list--inline">
            <span><strong>Blancs</strong>{summary.white}</span>
            <span><strong>Noirs</strong>{summary.black}</span>
            <span><strong>Résultat</strong>{summary.result}</span>
            <span><strong>Commentaires</strong>{getCommentCount(sharedGame)}</span>
          </div>

          <div className="shared-detail-actions">
            <Link className="btn btn--secondary" to="/analyse">Analyser un PGN</Link>
            {canManageSharedGame && (
              <button className="btn btn--ghost" type="button" onClick={handleDeleteSharedGame}>Supprimer</button>
            )}
            {isAdmin && (
              <>
                <button className="btn btn--ghost" type="button" onClick={() => handleSharedGameModeration('hidden')}>Masquer</button>
                <button className="btn btn--ghost" type="button" onClick={() => handleSharedGameModeration('visible')}>Restaurer</button>
              </>
            )}
          </div>
        </article>

        <aside className="panel shared-detail-board">
          <ChessPreview pgn={pgn} />
        </aside>
      </section>

      {(message || error) && (
        <p className={error ? 'panel community-state error-text' : 'panel community-state'}>{error || message}</p>
      )}

      <section className="comments-grid">
        <article className="panel comments-panel">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Commentaires</p>
              <h2>Échanges autour de la partie</h2>
            </div>
          </div>

          {isAuthenticated ? (
            <form className="comment-form" onSubmit={handleCommentSubmit}>
              <textarea
                value={commentContent}
                onChange={(event) => setCommentContent(event.target.value)}
                placeholder="Écris un retour constructif..."
                rows={4}
              />
              <button className="btn btn--primary" type="submit">Commenter</button>
            </form>
          ) : (
            <p className="inline-note">Connecte-toi pour commenter cette partie.</p>
          )}

          <div className="comment-list">
            {comments.map((comment) => {
              const ownsComment = userOwnsResource(user, comment);
              const commentAuthor = comment.user || comment.author || {};
              return (
                <article key={comment.id} className="comment-card">
                  <div className="comment-card__header">
                    <strong>{getUserDisplayName(commentAuthor)}</strong>
                    <span>{formatDate(comment.created_at || comment.createdAt)}</span>
                  </div>

                  {editingCommentId === comment.id ? (
                    <div className="comment-edit-box">
                      <textarea value={editingContent} onChange={(event) => setEditingContent(event.target.value)} rows={4} />
                      <div className="input-actions">
                        <button className="btn btn--primary" type="button" onClick={() => handleCommentUpdate(comment.id)}>Enregistrer</button>
                        <button className="btn btn--secondary" type="button" onClick={() => setEditingCommentId(null)}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <p>{comment.content}</p>
                  )}

                  <div className="comment-card__actions">
                    {ownsComment && editingCommentId !== comment.id && (
                      <button className="btn btn--ghost" type="button" onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditingContent(comment.content || '');
                      }}>
                        Modifier
                      </button>
                    )}
                    {(ownsComment || isAdmin) && (
                      <button className="btn btn--ghost" type="button" onClick={() => handleCommentDelete(comment.id)}>Supprimer</button>
                    )}
                    {isAuthenticated && (
                      <button className="btn btn--ghost" type="button" onClick={() => handleReport('comment', comment.id)}>Signaler</button>
                    )}
                    {isAdmin && (
                      <>
                        <button className="btn btn--ghost" type="button" onClick={() => handleCommentModeration(comment.id, 'hidden')}>Masquer</button>
                        <button className="btn btn--ghost" type="button" onClick={() => handleCommentModeration(comment.id, 'visible')}>Restaurer</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <aside className="panel report-panel">
          <p className="eyebrow">Signalement</p>
          <h2>Un contenu pose problème ?</h2>
          <textarea
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
            placeholder="Décris rapidement le problème..."
            rows={5}
          />
          <button className="btn btn--secondary" type="button" onClick={() => handleReport('shared_game', id)}>
            Signaler la publication
          </button>
        </aside>
      </section>
    </div>
  );
}
