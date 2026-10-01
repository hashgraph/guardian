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
