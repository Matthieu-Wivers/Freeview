# Sécurité applicative

## Objectif du document

Ce document décrit les mesures de sécurité mises en place dans l'application Freeview.

L'objectif est de protéger les comptes utilisateurs, les données personnelles, les contenus publiés et les routes sensibles de l'application.

---

## Hash des mots de passe avec bcrypt

Pour les comptes utilisant une authentification locale, les mots de passe ne doivent jamais être stockés en clair.

L'application utilise un mécanisme de hash sécurisé avec `bcrypt`.

Le principe est le suivant :

1. L'utilisateur choisit un mot de passe.
2. Le serveur génère un hash sécurisé.
3. Seul le hash est stocké en base de données.
4. Lors de la connexion, le mot de passe saisi est comparé au hash.

Avantages de `bcrypt` :

- Protection contre le stockage en clair
- Ajout automatique d'un salt
- Coût de calcul configurable
- Résistance accrue aux attaques par force brute

Même en cas d'accès non autorisé à la base de données, les mots de passe originaux ne sont pas directement visibles.

---

## JWT et cookies de session

L'application peut utiliser un système de session basé sur un cookie ou sur un token JWT.

Le token ou cookie permet au serveur d'identifier l'utilisateur connecté lors des requêtes suivantes.

Les bonnes pratiques à respecter sont :

- Ne pas stocker d'information sensible inutile dans le token
- Utiliser une clé secrète forte
- Définir une durée d'expiration
- Activer `HttpOnly` pour les cookies sensibles
- Activer `Secure` en production
- Configurer `SameSite`
- Ne jamais exposer le secret JWT dans le frontend

Exemple de configuration recommandée en production :

```js
cookie: {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 1000 * 60 * 60 * 24
}
```

Le frontend ne doit pas manipuler directement les secrets d'authentification.

---

## Middleware requireAuth

Les routes réservées aux utilisateurs connectés doivent être protégées par un middleware d'authentification.

Le middleware `requireAuth` a pour rôle de :

- Vérifier la présence d'une session ou d'un token valide
- Identifier l'utilisateur courant
- Bloquer les requêtes non authentifiées
- Retourner une erreur HTTP adaptée

Exemple de comportement attendu :

```txt
Utilisateur non connecté -> 401 Unauthorized
Utilisateur connecté -> accès autorisé
```

Routes typiquement protégées :

- Création de commentaire
- Publication d'une review
- Import de partie
- Accès aux parties personnelles
- Modification du profil
- Suppression logique d'un contenu personnel

---

## Middleware requireAdmin

Certaines routes doivent être réservées aux administrateurs.

Le middleware `requireAdmin` permet de vérifier que l'utilisateur connecté dispose du rôle nécessaire.

Il doit être utilisé pour les fonctionnalités sensibles comme :

- Modération des publications
- Masquage de contenus
- Consultation de contenus masqués
- Actions d'administration
- Gestion avancée des utilisateurs

Exemple de comportement attendu :

```txt
Utilisateur non connecté -> 401 Unauthorized
Utilisateur connecté non admin -> 403 Forbidden
Utilisateur admin -> accès autorisé
```

Ce contrôle doit être fait côté backend.

Le frontend peut masquer les boutons d'administration, mais cela ne suffit pas à sécuriser l'application.

---

## Requêtes SQL paramétrées

L'application doit utiliser des requêtes SQL paramétrées afin de limiter les risques d'injection SQL.

Une requête vulnérable concatène directement une valeur utilisateur :

```js
// Mauvaise pratique
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

Une requête paramétrée sépare la structure SQL des valeurs :

```js
// Bonne pratique
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

Les champs concernés peuvent être :

- Email
- Identifiant utilisateur
- Identifiant de partie
- Texte de recherche
- Statut de modération
- Identifiant de publication
- Identifiant de commentaire

Les paramètres utilisateur ne doivent jamais être concaténés directement dans une requête SQL.

---

## Helmet

L'application backend peut utiliser `helmet` afin d'ajouter des headers HTTP de sécurité.

Helmet permet notamment de renforcer la protection contre :

- Certaines attaques XSS
- Le clickjacking
- Les erreurs de sniffing MIME
- Certaines mauvaises configurations HTTP

Exemple :

```js
import helmet from 'helmet';

app.use(helmet());
```

Helmet ne remplace pas les autres mesures de sécurité, mais ajoute une protection globale utile au niveau HTTP.

---

## Rate limiting

Le rate limiting permet de limiter le nombre de requêtes effectuées par un utilisateur ou une adresse IP sur une période donnée.

Il est particulièrement important sur les routes sensibles :

- Connexion
- Création de compte
- Réinitialisation de mot de passe
- Création de commentaire
- Publication de contenu
- Routes d'administration

Objectifs :

- Réduire les attaques par force brute
- Limiter le spam
- Réduire les abus automatisés
- Protéger la disponibilité du serveur

Exemple de logique :

```txt
Maximum 100 requêtes par IP toutes les 15 minutes
Maximum 5 tentatives de connexion par minute
```

Le rate limiting doit être ajusté selon les besoins réels de l'application.

---

## Variables d'environnement

Les informations sensibles doivent être stockées dans des variables d'environnement et ne jamais être écrites directement dans le code source.

Exemples de données à placer en variable d'environnement :

- URL de base de données
- Identifiants de base de données
- Secret JWT
- Secret de session
- Client ID OAuth
- Client secret OAuth
- URL du frontend
- Configuration CORS
- Port du serveur

Exemple :

```env
DATABASE_URL=postgresql://user:password@host:5432/freeview
JWT_SECRET=change_me
SESSION_SECRET=change_me
GOOGLE_CLIENT_ID=change_me
GOOGLE_CLIENT_SECRET=change_me
FRONTEND_URL=https://freeview.wivers.fr
```

Le fichier `.env` ne doit pas être versionné.

Il doit être présent dans `.gitignore`.

Un fichier `.env.example` peut être fourni pour documenter les variables attendues sans exposer de secret.

---

## Contrôle des accès

Les accès doivent être vérifiés côté backend.

Le frontend peut améliorer l'expérience utilisateur en masquant certaines actions, mais il ne doit jamais être considéré comme une barrière de sécurité suffisante.

Exemples :

- Un bouton admin peut être masqué côté frontend.
- La route backend doit quand même vérifier le rôle admin.
- Un utilisateur ne doit pas pouvoir modifier une ressource qui ne lui appartient pas.
- Une publication masquée ne doit pas être accessible sans autorisation.

---

## Validation des entrées

Les données reçues par le backend doivent être validées avant traitement.

Exemples de validations nécessaires :

- Email valide
- Mot de passe suffisamment robuste
- PGN non vide
- Identifiant UUID valide
- Statut de modération autorisé
- Contenu de commentaire non vide
- Longueur maximale des champs texte

La validation permet de limiter :

- Les erreurs applicatives
- Les injections
- Les contenus invalides
- Les abus liés aux champs trop longs

---

## Gestion des erreurs

Les erreurs doivent être gérées sans exposer d'informations sensibles.

Il faut éviter de renvoyer au client :

- Stack traces
- Secrets
- Requêtes SQL complètes
- Informations internes du serveur
- Détails de configuration

Exemple de réponse correcte :

```json
{
  "message": "Invalid credentials"
}
```

Exemple à éviter :

```json
{
  "error": "Database error on table auth_accounts with query SELECT ..."
}
```

Les logs serveur peuvent contenir plus de détails, mais ils ne doivent pas être exposés publiquement.

---

## Bonnes pratiques restantes

Améliorations possibles pour renforcer encore le projet :

- Ajouter des tests automatisés sur les middlewares `requireAuth` et `requireAdmin`
- Ajouter des tests sur les permissions utilisateur
- Ajouter une validation stricte avec une librairie comme Zod ou Joi
- Ajouter un audit de dépendances dans la pipeline CI/CD
- Ajouter une analyse statique du code
- Vérifier les headers HTTP en production
- Renforcer la politique CORS
- Ajouter une rotation des secrets
- Ajouter des logs d'audit pour les actions administrateur
