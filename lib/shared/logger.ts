import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});

// Child loggers por módulo — añaden contexto automáticamente
export const authLogger       = logger.child({ module: 'auth' });
export const monitorLogger    = logger.child({ module: 'monitor' });
export const scraperLogger    = logger.child({ module: 'scraper' });
export const workerLogger     = logger.child({ module: 'worker' });
export const notifierLogger   = logger.child({ module: 'notifier' });
