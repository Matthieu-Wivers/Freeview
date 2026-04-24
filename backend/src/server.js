import app from './app.js';
import { env } from './utils/env.utils.js';

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`Freeview API listening on port ${env.port}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down Freeview API.`);
  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
