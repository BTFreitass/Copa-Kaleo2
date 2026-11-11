import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@copa/shared': fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)) } },
  test: { include: ['packages/**/*.test.ts', 'functions/src/**/*.test.ts'] },
});
