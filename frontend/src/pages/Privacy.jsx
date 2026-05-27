export default function PrivacyPolicy() {
  return (
    <main className="privacy-page">
      <section>
        <h1>Privacy Policy — Freeview Chess.com Analyzer</h1>

        <p>
          Freeview Chess.com Analyzer is a Chrome extension that adds an
          “Analyse with Freeview” button on Chess.com.
        </p>

        <h2>Data processed</h2>
        <p>
          The extension may read information from the game displayed on Chess.com,
          including the moves, PGN, result, usernames displayed on the page, and
          the game URL.
        </p>

        <h2>Use</h2>
        <p>
          This data is used only to open the game in Freeview at the user’s
          request, when the user clicks the “Analyse with Freeview” button.
        </p>

        <h2>Transmission</h2>
        <p>
          When the user clicks the button, the PGN is transmitted to{" "}
          <a href="https://freeview.wivers.fr/analyse">
            https://freeview.wivers.fr/analyse
          </a>{" "}
          through an HTTPS URL in order to display the game analysis.
        </p>

        <h2>Storage</h2>
        <p>
          The extension does not locally store game data and does not keep a
          history in the browser through the extension.
        </p>

        <h2>Sharing</h2>
        <p>
          The data is not sold, is not used for advertising, is not shared with
          data brokers, and is not used for tracking purposes.
        </p>

        <h2>Contact</h2>
        <p>
          <a href="mailto:matthieu.ganet@proton.me">
            matthieu.ganet@proton.me
          </a>
        </p>
      </section>

      <hr />

      <section lang="fr">
        <h1>Politique de confidentialité — Freeview Chess.com Analyzer</h1>

        <p>
          Freeview Chess.com Analyzer est une extension Chrome qui ajoute un
          bouton “Analyse with Freeview” sur Chess.com.
        </p>

        <h2>Données traitées</h2>
        <p>
          L’extension peut lire les informations de la partie affichée sur
          Chess.com, notamment les coups, le PGN, le résultat, les noms
          d’utilisateurs affichés sur la page et l’URL de la partie.
        </p>

        <h2>Utilisation</h2>
        <p>
          Ces données sont utilisées uniquement pour ouvrir la partie dans
          Freeview à la demande de l’utilisateur, lorsque celui-ci clique sur le
          bouton “Analyse with Freeview”.
        </p>

        <h2>Transmission</h2>
        <p>
          Lorsque l’utilisateur clique sur le bouton, le PGN est transmis à{" "}
          <a href="https://freeview.wivers.fr/analyse">
            https://freeview.wivers.fr/analyse
          </a>{" "}
          via une URL HTTPS afin d’afficher l’analyse de la partie.
        </p>

        <h2>Stockage</h2>
        <p>
          L’extension ne stocke pas localement les données de partie et ne
          conserve pas d’historique dans le navigateur via l’extension.
        </p>

        <h2>Partage</h2>
        <p>
          Les données ne sont pas vendues, ne sont pas utilisées pour la
          publicité, ne sont pas partagées avec des courtiers de données et ne
          sont pas utilisées à des fins de suivi.
        </p>

        <h2>Contact</h2>
        <p>
          <a href="mailto:matthieu.ganet@proton.me">
            matthieu.ganet@proton.me
          </a>
        </p>
      </section>
    </main>
  );
}