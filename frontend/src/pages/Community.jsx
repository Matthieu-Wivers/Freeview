import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import SharedGameCard from '../components/community/SharedGameCard';
import { listSharedGames } from '../services/freeviewApi';
import { hasSharedReview } from '../utils/sharedReview';

function getLikeCount(sharedGame) {
  return Number(
    sharedGame.likes_count ??
      sharedGame.like_count ??
      sharedGame.likesCount ??
      sharedGame.likes ??
      0,
  );
}

function getCommentCount(sharedGame) {
  return Number(
    sharedGame.comments_count ??
      sharedGame.comment_count ??
      sharedGame.commentsCount ??
      sharedGame.comments?.length ??
      0,
  );
}

export default function Community() {
  const [sharedGames, setSharedGames] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [reviewOnly, setReviewOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSharedGames() {
    setLoading(true);
    setError('');

    try {
      const items = await listSharedGames({
        visibility: 'public',
        q: query.trim() || undefined,
        sort,
      });

      setSharedGames(Array.isArray(items) ? items : []);
    } catch (apiError) {
      setError(apiError.message || 'Community posts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSharedGames();
  }, [sort]);

  const visibleGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = sharedGames.filter((game) => {
      if (reviewOnly && !hasSharedReview(game)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const text = [
        game.title,
        game.description,
        game.username,
        game.user?.username,
        game.author?.username,
        game.white_player,
        game.whitePlayer,
        game.black_player,
        game.blackPlayer,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(normalizedQuery);
    });

    return [...filtered].sort((left, right) => {
      if (sort === 'popular') {
        return getLikeCount(right) - getLikeCount(left);
      }

      if (sort === 'commented') {
        return getCommentCount(right) - getCommentCount(left);
      }

      return new Date(right.created_at || right.createdAt || 0) -
        new Date(left.created_at || left.createdAt || 0);
    });
  }, [query, reviewOnly, sharedGames, sort]);

  const reviewCount = sharedGames.filter(hasSharedReview).length;
  const totalLikes = sharedGames.reduce((total, game) => total + getLikeCount(game), 0);
  const totalComments = sharedGames.reduce((total, game) => total + getCommentCount(game), 0);

  function handleSubmit(event) {
    event.preventDefault();
    void loadSharedGames();
  }

  return (
    <main className="community-page community-page--focused">
      <section className="community-hero">
        <div className="community-hero__content">
          <p className="eyebrow">Community</p>
          <h1>Shared chess reviews</h1>
          <p>
            Explore analyzed games, jump into key moments, and discuss the review with other players.
          </p>

          <div className="community-hero__actions">
            <Link className="btn btn--primary" to="/analyse">
              Review a game
            </Link>
            <Link className="btn btn--secondary" to="/profile">
              My profile
            </Link>
          </div>
        </div>

        <div className="community-stats-grid" aria-label="Community statistics">
          <article>
            <strong>{reviewCount}</strong>
            <span>Reviews</span>
          </article>
          <article>
            <strong>{totalLikes}</strong>
            <span>Likes</span>
          </article>
          <article>
            <strong>{totalComments}</strong>
            <span>Comments</span>
          </article>
        </div>
      </section>

      <form className="community-toolbar" onSubmit={handleSubmit}>
        <label className="community-toolbar__search">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, player, username..."
            type="search"
          />
        </label>

        <label>
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recent">Newest</option>
            <option value="popular">Most liked</option>
            <option value="commented">Most discussed</option>
          </select>
        </label>

        <label className="community-toolbar__toggle">
          <input
            type="checkbox"
            checked={reviewOnly}
            onChange={(event) => setReviewOnly(event.target.checked)}
          />
          <span>Reviews only</span>
        </label>

        <button className="btn btn--secondary" type="submit">
          Search
        </button>
      </form>

      {loading ? (
        <section className="community-state">
          <h2>Loading reviews...</h2>
          <p>The community feed is being prepared.</p>
        </section>
      ) : null}

      {error ? (
        <section className="community-state community-state--error">
          <h2>Community unavailable</h2>
          <p>{error}</p>
        </section>
      ) : null}

      {!loading && !error && visibleGames.length === 0 ? (
        <section className="community-state">
          <h2>No review found</h2>
          <p>Try another search or publish your first analyzed game.</p>
          <Link className="btn btn--primary" to="/analyse">
            Review a game
          </Link>
        </section>
      ) : null}

      {!loading && !error && visibleGames.length > 0 ? (
        <section className="shared-game-list shared-game-list--framed">
          {visibleGames.map((sharedGame) => (
            <SharedGameCard
              key={sharedGame.id || sharedGame.shared_game_id || sharedGame.sharedGameId}
              sharedGame={sharedGame}
            />
          ))}
        </section>
      ) : null}
    </main>
  );
}