import { assert } from 'chai';
import crypto from 'node:crypto';
import { RestoreEntity } from '../../../dist/models/restore-entity.js';

class TestRestore extends RestoreEntity {
    async deleteCache() {}

    bumpProp(prop) {
        this._updatePropHash(prop);
    }
    bumpDoc(doc) {
        this._updateDocHash(doc);
    }
}

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

describe('RestoreEntity._updatePropHash', () => {
    it('sets _propHash to MD5 of JSON.stringify(prop)', () => {
        const e = new TestRestore();
        const prop = { a: 1, b: 'two' };
        e.bumpProp(prop);
        assert.equal(e._propHash, md5(JSON.stringify(prop)));
    });

    it('different props produce different hashes', () => {
        const a = new TestRestore();
        const b = new TestRestore();
        a.bumpProp({ x: 1 });
        b.bumpProp({ x: 2 });
        assert.notEqual(a._propHash, b._propHash);
    });

    it('identical props produce identical hashes (deterministic)', () => {
        const a = new TestRestore();
        const b = new TestRestore();
        const same = { foo: 'bar' };
        a.bumpProp(same);
        b.bumpProp(same);
        assert.equal(a._propHash, b._propHash);
    });
});

describe('RestoreEntity._updateDocHash', () => {
    it('sets _docHash to MD5 of the document string', () => {
        const e = new TestRestore();
        e.bumpDoc('hello world');
        assert.equal(e._docHash, md5('hello world'));
    });

    it('sets _docHash to "" when document is empty/falsy', () => {
        const e = new TestRestore();
        e.bumpDoc('');
        assert.equal(e._docHash, '');
        e.bumpDoc(null);
        assert.equal(e._docHash, '');
        e.bumpDoc(undefined);
        assert.equal(e._docHash, '');
    });

    it('different documents produce different hashes', () => {
        const a = new TestRestore();
        const b = new TestRestore();
        a.bumpDoc('alpha');
        b.bumpDoc('beta');
        assert.notEqual(a._docHash, b._docHash);
    });
});

describe('RestoreEntity inherits BaseEntity behaviors', () => {
    it('has createDate / updateDate from BaseEntity initialiser', () => {
        const e = new TestRestore();
        assert.instanceOf(e.createDate, Date);
        assert.instanceOf(e.updateDate, Date);
    });

    it('exposes _restoreId, _propHash, _docHash as undefined until set', () => {
        const e = new TestRestore();
        assert.equal(e._restoreId, undefined);
        assert.equal(e._propHash, undefined);
        assert.equal(e._docHash, undefined);
    });
});
