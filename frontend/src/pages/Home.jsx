import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      navigate('/community', { replace: true });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [navigate]);

  return (
    <main className="community-page redirect-page">
      <section className="panel redirect-card">
        <p className="eyebrow">Opening Community</p>
        <h1>Freeview Community</h1>
        <p className="subtle">
          Shared chess reviews, readable posts, and focused feedback from players.
        </p>

        <div className="redirect-highlights" aria-label="Community highlights">
          <span>Engine reviews first</span>
          <span>Readable posts</span>
          <span>Player discussions</span>
        </div>

        <div className="input-actions">
          <Link className="btn btn--primary" to="/community">
            Go to Community
          </Link>
          <Link className="btn btn--secondary" to="/analyse">
            Review a game
          </Link>
        </div>
      </section>
    </main>
  );
}