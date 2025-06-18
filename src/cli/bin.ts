#!/usr/bin/env node

// CLI executable entry point
import { main } from './index.js';

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
