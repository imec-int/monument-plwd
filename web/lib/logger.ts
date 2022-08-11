import pino from 'pino';
import pretty from 'pino-pretty';

const stream = pretty({
  levelFirst: true,
  colorize: true,
});

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'debug',
    formatters: {
      // Add level label instead of the numeric value
      level: (label) => {
        return { level: label };
      },
    },
  },
  stream
);
