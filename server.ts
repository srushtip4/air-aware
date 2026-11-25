import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createAirAwareApp } from './src/app/createApp';
import { loadEnvConfig } from './src/lib/config';
import { createServerLogger } from './src/lib/security';

const PORT = 3000;

async function startServer(): Promise<void> {
  const logger = createServerLogger();
  const envConfig = loadEnvConfig();
  const app = createAirAwareApp({ envConfig, logger });

  if (envConfig.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.log({
      level: 'info',
      event: 'server_started',
      route: '/',
      detail: `AirAware listening on port ${PORT} (${envConfig.nodeEnv})`,
    });
  });
}

void startServer();
