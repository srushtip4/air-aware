import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createAirAwareApp } from './src/app/createApp';
import { loadEnvConfig } from './src/lib/config';
import { createServerLogger } from './src/lib/security';

const PORT = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  const logger = createServerLogger();
  const envConfig = loadEnvConfig();
  const app = createAirAwareApp({ envConfig, logger });

  if (envConfig.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const baseDir =
      path.basename(import.meta.dirname) === 'dist-server'
        ? path.resolve(import.meta.dirname, '..')
        : import.meta.dirname;
    const distDir = path.resolve(baseDir, 'dist');
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
