# Procédure de rollback

## Objectif

Ce document décrit comment revenir à une version stable de Freeview si un déploiement provoque une régression.

Un rollback peut être nécessaire si le frontend ne charge plus, si l’API crash, si l’authentification est cassée, si la base est inaccessible, si une fonctionnalité critique ne fonctionne plus ou si une image Docker est invalide.

## Stratégies

Deux stratégies sont possibles :

```txt
1. Rollback Git
2. Rollback d’image Docker
```

## Checklist avant rollback

```txt
[ ] Identifier précisément le problème.
[ ] Lire les logs API.
[ ] Lire les logs web.
[ ] Lire les logs base de données.
[ ] Vérifier la dernière pipeline GitHub Actions réussie.
[ ] Identifier la dernière version stable.
[ ] Créer une sauvegarde de la base si les données peuvent être concernées.
```

Créer une sauvegarde de sécurité :

```bash
docker exec freeview-db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > freeview-before-rollback-$(date +%Y-%m-%d-%H%M).sql
```

## Vérifier les logs

```bash
docker logs freeview-api --tail=200
docker logs freeview-web --tail=200
docker logs freeview-db --tail=200
```

## Rollback Git

```bash
cd /opt/project/Freeview
git log --oneline
git reset --hard <stable_commit_hash>
docker compose up -d --build --remove-orphans
docker image prune -f
```

## Rollback Docker

Si le serveur déploie des images préconstruites :

```bash
docker compose pull
docker compose up -d --remove-orphans
```

Si nécessaire, modifier le tag d’image dans la configuration Compose avant de relancer.

## Rollback base de données

À utiliser seulement si une migration ou correction SQL a introduit un problème.

```bash
cat freeview-backup.sql | docker exec -i freeview-db sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

## Vérifications après rollback

```txt
[ ] Les conteneurs sont démarrés.
[ ] L’API répond.
[ ] Le frontend charge.
[ ] La connexion fonctionne.
[ ] La page Community charge.
[ ] Le détail d’une publication charge.
[ ] L’import PGN fonctionne.
[ ] Les pages admin sont protégées.
[ ] Les logs ne montrent pas d’erreurs critiques.
```

Commandes :

```bash
docker ps
curl http://localhost:3000/api/health
docker logs freeview-api --tail=100
```

## Documentation de l’incident

Après un rollback, documenter :

- la cause du problème ;
- l’heure du déploiement ;
- la version déployée ;
- la version restaurée ;
- l’impact utilisateur ;
- si la base a été restaurée ou non ;
- les tests à ajouter ;
- la correction prévue.

## Intérêt CDA

Cette procédure démontre la préparation du déploiement, la gestion des risques, la sauvegarde avant opération critique, le retour arrière contrôlé et la validation post-déploiement.
