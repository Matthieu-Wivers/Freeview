import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import SharedGameCard from '../components/community/SharedGameCard';
import { listSharedGames } from '../services/freeviewApi';

export default function Community() {
  const [sharedGames, setSharedGames] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSharedGames() {
    setLoading(true);
    setError('');

    try {
      const items = await listSharedGames({ visibility: 'public', q: query, sort });
      setSharedGames(items);
    } catch (apiError) {
      setError(apiError.message || 'Impossible de charger les parties partagées.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSharedGames();
  }, [sort]);

  const visibleGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return sharedGames;
    }

    return sharedGames.filter((game) => {
      const text = `${game.title || ''} ${game.description || ''} ${game.user?.username || ''}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [sharedGames, query]);

  return (
    <div className="community-page">
      <section className="panel community-header">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Communauté</p>
            <h1>Parties partagées</h1>
            <p className="subtle">Lis les descriptions, analyse les positions et participe aux échanges.</p>
          </div>
          <Link className="btn btn--primary" to="/games/import">Importer une partie</Link>
        </div>

        <form
          className="community-filters"
          onSubmit={(event) => {
            event.preventDefault();
            loadSharedGames();
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une partie, un joueur, un thème..."
          />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recent">Plus récentes</option>
            <option value="popular">Plus likées</option>
            <option value="commented">Plus commentées</option>
          </select>
          <button className="btn btn--secondary" type="submit">Rechercher</button>
        </form>
      </section>

      {loading && <p className="panel community-state">Chargement des parties...</p>}
      {error && <p className="panel community-state error-text">{error}</p>}

      {!loading && !error && visibleGames.length === 0 && (
        <div className="panel community-empty">
          <h2>Aucune partie publique pour le moment.</h2>
          <p>Importe une partie PGN, publie-la, puis elle apparaîtra ici.</p>
          <Link className="btn btn--primary" to="/games/import">Importer une partie</Link>
        </div>
      )}

      <div className="shared-game-list">
        {visibleGames.map((sharedGame) => (
          <SharedGameCard key={sharedGame.id || sharedGame.shared_game_id} sharedGame={sharedGame} />
        ))}
      </div>
    </div>
  );
}
