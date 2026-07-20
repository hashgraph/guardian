import assert from 'node:assert/strict';
import { Token } from '../dist/models/token.js';

describe('Token model', () => {
    const base = {
        id: 'id1', tokenId: '0.0.123', tokenName: 'My Token', tokenSymbol: 'MTK',
        tokenType: 'fungible', decimals: 2, initialSupply: 1000,
        enableAdmin: true, enableFreeze: false, enableKYC: true, enableWipe: false,
        draftToken: false, canDelete: true, wipeContractId: '0.0.999'
    };

    it('maps the core descriptive fields', () => {
        const t = new Token({ ...base });
        assert.equal(t.id, 'id1');
        assert.equal(t.tokenId, '0.0.123');
        assert.equal(t.tokenName, 'My Token');
        assert.equal(t.tokenSymbol, 'MTK');
        assert.equal(t.tokenType, 'fungible');
        assert.equal(t.decimals, 2);
        assert.equal(t.initialSupply, 1000);
    });

    it('maps the capability flags', () => {
        const t = new Token({ ...base });
        assert.equal(t.enableAdmin, true);
        assert.equal(t.enableFreeze, false);
        assert.equal(t.enableKYC, true);
        assert.equal(t.enableWipe, false);
    });

    it('defaults policies to an empty array when absent', () => {
        const t = new Token({ ...base });
        assert.deepEqual(t.policies, []);
    });

    it('keeps a provided policies array', () => {
        const t = new Token({ ...base, policies: ['p1', 'p2'] });
        assert.deepEqual(t.policies, ['p1', 'p2']);
    });

    it('base64-encodes the tokenId into url', () => {
        const t = new Token({ ...base });
        assert.equal(t.url, btoa('0.0.123'));
    });

    it('carries the wipe contract id and delete/draft flags', () => {
        const t = new Token({ ...base });
        assert.equal(t.wipeContractId, '0.0.999');
        assert.equal(t.canDelete, true);
        assert.equal(t.draftToken, false);
    });

    describe('when not associated (IToken / plain token)', () => {
        it('marks associated as No and balances n/a', () => {
            const t = new Token({ ...base });
            assert.equal(t.associated, 'No');
            assert.equal(t.tokenBalance, 'n/a');
            assert.equal(t.hBarBalance, 'n/a');
        });

        it('reports frozen and kyc as n/a', () => {
            const t = new Token({ ...base });
            assert.equal(t.frozen, 'n/a');
            assert.equal(t.kyc, 'n/a');
        });
    });

    describe('when associated (ITokenInfo)', () => {
        it('marks associated as Yes and reads balances', () => {
            const t = new Token({ ...base, associated: true, balance: '50', hBarBalance: '1.5' });
            assert.equal(t.associated, 'Yes');
            assert.equal(t.tokenBalance, '50');
            assert.equal(t.hBarBalance, '1.5');
        });

        it('derives frozen / kyc Yes/No from the info flags', () => {
            const t = new Token({ ...base, associated: true, frozen: true, kyc: false });
            assert.equal(t.frozen, 'Yes');
            assert.equal(t.kyc, 'No');
        });

        it('falls back to n/a balance when balance missing despite association', () => {
            const t = new Token({ ...base, associated: true });
            assert.equal(t.tokenBalance, 'n/a');
            assert.equal(t.hBarBalance, 'n/a');
        });
    });
});
