# Chess Review App

Frontend Vite + React pour analyser rapidement une partie d'échecs à partir d'un PGN.

## Fonctionnalités

- collage direct d'un PGN
- parsing des headers utiles
- échiquier interactif
- navigation coup par coup
- flèches clavier gauche / droite
- inversion de l'échiquier
- liste des coups cliquable
- suggestion du meilleur coup dans la position affichée
- test interactif d'un autre coup dans la position courante
- accuracy estimée pour les deux joueurs
- timeline d'évaluation

## Lancer le projet

```bash
npm install
npm run dev
```

## Stack

- React
- Vite
- chess.js
- react-chessboard

## Limite volontaire de cette version

Cette version fait une analyse heuristique locale, sans backend et sans Stockfish. C'est très bien pour un MVP visuel, pédagogique et interactif.

Si tu veux un rendu plus proche de Chess.com / Lichess, tu pourras ensuite brancher :

- un worker Stockfish côté front, ou
- un backend Node qui centralise les analyses plus profondes.
