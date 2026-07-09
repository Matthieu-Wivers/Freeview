# Checklist de production

## Objectif

Cette checklist sert à vérifier Freeview avant et après un déploiement en production.

## Avant déploiement

```txt
[ ] Les tests unitaires backend passent.
[ ] Les tests unitaires frontend passent.
[ ] Le build frontend réussit.
[ ] La pipeline GitHub Actions est verte.
[ ] Aucun fichier `.env` n’est commité.
[ ] La configuration Docker Compose est valide.
[ ] Les variables d’environnement sont configurées.
[ ] Les GitHub Secrets sont configurés.
[ ] Une sauvegarde de la base existe.
[ ] La dernière version stable est identifiée.
```

## Commandes de validation locale

Backend :

```bash
cd backend
npm run test
```

Frontend :

```bash
cd frontend
npm run test
npm run build
```

Docker :

```bash
docker compose config
```

## Commandes de déploiement

```bash
cd /opt/project/Freeview
git fetch origin main
git reset --hard origin/main
docker compose pull
docker compose up -d --remove-orphans
docker image prune -f
```

## Après déploiement

```txt
[ ] Les conteneurs sont démarrés.
[ ] Le conteneur web est accessible.
[ ] Le conteneur API est accessible.
[ ] Le conteneur PostgreSQL est démarré.
[ ] L’endpoint /api/health retourne OK.
[ ] Les logs API ne montrent pas d’erreur critique.
[ ] La connexion fonctionne.
[ ] L’import PGN fonctionne.
[ ] La page Community fonctionne.
[ ] Le détail d’une publication fonctionne.
[ ] Les commentaires fonctionnent.
[ ] Les likes fonctionnent.
[ ] Les signalements fonctionnent.
[ ] Les pages admin sont protégées.
[ ] La modération admin fonctionne.
```

## Commandes utiles

```bash
docker ps
docker compose ps
curl http://localhost:3000/api/health
docker logs freeview-api --tail=100
docker logs freeview-web --tail=100
docker logs freeview-db --tail=100
```

## En cas d’échec

```txt
1. Ne pas supprimer les données.
2. Lire les logs.
3. Identifier si le problème vient du frontend, backend, DB ou réseau.
4. Si le problème est critique, effectuer un rollback.
5. Documenter l’incident.
6. Ajouter un test ou une vérification si possible.
```

## Preuves CDA

Conserver les captures suivantes :

```txt
GitHub Actions réussie
tests backend réussis
tests frontend réussis
conteneurs Docker en production
site en production
endpoint /api/health
```
