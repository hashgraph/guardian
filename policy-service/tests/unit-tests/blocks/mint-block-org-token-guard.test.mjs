import assert from 'node:assert/strict';
import { OrgRolePermission } from '@guardian/interfaces';
import { Users } from '@guardian/common';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MintBlock } from '../../../dist/policy-engine/blocks/mint-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const _origStore = [];
function ovr(obj, name, fn) {
    _origStore.push({ obj, name, orig: obj[name] });
    obj[name] = fn;
}
function restoreOverrides() {
    while (_origStore.length) {
        const { obj, name, orig } = _origStore.pop();
        obj[name] = orig;
    }
}
function captureEvents(block) {
    const cap = [];
    block.triggerEvents = (...a) => { cap.push(a); return Promise.resolve([]); };
    block.saveState = async () => { };
    block.backup = () => { };
    return cap;
}

after(() => { restoreOverrides(); restoreHarness(); });

describe('@unit mint-block org TOKEN_MINTING guard', () => {
    afterEach(() => restoreOverrides());

    const ORG_ACCOUNT = '0.0.1001';
    const OWN_ACCOUNT = '0.0.2002';
    const OTHER_ACCOUNT = '0.0.3003';
    const MINTING_ERROR = /Insufficient organization permissions for token minting/;
    const TRANSFER_ERROR = /Insufficient organization permissions for token transfer/;

    /**
     * Drive run() with everything around the guard stubbed, but leave the real
     * getAccount() to resolve targetAccount so each of its three account paths is
     * genuinely exercised. mintProcessing records its args: the guard has to reject
     * before it is reached.
     */
    function setupRun(options, { accounts = [], relayerAccount = OWN_ACCOUNT, orgAccount = ORG_ACCOUNT } = {}) {
        const { block } = makeBlock(MintBlock, { options });
        const events = captureEvents(block);
        ovr(PolicyComponentsUtils, 'ExternalEventFn', () => { });
        ovr(PolicyUtils, 'getDocumentRelayerAccount', async () => relayerAccount);
        // the single NATS hop checkOrgTokenPermission makes, via getOrgHederaAccountId
        ovr(Users.prototype, 'getOrgHederaInfo', async () => ({ hederaAccountId: orgAccount }));
        block.getToken = async () => ({ tokenId: '0.0.5' });
        block.getObjects = async () => ({ vcs: [], messages: [], topics: ['0.0.1'], accounts });
        const minted = [];
        block.mintProcessing = async (...a) => { minted.push(a); return [{}, 1]; };
        return { block, minted, events };
    }

    // a fresh user per test also gives a fresh WeakMap memo in getOrgHederaAccountId
    const member = (permissions) => makeUser({
        did: 'did:member',
        hederaAccountId: OWN_ACCOUNT,
        organization: 'org-1',
        organizationRolePermissions: permissions,
    });

    const run = (block, user) => block.run(
        block,
        { user, data: {}, actionStatus: null },
        makeUser({ did: 'did:owner' }),
        [{ id: 'd1' }],
        null,
        'uid-1',
    );

    // mintProcessing(token, topicId, user, relayerAccount, targetAccount, ...)
    const RELAYER_ARG = 3;
    const TARGET_ARG = 4;

    it('rejects when the document names the org account (default accountType + accountId)', async () => {
        const { block, minted } = setupRun({ accountId: 'beneficiary' }, { accounts: [ORG_ACCOUNT] });
        await assert.rejects(run(block, member([])), MINTING_ERROR);
        assert.equal(minted.length, 0);
    });

    it('rejects when the relayer account is the org account, and TOKEN_TRANSFER does not confer minting', async () => {
        const { block, minted } = setupRun({}, { relayerAccount: ORG_ACCOUNT });
        await assert.rejects(run(block, member([OrgRolePermission.TOKEN_TRANSFER])), MINTING_ERROR);
        assert.equal(minted.length, 0);
    });

    it('rejects when accountIdValue is the org account (custom-value)', async () => {
        const { block, minted } = setupRun({ accountType: 'custom-value', accountIdValue: ORG_ACCOUNT });
        await assert.rejects(run(block, member([])), MINTING_ERROR);
        assert.equal(minted.length, 0);
    });

    it('allows a member holding TOKEN_MINTING and mints into the org account', async () => {
        const { block, minted } = setupRun({ accountId: 'beneficiary' }, { accounts: [ORG_ACCOUNT] });
        await run(block, member([OrgRolePermission.TOKEN_MINTING]));
        assert.equal(minted.length, 1);
        assert.equal(minted[0][TARGET_ARG], ORG_ACCOUNT);
    });

    it('leaves non-org target accounts alone — the guard self-limits to the org account', async () => {
        const { block, minted } = setupRun({ accountId: 'beneficiary' }, { accounts: [OTHER_ACCOUNT] });
        await run(block, member([]));
        assert.equal(minted.length, 1);
        assert.equal(minted[0][TARGET_ARG], OTHER_ACCOUNT);
    });

    it('leaves a user with no organization alone', async () => {
        const { block, minted } = setupRun({ accountId: 'beneficiary' }, { accounts: [ORG_ACCOUNT] });
        await run(block, makeUser({ hederaAccountId: OWN_ACCOUNT }));
        assert.equal(minted.length, 1);
    });

    // this entry point does not pass through runAction()
    it('rejects through the additionalMintEvent entry point', async () => {
        const { block, minted } = setupRun({ accountId: 'beneficiary' }, { accounts: [ORG_ACCOUNT] });
        ovr(PolicyUtils, 'getArray', (d) => Array.isArray(d) ? d : [d]);
        ovr(PolicyUtils, 'getDocumentOwner', async () => makeUser({ did: 'did:owner' }));
        await assert.rejects(
            block.additionalMintEvent({
                user: member([]),
                data: { data: [{ id: 'd1' }], result: [{ messageId: 'add1' }] },
                actionStatus: null,
            }),
            MINTING_ERROR
        );
        assert.equal(minted.length, 0);
    });

    it('rejects the relayer transfer when the relayer is the org account and the target is not', async () => {
        const { block, minted } = setupRun(
            { accountId: 'beneficiary' },
            { accounts: [OTHER_ACCOUNT], relayerAccount: ORG_ACCOUNT }
        );
        await assert.rejects(run(block, member([OrgRolePermission.TOKEN_MINTING])), TRANSFER_ERROR);
        assert.equal(minted.length, 0);
    });

    it('allows the relayer transfer when the member holds TOKEN_TRANSFER', async () => {
        const { block, minted } = setupRun(
            { accountId: 'beneficiary' },
            { accounts: [OTHER_ACCOUNT], relayerAccount: ORG_ACCOUNT }
        );
        await run(block, member([OrgRolePermission.TOKEN_TRANSFER]));
        assert.equal(minted.length, 1);
        assert.equal(minted[0][RELAYER_ARG], ORG_ACCOUNT);
        assert.equal(minted[0][TARGET_ARG], OTHER_ACCOUNT);
    });
});
