// Production environment configuration
import type { EnvironmentConfig } from '@/types/config.js';

export const productionConfig: EnvironmentConfig = {
  logging: {
    level: 'info',
    colorize: false,
    timestamps: true,
  },

  cache: {
    enabled: true,
    ttl: 86400, // 24 hours in production
  },

  download: {
    retries: 3,
    timeout: 30000, // 30 seconds
  },

  processing: {
    skipExisting: false,
    validateOutput: true,
  },
};
