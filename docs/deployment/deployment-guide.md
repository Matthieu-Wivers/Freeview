# Guide de déploiement

## Objectif

Ce document explique comment Freeview est déployé et maintenu dans un environnement de production.

Freeview est une application full stack conteneurisée composée de trois services principaux : un conteneur web frontend, un conteneur API backend et un conteneur PostgreSQL. Un conteneur Cloudflare Tunnel peut également être utilisé pour exposer l’application publiquement.

## Architecture de production

```txt
Navigateur utilisateur
    |
    v
Cloudflare Tunnel / reverse proxy
    |
    v
Conteneur web Nginx
    |
    v
Application React statique
    |
    v
Conteneur API Express
    |
    v
Conteneur PostgreSQL
```

## Services attendus

```txt
freeview-web
freeview-api
freeview-db
freeview-cloudflared
```

Les noms exacts peuvent varier selon la configuration Docker Compose.

## Prérequis serveur

- Docker.
- Docker Compose.
- Git.
- Accès SSH.
- Accès aux logs.
- Espace de stockage pour les sauvegardes.

## Variables d’environnement

Les secrets de production ne doivent jamais être commités. Ils doivent être stockés dans l’environnement serveur, dans Docker Compose ou dans GitHub Secrets.

### Backend

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://freeview:replace-password@freeview-db:5432/freeview
AUTH_JWT_SECRET=replace-with-a-strong-production-secret
AUTH_COOKIE_NAME=freeview_session
AUTH_COOKIE_MAX_AGE_SECONDS=604800
API_ADMIN_TOKEN=replace-with-a-strong-admin-token
INTERNAL_GATEWAY_TOKEN=replace-with-a-strong-internal-token
FRONTEND_ORIGIN=https://freeview.wivers.fr
STOCKFISH_PATH=/usr/local/bin/stockfish
STOCKFISH_THREADS=1
STOCKFISH_HASH_MB=128
MAX_CONCURRENT_ANALYSES=1
MAX_QUEUE_SIZE=16
MAX_STREAM_POSITIONS=160
DEFAULT_MOVETIME_MS=120
MAX_MULTIPV=3
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

### Frontend

```env
VITE_API_URL=https://freeview.wivers.fr/api
```

## GitHub Actions

Le workflow est défini dans :

```txt
.github/workflows/docker-publish.yml
```

La pipeline contient les jobs suivants :

```txt
backend-unit-tests
frontend-unit-tests
frontend-build
docker-build-and-push
deploy-production
```

Le déploiement ne s’exécute que si :

```txt
l’événement est un push
la branche est main
ENABLE_PRODUCTION_DEPLOY vaut true
tous les jobs précédents ont réussi
```

## Images Docker

La pipeline construit les images suivantes :

```txt
docker.io/<DOCKERHUB_USERNAME>/freeview
docker.io/<DOCKERHUB_USERNAME>/freeview-api
docker.io/<DOCKERHUB_USERNAME>/freeview-db
```

La cible de build est :

```txt
linux/amd64
```

Le build ARM64 a été retiré pour éviter les erreurs QEMU pendant `npm ci`.

## Déploiement manuel

Connexion au serveur :

```bash
ssh user@server
```

Aller dans le projet :

```bash
cd /opt/project/Freeview
```

Mettre à jour le code :

```bash
git fetch origin main
git reset --hard origin/main
```

Récupérer les images :

```bash
docker compose pull
```

Relancer la stack :

```bash
docker compose up -d --remove-orphans
```

Nettoyer les images inutilisées :

```bash
docker image prune -f
```

## Premier déploiement

```bash
cd /opt/project
git clone https://github.com/Matthieu-Wivers/Freeview.git
cd Freeview
docker compose up -d --build
```

Vérifier les conteneurs :

```bash
docker compose ps
```

Lire les logs :

```bash
docker compose logs -f
```

## Vérifications après déploiement

```bash
docker ps
docker logs freeview-api --tail=100
docker logs freeview-web --tail=100
docker logs freeview-db --tail=100
curl http://localhost:3000/api/health
```

Résultat attendu :

```json
{
  "status": "ok"
}
```

## Commandes de maintenance

```bash
docker restart freeview-api
docker restart freeview-web
docker restart freeview-db
docker logs freeview-api --tail=200
docker logs -f freeview-api
docker images
docker image prune -f
```

## Accès PostgreSQL

```bash
docker exec -it freeview-db sh
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Lister les tables :

```sql
\dt
```

Décrire une table :

```sql
\d users
```

## Export du schéma

```bash
docker exec freeview-db sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --schema-only --no-owner --no-privileges' > freeview_schema.sql
```

## Sauvegarde

Créer une sauvegarde :

```bash
docker exec freeview-db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > freeview-backup.sql
```

Sauvegarde datée :

```bash
docker exec freeview-db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > freeview-backup-$(date +%Y-%m-%d-%H%M).sql
```

## Restauration

```bash
cat freeview-backup.sql | docker exec -i freeview-db sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Pour plus de sécurité :

```bash
docker stop freeview-api
cat freeview-backup.sql | docker exec -i freeview-db sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker start freeview-api
```

## Rollback

Processus général :

```txt
1. Identifier la dernière version stable.
2. Sauvegarder la base si nécessaire.
3. Revenir au commit ou à l’image stable.
4. Relancer les conteneurs.
5. Vérifier /api/health.
6. Vérifier les logs.
7. Tester les parcours critiques.
```

Rollback Git :

```bash
cd /opt/project/Freeview
git log --oneline
git reset --hard <stable_commit_hash>
docker compose up -d --build --remove-orphans
```

## Checklist post-déploiement

```txt
[ ] Les conteneurs sont démarrés.
[ ] Le frontend est accessible.
[ ] L’API répond.
[ ] La base de données est accessible depuis l’API.
[ ] /api/health retourne OK.
[ ] La connexion fonctionne.
[ ] L’import PGN fonctionne.
[ ] La page Community fonctionne.
[ ] Le détail d’une publication fonctionne.
[ ] Les commentaires fonctionnent.
[ ] Les likes fonctionnent.
[ ] Les signalements fonctionnent.
[ ] Les pages admin sont protégées.
[ ] Les logs ne montrent pas d’erreur critique.
```

## Sécurité

- Ne pas commiter de fichier `.env`.
- Utiliser des secrets forts.
- Stocker les secrets dans GitHub Secrets ou dans l’environnement serveur.
- Ne pas exposer PostgreSQL publiquement.
- Garder la base accessible uniquement via le réseau Docker interne.
- Exposer uniquement le point d’entrée web.
- Vérifier les logs après chaque déploiement.
- Sauvegarder la base avant toute opération risquée.

## Preuves CDA

Captures recommandées :

```txt
GitHub Actions verte
tests backend réussis
tests frontend réussis
conteneurs Docker en production
site en production
endpoint /api/health
schéma de base de données
```
