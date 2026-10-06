import assert from 'node:assert/strict';
import { AIManager } from '../dist/ai-manager.js';
import { AISuggestionsDB } from '../dist/helpers/ai-suggestions-db.js';
import { PropertySuggestionConnect } from '../dist/helpers/property-suggestion-helper.js';

function silentLogger() {
    return { info: async () => {}, warn: async () => {}, error: async () => {} };
}

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

describe('AIManager.suggestProperties', () => {
    // Singletons, so stubbing here affects the manager
    const dbInstance = new AISuggestionsDB();
    const originalGetPolicyProperties = dbInstance.getPolicyProperties;
    const originalSuggest = PropertySuggestionConnect.suggest;

    afterEach(() => {
        dbInstance.getPolicyProperties = originalGetPolicyProperties;
        PropertySuggestionConnect.suggest = originalSuggest;
    });

    it('returns empty results without touching the DB or the model when the live schema has no fields (unsaved schema with no fields yet)', async () => {
        let dbCalled = false;
        let suggestCalled = false;
        dbInstance.getPolicyProperties = async () => { dbCalled = true; return []; };
        PropertySuggestionConnect.suggest = async () => { suggestCalled = true; return []; };

        const manager = new AIManager(silentLogger());
        const res = await manager.suggestProperties({
            schema: { fields: [] },
            fieldNames: ['someField'],
        });

        assert.deepEqual(res, { available: true, results: [] });
        assert.equal(dbCalled, false);
        assert.equal(suggestCalled, false);
    });

    it('returns empty results without touching the DB when fieldNames is empty', async () => {
        let dbCalled = false;
        dbInstance.getPolicyProperties = async () => { dbCalled = true; return []; };

        const manager = new AIManager(silentLogger());
        const res = await manager.suggestProperties({
            schema: { fields: [{ name: 'field1' }] },
            fieldNames: [],
        });

        assert.deepEqual(res, { available: true, results: [] });
        assert.equal(dbCalled, false);
    });

    it('answers from the live editor state with no schemaId at all (new, unsaved schema)', async () => {
        let requestedIwaVersion;
        dbInstance.getPolicyProperties = async (iwaVersion) => {
            requestedIwaVersion = iwaVersion;
            return [{ title: 'SomeProperty', description: 'desc' }];
        };
        let capturedFields;
        let capturedTargets;
        PropertySuggestionConnect.suggest = async (_model, fields, _properties, _name, _description, targets) => {
            capturedFields = fields;
            capturedTargets = targets;
            return targets.map((name) => ({ fieldName: name, candidates: [] }));
        };

        const manager = new AIManager(silentLogger());
        const res = await manager.suggestProperties({
            // No schemaId: the request must still be answered from `schema`.
            schema: { name: 'NewSchema', fields: [{ name: 'field1', title: 'Field One' }] },
            fieldNames: ['field1'],
        });

        assert.equal(res.available, true);
        assert.deepEqual(res.results, [{ fieldName: 'field1', candidates: [] }]);
        assert.deepEqual(capturedTargets, ['field1']);
        assert.equal(capturedFields.length, 1);
        assert.equal(capturedFields[0].name, 'field1');
        assert.equal(requestedIwaVersion, '1.0.0');
    });

    it('includes a field that only exists in the live state (added in the editor but never saved)', async () => {
        dbInstance.getPolicyProperties = async () => [{ title: 'SomeProperty' }];
        let capturedFields;
        PropertySuggestionConnect.suggest = async (_model, fields, _properties, _name, _description, targets) => {
            capturedFields = fields;
            return targets.map((name) => ({ fieldName: name, candidates: [] }));
        };

        const manager = new AIManager(silentLogger());
        const res = await manager.suggestProperties({
            schemaId: 'saved-schema-id',
            schema: {
                name: 'SavedSchema',
                fields: [
                    { name: 'savedField' },
                    { name: 'unsavedField', title: 'Not persisted yet' },
                ],
            },
            fieldNames: ['unsavedField'],
        });

        assert.equal(res.available, true);
        assert.deepEqual(res.results, [{ fieldName: 'unsavedField', candidates: [] }]);
        assert.equal(capturedFields.length, 2);
        assert.ok(capturedFields.some((field) => field.name === 'unsavedField'));
    });

    it('drops requested field names that are not present in the live field list', async () => {
        let dbCalled = false;
        dbInstance.getPolicyProperties = async () => { dbCalled = true; return []; };

        const manager = new AIManager(silentLogger());
        const res = await manager.suggestProperties({
            schema: { fields: [{ name: 'field1' }] },
            fieldNames: ['fieldThatDoesNotExist'],
        });

        assert.deepEqual(res, { available: true, results: [] });
        assert.equal(dbCalled, false);
    });

    it('uses IWA v3 policy properties when the live schema is tagged as v3', async () => {
        let requestedIwaVersion;
        dbInstance.getPolicyProperties = async (iwaVersion) => {
            requestedIwaVersion = iwaVersion;
            return [];
        };
        PropertySuggestionConnect.suggest = async (_model, _fields, _properties, _name, _description, targets) =>
            targets.map((name) => ({ fieldName: name, candidates: [] }));

        const manager = new AIManager(silentLogger());
        await manager.suggestProperties({
            schema: { iwaVersion: '3.0.0', fields: [{ name: 'field1' }] },
            fieldNames: ['field1'],
        });

        assert.equal(requestedIwaVersion, '3.0.0');
    });
});
