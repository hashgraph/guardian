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

    // A child of the target, and a policy schema that blocks the CHILD rather than the
    // target itself - the case where includeChildren decides whether it matters.
    const child = {
        id: 'schema-3',
        iri: '#child',
        name: 'Child Schema',
        topicId: '0.0.10',
        status: ModuleStatus.DRAFT,
        document: { $id: '#child', properties: {} },
    };

    const blockingChild = {
        id: 'schema-4',
        iri: '#other',
        name: 'Unrelated Policy Schema',
        topicId: '0.0.10',
        status: ModuleStatus.DRAFT,
        document: { $id: '#other', properties: { c: { $ref: '#child' } } },
    };

    // deleteSchema nests steps under the step it is handed, so the stub has to nest too.
    const step = () => ({
        start() {}, complete() {}, completed() {}, completedAndStart() {}, sendStatus() {},
        finish() {}, fail() {}, addStep: () => step(), createStep: () => step(),
    });

    async function runDelete({
        requested = [target],
        children = [],
        scope = [blocking],
        includeChildren = false,
    } = {}) {
        let captured;
        // The handler fires RunFunctionAsync without awaiting it and returns the task
        // immediately, so hold on to the work and await it here.
        let work;
        const { handlers } = await loadAPI('../dist/api/schema.service.js', 'schemaAPI', {
            '@guardian/common': {
                DatabaseServer: class {
                    static async getSchemas(filter) {
                        // by-id lookup -> the requested schemas
                        if (filter?.id?.$in) { return requested; }
                        // child-def lookup -> the children they $ref
                        if (filter?.iri?.$in) { return children; }
                        // dependency-scope lookup -> what could block a delete
                        return scope;
                    }
                },
                NewNotifier: {
                    create: async () => ({
                        start() {}, completed() {}, completedAndStart() {}, sendStatus() {},
                        finish() {}, addStep: () => step(), createStep: () => step(),
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
            schemaIds: requested.map(schema => schema.id), owner, task: { taskId: 't1' }, includeChildren,
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

    it('says nothing about a blocked child that was never a delete candidate', async () => {
        // includeChildren off: the child is not up for deletion, so a policy schema
        // holding a reference to it is not something the caller needs a toast about.
        const parent = { ...target, document: { $id: '#target', properties: { c: { $ref: '#child' } } } };
        const result = await runDelete({
            requested: [parent],
            children: [child],
            scope: [blocking, blockingChild],
            includeChildren: false,
        });

        assert.deepEqual(result.errors.map(e => e.name), ['Target Schema'],
            'the blocked child must not be reported when children are not being deleted');
    });

    it('reports that same blocked child once children are in scope', async () => {
        const parent = { ...target, document: { $id: '#target', properties: { c: { $ref: '#child' } } } };
        const result = await runDelete({
            requested: [parent],
            children: [child],
            scope: [blocking, blockingChild],
            includeChildren: true,
        });

        const blockedChild = result.errors.find(e => e.name === 'Child Schema');
        assert.ok(blockedChild, 'the child is a delete candidate now, so its blocker matters');
        assert.match(blockedChild.error, /Unrelated Policy Schema/);
    });

    it('carries the per-schema outcome in a JSON-serialisable shape', async () => {
        const result = await runDelete();

        // A Map serialises to {} over the message bus, so the caller learned nothing.
        assert.ok(Array.isArray(result.results), 'results must be an array, not a Map');
        assert.deepEqual(JSON.parse(JSON.stringify(result)).results, result.results);
    });
});
