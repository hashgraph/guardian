import assert from 'node:assert/strict';
import { ReleaseMigration } from '../../dist/migrations/v3-7-1.js';

/*
 * A policy used to carry a single `schemaTemplate` binding; it now carries a
 * `schemaTemplates` array. Every policy already in the database has to be moved
 * across, and the legacy field has to disappear so nothing keeps reading it.
 *
 * The migration also repairs the template ids on already-imported policy schemas.
 * Import re-pointed the binding at the locally resolved template but left the
 * schemas carrying the source instance's id, which was harmless only while lock
 * resolution read "the one binding" instead of matching ids.
 */

/** The mongo query operators the migration actually uses. */
function matches(doc, filter) {
    for (const [key, spec] of Object.entries(filter || {})) {
        const present = Object.prototype.hasOwnProperty.call(doc, key);
        const value = doc[key];
        if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
            if (spec.$exists === true && !present) {
                return false;
            }
            if (spec.$exists === false && present) {
                return false;
            }
            if ('$ne' in spec && value === spec.$ne) {
                return false;
            }
            if ('$nin' in spec && spec.$nin.includes(value)) {
                return false;
            }
            // ids arrive as ObjectId instances, so compare by string
            if ('$in' in spec && !spec.$in.map(String).includes(String(value))) {
                return false;
            }
            continue;
        }
        if (value !== spec) {
            return false;
        }
    }
    return true;
}

/** Minimal stand-in for the mongo collection the migration drives. */
function fakeCollection(documents) {
    const calls = { updateOne: [], updateMany: [], find: [] };
    return {
        calls,
        documents,
        find(filter, options) {
            calls.find.push({ filter, options });
            const matched = documents.filter((doc) => matches(doc, filter));
            let index = 0;
            return {
                async hasNext() { return index < matched.length; },
                async next() { return matched[index++]; },
            };
        },
        async updateOne(filter, update, options) {
            calls.updateOne.push({ filter, update, options });
            const doc = documents.find((item) => item._id === filter._id);
            Object.assign(doc, update.$set);
        },
        async updateMany(filter, update, options) {
            calls.updateMany.push({ filter, update, options });
            for (const doc of documents) {
                if (!matches(doc, filter)) {
                    continue;
                }
                Object.assign(doc, update.$set);
                for (const key of Object.keys(update.$unset || {})) {
                    delete doc[key];
                }
            }
        },
    };
}

function runMigration(policyDocuments, schemaDocuments = []) {
    const policies = fakeCollection(policyDocuments);
    const schemas = fakeCollection(schemaDocuments);
    const collections = { Policy: policies, Schema: schemas };
    const migration = Object.create(ReleaseMigration.prototype);
    migration.ctx = 'session-1';
    migration.getCollection = (name) => {
        assert.ok(collections[name], `unexpected collection "${name}"`);
        return collections[name];
    };
    return { collection: policies, policies, schemas, run: () => migration.up() };
}

describe('v3-7-1 migration - schemaTemplate to schemaTemplates', () => {
    it('wraps a legacy binding in a one-element array', async () => {
        const binding = { templateId: 'template-1', snapshotId: 'snapshot-1' };
        const documents = [{ _id: 'policy-1', schemaTemplate: binding }];
        const { run } = runMigration(documents);

        await run();

        assert.deepEqual(documents[0].schemaTemplates, [binding],
            'the binding must survive the move unchanged');
        assert.equal(Object.prototype.hasOwnProperty.call(documents[0], 'schemaTemplate'), false,
            'the legacy field must be gone so nothing keeps reading it');
    });

    it('migrates every bound policy, not just the first', async () => {
        const documents = [
            { _id: 'policy-1', schemaTemplate: { templateId: 'template-1' } },
            { _id: 'policy-2', schemaTemplate: { templateId: 'template-2' } },
        ];
        const { run } = runMigration(documents);

        await run();

        assert.deepEqual(documents[0].schemaTemplates, [{ templateId: 'template-1' }]);
        assert.deepEqual(documents[1].schemaTemplates, [{ templateId: 'template-2' }]);
    });

    it('leaves a policy that never had a template alone', async () => {
        const documents = [{ _id: 'policy-1', name: 'Untemplated' }];
        const { collection, run } = runMigration(documents);

        await run();

        assert.equal(documents[0].schemaTemplates, undefined,
            'an untemplated policy must not gain an empty binding list');
        assert.equal(collection.calls.updateOne.length, 0);
    });

    it('does not rewrite documents that have no legacy field', async () => {
        const documents = [
            { _id: 'policy-1', schemaTemplate: { templateId: 'template-1' } },
            { _id: 'policy-2', name: 'Untemplated' },
        ];
        const { collection, run } = runMigration(documents);

        await run();

        const [unset] = collection.calls.updateMany;
        assert.deepEqual(unset.filter, { schemaTemplate: { $exists: true } },
            'an unfiltered updateMany would touch every policy in the collection');
    });

    it('runs inside the migration transaction', async () => {
        const documents = [{
            _id: 'policy-1',
            topicId: '0.0.1',
            schemaTemplate: {
                templateId: 'template-1',
                schemaMap: { a: '000000000000000000000001' },
            },
        }];
        const schemas = [{
            _id: '000000000000000000000001',
            topicId: '0.0.1',
            category: 'POLICY',
            templateId: 'remote-1',
        }];
        const { policies, schemas: schemaCollection, run } = runMigration(documents, schemas);

        await run();

        const everyCall = [
            ...policies.calls.updateOne,
            ...policies.calls.updateMany,
            ...schemaCollection.calls.updateMany,
        ];
        for (const call of everyCall) {
            assert.equal(call.options.session, 'session-1');
        }
        assert.equal(policies.calls.find[0].options.session, 'session-1');
    });
});

describe('v3-7-1 migration - policy schema template ids', () => {
    /*
     * The repair follows the binding's schemaMap rather than the policy topic: a
     * policy imported as a new version reuses the previous version's topic, so two
     * policies bound to different templates can share one.
     */
    const SCHEMA_1 = '000000000000000000000001';
    const SCHEMA_2 = '000000000000000000000002';
    const SCHEMA_3 = '000000000000000000000003';

    const importedPolicy = () => [{
        _id: 'policy-1',
        topicId: '0.0.1',
        schemaTemplate: {
            templateId: 'local-1',
            snapshotId: 'snapshot-1',
            schemaMap: { 'tsid-a': SCHEMA_1, 'tsid-b': SCHEMA_2 },
        },
    }];

    it('re-points imported policy schemas at the template the binding names', async () => {
        const schemas = [
            { _id: SCHEMA_1, topicId: '0.0.1', category: 'POLICY', templateId: 'remote-1' },
            { _id: SCHEMA_2, topicId: '0.0.1', category: 'POLICY', templateId: 'remote-1' },
        ];
        const { run } = runMigration(importedPolicy(), schemas);

        await run();

        assert.equal(schemas[0].templateId, 'local-1',
            'a schema still naming the source instance template resolves no locks at all');
        assert.equal(schemas[1].templateId, 'local-1');
    });

    it('leaves a schema the binding does not claim alone', async () => {
        const schemas = [
            { _id: SCHEMA_1, topicId: '0.0.1', category: 'POLICY', templateId: 'remote-1' },
            { _id: SCHEMA_3, topicId: '0.0.1', category: 'POLICY', templateId: 'remote-2' },
        ];
        const { run } = runMigration(importedPolicy(), schemas);

        await run();

        assert.equal(schemas[1].templateId, 'remote-2',
            'only the schemas the binding created may be re-pointed');
    });

    it('does not let two policies sharing a topic overwrite each other', async () => {
        const policies = [
            {
                _id: 'policy-1',
                topicId: '0.0.1',
                schemaTemplate: { templateId: 'local-1', schemaMap: { a: SCHEMA_1 } },
            },
            {
                _id: 'policy-2',
                topicId: '0.0.1',
                schemaTemplate: { templateId: 'local-2', schemaMap: { a: SCHEMA_2 } },
            },
        ];
        const schemas = [
            { _id: SCHEMA_1, topicId: '0.0.1', category: 'POLICY', templateId: 'remote-1' },
            { _id: SCHEMA_2, topicId: '0.0.1', category: 'POLICY', templateId: 'remote-2' },
        ];
        const { run } = runMigration(policies, schemas);

        await run();

        assert.equal(schemas[0].templateId, 'local-1',
            'a new policy version reuses the old topic, so topic scoping would cross the two');
        assert.equal(schemas[1].templateId, 'local-2');
    });

    it('leaves detached schemas detached', async () => {
        const schemas = [
            { _id: SCHEMA_1, topicId: '0.0.1', category: 'POLICY', templateId: '' },
        ];
        const { run } = runMigration(importedPolicy(), schemas);

        await run();

        assert.equal(schemas[0].templateId, '',
            'a cleared marker means detached, and must not be revived');
    });

    it('skips a binding with no schemaMap', async () => {
        const policies = [{
            _id: 'policy-1',
            topicId: '0.0.1',
            schemaTemplate: { templateId: 'local-1' },
        }];
        const schemas = [{ _id: SCHEMA_1, topicId: '0.0.1', category: 'POLICY', templateId: 'remote-1' }];
        const { schemas: schemaCollection, run } = runMigration(policies, schemas);

        await run();

        assert.equal(schemaCollection.calls.updateMany.length, 0,
            'with no schemaMap there is no way to tell which schemas the template created');
    });

    it('skips a schemaMap entry that is not a usable id', async () => {
        const policies = [{
            _id: 'policy-1',
            topicId: '0.0.1',
            schemaTemplate: { templateId: 'local-1', schemaMap: { a: 'not-an-id' } },
        }];
        const { schemas: schemaCollection, run } = runMigration(policies, []);

        await run();

        assert.equal(schemaCollection.calls.updateMany.length, 0,
            'a malformed id must be skipped, not throw and abort the whole migration');
    });

    it('leaves a policy that never had a template alone', async () => {
        const policies = [{ _id: 'policy-1', topicId: '0.0.1', name: 'Untemplated' }];
        const schemas = [{ _id: SCHEMA_1, topicId: '0.0.1', category: 'POLICY', templateId: 'remote-1' }];
        const { schemas: schemaCollection, run } = runMigration(policies, schemas);

        await run();

        assert.equal(schemaCollection.calls.updateMany.length, 0);
        assert.equal(schemas[0].templateId, 'remote-1');
    });
});
