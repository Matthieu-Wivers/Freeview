# Freeview

Freeview is a full-stack chess web application that allows users to import, analyze, save and share chess games in PGN format. The project includes a community space where users can publish reviewed games, comment, like posts, report inappropriate content and interact around chess analysis.

The application was developed as a support project for the French professional title "Concepteur Développeur d'Applications" (CDA). It demonstrates a complete software development cycle: requirements analysis, frontend development, backend API design, relational database modeling, authentication, authorization, automated testing, Docker-based deployment and CI/CD automation.

## Table of contents

1. Project overview
2. Main features
3. Architecture
4. Repository structure
5. Technology stack
6. Local installation
7. Environment variables
8. Running the application
9. Automated tests
10. CI/CD pipeline
11. Docker deployment
12. Production maintenance
13. Security
14. Database overview
15. API overview
16. CDA skills coverage
17. Known limitations
18. Future improvements
19. Author

## Project overview

Freeview is designed for chess players who want to review their games and share them with a community. A user can import a PGN, analyze the game, save it to their account and publish it as a community post. Other users can then view the shared game, comment on it, like it or report it. Administrators can moderate reported content and manage users.

The project is split into three main technical layers:

```txt
React / Vite frontend
        ↓
Node.js / Express API
        ↓
PostgreSQL database
```

The application follows a layered backend architecture:

```txt
Routes
  → Controllers
    → Services
      → Repositories
        → PostgreSQL
```

This separation improves maintainability, testability and security by keeping HTTP handling, business rules and SQL access clearly separated.

## Main features

### Public features

* View the home page.
* Access the community hub.
* View public shared games.
* Read visible comments.
* Open a shared game detail page.
* Access the privacy policy.

### Authenticated user features

* Register with email and password.
* Log in and log out.
* Authenticate with Google SSO if configured.
* Import a chess game in PGN format.
* Save games to the user account.
* Analyze a game through the Freeview review interface.
* Share a saved game with a title, description and visibility.
* Share a reviewed game with analysis data.
* Comment on shared games.
* Like and unlike shared games.
* Report a shared game or a comment.
* Manage the user profile.

### Administrator features

* Access administration pages.
* View reports.
* Process reports.
* Moderate shared games.
* Moderate comments.
* View moderation actions.
* Manage users, roles and account status.

## Architecture

### Global architecture

```txt
Browser
  → React application
  → Frontend API services
  → Express API
  → Controllers
  → Services
  → Repositories
  → PostgreSQL
```

### Frontend architecture

The frontend is built with React and Vite. It is organized around pages, reusable components, API services and utilities.

Main responsibilities:

* Render the chess analysis interface.
* Parse and display PGN data.
* Display the community hub and shared game cards.
* Handle authentication state.
* Protect private and admin routes.
* Call the backend API through centralized API clients.

### Backend architecture

The backend is built with Node.js and Express. It uses a layered architecture:

* `routes`: define HTTP endpoints.
* `controllers`: handle request and response objects.
* `services`: contain business logic and validation.
* `repositories`: execute SQL queries.
* `middlewares`: handle authentication, authorization, security and errors.
* `utils`: provide reusable helpers.

This structure makes the backend easier to maintain and easier to test.

### Database architecture

The database is PostgreSQL. It stores users, authentication accounts, profiles, ratings, imported games, shared games, comments, likes, reports and moderation actions.

The schema uses UUID identifiers and relational constraints to keep data consistent.

## Repository structure

```txt
Freeview/
  .github/
    workflows/
      docker-publish.yml

  backend/
    src/
      controllers/
      middlewares/
      repositories/
      routes/
      services/
      utils/
      __tests__/
    test/
      setup/
    Dockerfile
    package.json
    vitest.config.js

  db/
    Dockerfile
    migrations/
    init.sql

  frontend/
    src/
      auth/
      components/
      data/
      engine/
      hooks/
      layout/
      pages/
      services/
      tests/
      utils/
      __tests__/
    package.json
    vitest.config.js
    vite.config.js

  Dockerfile
  docker-compose.yml
  nginx.conf
  README.md
```

## Technology stack

### Frontend

* React
* Vite
* React Router
* CSS
* chess.js
* react-chessboard
* Vitest
* Testing Library
* jsdom

### Backend

* Node.js
* Express
* PostgreSQL client `pg`
* bcryptjs
* jsonwebtoken
* Helmet
* express-rate-limit
* Vitest
* V8 coverage

### Database

* PostgreSQL
* UUID-based model
* SQL migrations
* Relational constraints
* Logical deletion for moderated or removed content

### Deployment and DevOps

* Docker
* Docker Compose
* Nginx
* Docker Hub
* GitHub Actions
* Cloudflare Tunnel in production environment
* CI/CD pipeline with separated jobs

## Local installation

### Prerequisites

Install the following tools:

```txt
Node.js 22
npm
Docker
Docker Compose
Git
```

Clone the repository:

```bash
git clone https://github.com/Matthieu-Wivers/Freeview.git
cd Freeview
```

## Environment variables

The project uses environment variables for secrets, database configuration, authentication and runtime limits.

Never commit real production secrets to the repository.

### Backend environment variables

Create a backend environment file if needed:

```bash
cp backend/.env.example backend/.env
```

Example backend variables:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgres://freeview:freeview@localhost:5432/freeview

AUTH_JWT_SECRET=replace-with-a-strong-secret-at-least-32-characters
AUTH_COOKIE_NAME=freeview_session
AUTH_COOKIE_MAX_AGE_SECONDS=604800

API_ADMIN_TOKEN=replace-with-a-strong-admin-token
INTERNAL_GATEWAY_TOKEN=replace-with-a-strong-internal-token

FRONTEND_ORIGIN=http://localhost:5173

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

### Frontend environment variables

Create a frontend environment file if needed:

```bash
cp frontend/.env.example frontend/.env
```

Example frontend variables:

```env
VITE_API_URL=http://localhost:3000/api
```

Depending on the local development setup, the frontend can also use a Vite proxy instead of a full API URL.

## Running the application

### Run the backend locally

```bash
cd backend
npm install
npm run dev
```

Default backend URL:

```txt
http://localhost:3000
```

Health endpoint:

```txt
GET /api/health
```

### Run the frontend locally

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL:

```txt
http://localhost:5173
```

### Run with Docker Compose

From the repository root:

```bash
docker compose up -d --build
```

Check running containers:

```bash
docker compose ps
```

Read logs:

```bash
docker compose logs -f
```

Stop the stack:

```bash
docker compose down
```

## Automated tests

The project includes automated unit tests for both backend and frontend.

The test strategy is split by responsibility:

```txt
Backend unit tests
  → services
  → middlewares
  → utils

Frontend unit tests
  → API clients
  → PGN utilities
  → shared review utilities
  → reusable UI components
```

The goal is to validate business rules and critical helpers without depending on the full production environment.

### Backend tests

Run backend tests:

```bash
cd backend
npm install
npm run test
```

The backend test suite covers:

* Authentication service.
* Email normalization.
* Password hashing behavior.
* JWT verification behavior.
* Game import validation.
* Shared game creation and update rules.
* Comment service rules.
* Like service rules.
* Report service rules.
* Moderation service rules.
* Admin user service rules.
* Queue service rules.
* Authentication middleware.
* Optional authentication middleware.
* Admin middleware.
* Security middleware.
* Error middleware.
* Request utilities.
* HTTP error utilities.
* FEN utilities.
* Score utilities.

Current backend unit test status:

```txt
Test files: 18 passed
Tests: 125 passed
```

### Frontend tests

Run frontend tests:

```bash
cd frontend
npm install
npm run test
```

The frontend test suite covers:

* API client behavior.
* Freeview API service wrappers.
* PGN parsing and formatting utilities.
* Shared review payload utilities.
* Accuracy summary component.
* Chess preview component.
* Shared game card component.

Current frontend unit test status:

```txt
Test files: 7 passed
Tests: 41 passed
```

### Coverage strategy

Coverage is scoped by test type.

For unit tests, the coverage configuration focuses on the files that are actually part of the unit test scope. Large pages, full user flows, Stockfish runtime integration and database repositories are better suited for integration or end-to-end tests.

Backend unit coverage focuses on:

```txt
src/services
src/middlewares
src/utils
```

Frontend unit coverage focuses on:

```txt
src/services/apiClient.js
src/services/freeviewApi.js
src/utils/pgn.js
src/utils/sharedReview.js
src/components/Analyse/AccuracySummary.jsx
src/components/community/ChessPreview.jsx
src/components/community/SharedGameCard.jsx
```

This avoids mixing unit test coverage with integration coverage.

## CI/CD pipeline

The repository uses a GitHub Actions workflow:

```txt
.github/workflows/docker-publish.yml
```

The pipeline is separated into multiple jobs:

```txt
backend-unit-tests
frontend-unit-tests
frontend-build
docker-build-and-push
deploy-production
```

### Pipeline flow

```txt
Push or pull request
        ↓
Backend unit tests
        ↓
Frontend unit tests
        ↓
Frontend production build
        ↓
Docker image build and push
        ↓
Production deployment if enabled
```

The Docker build job depends on the test and build jobs. This means Docker images are only built and pushed if the automated test suite and the frontend production build pass.

### Docker image build

The workflow builds the following Docker images:

```txt
docker.io/<DOCKERHUB_USERNAME>/freeview
docker.io/<DOCKERHUB_USERNAME>/freeview-api
docker.io/<DOCKERHUB_USERNAME>/freeview-db
```

The workflow builds images for:

```txt
linux/amd64
```

The ARM64 build was intentionally removed because the GitHub Actions emulation layer can fail during `npm ci` with QEMU illegal instruction errors. The production server currently uses the AMD64 image target.

### Deployment behavior

Deployment is conditional.

The production deployment job only runs when all of these conditions are true:

```txt
event is push
branch is main
ENABLE_PRODUCTION_DEPLOY is true
```

If deployment is not enabled, the pipeline still validates the project by running tests, building the frontend and building Docker images.

### Required GitHub variables

Repository variables:

```txt
DOCKERHUB_USERNAME
ENABLE_PRODUCTION_DEPLOY
PROD_PROJECT_PATH
```

Example:

```txt
DOCKERHUB_USERNAME=matthieugan
ENABLE_PRODUCTION_DEPLOY=true
PROD_PROJECT_PATH=/opt/project/Freeview
```

### Required GitHub secrets

Repository secrets:

```txt
DOCKERHUB_TOKEN
PROD_SSH_HOST
PROD_SSH_USER
PROD_SSH_PORT
PROD_SSH_KEY
```

## Docker deployment

### Production containers

The production environment is expected to run the following services:

```txt
freeview-web
freeview-api
freeview-db
```

A Cloudflare Tunnel container can also be used to expose the application publicly without opening direct inbound ports.

### Production update

On the production server:

```bash
cd /opt/project/Freeview
git fetch origin main
git reset --hard origin/main
docker compose pull
docker compose up -d --remove-orphans
docker image prune -f
```

### Production health check

Check containers:

```bash
docker ps
```

Check API logs:

```bash
docker logs freeview-api --tail=100
```

Check API health:

```bash
curl http://localhost:3000/api/health
```

## Production maintenance

### View logs

```bash
docker logs freeview-web --tail=100
docker logs freeview-api --tail=100
docker logs freeview-db --tail=100
```

### Restart a service

```bash
docker restart freeview-api
```

### Open a PostgreSQL shell

```bash
docker exec -it freeview-db sh
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

### List database tables

```bash
docker exec freeview-db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
```

### Create a database backup

```bash
docker exec freeview-db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > freeview-backup.sql
```

### Restore a database backup

```bash
cat freeview-backup.sql | docker exec -i freeview-db sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

### Rollback strategy

A rollback can be performed by redeploying a previous Docker image tag or by reverting to a previous Git commit.

General rollback steps:

```txt
1. Identify the previous stable commit or Docker tag.
2. Revert the repository or change the image tag.
3. Run docker compose pull if using remote images.
4. Run docker compose up -d --remove-orphans.
5. Verify /api/health.
6. Check application logs.
```

## Security

Security is handled at several levels.

### Authentication

* Passwords are hashed with bcrypt.
* JWT tokens are signed with a strong secret.
* Authentication cookies have a controlled lifetime.
* Google SSO can be enabled through OAuth configuration.

### Authorization

* Private routes require an authenticated user.
* Admin routes require the `ADMIN` role.
* Users can only modify or delete their own resources unless they are administrators.
* Moderation endpoints are restricted to administrators.

### HTTP security

* Helmet is used to set secure HTTP headers.
* Express disables the `x-powered-by` header.
* API rate limiting is enabled.
* JSON payload size is controlled.
* Internal routes are protected with gateway or internal tokens where required.

### Database security

* SQL queries are parameterized.
* UUID identifiers are used for application entities.
* Foreign keys preserve relational integrity.
* Logical deletion keeps moderation history consistent.
* Moderation actions are recorded.

### Secrets management

Secrets must be stored in environment variables or GitHub Secrets.

Do not commit:

```txt
.env
.env.local
production secrets
private SSH keys
database credentials
OAuth client secrets
JWT secrets
admin tokens
```

## Database overview

Main tables:

```txt
users
auth_accounts
user_profiles
user_ratings
games
shared_games
game_likes
comments
reports
moderation_actions
```

### users

Stores the main application account:

```txt
id
email
role
disabled_at
created_at
updated_at
```

### auth_accounts

Stores authentication providers:

```txt
id
user_id
provider
provider_user_id
password_hash
created_at
updated_at
```

### user_profiles

Stores public profile information:

```txt
user_id
username
bio
avatar_url
created_at
updated_at
```

### games

Stores imported PGN games:

```txt
id
user_id
pgn
white_player
black_player
result
played_at
source
deleted_at
created_at
updated_at
```

### shared_games

Stores community publications:

```txt
id
game_id
user_id
title
description
visibility
review
analysis_summary
reviewed_at
moderation_status
deleted_at
created_at
updated_at
```

### comments

Stores comments on shared games:

```txt
id
shared_game_id
user_id
content
moderation_status
deleted_at
created_at
updated_at
```

### game_likes

Stores one like per user and shared game:

```txt
shared_game_id
user_id
created_at
```

### reports

Stores user reports:

```txt
id
reporter_id
shared_game_id
comment_id
reason
details
status
created_at
updated_at
```

### moderation_actions

Stores administrator actions:

```txt
id
admin_id
report_id
target_type
target_id
action
reason
created_at
```

## API overview

### Health

```txt
GET /api/health
```

### Authentication

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
PATCH /api/auth/me
GET /api/auth/google
GET /api/auth/google/callback
```

### Games

```txt
POST /api/games/import
GET /api/games/me
GET /api/games/:id
PATCH /api/games/:id
DELETE /api/games/:id
```

### Shared games

```txt
GET /api/shared-games
POST /api/shared-games
GET /api/shared-games/me
GET /api/shared-games/:id
PATCH /api/shared-games/:id
DELETE /api/shared-games/:id
```

### Comments

```txt
GET /api/shared-games/:id/comments
POST /api/shared-games/:id/comments
PATCH /api/comments/:id
DELETE /api/comments/:id
```

### Likes

```txt
GET /api/shared-games/:id/likes
POST /api/shared-games/:id/like
DELETE /api/shared-games/:id/like
```

### Reports

```txt
POST /api/reports
```

### Administration

```txt
GET /api/admin/users
PATCH /api/admin/users/:id/role
PATCH /api/admin/users/:id/status

GET /api/admin/reports
PATCH /api/admin/reports/:id

GET /api/admin/moderation/actions
PATCH /api/admin/shared-games/:id/moderation
PATCH /api/admin/comments/:id/moderation
```

### Stockfish analysis

```txt
POST /api/stockfish/analyze
POST /api/stockfish/analyze-stream
POST /api/stockfish/sandbox
```

The Stockfish API is centralized on the backend to control concurrency, queue size, calculation time and server resource usage.

## CDA skills coverage

This project was built to demonstrate the main skills expected for the professional title "Concepteur Développeur d'Applications".

### BC01: Develop a secure application

Covered by:

```txt
React frontend
user interfaces
routing
forms
API services
authentication flows
protected pages
admin pages
PGN analysis interface
community interface
```

### BC02: Design and develop a secure layered application

Covered by:

```txt
functional requirements
user stories
roles and permissions
layered backend architecture
REST API
PostgreSQL database
repositories
services
controllers
SQL constraints
data validation
business rules
```

### BC03: Prepare the deployment of a secure application

Covered by:

```txt
Docker configuration
Docker Compose environment
Nginx frontend serving
environment variables
automated backend tests
automated frontend tests
coverage reports
GitHub Actions CI/CD pipeline
Docker image build and push
conditional production deployment
production maintenance commands
backup and rollback strategy
```

## Known limitations

The current version is functional for the CDA project scope, but some areas can still be improved:

```txt
End-to-end tests are not yet implemented.
API integration tests can be expanded with Supertest.
A complete accessibility audit has not yet been performed.
Advanced search and filtering can be improved.
Notifications are not implemented.
Stockfish analysis caching can be improved.
A full production monitoring stack is not yet implemented.
```

## Future improvements

Planned or possible improvements:

```txt
Add API integration tests.
Add Playwright end-to-end tests.
Add advanced community search.
Add notification system for comments and moderation.
Improve accessibility according to RGAA criteria.
Add player progression statistics.
Cache expensive Stockfish analyses.
Add release tags and changelog.
Add demo seed data for jury presentation.
Add monitoring with health checks and alerting.
```

## Development workflow

Recommended workflow:

```txt
1. Create a feature branch.
2. Implement the change.
3. Run backend tests.
4. Run frontend tests.
5. Run frontend build.
6. Commit with a clear message.
7. Open a pull request.
8. Let GitHub Actions validate the pipeline.
9. Merge only when checks pass.
```

Commands:

```bash
cd backend
npm run test

cd ../frontend
npm run test
npm run build
```

## Suggested Git ignore rules

The repository should ignore generated and sensitive files:

```gitignore
node_modules/
coverage/
dist/
.env
.env.*
!.env.example
```

## Author

Project developed by Matthieu GANET.

Repository:

```txt
https://github.com/Matthieu-Wivers/Freeview
```

Production target:

```txt
https://freeview.wivers.fr
```

## License

This project was developed as a professional training project. A license can be added later depending on the intended public distribution model.
