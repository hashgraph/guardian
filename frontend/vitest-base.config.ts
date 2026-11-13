import { defineConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';

// Playwright starts the pointer at (0,0), so it hovers whatever a spec renders top left
// and fires real mouseenter events that a headless Karma page never had.
const moveMouseOutsidePage: BrowserCommand<[]> = async ({ page }) => {
    await page.mouse.move(-1, -1);
};

// In CI the counts go to the shared summary table through test_results/frontend.xml, so
// Vitest's own job summary would repeat them; its failure annotations are kept.
const ciReporters = [
    'default',
    ['junit', { outputFile: '../test_results/frontend.xml' }],
    ['github-actions', { jobSummary: { enabled: false } }],
] as const;

export default defineConfig({
    test: {
        // Jasmine removed every spy after each spec; the specs rely on it.
        restoreMocks: true,
        ...(process.env.GITHUB_ACTIONS ? { reporters: [...ciReporters] } : {}),
        browser: {
            // Karma's window was wider than Vitest's default 414 px frame; layout specs rely on it.
            viewport: { width: 1280, height: 720 },
            commands: { moveMouseOutsidePage },
        },
    },
});
