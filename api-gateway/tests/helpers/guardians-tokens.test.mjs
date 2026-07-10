import assert from 'node:assert/strict';
import { MessageAPI } from '@guardian/interfaces';
import { Guardians } from '../../dist/helpers/guardians.js';

function make(canned = { ok: true }) {
    const g = new Guardians(undefined);
    const calls = [];
    g.sendMessage = async (subject, data) => {
        calls.push([subject, data]);
        return canned;
    };
    return { g, calls };
}

const owner = { creator: 'did:owner', owner: 'did:owner', id: 'o1' };
const task = { taskId: 't1', userId: 'u1' };

describe('Guardians tokens', () => {
    it('getTokens forwards filters and owner', async () => {
        const { g, calls } = make([{ tokenId: 'T' }]);
        const res = await g.getTokens({ tokenId: 'T' }, owner);
        assert.deepEqual(res, [{ tokenId: 'T' }]);
        assert.deepEqual(calls[0], [MessageAPI.GET_TOKENS, { filters: { tokenId: 'T' }, owner }]);
    });

    it('getTokensPage forwards paging', async () => {
        const { g, calls } = make();
        await g.getTokensPage(owner, 2, 50);
        assert.deepEqual(calls[0], [MessageAPI.GET_TOKENS_PAGE, { owner, pageIndex: 2, pageSize: 50 }]);
    });

    it('getTokensPage with no args sends undefined values', async () => {
        const { g, calls } = make();
        await g.getTokensPage();
        assert.deepEqual(calls[0], [MessageAPI.GET_TOKENS_PAGE, { owner: undefined, pageIndex: undefined, pageSize: undefined }]);
    });

    it('getTokensPageV2 forwards fields and paging', async () => {
        const { g, calls } = make();
        await g.getTokensPageV2(['a', 'b'], owner, 1, 10);
        assert.deepEqual(calls[0], [MessageAPI.GET_TOKENS_PAGE_V2, { fields: ['a', 'b'], owner, pageIndex: 1, pageSize: 10 }]);
    });

    it('getTokenById forwards tokenId and owner', async () => {
        const { g, calls } = make();
        await g.getTokenById('T1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_TOKEN, { tokenId: 'T1', owner }]);
    });

    it('setToken forwards item and owner', async () => {
        const { g, calls } = make();
        await g.setToken({ name: 'X' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.SET_TOKEN, { item: { name: 'X' }, owner }]);
    });

    it('setTokenAsync forwards token owner task', async () => {
        const { g, calls } = make();
        await g.setTokenAsync({ name: 'X' }, owner, task);
        assert.deepEqual(calls[0], [MessageAPI.SET_TOKEN_ASYNC, { token: { name: 'X' }, owner, task }]);
    });

    it('updateToken forwards token and owner', async () => {
        const { g, calls } = make();
        await g.updateToken({ tokenId: 'T' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.UPDATE_TOKEN, { token: { tokenId: 'T' }, owner }]);
    });

    it('updateTokenAsync forwards token owner task', async () => {
        const { g, calls } = make();
        await g.updateTokenAsync({ tokenId: 'T' }, owner, task);
        assert.deepEqual(calls[0], [MessageAPI.UPDATE_TOKEN_ASYNC, { token: { tokenId: 'T' }, owner, task }]);
    });

    it('deleteTokenAsync forwards tokenId owner task', async () => {
        const { g, calls } = make();
        await g.deleteTokenAsync('T', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_TOKEN_ASYNC, { tokenId: 'T', owner, task }]);
    });

    it('deleteTokensAsync forwards tokenIds owner task', async () => {
        const { g, calls } = make();
        await g.deleteTokensAsync(['T1', 'T2'], owner, task);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_TOKENS_ASYNC, { tokenIds: ['T1', 'T2'], owner, task }]);
    });

    it('freezeToken sets freeze true', async () => {
        const { g, calls } = make();
        await g.freezeToken('T', 'bob', owner);
        assert.deepEqual(calls[0], [MessageAPI.FREEZE_TOKEN, { tokenId: 'T', username: 'bob', owner, freeze: true }]);
    });

    it('freezeTokenAsync sets freeze true and task', async () => {
        const { g, calls } = make();
        await g.freezeTokenAsync('T', 'bob', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.FREEZE_TOKEN_ASYNC, { tokenId: 'T', username: 'bob', owner, freeze: true, task }]);
    });

    it('unfreezeToken sets freeze false', async () => {
        const { g, calls } = make();
        await g.unfreezeToken('T', 'bob', owner);
        assert.deepEqual(calls[0], [MessageAPI.FREEZE_TOKEN, { tokenId: 'T', username: 'bob', owner, freeze: false }]);
    });

    it('unfreezeTokenAsync sets freeze false and task', async () => {
        const { g, calls } = make();
        await g.unfreezeTokenAsync('T', 'bob', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.FREEZE_TOKEN_ASYNC, { tokenId: 'T', username: 'bob', owner, freeze: false, task }]);
    });

    it('grantKycToken sets grant true', async () => {
        const { g, calls } = make();
        await g.grantKycToken('T', 'bob', owner);
        assert.deepEqual(calls[0], [MessageAPI.KYC_TOKEN, { tokenId: 'T', username: 'bob', owner, grant: true }]);
    });

    it('grantKycTokenAsync sets grant true and task', async () => {
        const { g, calls } = make();
        await g.grantKycTokenAsync('T', 'bob', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.KYC_TOKEN_ASYNC, { tokenId: 'T', username: 'bob', owner, grant: true, task }]);
    });

    it('revokeKycToken sets grant false', async () => {
        const { g, calls } = make();
        await g.revokeKycToken('T', 'bob', owner);
        assert.deepEqual(calls[0], [MessageAPI.KYC_TOKEN, { tokenId: 'T', username: 'bob', owner, grant: false }]);
    });

    it('revokeKycTokenAsync sets grant false and task', async () => {
        const { g, calls } = make();
        await g.revokeKycTokenAsync('T', 'bob', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.KYC_TOKEN_ASYNC, { tokenId: 'T', username: 'bob', owner, grant: false, task }]);
    });

    it('associateToken sets associate true', async () => {
        const { g, calls } = make();
        await g.associateToken('T', '0.0.1', owner);
        assert.deepEqual(calls[0], [MessageAPI.ASSOCIATE_TOKEN, { tokenId: 'T', accountId: '0.0.1', owner, associate: true }]);
    });

    it('associateTokenAsync sets associate true and task', async () => {
        const { g, calls } = make();
        await g.associateTokenAsync('T', '0.0.1', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.ASSOCIATE_TOKEN_ASYNC, { tokenId: 'T', accountId: '0.0.1', owner, associate: true, task }]);
    });

    it('dissociateToken sets associate false', async () => {
        const { g, calls } = make();
        await g.dissociateToken('T', '0.0.1', owner);
        assert.deepEqual(calls[0], [MessageAPI.ASSOCIATE_TOKEN, { tokenId: 'T', accountId: '0.0.1', owner, associate: false }]);
    });

    it('dissociateTokenAsync sets associate false and task', async () => {
        const { g, calls } = make();
        await g.dissociateTokenAsync('T', '0.0.1', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.ASSOCIATE_TOKEN_ASYNC, { tokenId: 'T', accountId: '0.0.1', owner, associate: false, task }]);
    });

    it('transferToken forwards body', async () => {
        const { g, calls } = make();
        const body = { targetAccount: '0.0.2', amount: 5 };
        await g.transferToken('T', body, owner);
        assert.deepEqual(calls[0], [MessageAPI.TRANSFER_TOKEN, { tokenId: 'T', body, owner }]);
    });

    it('transferTokenAsync forwards body and task', async () => {
        const { g, calls } = make();
        const body = { targetAccount: '0.0.2', serialNumbers: [1, 2] };
        await g.transferTokenAsync('T', body, owner, task);
        assert.deepEqual(calls[0], [MessageAPI.TRANSFER_TOKEN_ASYNC, { tokenId: 'T', body, owner, task }]);
    });

    it('getInfoToken forwards args', async () => {
        const { g, calls } = make();
        await g.getInfoToken('T', 'bob', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_INFO_TOKEN, { tokenId: 'T', username: 'bob', owner }]);
    });

    it('getRelayerAccountInfo forwards args', async () => {
        const { g, calls } = make();
        const user = { id: 'u' };
        await g.getRelayerAccountInfo('T', '0.0.9', owner, user);
        assert.deepEqual(calls[0], [MessageAPI.GET_RELAYER_ACCOUNT_INFO, { tokenId: 'T', relayerAccountId: '0.0.9', owner, user }]);
    });

    it('getTokenSerials forwards args', async () => {
        const { g, calls } = make([1, 2, 3]);
        const res = await g.getTokenSerials(owner, 'T', 'did:x');
        assert.deepEqual(res, [1, 2, 3]);
        assert.deepEqual(calls[0], [MessageAPI.GET_SERIALS, { owner, tokenId: 'T', did: 'did:x' }]);
    });

    it('getAssociatedTokens forwards paging', async () => {
        const { g, calls } = make();
        await g.getAssociatedTokens(owner, 'did:x', 0, 20);
        assert.deepEqual(calls[0], [MessageAPI.GET_ASSOCIATED_TOKENS, { owner, did: 'did:x', pageIndex: 0, pageSize: 20 }]);
    });
});
