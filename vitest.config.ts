import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        globals: true,
        environmentMatchGlobs: [
            // Use jsdom for files testing React components
            ['**/tests/**/*.test.tsx', 'jsdom'],
        ],
        environment: 'node', // default for everything else
        setupFiles: './vitest.setup.ts'
    },
});
