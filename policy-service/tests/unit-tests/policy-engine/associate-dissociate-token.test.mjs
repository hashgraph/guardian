import { assert } from 'chai';
import { AssociateToken } from '../../../dist/policy-engine/policy-actions/associate-token.js';
import { DissociateToken } from '../../../dist/policy-engine/policy-actions/dissociate-token.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const token = { tokenId: 't1', tokenName: 'Tk', tokenSymbol: 'SYM', tokenType: 'fungible' };
let saved;

describe('AssociateToken / DissociateToken actions', () => {
beforeEach(() => {
    saved = {
        getUserCredentials: PolicyUtils.getUserCredentials,
        getHederaAccountId: PolicyUtils.getHederaAccountId,
        associate: PolicyUtils.associate,
        dissociate: PolicyUtils.dissociate,
        getBlock: PolicyComponentsUtils.GetBlockByTag,
    };
    PolicyUtils.getUserCredentials = async () => ({
        loadRelayerAccount: async () => 'relayer-loaded'
    });
    PolicyUtils.getHederaAccountId = async () => '0.0.999';
    PolicyUtils.associate = async () => true;
    PolicyUtils.dissociate = async () => true;
    PolicyComponentsUtils.GetBlockByTag = () => ({ tag: 'block-tag' });
});

afterEach(() => {
    PolicyUtils.getUserCredentials = saved.getUserCredentials;
    PolicyUtils.getHederaAccountId = saved.getHederaAccountId;
    PolicyUtils.associate = saved.associate;
    PolicyUtils.dissociate = saved.dissociate;
    PolicyComponentsUtils.GetBlockByTag = saved.getBlock;
});

const ref = { tag: 'ref-tag' };

describe('AssociateToken', () => {
    it('local() returns the associate result', async () => {
        const out = await AssociateToken.local({ ref, token, user: 'did:u', relayerAccount: 'r', userId: null });
        assert.isTrue(out);
    });

    it('request() builds an AssociateToken document', async () => {
        const out = await AssociateToken.request({ ref, token, user: 'did:u', relayerAccount: 'r', userId: null });
        assert.equal(out.owner, 'did:u');
        assert.equal(out.accountId, '0.0.999');
        assert.equal(out.relayerAccount, 'r');
        assert.equal(out.blockTag, 'ref-tag');
        assert.equal(out.document.type, 'associate-token');
        assert.deepEqual(out.document.token, token);
        assert.match(out.uuid, /[0-9a-f-]{36}/);
    });

    it('response() resolves the block, associates and returns the result', async () => {
        const row = { policyId: 'p1', blockTag: 'bt', document: { token } };
        const out = await AssociateToken.response({ row, user: { did: 'did:u' }, relayerAccount: 'r', userId: null });
        assert.equal(out.type, 'associate-token');
        assert.equal(out.owner, 'did:u');
        assert.isTrue(out.associate);
        assert.deepEqual(out.token, token);
    });

    it('complete() returns true when associate is truthy', async () => {
        assert.isTrue(await AssociateToken.complete({ document: { associate: true } }, null));
    });

    it('complete() returns false when associate is falsy', async () => {
        assert.isFalse(await AssociateToken.complete({ document: { associate: false } }, null));
    });

    it('validate() returns true when account and relayer match', async () => {
        const req = { accountId: '0.0.1', relayerAccount: 'r' };
        const res = { accountId: '0.0.1', relayerAccount: 'r' };
        assert.isTrue(await AssociateToken.validate(req, res, null));
    });

    it('validate() returns false when accounts differ', async () => {
        const req = { accountId: '0.0.1', relayerAccount: 'r' };
        const res = { accountId: '0.0.2', relayerAccount: 'r' };
        assert.isFalse(await AssociateToken.validate(req, res, null));
    });

    it('validate() returns false when request is missing', async () => {
        assert.isFalse(await AssociateToken.validate(null, { accountId: 'a' }, null));
    });

    it('validate() returns false (catch) when an arg throws on access', async () => {
        const thrower = new Proxy({}, { get() { throw new Error('boom'); } });
        assert.isFalse(await AssociateToken.validate(thrower, { accountId: 'a', relayerAccount: 'r' }, null));
    });
});

describe('DissociateToken', () => {
    it('local() returns the dissociate result', async () => {
        const out = await DissociateToken.local({ ref, token, user: 'did:u', relayerAccount: 'r', userId: null });
        assert.isTrue(out);
    });

    it('request() builds a DissociateToken document', async () => {
        const out = await DissociateToken.request({ ref, token, user: 'did:u', relayerAccount: 'r', userId: null });
        assert.equal(out.document.type, 'dissociate-token');
        assert.deepEqual(out.document.token, token);
    });

    it('response() returns the dissociate result', async () => {
        const row = { policyId: 'p1', blockTag: 'bt', document: { token } };
        const out = await DissociateToken.response({ row, user: { did: 'did:u' }, relayerAccount: 'r', userId: null });
        assert.equal(out.type, 'dissociate-token');
        assert.isTrue(out.dissociate);
    });

    it('complete() reflects the dissociate flag', async () => {
        assert.isTrue(await DissociateToken.complete({ document: { dissociate: 1 } }, null));
        assert.isFalse(await DissociateToken.complete({ document: { dissociate: 0 } }, null));
    });

    it('validate() returns false when relayer accounts differ', async () => {
        const req = { accountId: '0.0.1', relayerAccount: 'r1' };
        const res = { accountId: '0.0.1', relayerAccount: 'r2' };
        assert.isFalse(await DissociateToken.validate(req, res, null));
    });

    it('validate() returns true for matching request/response', async () => {
        const req = { accountId: '0.0.1', relayerAccount: 'r' };
        const res = { accountId: '0.0.1', relayerAccount: 'r' };
        assert.isTrue(await DissociateToken.validate(req, res, null));
    });
});

});
