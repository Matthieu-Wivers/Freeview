import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import SharedGameCard from '../components/community/SharedGameCard';
import { listSharedGames } from '../services/freeviewApi';
import { getCommentCount, getLikeCount } from '../utils/pgn';
import { hasSharedReview } from '../utils/sharedReview';

export default function Community() {
  const [sharedGames, setSharedGames] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSharedGames() {
    setLoading(true);
    setError('');

    try {
      const data = await listSharedGames({
        visibility: 'public',
        q: query,
        search: query,
        sort,
      });

      setSharedGames(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Shared reviews could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSharedGames();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, sort]);

  const stats = useMemo(() => {
    const reviewCount = sharedGames.filter(hasSharedReview).length;
    const likeCount = sharedGames.reduce((sum, sharedGame) => sum + getLikeCount(sharedGame), 0);
    const commentCount = sharedGames.reduce((sum, sharedGame) => sum + getCommentCount(sharedGame), 0);

    return {
      reviewCount,
      likeCount,
      commentCount,
    };
  }, [sharedGames]);

  return (
    <main className="community-page">
      <section className="community-header community-header--hub">
        <div>
          <p className="eyebrow">Community</p>
          <h1>Review Hub</h1>
          <p>
            Explore analyzed chess games, compare engine suggestions,
            discuss key mistakes, and share your own Stockfish review.
          </p>

          <div className="community-header__actions">
            <Link className="btn btn--primary" to="/analyse">
              Analyze and share a review
            </Link>
            <Link className="btn btn--ghost" to="/profile">
              My profile
            </Link>
          </div>
        </div>

        <div className="review-hub-stats">
          <span>
            Published reviews
            <strong>{stats.reviewCount}</strong>
          </span>
          <span>
            Likes
            <strong>{stats.likeCount}</strong>
          </span>
          <span>
            Comments
            <strong>{stats.commentCount}</strong>
          </span>
        </div>
      </section>

      <section className="community-filters community-filters--friendly">
        <label>
          Search reviews
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, player, author or description..."
          />
        </label>

        <label>
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="latest">Latest reviews</option>
            <option value="popular">Most liked</option>
            <option value="commented">Most discussed</option>
          </select>
        </label>

        <button className="btn btn--ghost" type="button" onClick={() => void loadSharedGames()}>
          Refresh
        </button>
      </section>

      <section className="review-hub-help">
        <article>
          <strong>1. Analyze</strong>
          <span>Paste a PGN and run the engine review.</span>
        </article>
        <article>
          <strong>2. Publish</strong>
          <span>Share the saved review directly from the analysis page.</span>
        </article>
        <article>
          <strong>3. Discuss</strong>
          <span>Comment on mistakes, best moves and critical positions.</span>
        </article>
      </section>

      {loading ? (
        <section className="community-state">
          <h2>Loading reviews...</h2>
          <p>The hub is fetching the latest shared reviews.</p>
        </section>
      ) : null}

      {error ? (
        <section className="community-state community-state--error">
          <h2>Unable to load the hub</h2>
          <p>{error}</p>
          <button className="btn btn--primary" type="button" onClick={() => void loadSharedGames()}>
            Try again
          </button>
        </section>
      ) : null}

      {!loading && !error && sharedGames.length === 0 ? (
        <section className="community-empty">
          <h2>No shared reviews yet</h2>
          <p>
            Be the first one to publish an analyzed game from the analysis page.
          </p>
          <Link className="btn btn--primary" to="/analyse">
            Create the first review
          </Link>
        </section>
      ) : null}

      {!loading && !error && sharedGames.length > 0 ? (
        <section className="shared-game-list">
          {sharedGames.map((sharedGame) => (
            <SharedGameCard key={sharedGame.id} sharedGame={sharedGame} />
          ))}
        </section>
      ) : null}
    </main>
  );
}