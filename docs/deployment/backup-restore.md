# Sauvegarde et restauration

## Objectif

Ce document décrit la procédure de sauvegarde et de restauration de la base PostgreSQL de Freeview.

La base contient les utilisateurs, comptes d’authentification, profils, parties importées, publications, commentaires, likes, signalements et actions de modération.

## Quand faire une sauvegarde

Créer une sauvegarde avant :

- un déploiement en production ;
- une migration ;
- une correction SQL manuelle ;
- une modification de schéma ;
- une opération sur un volume Docker ;
- un rollback.

## Sauvegarde complète

```bash
docker exec freeview-db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > freeview-backup.sql
```

## Sauvegarde datée

```bash
docker exec freeview-db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > freeview-backup-$(date +%Y-%m-%d-%H%M).sql
```

## Vérifier la sauvegarde

```bash
ls -lh freeview-backup-*.sql
head -n 20 freeview-backup.sql
tail -n 20 freeview-backup.sql
```

## Export du schéma uniquement

```bash
docker exec freeview-db sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --schema-only --no-owner --no-privileges' > freeview_schema.sql
```

Ce fichier ne contient pas les données applicatives, seulement la structure SQL.

## Restauration simple

```bash
cat freeview-backup.sql | docker exec -i freeview-db sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

## Restauration sécurisée

```bash
docker stop freeview-api

docker exec freeview-db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > freeview-before-restore-$(date +%Y-%m-%d-%H%M).sql

cat freeview-backup.sql | docker exec -i freeview-db sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'

docker start freeview-api
```

## Vérifications après restauration

```bash
docker logs freeview-api --tail=100
curl http://localhost:3000/api/health
```

Vérifier ensuite :

```txt
[ ] La connexion fonctionne.
[ ] La page Community charge les publications.
[ ] Les détails de publication sont accessibles.
[ ] Les commentaires sont visibles.
[ ] Les pages admin fonctionnent.
[ ] Aucun log critique n’apparaît.
```

## Stockage des sauvegardes

- Stocker les sauvegardes hors du conteneur.
- Conserver plusieurs versions.
- Ne pas exposer les sauvegardes publiquement.
- Protéger les sauvegardes car elles peuvent contenir des données personnelles.
- Supprimer les sauvegardes obsolètes.
- Garder une sauvegarde avant chaque déploiement important.

## Note sécurité

Les sauvegardes peuvent contenir des emails, usernames, commentaires, signalements, parties PGN et historiques de modération. Elles doivent être protégées avec le même niveau de sécurité que la base de production.
