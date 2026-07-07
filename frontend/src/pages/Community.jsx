import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import SharedGameCard from '../components/community/SharedGameCard';
import { listSharedGames } from '../services/freeviewApi';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Newest' },
  { value: 'popular', label: 'Most liked' },
  { value: 'commented', label: 'Most discussed' },
];

function getLikeCount(sharedGame) {
  return Number(sharedGame.likes_count ?? sharedGame.like_count ?? sharedGame.likesCount ?? 0);
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

function hasReview(sharedGame) {
  return Boolean(sharedGame.review || sharedGame.analysisSummary || sharedGame.analysis_summary);
}

export default function Community() {
  const [sharedGames, setSharedGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [reviewOnly, setReviewOnly] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadCommunity() {
      setLoading(true);
      setError('');

      try {
        const data = await listSharedGames({
          visibility: 'public',
          limit: 50,
        });

        if (mounted) {
          setSharedGames(Array.isArray(data) ? data : []);
        }
      } catch (apiError) {
        if (mounted) {
          setError(apiError instanceof Error ? apiError.message : 'Community posts could not be loaded.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadCommunity();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleSharedGames = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = sharedGames.filter((sharedGame) => {
      if (reviewOnly && !hasReview(sharedGame)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const title = String(sharedGame.title ?? sharedGame.name ?? '').toLowerCase();
      const description = String(sharedGame.description ?? '').toLowerCase();
      const username = String(
        sharedGame.username ??
          sharedGame.author?.username ??
          sharedGame.user?.username ??
          sharedGame.email ??
          '',
      ).toLowerCase();

      return (
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        username.includes(normalizedSearch)
      );
    });

    return [...filtered].sort((left, right) => {
      if (sort === 'popular') {
        return getLikeCount(right) - getLikeCount(left);
      }

      if (sort === 'commented') {
        return getCommentCount(right) - getCommentCount(left);
      }

      return new Date(right.created_at ?? right.createdAt ?? 0) - new Date(left.created_at ?? left.createdAt ?? 0);
    });
  }, [reviewOnly, search, sharedGames, sort]);

  const reviewCount = sharedGames.filter(hasReview).length;
  const totalLikes = sharedGames.reduce((total, sharedGame) => total + getLikeCount(sharedGame), 0);
  const totalComments = sharedGames.reduce((total, sharedGame) => total + getCommentCount(sharedGame), 0);

  return (
    <main className="community-page community-page--focused">
      <section className="community-header community-header--compact">
        <div>
          <p className="eyebrow">Community</p>
          <h1>Shared reviews</h1>
          <p className="subtle">
            Browse analyzed games, read the review, and join the discussion.
          </p>
        </div>

        <div className="community-header__actions">
          <Link className="btn btn--primary" to="/analyse">
            Review a game
          </Link>
          <Link className="btn btn--secondary" to="/profile">
            My profile
          </Link>
        </div>
      </section>

      <section className="community-stats community-stats--compact" aria-label="Community statistics">
        <article>
          <strong>{reviewCount}</strong>
          <span>reviews</span>
        </article>
        <article>
          <strong>{totalLikes}</strong>
          <span>likes</span>
        </article>
        <article>
          <strong>{totalComments}</strong>
          <span>comments</span>
        </article>
      </section>

      <section className="community-filters community-filters--sticky">
        <label className="community-search">
          <span className="sr-only">Search posts</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, player, or username"
            type="search"
          />
        </label>

        <label className="community-select">
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="community-toggle">
          <input
            type="checkbox"
            checked={reviewOnly}
            onChange={(event) => setReviewOnly(event.target.checked)}
          />
          <span>Reviews only</span>
        </label>
      </section>

      {error ? (
        <section className="community-state community-state--error">
          <h2>Community unavailable</h2>
          <p>{error}</p>
        </section>
      ) : null}

      {loading ? (
        <section className="community-state">
          <h2>Loading posts...</h2>
        </section>
      ) : null}

      {!loading && visibleSharedGames.length === 0 ? (
        <section className="community-state">
          <h2>No posts found</h2>
          <p>Try another search or share your first analyzed review.</p>
          <Link className="btn btn--primary" to="/analyse">
            Review a game
          </Link>
        </section>
      ) : null}

      <section className="shared-game-list shared-game-list--framed">
        {visibleSharedGames.map((sharedGame) => (
          <SharedGameCard
            key={sharedGame.id || sharedGame.shared_game_id || sharedGame.sharedGameId}
            sharedGame={sharedGame}
          />
        ))}
      </section>
    </main>
  );
}