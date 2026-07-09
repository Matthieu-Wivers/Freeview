```txt
Freeview — Architecture technique

Client
    ↓
Frontend React / Vite
    ↓
Services API frontend
    ↓
Nginx Reverse Proxy
    ↓
API REST Express / Node.js
    ↓
Routes
    ↓
Middlewares
    ↓
Controllers
    ↓
Services
    ↓
Repositories
    ↓
PostgreSQL

Service métier externe :
Services d'analyse
    ↓
File d'attente d'analyse
    ↓
Stockfish
```