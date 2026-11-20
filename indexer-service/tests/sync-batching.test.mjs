import assert from 'node:assert/strict';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '@indexer/common';
import { MessageType } from '@indexer/interfaces';
import { BatchLoadHelper } from '../dist/helpers/batch-load-helper.js';
import { PrepareRecordHelper } from '../dist/helpers/prepare-record-helper.js';
import { SynchronizationProjects } from '../dist/helpers/synchronizers/synchronize-projects.js';
import { SynchronizationSchemas } from '../dist/helpers/synchronizers/synchronize-schema.js';
import { SynchronizationVCs } from '../dist/helpers/synchronizers/synchronize-vcs.js';
import { SynchronizationVPs } from '../dist/helpers/synchronizers/synchronize-vp.js';

const cursor = (items) => {
    let index = 0;
    return { hasNext: async () => index < items.length, next: async () => items[index++] };
};

/** Fake database: message rows are chosen by `select(filter)`, GridFS serves `files` by name. */
function fakeManager(select, files = {}) {
    const refs = new Map();
    const requested = [];
    const stored = Object.entries(files).map(([filename, text]) => ({ _id: new ObjectId(), filename, text }));
    return {
        refs,
        requested,
        getCollection: (name) => {
            if (name === 'fs.files') {
                return {
                    find: (filter) => {
                        requested.push(...filter.filename.$in);
                        return cursor(stored.filter(file => filter.filename.$in.includes(file.filename)));
                    }
                };
            }
            if (name === 'fs.chunks') {
                return {
                    find: (filter) => cursor(stored
                        .filter(file => filter.files_id.$in.some(id => id.equals(file._id)))
                        .map(file => ({ files_id: file._id, n: 0, data: Buffer.from(file.text) })))
                };
            }
            return { find: (filter) => cursor(select(filter, refs)), distinct: async () => [] };
        },
        getReference: (entity, id) => {
            if (!refs.has(id)) {
                refs.set(id, {});
            }
            return refs.get(id);
        },
        create: (entity, value) => value,
        persist: () => undefined,
        persistAndFlush: async () => undefined,
        flush: async () => undefined,
        clear: () => undefined,
    };
}

async function withManager(manager, callback) {
    const original = DataBaseHelper.getEntityManager;
    DataBaseHelper.getEntityManager = () => manager;
    const originalLog = console.log;
    console.log = () => undefined;
    try {
        return await callback();
    } finally {
        console.log = originalLog;
        DataBaseHelper.getEntityManager = original;
    }
}

describe('BatchLoadHelper', () => {
    it('splits a cursor into batches and reports the counters', async () => {
        const seen = [];
        await BatchLoadHelper.load(cursor([1, 2, 3, 4, 5]), 2, async (rows, counter) => {
            seen.push([rows, counter.batchIndex, counter.loadedTotal]);
        });
        assert.deepEqual(seen, [[[1, 2], 1, 2], [[3, 4], 2, 4], [[5], 3, 5]]);
    });

    it('falls back to the default size and skips an empty cursor', async () => {
        let calls = 0;
        await BatchLoadHelper.load(cursor([]), 0, async () => { calls++; });
        assert.equal(calls, 0);
    });
});

describe('PrepareRecordHelper.prepareVCMessages', () => {
    const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

    it('prepares VC documents of any action and does not rescan a document without a subject', async () => {
        const rows = [
            { _id: 'with-subject', files: ['vc-1'] },
            { _id: 'no-subject', files: ['vc-2'] },
        ];
        let filter;
        const manager = fakeManager((f) => { filter = f; return rows; }, {
            'vc-1': JSON.stringify({ '@context': [`ipfs://${cid}`], credentialSubject: [{ type: 'Site' }] }),
            'vc-2': JSON.stringify({ '@context': [`ipfs://${cid}`] }),
        });
        await withManager(manager, () => PrepareRecordHelper.prepareVCMessages());
        assert.equal(filter.action, undefined);
        assert.deepEqual(manager.refs.get('with-subject').parsedContextId, { context: cid, type: 'Site' });
        assert.equal(manager.refs.get('no-subject').parsedContextId, null);
    });
});

describe('SynchronizationProjects.prepareSchemas', () => {
    it('marks schemas by their context file and retries a schema whose file is unreadable', async () => {
        const rows = [
            { _id: 'geo', files: ['doc-1', 'ctx-1'] },
            { _id: 'plain', files: ['doc-2', 'ctx-2'] },
            { _id: 'missing', files: ['doc-3', 'ctx-3'] },
        ];
        const manager = fakeManager(() => rows, {
            'ctx-1': JSON.stringify({ '@context': { '#GeoJSON': {} } }),
            'ctx-2': JSON.stringify({ '@context': { Site: {} } }),
        });
        await withManager(manager, () => Object.create(SynchronizationProjects.prototype).prepareSchemas());
        assert.equal(manager.refs.get('geo').parsedHasGeoJson, true);
        assert.equal(manager.refs.get('plain').parsedHasGeoJson, false);
        assert.equal(manager.refs.has('missing'), false);
    });
});

describe('SynchronizationSchemas', () => {
    it('recomputes the policies of a schema when a policy arrives later', async () => {
        const schema = {
            _id: 's', topicId: 'topic', consensusTimestamp: 'schema-1', files: ['doc'], options: { uuid: 'u', name: 'n' },
        };
        const policies = [];
        const manager = fakeManager((filter, refs) => {
            if (filter.type === MessageType.INSTANCE_POLICY) {
                return policies;
            }
            return refs.get('s')?.processedSchemas && filter.processedSchemas ? [] : [schema];
        }, { doc: JSON.stringify({ properties: {} }) });
        await withManager(manager, async () => {
            const synchronizer = Object.create(SynchronizationSchemas.prototype);
            await synchronizer.sync();
            assert.deepEqual(manager.refs.get('s').analytics.policyIds, []);
            policies.push({ topicId: 'topic', consensusTimestamp: 'policy-1' });
            await synchronizer.sync();
            assert.deepEqual(manager.refs.get('s').analytics.policyIds, ['policy-1']);
        });
    });
});

describe('SynchronizationVPs', () => {
    it('reads the schema title of the linked credentials', async () => {
        const context = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
        const vp = {
            _id: 'vp', topicId: 'topic', consensusTimestamp: 'vp-1', files: ['vp-file'],
            parsedLinkedContextIds: [{ context, type: 'Site' }],
        };
        const schema = { consensusTimestamp: 'schema-1', files: ['schema-doc', context] };
        const vpDocument = {
            verifiableCredential: [{ '@context': [`ipfs://${context}`], credentialSubject: [{ type: 'Site', name: 'x' }] }],
        };
        const manager = fakeManager((filter) => {
            if (filter.type === MessageType.SCHEMA) {
                return [schema];
            }
            if (filter.type?.$in?.includes(MessageType.VP_DOCUMENT)) {
                return [vp];
            }
            return [];
        }, {
            'vp-file': JSON.stringify(vpDocument),
            'schema-doc': JSON.stringify({ title: 'Site schema' }),
            [context]: JSON.stringify({ '@context': {} }),
        });
        await withManager(manager, async () => {
            const synchronizer = Object.create(SynchronizationVPs.prototype);
            synchronizer.filter = () => ({});
            await synchronizer.sync();
        });
        assert.deepEqual(manager.refs.get('vp').analytics.schemaNames, ['Site schema']);
    });
});

describe('SynchronizationVCs', () => {
    const context = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

    it('reads the schema name of a schema unpacked from a package', async () => {
        const vc = {
            _id: 'vc', topicId: 'topic', consensusTimestamp: 'vc-1', files: ['vc-file'],
            parsedContextId: { context, type: 'uuid&1.0.0' },
        };
        // Schemas of a package keep the type in the context file id
        const schema = { consensusTimestamp: 'schema-1', files: ['schema-doc', `${context}#uuid&1.0.0`] };
        const vcDocument = {
            '@context': [`ipfs://${context}`],
            credentialSubject: [{ type: 'uuid&1.0.0' }],
        };
        const manager = fakeManager((filter) => {
            if (filter.type === MessageType.SCHEMA) {
                return [schema];
            }
            if (filter.type?.$in?.includes(MessageType.VC_DOCUMENT)) {
                return [vc];
            }
            return [];
        }, {
            'vc-file': JSON.stringify(vcDocument),
            'schema-doc': JSON.stringify({ title: 'Package schema' }),
        });
        await withManager(manager, async () => {
            const synchronizer = Object.create(SynchronizationVCs.prototype);
            synchronizer.filter = () => ({});
            await synchronizer.sync();
        });
        assert.equal(manager.refs.get('vc').analytics.schemaName, 'Package schema');
    });
});
