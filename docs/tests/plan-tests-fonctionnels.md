## Plan de tests fonctionnels

| ID | Fonctionnalité | Précondition | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|
| T01 | Inscription | Aucun compte | Créer un compte utilisateur | Le compte est créé et l’utilisateur peut se connecter | OK |
| T02 | Connexion | Compte existant | Saisir des identifiants valides | Une session utilisateur est ouverte | OK |
| T03 | Import PGN | Utilisateur connecté | Importer un fichier ou texte PGN valide | La partie est sauvegardée en base de données | OK |
| T04 | Partage de review | Partie analysée | Publier la review dans le hub communautaire | La publication est visible selon son statut de modération | OK |
| T05 | Commentaire | Utilisateur connecté | Poster un commentaire sur une partie partagée | Le commentaire apparaît sous la publication | OK |
| T06 | Like | Utilisateur connecté | Cliquer deux fois sur le bouton like | Un seul like est enregistré pour l’utilisateur | OK |
| T07 | Signalement | Utilisateur connecté | Signaler une publication | Un signalement est créé avec le statut attendu | OK |
| T08 | Accès admin reports | Utilisateur avec rôle USER | Tenter d’accéder à l’espace admin | L’accès est refusé | OK |
| T09 | Modération admin | Utilisateur avec rôle ADMIN | Masquer une publication signalée | Le statut de modération passe à `hidden` | OK |