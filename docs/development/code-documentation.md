# Freeview Code Documentation Standard

| Document information | Value |
|---|---|
| Project | Freeview |
| Document type | Development and code documentation standard |
| Scope | Frontend, backend, database access and automated tests |
| Intended audience | Developers, maintainers, reviewers and CDA jury members |
| Language | English |
| Status | Approved project standard |
| Last review | 10 July 2026 |

## 1. Purpose

This document defines the code documentation rules used in Freeview.

The objective is to keep the source code understandable, maintainable and reviewable without adding comments that simply repeat the implementation. Documentation must explain the **intent**, **contract**, **security implications**, **business rules**, **side effects** and **non-obvious technical decisions** of the code.

This standard applies to all new code and to any existing file modified during maintenance or feature development.

## 2. Documentation objectives

Code documentation in Freeview must help a developer answer the following questions quickly:

- What responsibility does this module have?
- What data does a public function accept and return?
- Which business rule is enforced?
- Which authorization or security boundary is involved?
- What side effects can occur?
- What errors can be produced and how are they handled?
- Why was this implementation chosen instead of a simpler alternative?
- Which assumptions must remain true when the code evolves?

Documentation complements the automated tests and technical documentation. It does not replace them.

## 3. General principles

### 3.1 Explain intent rather than syntax

Comments must explain **why** the code exists or **why** a particular decision is required.

Preferred:

```js
// Keep the ownership predicate inside the UPDATE statement to avoid a
// time-of-check/time-of-use gap between authorization and persistence.
```

Avoid:

```js
// Update the shared game.
```

### 3.2 Document public contracts

Exported functions, classes and complex modules should include a concise JSDoc block when their contract is not immediately obvious.

A useful contract may describe:

- accepted parameters;
- returned value;
- asynchronous behavior;
- expected side effects;
- known error conditions;
- security or authorization requirements.

### 3.3 Keep comments close to the decision

A comment must be placed immediately above the code it explains. Long explanations that concern an entire module belong at the top of the file or in the relevant technical documentation.

### 3.4 Keep documentation synchronized

A misleading comment is more dangerous than no comment. Any code change that invalidates a comment must update or remove that comment in the same commit.

### 3.5 Use English consistently

Source-code comments, JSDoc blocks, identifiers and technical documentation are written in English to keep the codebase consistent and accessible to external contributors.

## 4. Documentation by architectural layer

Freeview follows a layered backend architecture. Documentation expectations differ by layer.

### 4.1 Routes

Routes should remain thin. Comments are only needed when route ordering, middleware composition or compatibility behavior is not obvious.

Document when relevant:

- middleware order;
- authentication or role requirements;
- compatibility aliases;
- request-size or rate-limit constraints.

Business rules must not be documented in routes if they are implemented in services.

### 4.2 Controllers

Controllers adapt HTTP requests and responses. Documentation should describe non-obvious request mapping, streaming behavior or response semantics.

Document when relevant:

- mapping between HTTP fields and service parameters;
- status-code decisions;
- streaming or Server-Sent Events behavior;
- cookie creation or deletion;
- intentionally hidden error details.

### 4.3 Services

Services contain the application business rules and require the strongest level of documentation.

Document when relevant:

- validation rules;
- ownership checks;
- role and visibility rules;
- business invariants;
- idempotency or duplicate prevention;
- asynchronous workflows;
- resource limits;
- reasons for soft deletion;
- compatibility normalization.

### 4.4 Repositories

Repositories isolate database access. Comments must explain persistence decisions that are not obvious from the SQL alone.

Document when relevant:

- ownership or authorization predicates enforced in SQL;
- soft-delete predicates;
- moderation and visibility filters;
- JSONB serialization and normalization;
- transaction boundaries;
- concurrency protection;
- static SQL fragments used after allowlist validation;
- row-to-domain mapping decisions.

Comments must never be used to justify unsafe string interpolation. User-controlled values must remain parameterized.

### 4.5 Middlewares

Security and error middlewares must document their trust boundaries and failure behavior.

Document when relevant:

- accepted authentication sources;
- trusted-proxy assumptions;
- fail-open or fail-closed behavior;
- secret comparison strategy;
- production information-disclosure rules;
- rate-limit scope;
- middleware ordering requirements.

### 4.6 Frontend services and utilities

Frontend documentation should focus on application contracts rather than React syntax.

Document when relevant:

- API response normalization;
- authentication-cookie behavior;
- backwards-compatible payload aliases;
- transformation of review or PGN data;
- pure domain rules;
- fallbacks for incomplete analysis data;
- error propagation to the user interface.

### 4.7 Tests

Tests should be readable through descriptive suite and test names. Comments are reserved for setup or assertions whose purpose would otherwise be unclear.

A test comment may explain:

- why a mock is required;
- the security risk represented by a payload;
- why a boundary value was selected;
- a regression linked to a previously observed defect.

Comments must not describe assertions that are already self-explanatory.

## 5. JSDoc conventions

JSDoc is recommended for exported functions, classes and complex internal functions.

### 5.1 Function example

```js
/**
 * Creates a shared review for a game owned by the authenticated user.
 *
 * @param {string} userId Authenticated user identifier.
 * @param {object} payload Untrusted request payload to validate and normalize.
 * @returns {Promise<object>} Persisted shared review.
 * @throws {Error} When the game does not exist, is not owned by the user,
 * or the payload violates a business rule.
 */
export async function createSharedGame(userId, payload) {
  // ...
}
```

### 5.2 Class example

```js
/**
 * Bounded FIFO queue used to limit concurrent Stockfish analyses.
 *
 * The queue protects CPU and memory by rejecting new work after the pending
 * capacity has been reached.
 */
export class AnalysisQueue {
  // ...
}
```

### 5.3 When JSDoc is unnecessary

JSDoc is not required for:

- trivial private helpers whose behavior is obvious;
- React event handlers with a clear name and no complex side effects;
- simple getters or field mappers;
- functions already fully explained by their type, name and implementation.

## 6. Security-sensitive documentation

Security-related comments must describe the protection being enforced without disclosing secrets or operational values.

The following decisions should be documented when present:

- authentication and authorization checks;
- distinction between `USER` and `ADMIN` permissions;
- gateway or reverse-proxy trust boundaries;
- JWT issuer, audience and expiration constraints;
- password hashing decisions;
- generic authentication errors that prevent account enumeration;
- request body-size limits;
- rate limiting;
- parameterized SQL queries;
- ownership predicates;
- moderation and soft-deletion rules;
- production error sanitization;
- allowed URL protocols and other input allowlists.

Never include the following in comments:

- passwords;
- tokens;
- secret values;
- private keys;
- internal production addresses that are not already public configuration;
- personal data copied from the database.

## 7. Representative documented files

The following files are maintained as representative examples of the Freeview documentation standard:

| Layer | File | Main documented concerns |
|---|---|---|
| Application composition | `backend/src/app.js` | Middleware order, gateway boundary, body-size limit, rate limiting and route composition |
| Security middleware | `backend/src/middlewares/security.middleware.js` | Constant-time secret comparison, localhost administration and fail-closed access |
| Error handling | `backend/src/middlewares/error.middleware.js` | Safe production responses, development diagnostics and centralized error translation |
| Abuse control | `backend/src/middlewares/rateLimit.middleware.js` | Global request-limiting policy and standardized response headers |
| Authentication service | `backend/src/services/auth.service.js` | Input validation, bcrypt hashing, JWT claims and non-enumerating login errors |
| Analysis queue | `backend/src/services/queue.service.js` | Bounded asynchronous execution and compute-resource protection |
| Shared-review service | `backend/src/services/sharedGame.service.js` | JSON validation, ownership, visibility, moderation and soft deletion |
| Data access | `backend/src/repositories/sharedGame.repository.js` | Parameterized SQL, viewer-aware access rules and row mapping |
| Frontend transport | `frontend/src/services/apiClient.js` | Cookie credentials, request encoding, response parsing and API errors |
| Frontend domain logic | `frontend/src/utils/sharedReview.js` | Review compatibility, summary generation, accuracy and critical-move rules |

These files are representative evidence, not an exhaustive list. Other files must follow the same standard whenever their behavior is security-sensitive, business-critical or non-obvious.

## 8. Comments to avoid

The following comment styles are not accepted because they reduce readability or create maintenance noise.

### 8.1 Repeating the instruction

```js
// Set loading to true.
setLoading(true);
```

### 8.2 Restating the function name

```js
// Deletes a comment.
export async function deleteComment() {
  // ...
}
```

### 8.3 Preserving obsolete code in comments

```js
// const result = oldImplementation();
```

Obsolete code must be removed. Git history is the source of truth for previous versions.

### 8.4 Using comments instead of clear naming

Prefer:

```js
const isOwnedByCurrentUser = sharedGame.userId === userId;
```

Avoid:

```js
const value = sharedGame.userId === userId; // True when owned by user.
```

### 8.5 Writing unverified statements

Comments must describe actual behavior. They must not claim that a component is secure, transactional or idempotent unless the implementation and tests demonstrate it.

## 9. Code-review checklist

The reviewer must verify the following points before approving a change:

- [ ] Public and exported contracts are documented when necessary.
- [ ] Business rules are explained in the service layer.
- [ ] Security-sensitive ordering and authorization decisions are explicit.
- [ ] Non-obvious SQL predicates and soft-delete behavior are explained.
- [ ] Asynchronous side effects and failure behavior are understandable.
- [ ] Comments do not duplicate obvious code.
- [ ] Comments contain no secrets or personal data.
- [ ] Documentation matches the current implementation.
- [ ] New or changed behavior is covered by automated tests.
- [ ] Related architecture, security or deployment documentation is updated when required.

## 10. Definition of done

A development task is considered complete only when:

1. the implementation follows the project architecture and naming conventions;
2. critical or non-obvious code is documented according to this standard;
3. automated tests cover the expected behavior and relevant error cases;
4. security-sensitive changes include authorization and input-validation tests;
5. the frontend production build succeeds when frontend code is affected;
6. the CI pipeline succeeds;
7. obsolete comments and dead code have been removed;
8. related technical documentation has been updated.

## 11. Verification commands

Run the relevant validation commands before opening or merging a pull request.

### Backend

```bash
cd backend
npm ci
npm run test
```

### Frontend

```bash
cd frontend
npm ci
npm run test
npm run build
```

The successful local output or the corresponding GitHub Actions run should be retained as project evidence.

## 12. CDA competency traceability

This standard contributes to the CDA competency concerning the development of secure business components in a defensive style and the documentation of source code in English.

The evidence is based on the combination of:

- documented critical source files;
- layered separation between routes, controllers, services, repositories and middlewares;
- server-side input validation;
- authentication and authorization controls;
- parameterized SQL access;
- controlled asynchronous processing;
- automated unit and security tests;
- test and CI results;
- the candidate's ability to explain the documented decisions during the technical presentation.

Code comments alone do not validate the complete competency. They provide maintainability and traceability evidence that must remain consistent with the implementation and test results.

## 13. Related documentation

This document should be read together with:

- `README.md`;
- `docs/diagrams/architecture-technique.md`;
- `docs/diagrams/database.md`;
- `docs/security/security.md`;
- `docs/security/rgpd.md`;
- `docs/security/accessibility.md`;
- `docs/tests/plan-tests-fonctionnels.md`;
- `docs/deployment/deployment-guide.md`;
- `docs/deployment/backup-restore.md`;
- `docs/deployment/rollback.md`.

---

**Maintenance rule:** any architectural, security or persistence change that makes this document inaccurate must update it in the same pull request.