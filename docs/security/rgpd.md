# RGPD - Protection des données personnelles

## Objectif du document

Ce document décrit les données personnelles traitées par l'application Freeview, les finalités associées, les durées de conservation prévues, ainsi que les droits des utilisateurs.

Freeview est une application web permettant à un utilisateur de se connecter, d'importer des parties d'échecs, de les analyser, de publier des revues et d'interagir avec des contenus partagés.

---

## Données collectées

L'application peut collecter les données suivantes :

### Données liées au compte utilisateur

- Adresse email
- Nom d'utilisateur
- Rôle utilisateur
- Statut de vérification de l'email
- Date de création du compte
- Date de dernière connexion
- Statut de désactivation du compte

### Données liées à l'authentification

- Identifiant du fournisseur d'authentification
- Type de fournisseur utilisé, par exemple Google OAuth ou compte local
- Hash du mot de passe pour les comptes locaux
- Dates de création des comptes d'authentification

Les mots de passe ne sont jamais stockés en clair. Ils sont uniquement conservés sous forme de hash sécurisé.

### Données liées au profil

- Nom d'utilisateur public
- Biographie
- URL d'avatar
- Dates de création et de mise à jour du profil

### Données liées aux parties d'échecs

- PGN de la partie
- Nom du joueur blanc
- Nom du joueur noir
- Résultat de la partie
- Date de la partie
- Source de la partie
- Date de suppression logique éventuelle

### Données liées aux parties partagées

- Titre de la publication
- Description
- Visibilité
- Statut de modération
- Revue de partie
- Résumé d'analyse
- Date de revue
- Date de suppression logique éventuelle

### Données liées aux commentaires

- Contenu du commentaire
- Auteur du commentaire
- Partie partagée concernée
- Date de création
- Date de mise à jour ou de suppression logique éventuelle

---

## Finalités du traitement

Les données sont collectées pour les finalités suivantes :

### Authentification

Permettre aux utilisateurs de créer un compte, de se connecter, de se déconnecter et de sécuriser leur accès à l'application.

### Gestion du profil utilisateur

Permettre aux utilisateurs de disposer d'une identité visible dans l'application, notamment lorsqu'ils publient ou commentent une partie.

### Import et analyse de parties

Permettre aux utilisateurs d'importer des parties d'échecs au format PGN, de les consulter et d'obtenir une analyse structurée.

### Partage communautaire

Permettre aux utilisateurs de partager des revues de parties avec la communauté.

### Modération

Permettre aux administrateurs de masquer, valider ou modérer des contenus publiés.

### Sécurité

Prévenir les usages abusifs, protéger les sessions utilisateurs et limiter les accès non autorisés.

---

## Durée de conservation

Les données sont conservées uniquement pendant la durée nécessaire au fonctionnement de l'application.

### Compte utilisateur

Les données du compte sont conservées tant que le compte est actif.

En cas de désactivation, les données peuvent être conservées de manière limitée afin de préserver l'intégrité des contenus existants et les obligations de sécurité.

### Parties importées

Les parties sont conservées tant que l'utilisateur les conserve dans son espace personnel.

Une suppression logique peut être appliquée afin d'éviter une suppression physique immédiate en base de données.

### Parties partagées

Les parties partagées sont conservées tant qu'elles sont visibles ou nécessaires à la cohérence des échanges communautaires.

Une publication supprimée peut être marquée comme supprimée grâce au champ `deleted_at`.

### Commentaires

Les commentaires sont conservés tant qu'ils sont liés à une publication existante.

En cas de suppression, une suppression logique peut être utilisée afin de conserver la cohérence des discussions.

---

## Cookies et sessions

L'application utilise des cookies ou mécanismes équivalents pour gérer les sessions utilisateurs.

Ces cookies servent principalement à :

- Maintenir l'utilisateur connecté
- Sécuriser les échanges avec le serveur
- Vérifier l'identité de l'utilisateur
- Empêcher les accès non autorisés

Les cookies de session ne sont pas utilisés à des fins publicitaires.

Lorsque l'application utilise des cookies sensibles, ceux-ci doivent être configurés avec des options de sécurité adaptées :

- `HttpOnly`
- `Secure` en production
- `SameSite`
- Durée de vie limitée

---

## Google OAuth

L'application peut permettre la connexion via Google OAuth.

Dans ce cas, Freeview récupère uniquement les informations nécessaires à l'identification de l'utilisateur, comme :

- L'adresse email
- L'identifiant Google
- Le nom ou pseudo public si nécessaire

L'application ne récupère pas le mot de passe Google de l'utilisateur.

L'utilisateur peut révoquer l'accès OAuth depuis son compte Google.

---

## Droits utilisateur

Conformément au RGPD, l'utilisateur dispose des droits suivants :

### Droit d'accès

L'utilisateur peut demander à connaître les données personnelles détenues par l'application.

### Droit de rectification

L'utilisateur peut demander la correction de données incorrectes ou obsolètes.

### Droit à l'effacement

L'utilisateur peut demander la suppression de ses données personnelles, dans la limite des contraintes techniques et légales.

### Droit à la limitation

L'utilisateur peut demander la limitation temporaire du traitement de ses données.

### Droit d'opposition

L'utilisateur peut s'opposer à certains traitements de données, notamment les traitements non indispensables au fonctionnement du service.

### Droit à la portabilité

L'utilisateur peut demander une exportation de ses données dans un format lisible et exploitable.

---

## Suppression logique

L'application utilise une logique de suppression non destructive sur certaines entités.

Au lieu de supprimer immédiatement une donnée en base, un champ comme `deleted_at` peut être renseigné.

Cela permet de :

- Préserver la cohérence relationnelle des données
- Éviter les erreurs liées aux dépendances entre tables
- Masquer les contenus supprimés côté utilisateur
- Conserver une traçabilité minimale

Les contenus supprimés logiquement ne doivent plus être affichés dans les listes publiques ou personnelles, sauf cas d'administration ou d'audit.

---

## Contact

Pour toute demande liée aux données personnelles, l'utilisateur peut contacter l'administrateur du projet.

Contact projet :

```txt
Matthieu Ganet
Email : matthieuganet@gmail.com