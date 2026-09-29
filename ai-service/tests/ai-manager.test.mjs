import assert from 'node:assert/strict';
import { AIManager } from '../dist/ai-manager.js';

describe('AIManager.remainingModelTimeoutMs', () => {
    it('returns the full budget when nothing was spent yet', () => {
        assert.equal(AIManager.remainingModelTimeoutMs(300_000, 1_000, 1_000), 300_000);
    });

    it('subtracts the time elapsed since the request started', () => {
        assert.equal(AIManager.remainingModelTimeoutMs(300_000, 1_000, 15_000), 286_000);
    });

    it('reaches zero exactly when the budget is spent', () => {
        assert.equal(AIManager.remainingModelTimeoutMs(300_000, 1_000, 301_000), 0);
    });

    it('goes negative once the gateway deadline has passed', () => {
        assert.ok(AIManager.remainingModelTimeoutMs(300_000, 1_000, 400_000) < 0);
    });

    it('defaults `now` to the current time', () => {
        const startedAt = Date.now() - 5_000;
        const remaining = AIManager.remainingModelTimeoutMs(300_000, startedAt);
        assert.ok(remaining > 290_000 && remaining <= 295_000);
    });
});

describe('AIManager model selection', () => {
    const savedEnv = {
        LLM_MODEL: process.env.LLM_MODEL,
        GPT_VERSION: process.env.GPT_VERSION
    };
    const logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

    // `process.env.X = undefined` stores the string "undefined"; delete instead.
    function setEnv(name, value) {
        if (value === undefined) {
            delete process.env[name];
        } else {
            process.env[name] = value;
        }
    }

    function createManager({ LLM_MODEL, GPT_VERSION } = {}) {
        setEnv('LLM_MODEL', LLM_MODEL);
        setEnv('GPT_VERSION', GPT_VERSION);
        return new AIManager(logger);
    }

    after(() => {
        setEnv('LLM_MODEL', savedEnv.LLM_MODEL);
        setEnv('GPT_VERSION', savedEnv.GPT_VERSION);
    });

    it('falls back to gpt-5-nano when neither LLM_MODEL nor GPT_VERSION is set', () => {
        // Without this fallback ChatOpenAI silently sends its own "gpt-3.5-turbo" default.
        const manager = createManager();
        assert.equal(manager.model.model, 'gpt-5-nano');
    });

    it('uses GPT_VERSION when LLM_MODEL is not set', () => {
        const manager = createManager({ GPT_VERSION: 'gpt-4o-mini' });
        assert.equal(manager.model.model, 'gpt-4o-mini');
    });

    it('gives LLM_MODEL precedence over GPT_VERSION', () => {
        const manager = createManager({ LLM_MODEL: 'google/gemma-4-12b-qat', GPT_VERSION: 'gpt-4o-mini' });
        assert.equal(manager.model.model, 'google/gemma-4-12b-qat');
    });

    it('sends temperature 0 to a model set through LLM_MODEL', () => {
        // The temperature support used to be decided from GPT_VERSION, so this model was
        // judged on the gpt-5-nano default and never got temperature: 0.
        const manager = createManager({ LLM_MODEL: 'google/gemma-4-12b-qat' });
        assert.equal(manager.model.temperature, 0);
    });

    it('keeps temperature off for a reasoning model set through LLM_MODEL', () => {
        const manager = createManager({ LLM_MODEL: 'o3', GPT_VERSION: 'gpt-4o-mini' });
        assert.equal(manager.model.temperature, undefined);
    });

    it('keeps temperature off for gpt-5-nano, the default model', () => {
        const manager = createManager();
        assert.equal(manager.model.temperature, undefined);
    });
});
