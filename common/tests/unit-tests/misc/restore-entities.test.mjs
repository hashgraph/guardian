import { assert } from 'chai';
import { MintRequest } from '../../../dist/entity/mint-request.js';
import { MintTransaction } from '../../../dist/entity/mint-transaction.js';
import { RetirePool } from '../../../dist/entity/retire-pool.js';
import { RetireRequest } from '../../../dist/entity/retire-request.js';

describe('MintRequest entity', () => {
    it('extends BaseEntity (createDate present)', () => {
        const m = new MintRequest();
        assert.instanceOf(m.createDate, Date);
    });

    it('applies documented boolean defaults', () => {
        const m = new MintRequest();
        assert.equal(m.isMintNeeded, true);
        assert.equal(m.isTransferNeeded, false);
        assert.equal(m.wasTransferNeeded, false);
    });

    it('createDocument sets a deterministic propHash and empty docHash', async () => {
        const m = new MintRequest();
        m.amount = 100;
        m.tokenId = '0.0.1';
        m.target = '0.0.2';
        m.vpMessageId = 'vp-1';
        m.memo = 'memo';
        await m.createDocument();
        assert.isString(m._propHash);
        assert.equal(m._propHash.length, 32);
        assert.equal(m._docHash, '');
    });

    it('createDocument is stable for identical inputs', async () => {
        const a = new MintRequest();
        a.amount = 5;
        a.tokenId = 't';
        a.target = 'x';
        a.vpMessageId = 'v';
        a.memo = 'm';
        await a.createDocument();

        const b = new MintRequest();
        b.amount = 5;
        b.tokenId = 't';
        b.target = 'x';
        b.vpMessageId = 'v';
        b.memo = 'm';
        await b.createDocument();

        assert.equal(a._propHash, b._propHash);
    });

    it('createDocument hash changes when a property changes', async () => {
        const a = new MintRequest();
        a.amount = 1;
        a.tokenId = 't';
        await a.createDocument();
        const first = a._propHash;
        a.amount = 2;
        await a.createDocument();
        assert.notEqual(a._propHash, first);
    });
});

describe('MintTransaction entity', () => {
    it('extends BaseEntity (createDate present)', () => {
        const m = new MintTransaction();
        assert.instanceOf(m.createDate, Date);
    });

    it('createDocument sets propHash and empty docHash', async () => {
        const m = new MintTransaction();
        m.amount = 10;
        m.mintRequestId = 'r-1';
        m.mintStatus = 'NEW';
        m.transferStatus = 'NEW';
        await m.createDocument();
        assert.isString(m._propHash);
        assert.equal(m._docHash, '');
    });

    it('createDocument hash reflects serials', async () => {
        const m = new MintTransaction();
        m.amount = 1;
        m.mintRequestId = 'r';
        await m.createDocument();
        const before = m._propHash;
        m.serials = [1, 2, 3];
        await m.createDocument();
        assert.notEqual(m._propHash, before);
    });
});

describe('RetirePool entity', () => {
    it('enabled defaults to false', () => {
        const p = new RetirePool();
        assert.equal(p.enabled, false);
    });

    it('setTokens derives a unique tokenIds list from tokens', () => {
        const p = new RetirePool();
        p.tokens = [
            { token: '0.0.1' },
            { token: '0.0.2' },
            { token: '0.0.1' }
        ];
        p.setTokens();
        assert.deepEqual(p.tokenIds, ['0.0.1', '0.0.2']);
    });

    it('setTokens yields an empty list for no tokens', () => {
        const p = new RetirePool();
        p.tokens = [];
        p.setTokens();
        assert.deepEqual(p.tokenIds, []);
    });
});

describe('RetireRequest entity', () => {
    it('setTokens derives a unique tokenIds list from tokens', () => {
        const r = new RetireRequest();
        r.tokens = [
            { token: 'a' },
            { token: 'a' },
            { token: 'b' }
        ];
        r.setTokens();
        assert.deepEqual(r.tokenIds, ['a', 'b']);
    });

    it('extends BaseEntity (createDate present)', () => {
        const r = new RetireRequest();
        assert.instanceOf(r.createDate, Date);
    });
});
