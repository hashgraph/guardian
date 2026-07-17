import assert from 'node:assert/strict';
import { RecordModel } from '../../dist/analytics/compare/models/record.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

const vc = (overrides = {}) => ({ type: 'vc', document: {}, ...overrides });
const vp = (amount) => ({
    type: 'vp',
    document: {
        verifiableCredential: [
            { credentialSubject: {} },
            { credentialSubject: { amount } },
        ],
    },
});

describe('RecordModel construction', () => {
    it('starts with empty weights and undefined counters', () => {
        const r = new RecordModel(opts);
        assert.deepEqual(r.getWeights(), []);
        assert.equal(r.maxWeight(), 0);
        assert.equal(r.count, undefined);
        assert.equal(r.tokens, undefined);
    });

    it('exposes the supplied options', () => {
        const r = new RecordModel(opts);
        assert.equal(r.options, opts);
    });
});

describe('RecordModel.setDocuments', () => {
    it('counts vc documents', () => {
        const r = new RecordModel(opts);
        r.setDocuments([vc(), vc(), vc()]);
        assert.equal(r.count, 3);
        assert.equal(r.tokens, 0);
    });

    it('counts vp documents and sums their mint amount', () => {
        const r = new RecordModel(opts);
        r.setDocuments([vp(5), vp(10)]);
        assert.equal(r.count, 2);
        assert.equal(r.tokens, 15);
    });

    it('mixes vc + vp counts but sums tokens only from vp', () => {
        const r = new RecordModel(opts);
        r.setDocuments([vc(), vp(7), vc()]);
        assert.equal(r.count, 3);
        assert.equal(r.tokens, 7);
    });

    it('returns 0 tokens when the mint subject is missing or unparseable', () => {
        const r = new RecordModel(opts);
        r.setDocuments([
            { type: 'vp', document: {} },
            { type: 'vp', document: { verifiableCredential: [] } },
            { type: 'vp', document: { verifiableCredential: [{ credentialSubject: {} }] } },
        ]);
        assert.equal(r.count, 3);
        assert.equal(r.tokens, 0);
    });

    it('handles credentialSubject as an array (reads the first entry)', () => {
        const r = new RecordModel(opts);
        r.setDocuments([
            {
                type: 'vp',
                document: {
                    verifiableCredential: [
                        { credentialSubject: {} },
                        { credentialSubject: [{ amount: 9 }] },
                    ],
                },
            },
        ]);
        assert.equal(r.tokens, 9);
    });

    it('handles a non-array argument by zeroing the counters', () => {
        const r = new RecordModel(opts);
        r.setDocuments(null);
        assert.equal(r.count, 0);
        assert.equal(r.tokens, 0);
    });

    it('returns the model instance for chaining', () => {
        const r = new RecordModel(opts);
        assert.equal(r.setDocuments([]), r);
    });
});

describe('RecordModel.setChildren', () => {
    it('stores an array of children unchanged', () => {
        const r = new RecordModel(opts);
        const docs = [{ a: 1 }, { b: 2 }];
        r.setChildren(docs);
        assert.equal(r.children, docs);
    });

    it('falls back to [] when given a non-array', () => {
        const r = new RecordModel(opts);
        r.setChildren(null);
        assert.deepEqual(r.children, []);
    });

    it('returns the model instance for chaining', () => {
        const r = new RecordModel(opts);
        assert.equal(r.setChildren([]), r);
    });
});

describe('RecordModel.equal', () => {
    it('compares by hash when no weights are populated (post-update is empty)', () => {
        const a = new RecordModel(opts).update(opts);
        const b = new RecordModel(opts).update(opts);
        // Both have empty hash → equal.
        assert.equal(a.equal(b), true);
    });

    it('returns true on equalKey() unconditionally', () => {
        const a = new RecordModel(opts);
        const b = new RecordModel(opts);
        assert.equal(a.equalKey(b), true);
    });
});

describe('RecordModel.toObject / info', () => {
    it('toObject returns {documents, tokens}', () => {
        const r = new RecordModel(opts);
        r.setDocuments([vc(), vp(2)]);
        assert.deepEqual(r.toObject(), { documents: 2, tokens: 2 });
    });

    it('info() returns the same shape as toObject()', () => {
        const r = new RecordModel(opts);
        r.setDocuments([vc()]);
        assert.deepEqual(r.info(), r.toObject());
    });
});
