import assert from 'node:assert/strict';
import esmock from 'esmock';
import { ObjectId } from '@mikro-orm/mongodb';
import { createInMemoryDatabaseHelper } from './in-memory-database-helper.mjs';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope, getPreviewComputed, getPreviewDocumentSchema, setPreviewComputed, setPreviewDocumentSchema } from '../../../dist/policy-engine/helpers/preview.js';
import {
    PreviewIncompleteError,
    createPreviewDatabaseServer,
    getPreviewIncomplete
} from '../../../dist/policy-engine/helpers/preview-database.js';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});

class VcDocument {}
class DidDocument {}

const policyId = 'policy-1';

function previewStep() {
    return new RecordActionStep(() => undefined, 0, true, true, undefined, true);
}

function inPreview(step, callback) {
    return PreviewScope.run(step, callback);
}

function vc(id, owner, area, extra = {}) {
    return {
        _id: new ObjectId(id),
        policyId,
        owner,
        documentFields: ['credentialSubject.0.area', 'credentialSubject.0.approved'],
        document: { credentialSubject: [{ area, approved: true }] },
        ...extra
    };
}

const ID_A = '64b7f0a1c2d3e4f5a6b7c8d1';
const ID_B = '64b7f0a1c2d3e4f5a6b7c8d2';
const ID_C = '64b7f0a1c2d3e4f5a6b7c8d3';

describe('@unit preview database wrapper', () => {
    let server;

    beforeEach(() => {
        db.reset();
        db.seed(VcDocument, [vc(ID_A, 'did:a', 10), vc(ID_B, 'did:a', 20), vc(ID_C, 'did:b', 30)]);
        server = createPreviewDatabaseServer(new DatabaseServer(null), null);
    });

    it('passes every call through unchanged outside a preview', async () => {
        await server.saveVC({ policyId, owner: 'did:a', document: { credentialSubject: [{ area: 1 }] } });
        assert.equal(db.records(VcDocument).length, 4);
        const found = await server.getVcDocuments({ policyId, owner: 'did:a' });
        assert.equal(found.length, 3);
    });

    it('keeps a preview save out of the database and shows it to later reads of the same preview', async () => {
        const step = previewStep();
        const found = await inPreview(step, async () => {
            await server.saveVC({ policyId, owner: 'did:a', documentFields: ['credentialSubject.0.area'], document: { credentialSubject: [{ area: 5 }] } });
            return await server.getVcDocuments({ policyId, owner: 'did:a' });
        });
        assert.equal(db.records(VcDocument).length, 3);
        assert.equal(db.calls.filter(([name]) => name === 'save').length, 0);
        assert.deepEqual(found.map((item) => item.document.credentialSubject[0].area), [10, 20, 5]);
    });

    for (const dryRunId of [null, 'dry-1']) {
        it(`retains origins through create, insert, find and findOne for ${dryRunId}`, async () => {
            const local = createPreviewDatabaseServer(new DatabaseServer(dryRunId), dryRunId);
            await inPreview(previewStep(), async () => {
                const row = setPreviewComputed(setPreviewDocumentSchema({ policyId, owner: 'did:new',
                    document: { credentialSubject: [{ temp: 6 }] } }, '#S'), ['temp']);
                const saved = await local.saveVC(row);
                const found = await local.getVcDocument({ _id: saved._id });
                const listed = await local.getVcDocuments({ owner: 'did:new' });
                for (const item of [saved, found, ...listed]) {
                    assert.deepEqual(getPreviewComputed(item), ['temp']);
                    assert.equal(getPreviewDocumentSchema(item), '#S');
                    assert.equal(Object.hasOwn(item, 'schema'), false);
                }
                assert.notEqual(saved, found);
                assert.equal(JSON.stringify(saved).includes('computed'), false);
            });
            assert.equal(db.calls.some(([name]) => name === 'save' || name === 'update'), false);
        });
    }

    it('retains origins on metadata updates and replaces them with the current document origins', async () => {
        await inPreview(previewStep(), async () => {
            const saved = await server.saveVC(setPreviewComputed({ policyId, owner: 'did:new',
                document: { credentialSubject: [{ temp: 6 }] } }, ['temp']));
            await server.update(VcDocument, { _id: saved._id }, { owner: 'did:changed' });
            const changed = await server.getVcDocument({ _id: saved._id });
            assert.deepEqual(getPreviewComputed(changed), ['temp']);
            await server.updateVC(setPreviewComputed({ ...changed,
                document: { credentialSubject: [{ total: 12 }] } }, ['total']));
            const updated = await server.getVcDocument({ _id: saved._id });
            assert.deepEqual(getPreviewComputed(updated), ['total']);
            await server.updateVC({ ...updated, document: { credentialSubject: [{ total: 13 }] } });
            assert.deepEqual(getPreviewComputed(await server.getVcDocument({ _id: saved._id })), []);
        });
    });

    it('keeps origins local to the record and preview and never persists them', async () => {
        const first = previewStep();
        const second = previewStep();
        await Promise.all([
            inPreview(first, async () => {
                const row = await server.getVcDocument({ _id: new ObjectId(ID_A) });
                await server.updateVC(setPreviewComputed(row, ['area']));
                await new Promise(resolve => setTimeout(resolve, 5));
                assert.deepEqual(getPreviewComputed(await server.getVcDocument({ _id: new ObjectId(ID_A) })), ['area']);
                assert.deepEqual(getPreviewComputed(await server.getVcDocument({ _id: new ObjectId(ID_B) })), []);
            }),
            inPreview(second, async () => {
                assert.deepEqual(getPreviewComputed(await server.getVcDocument({ _id: new ObjectId(ID_A) })), []);
            })
        ]);
        assert.deepEqual(getPreviewComputed(await server.getVcDocument({ _id: new ObjectId(ID_A) })), []);
        assert.equal(db.calls.some(([name]) => name === 'save' || name === 'update'), false);
    });

    it('goes through the wrapper for calls a DatabaseServer method makes to itself', async () => {
        const step = previewStep();
        await inPreview(step, async () => {
            await server.saveVC({ policyId, owner: 'did:a', document: {} });
        });
        assert.deepEqual(db.calls.map(([name]) => name).filter((name) => name === 'save' || name === 'update'), []);
        assert.equal(db.calls.some(([name]) => name === 'create'), true);
    });

    it('replaces a stored record updated in the preview and keeps it at its place', async () => {
        const step = previewStep();
        const found = await inPreview(step, async () => {
            const [first] = await server.getVcDocuments({ policyId, owner: 'did:a' });
            await server.updateVC({ ...first, document: { credentialSubject: [{ area: 99, approved: true }] } });
            return await server.getVcDocuments({ policyId, owner: 'did:a' });
        });
        assert.deepEqual(found.map((item) => item.document.credentialSubject[0].area), [99, 20]);
        assert.equal(db.records(VcDocument)[0].document.credentialSubject[0].area, 10);
    });

    it('returns a stored record that starts to match only after a preview update', async () => {
        const step = previewStep();
        const found = await inPreview(step, async () => {
            const third = await server.getVcDocument({ _id: new ObjectId(ID_C) });
            await server.updateVC({ ...third, owner: 'did:a' });
            return await server.getVcDocuments({ policyId, owner: 'did:a' });
        });
        assert.deepEqual(found.map((item) => item.id), [ID_A, ID_B, ID_C]);
    });

    it('hides a stored record removed in the preview, and the count follows', async () => {
        const step = previewStep();
        const [found, count] = await inPreview(step, async () => {
            const second = await server.getVcDocument({ _id: new ObjectId(ID_B) });
            await server.remove(VcDocument, second);
            return [await server.getVcDocuments({ policyId }), await server.getVcDocuments({ policyId }, null, true)];
        });
        assert.deepEqual(found.map((item) => item.id), [ID_A, ID_C]);
        assert.equal(count, 2);
        assert.equal(db.records(VcDocument).length, 3);
    });

    it('matches a preview record against the document field cache, as MongoDB sees a stored one', async () => {
        const step = previewStep();
        const [byArea, byFlag] = await inPreview(step, async () => {
            await server.saveVC({
                policyId,
                owner: 'did:z',
                documentFields: ['credentialSubject.0.area', 'credentialSubject.0.approved'],
                document: { credentialSubject: [{ area: 7, approved: true }] }
            });
            return [
                await server.getVcDocuments({ owner: 'did:z', 'document.credentialSubject.0.area': 7 }),
                await server.getVcDocuments({ owner: 'did:z', 'document.credentialSubject.0.approved': true })
            ];
        });
        assert.equal(byArea.length, 1);
        assert.equal(byArea[0].document.credentialSubject[0].approved, true);
        assert.equal(byFlag.length, 0);
    });

    it('sorts and limits after the merge, and picks one record after it', async () => {
        const step = previewStep();
        const [sorted, limited, one] = await inPreview(step, async () => {
            await server.saveVC({ policyId, owner: 'did:a', document: {}, documentFields: [] });
            const records = await server.getVcDocuments({ policyId, owner: 'did:a' });
            const newest = records[records.length - 1];
            const order = { orderBy: { owner: 'DESC', createDate: 'DESC' } };
            return [
                await server.getVcDocuments({ policyId }, order),
                await server.getVcDocuments({ policyId }, { ...order, limit: 2 }),
                await server.findOne(VcDocument, { policyId }, order).then((item) => item.id === newest.id ? 'newest' : item.id)
            ];
        });
        assert.equal(sorted.length, 4);
        assert.equal(sorted[0].owner, 'did:b');
        assert.equal(sorted[1].owner, 'did:a');
        assert.equal(limited.length, 2);
        assert.equal(one, ID_C);
    });

    it('gives a preview record the normal id and dates, never an artificial order', async () => {
        const step = previewStep();
        const before = Date.now();
        const saved = await inPreview(step, () => server.saveVC({ policyId, owner: 'did:a', document: {} }));
        assert.ok(ObjectId.isValid(saved.id));
        assert.ok(saved.createDate instanceof Date);
        assert.ok(saved.createDate.getTime() >= before && saved.createDate.getTime() <= Date.now());
        assert.equal(saved.hederaStatus, 'NEW');
        assert.equal(saved.signature, 0);
    });

    it('keeps two previews and a normal submit apart', async () => {
        const first = previewStep();
        const second = previewStep();
        const [seenByFirst, seenBySecond] = await Promise.all([
            inPreview(first, async () => {
                await server.saveVC({ policyId, owner: 'did:first', document: {} });
                await new Promise((resolve) => setTimeout(resolve, 5));
                return await server.getVcDocuments({ owner: 'did:first' }, null, true);
            }),
            inPreview(second, async () => {
                await new Promise((resolve) => setTimeout(resolve, 1));
                return await server.getVcDocuments({ owner: 'did:first' }, null, true);
            }),
            server.saveVC({ policyId, owner: 'did:normal', document: {} })
        ]);
        assert.equal(seenByFirst, 1);
        assert.equal(seenBySecond, 0);
        assert.equal(await server.getVcDocuments({ owner: 'did:first' }, null, true), 0);
        assert.equal(await server.getVcDocuments({ owner: 'did:normal' }, null, true), 1);
    });

    it('reports an unsupported filter as an incomplete result instead of an answer', async () => {
        const step = previewStep();
        await assert.rejects(
            inPreview(step, async () => {
                await server.saveVC({ policyId, owner: 'did:a', document: {} });
                return await server.getVcDocuments({ policyId, amount: { $elemMatch: { a: 1 } } });
            }),
            PreviewIncompleteError
        );
        const incomplete = getPreviewIncomplete(step);
        assert.equal(incomplete.length, 1);
        assert.match(incomplete[0].reason, /\$elemMatch/);
    });

    it('refuses an aggregation over an entity the preview changed', async () => {
        const step = previewStep();
        await assert.rejects(
            inPreview(step, async () => {
                await server.saveVC({ policyId, owner: 'did:a', document: {} });
                return await server.aggregate(VcDocument, [{ $match: { policyId } }]);
            }),
            PreviewIncompleteError
        );
    });

    it('refuses a Dry Run virtual token write in a preview', async () => {
        const step = previewStep();
        await assert.rejects(inPreview(step, () => server.virtualAssociate('0.0.1', { tokenId: '0.0.2' })), PreviewIncompleteError);
        assert.equal(getPreviewIncomplete(step)[0].reason, 'the database method virtualAssociate');
    });

    it('answers an untouched entity straight from the database during a preview', async () => {
        const step = previewStep();
        await inPreview(step, async () => {
            await server.saveVC({ policyId, owner: 'did:a', document: {} });
            assert.equal(await server.count(DidDocument, { did: 'did:x' }), 0);
        });
        assert.deepEqual(db.calls.filter(([, name]) => name === 'DidDocument').map(([call]) => call), ['count']);
    });
});
