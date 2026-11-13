import { defineConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';

// Playwright starts the pointer at (0,0), so it hovers whatever a spec renders top left
// and fires real mouseenter events that a headless Karma page never had.
const moveMouseOutsidePage: BrowserCommand<[]> = async ({ page }) => {
    await page.mouse.move(-1, -1);
};

export default defineConfig({
    test: {
        // Jasmine removed every spy after each spec; the specs rely on it.
        restoreMocks: true,
        browser: {
            // Karma's window was wider than Vitest's default 414 px frame; layout specs rely on it.
            viewport: { width: 1280, height: 720 },
            commands: { moveMouseOutsidePage },
        },
    },
});
