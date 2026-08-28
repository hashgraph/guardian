import assert from 'node:assert/strict';
import { MessageAPI, ModuleStatus } from '@guardian/interfaces';
import { loadAPI } from '../_handler-harness.mjs';

/**
 * DELETE_SCHEMAS skips any schema still referenced by a policy schema. These cover
 * what the caller is told about that: the per-schema outcome has to survive the JSON
 * hop, and a skipped schema has to be reported rather than counted as a success.
 */
describe('DELETE_SCHEMAS blocked-schema reporting', function () {
    // esmock re-imports the service module through @guardian/common; 2s is not enough.
    this.timeout(30000);

    const owner = { id: 'user-1', owner: 'did:owner', creator: 'did:owner' };

    // The schema the caller asked to delete.
    const target = {
        id: 'schema-1',
        iri: '#target',
        name: 'Target Schema',
        topicId: '0.0.10',
        status: ModuleStatus.DRAFT,
        document: { $id: '#target', properties: {} },
    };

    // A policy schema that still $refs the target, which is what blocks the delete.
    const blocking = {
        id: 'schema-2',
        iri: '#policy',
        name: 'Blocking Policy Schema',
        topicId: '0.0.10',
        status: ModuleStatus.DRAFT,
        document: { $id: '#policy', properties: { child: { $ref: '#target' } } },
    };

    async function runDelete() {
        let captured;
        // The handler fires RunFunctionAsync without awaiting it and returns the task
        // immediately, so hold on to the work and await it here.
        let work;
        const { handlers } = await loadAPI('../dist/api/schema.service.js', 'schemaAPI', {
            '@guardian/common': {
                DatabaseServer: class {
                    static async getSchemas(filter) {
                        // by-id lookup -> the requested schema
                        if (filter?.id?.$in) { return [target]; }
                        // child-def lookup -> no children in this fixture
                        if (filter?.iri?.$in) { return []; }
                        // dependency-scope lookup -> the blocking policy schema
                        return [blocking];
                    }
                },
                NewNotifier: {
                    create: async () => ({
                        start() {}, completed() {}, completedAndStart() {}, sendStatus() {},
                        finish() {}, addStep: () => ({ start() {}, complete() {} }),
                        createStep: () => ({ start() {}, complete() {} }),
                        result: (r) => { captured = r; },
                        fail() {},
                    }),
                },
                RunFunctionAsync: (fn, onError) => {
                    work = (async () => {
                        try { await fn(() => {}); } catch (e) { if (onError) { await onError(e); } throw e; }
                    })();
                    return work;
                },
            },
        });

        await handlers[MessageAPI.DELETE_SCHEMAS]({
            schemaIds: ['schema-1'], owner, task: { taskId: 't1' }, includeChildren: false,
        });
        await work;
        return captured;
    }

    it('reports a blocked schema instead of silently skipping it', async () => {
        const result = await runDelete();

        assert.ok(result, 'notifier.result must receive a payload');
        assert.ok(Array.isArray(result.errors), 'the payload carries an errors array');
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].name, 'Target Schema');
        assert.match(result.errors[0].error, /Blocking Policy Schema/);
    });

    it('carries the per-schema outcome in a JSON-serialisable shape', async () => {
        const result = await runDelete();

        // A Map serialises to {} over the message bus, so the caller learned nothing.
        assert.ok(Array.isArray(result.results), 'results must be an array, not a Map');
        assert.deepEqual(JSON.parse(JSON.stringify(result)).results, result.results);
    });
});
