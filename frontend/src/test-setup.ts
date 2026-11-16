import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
    interface BrowserCommands {
        moveMouseOutsidePage: () => Promise<void>;
    }
}

beforeAll(() => commands.moveMouseOutsidePage());
