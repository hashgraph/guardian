import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Jasmine removed every spy after each spec; the specs rely on it.
        restoreMocks: true,
    },
});
