# Gestion de projet

## Présentation

Freeview est une application web full stack d’analyse, de sauvegarde et de partage de parties d’échecs au format PGN. Le projet a été développé comme projet support pour le titre professionnel Concepteur Développeur d’Applications.

L’application permet à un utilisateur d’importer une partie, de l’analyser, de la sauvegarder, puis de la publier dans un espace communautaire. Les autres utilisateurs peuvent consulter la publication, commenter, liker ou signaler un contenu. Les administrateurs peuvent gérer les signalements et modérer les contenus.

## Objectifs

- Construire une application full stack complète.
- Proposer un parcours utilisateur clair autour de l’analyse d’une partie d’échecs.
- Permettre l’import, la sauvegarde et le partage de parties PGN.
- Ajouter un espace communautaire avec commentaires, likes et signalements.
- Ajouter un espace administrateur pour la modération.
- Sécuriser l’application avec authentification et autorisation.
- Concevoir une base PostgreSQL relationnelle.
- Organiser le backend avec une architecture en couches.
- Conteneuriser l’application avec Docker.
- Ajouter des tests automatisés backend et frontend.
- Mettre en place une pipeline CI/CD professionnelle.
- Produire une documentation exploitable pour le jury CDA.

## Méthodologie

Le projet a été mené de manière itérative. Chaque module a été conçu, développé, testé et intégré progressivement afin de stabiliser l’application au fur et à mesure.

Modules principaux :

- structure frontend et routage ;
- authentification et profil utilisateur ;
- import PGN et parsing de partie ;
- affichage de l’échiquier et de la review ;
- sauvegarde et partage de parties ;
- hub communautaire ;
- commentaires et likes ;
- signalements et modération ;
- pages administrateur ;
- base PostgreSQL ;
- Docker et déploiement ;
- tests automatisés ;
- pipeline CI/CD ;
- documentation CDA.

## Phases principales

| Phase | Objectif | Résultat |
|---|---|---|
| Analyse du besoin | Identifier les utilisateurs, les cas d’usage et les règles métier | Périmètre fonctionnel, rôles et user stories |
| Conception technique | Définir l’architecture, les routes API et le modèle de données | Architecture React, Express, PostgreSQL |
| Développement du socle | Mettre en place le frontend, le backend et la base | Application structurée et connectée |
| Authentification | Créer les parcours de connexion et de protection | Comptes, sessions, routes privées |
| Analyse PGN | Importer et visualiser une partie d’échecs | Parsing PGN, échiquier, navigation |
| Communauté | Publier et consulter des parties partagées | Hub communautaire et détail de publication |
| Interactions | Ajouter commentaires, likes et signalements | Participation utilisateur et modération possible |
| Administration | Ajouter les pages et actions de modération | Gestion des signalements et contenus |
| Déploiement | Préparer Docker et la production | Conteneurs web, API et DB |
| Qualité | Ajouter tests et coverage | Tests backend et frontend automatisés |
| CI/CD | Automatiser les validations | Pipeline GitHub Actions multi-étapes |
| Documentation | Préparer les preuves CDA | README, docs, captures et annexes |

## Rôles utilisateurs

### Visiteur

Un visiteur peut consulter la page d’accueil, les publications publiques, le détail d’une publication, les commentaires visibles et la politique de confidentialité.

### Utilisateur connecté

Un utilisateur connecté peut importer une partie PGN, sauvegarder ses parties, analyser une partie, partager une partie ou une review, commenter, liker, signaler un contenu et gérer son profil.

### Administrateur

Un administrateur peut accéder aux pages d’administration, consulter et traiter les signalements, modérer les publications ou commentaires, gérer les rôles et le statut des utilisateurs et consulter l’historique de modération.

## Périmètre fonctionnel

| Module | Description | Statut |
|---|---|---|
| Authentification | Inscription, connexion, déconnexion, utilisateur courant | Réalisé |
| Profil | Données publiques, parties importées, publications | Réalisé |
| Import PGN | Enregistrement d’une partie dans le compte utilisateur | Réalisé |
| Analyse | Affichage de l’échiquier, navigation et review | Réalisé |
| Partage | Création d’une publication communautaire | Réalisé |
| Hub communautaire | Liste des publications partagées | Réalisé |
| Détail publication | Consultation d’une partie partagée et de ses interactions | Réalisé |
| Commentaires | Ajout et affichage des commentaires | Réalisé |
| Likes | Like/unlike d’une publication avec contrainte d’unicité | Réalisé |
| Signalements | Signalement de publication ou commentaire | Réalisé |
| Modération | Traitement administrateur des contenus signalés | Réalisé |
| Tests | Tests unitaires backend et frontend | Réalisé |
| CI/CD | Pipeline GitHub Actions séparée en étapes | Réalisé |
| Docker | Déploiement conteneurisé | Réalisé |

## Priorisation MoSCoW

### Must have

- Authentification.
- Import PGN.
- Analyse et affichage d’une partie.
- Sauvegarde d’une partie.
- Partage communautaire.
- Commentaires.
- Likes.
- Signalements.
- Administration et modération.
- Base PostgreSQL relationnelle.
- Déploiement Docker.
- Tests automatisés.
- Pipeline CI/CD.

### Should have

- Google SSO.
- Profil utilisateur.
- Historique des actions de modération.
- Partage de review complète.
- Résumé d’analyse.
- Documentation de déploiement.

### Could have

- Notifications.
- Recherche avancée.
- Statistiques de progression.
- Cache des analyses Stockfish.
- Tests end-to-end.
- Audit RGAA complet.

### Won’t have pour cette version

- Application mobile native.
- Système de paiement.
- Tournois.
- Messagerie temps réel.
- Fonctionnalités complètes de plateforme d’échecs.

## Journal de sprint simplifié

### Sprint 1 : socle technique

Initialisation du frontend React/Vite, du backend Node/Express, de PostgreSQL, de Docker Compose et des premières routes.

### Sprint 2 : authentification et profil

Création de l’inscription, de la connexion, du hash des mots de passe, de la récupération utilisateur courant et des routes privées.

### Sprint 3 : import PGN et analyse

Ajout du parsing PGN, de l’import de partie, de l’échiquier, de la navigation dans les coups et de la connexion avec l’API.

### Sprint 4 : partage communautaire

Création de la table des publications, du formulaire de partage, du hub communautaire, de la page détail et de la visibilité des publications.

### Sprint 5 : interactions communautaires

Ajout des commentaires, des likes, de la contrainte d’unicité et des compteurs côté frontend.

### Sprint 6 : signalements et modération

Création des signalements, des actions de modération, des routes administrateur et des statuts de modération.

### Sprint 7 : préparation production

Préparation des Dockerfiles, de Nginx, de Docker Compose, des variables d’environnement et correction des écarts entre code et base de production.

### Sprint 8 : tests automatisés

Ajout des tests backend, frontend, configuration Vitest, coverage et corrections détectées par les tests.

### Sprint 9 : CI/CD et documentation

Création de la pipeline GitHub Actions, séparation des jobs, build Docker AMD64, README professionnel et documents CDA.

## Choix techniques

### React et Vite

React permet une interface modulaire et Vite fournit un environnement de développement rapide avec un build moderne.

### Node.js et Express

Express permet de construire une API REST claire. Le backend est organisé en couches : routes, controllers, services, repositories, PostgreSQL.

### PostgreSQL

PostgreSQL gère les données relationnelles du projet : utilisateurs, parties, publications, commentaires, likes, signalements et modération. Le modèle utilise UUID, clés étrangères, contraintes, index, suppression logique et JSONB pour les reviews.

### Docker

Docker permet de séparer les services et de reproduire l’environnement d’exécution : frontend web, backend API, base PostgreSQL et tunnel Cloudflare.

### GitHub Actions

GitHub Actions automatise les tests, le build frontend, la construction des images Docker et le déploiement conditionnel.

## Difficultés rencontrées

### Alignement base de données / backend

Certains repositories attendaient des colonnes ou types absents de la base de production. Les corrections ont été faites à partir des logs API, de l’analyse du schéma et de l’ajout des colonnes manquantes.

### Partage de review

Le partage a évolué d’un simple PGN vers une publication contenant une review complète. Les champs `review`, `analysis_summary` et `reviewed_at` ont été ajoutés.

### CI/CD Docker multi-architecture

Le build ARM64 échouait avec QEMU pendant `npm ci`. Le build Docker a été limité à `linux/amd64`, correspondant à l’environnement de production.

### Coverage

Le coverage initial incluait toute l’application, y compris les grandes pages non couvertes par les tests unitaires. Le scope a été aligné avec les fichiers réellement couverts par les suites unitaires.

## Stratégie qualité

La qualité repose sur une architecture en couches, des services testables, des repositories SQL séparés, des API clients centralisés, des tests automatisés, du coverage, Docker, CI/CD et une documentation de preuve.

## Gestion des risques

| Risque | Impact | Mesure de réduction |
|---|---|---|
| PGN invalide | Rupture du parcours d’analyse | Validation et fallback UI |
| Accès non autorisé | Problème de sécurité | Middlewares `requireAuth` et `requireAdmin` |
| Like en double | Incohérence des données | Contrainte unique SQL |
| Contenu inapproprié | Risque communautaire | Signalements et modération |
| Secret exposé | Risque de compromission | Variables d’environnement et GitHub Secrets |
| Déploiement cassé | Indisponibilité | Pipeline, Docker, rollback |
| Base incohérente | Erreurs API | Contraintes SQL et documentation |
| Pipeline en échec | Déploiement bloqué | Jobs séparés et logs exploitables |

## État actuel

Le projet dispose d’une application full stack, d’un frontend React, d’un backend Express, d’une base PostgreSQL, d’une authentification, d’un espace communautaire, d’une modération administrateur, de tests automatisés, d’une pipeline CI/CD, d’un déploiement Docker et d’une documentation professionnelle.

## Améliorations futures

- Tests d’intégration backend avec Supertest.
- Tests end-to-end avec Playwright.
- Audit RGAA complet.
- Notifications.
- Recherche avancée.
- Statistiques utilisateur.
- Cache des analyses Stockfish.
- Monitoring et alerting.
- Script de seed pour la démonstration.
- Changelog et tags de version.
