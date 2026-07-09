# Accessibilité

## Objectif du document

Ce document décrit les mesures d'accessibilité mises en place dans l'application Freeview.

L'objectif est de rendre l'application utilisable par le plus grand nombre d'utilisateurs possible, y compris les personnes utilisant un clavier, un lecteur d'écran ou ayant des besoins spécifiques liés au contraste et à la lisibilité.

---

## Navigation clavier

L'application doit rester utilisable sans souris.

Les éléments interactifs doivent pouvoir être atteints avec la touche `Tab`, notamment :

- Boutons
- Liens
- Champs de formulaire
- Menus
- Cartes interactives
- Actions de modération
- Actions de partage

Les actions doivent pouvoir être déclenchées avec les touches standards :

- `Enter`
- `Space`
- `Escape` lorsque cela est pertinent pour fermer une modale ou quitter une vue

Les éléments non interactifs ne doivent pas être rendus focusables inutilement.

---

## Labels de formulaire

Chaque champ de formulaire doit être associé à un label explicite.

Exemples de champs concernés :

- Email
- Mot de passe
- Nom d'utilisateur
- Titre d'une publication
- Description
- Commentaire
- Import de PGN
- Recherche dans le Share Hub

Les labels permettent :

- Une meilleure compréhension visuelle
- Une meilleure compatibilité avec les lecteurs d'écran
- Une navigation plus claire au clavier
- Une réduction des erreurs de saisie

Les placeholders ne doivent pas remplacer les labels, car ils disparaissent lors de la saisie.

---

## Contraste

Les textes doivent rester lisibles sur tous les fonds utilisés par l'application.

Une attention particulière doit être portée à :

- La lisibilité du texte principal
- La lisibilité des boutons
- La lisibilité des messages d'erreur
- La lisibilité des badges de statut
- La lisibilité des cartes de parties partagées
- La lisibilité des éléments désactivés

Les contrastes doivent être suffisants entre :

- Texte et arrière-plan
- Icônes et arrière-plan
- Boutons et fond de page
- États actifs, inactifs et désactivés

Les couleurs ne doivent pas être le seul moyen de transmettre une information.

Par exemple, un statut ne doit pas seulement être identifié par une couleur, mais aussi par un texte explicite.

---

## Attributs ARIA

Les attributs ARIA doivent être utilisés lorsque le HTML natif ne suffit pas à décrire correctement un élément.

Exemples d'utilisation :

```html
<button aria-label="Open user menu">
  ...
</button>
```

```html
<button aria-label="Share this game review">
  ...
</button>
```

```html
<section aria-labelledby="shared-games-title">
  <h2 id="shared-games-title">Shared games</h2>
</section>
```

Les `aria-label` sont particulièrement utiles pour :

- Boutons avec icône seule
- Menus déroulants
- Actions de suppression
- Actions de modération
- Boutons de partage
- Boutons de fermeture

Les attributs ARIA ne doivent pas être utilisés pour remplacer une structure HTML correcte.

Il faut privilégier les balises sémantiques natives lorsque c'est possible :

- `button`
- `nav`
- `main`
- `header`
- `footer`
- `section`
- `article`
- `form`
- `label`

---

## Structure des titres

Les pages doivent respecter une hiérarchie claire des titres.

Exemple attendu :

```md
# Titre principal de la page

## Section principale

### Sous-section

## Autre section principale
```

Dans l'application, cela correspond à une structure du type :

```html
<h1>Share Hub</h1>
<h2>Filters</h2>
<h2>Shared game reviews</h2>
<h3>Game card title</h3>
```

Une bonne structure de titres permet :

- Une meilleure lecture par les lecteurs d'écran
- Une navigation plus simple
- Une meilleure compréhension de la page
- Une meilleure maintenabilité du frontend

Il ne faut pas sauter de niveaux de titres sans raison.

Par exemple, il faut éviter de passer directement de `h1` à `h4`.

---

## Limites restantes

Certaines améliorations restent possibles :

- Audit complet avec Lighthouse
- Audit complet avec axe DevTools
- Tests manuels avec lecteur d'écran
- Ajout de tests automatisés d'accessibilité
- Vérification systématique du contraste
- Meilleure gestion du focus dans les modales
- Ajout d'un skip link vers le contenu principal
- Vérification de tous les textes alternatifs
- Amélioration de certains messages d'erreur pour les rendre plus explicites

---

## Bonnes pratiques à conserver

Lors des futures évolutions du projet, il faudra conserver les bonnes pratiques suivantes :

- Utiliser des composants HTML sémantiques
- Ajouter des labels aux champs de formulaire
- Éviter les boutons uniquement visuels sans texte accessible
- Vérifier la navigation clavier
- Maintenir une hiérarchie de titres cohérente
- Ne pas transmettre une information uniquement par la couleur
- Prévoir des messages d'erreur clairs et compréhensibles
