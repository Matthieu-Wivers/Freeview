import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="community-page">
      <section className="home-hero panel">
        <div>
          <p className="eyebrow">Plateforme communautaire d'échecs</p>
          <h1>Partage tes parties, reçois des avis et progresse avec la communauté.</h1>
          <p>
            Freeview permet d'importer une partie PGN, de la publier avec une description,
            puis de recevoir des likes et commentaires. Les administrateurs gardent un espace propre grâce à la modération.
          </p>
          <div className="input-actions">
            <Link className="btn btn--primary" to={isAuthenticated ? '/games/import' : '/login'}>
              Importer une partie
            </Link>
            <Link className="btn btn--secondary" to="/community">
              Voir la communauté
            </Link>
          </div>
        </div>
        <div className="home-hero__side">
          <div className="summary-card">
            <span className="meta-label">MVP CDA</span>
            <strong>Import → publication → commentaires → modération</strong>
          </div>
          <div className="summary-card">
            <span className="meta-label">Compétences</span>
            <strong>Auth, API, base relationnelle, rôles et sécurité</strong>
          </div>
        </div>
      </section>

      <section className="community-grid community-grid--three">
        <article className="panel community-info-card">
          <span className="meta-label">1</span>
          <h2>Import PGN</h2>
          <p>Le joueur colle une partie au format PGN et l'enregistre dans son espace.</p>
        </article>
        <article className="panel community-info-card">
          <span className="meta-label">2</span>
          <h2>Partage</h2>
          <p>Il ajoute un titre, une description et choisit une visibilité publique, privée ou non listée.</p>
        </article>
        <article className="panel community-info-card">
          <span className="meta-label">3</span>
          <h2>Échanges</h2>
          <p>Les membres likent, commentent et signalent les contenus à modérer.</p>
        </article>
      </section>
    </div>
  );
}
