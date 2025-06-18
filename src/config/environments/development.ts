// Development environment configuration
import type { EnvironmentConfig } from '@/types/config.js';

export const developmentConfig: EnvironmentConfig = {
  logging: {
    level: 'debug',
    colorize: true,
    timestamps: true,
  },

  cache: {
    enabled: true,
    ttl: 3600, // 1 hour in development
  },

  download: {
    retries: 1,
    timeout: 10000, // 10 seconds
  },

  processing: {
    skipExisting: true,
    validateOutput: true,
  },
};
