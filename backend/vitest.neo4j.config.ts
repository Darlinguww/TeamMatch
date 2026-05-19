import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

export default mergeConfig(baseConfig, defineConfig({
  test: {
    env: {
      RUN_E2E_NEO4J: 'true',
      NEO4J_TEST_URI: 'bolt://localhost:7687'
    }
  }
}));
