import { assert } from 'chai';
import esmock from 'esmock';
import { PolicyStatus } from '@guardian/interfaces';

const SERVICE = '../../../dist/policy-engine/actions-service.js';
const COMPONENTS_UTILS = '../../../dist/policy-engine/policy-components-utils.js';
const ACTIONS_UTILS = '../../../dist/policy-engine/policy-actions/utils.js';

/*
 * The actions topic has no submit key, so anyone can post to it. The Hedera payer is
 * the only thing tying a message to an account; the sender check was async and called
 * without await, so a Promise (always truthy) let every payer through.
 */
async function makeService({ policyUser, request = null } = {}) {
    const calls = { executed: [], validated: [], callbacks: [], errors: [] };
    const { PolicyActionsService } = await esmock(SERVICE, {
        '@guardian/common': {
            DataBaseHelper: class {
                async findOne() { return request; }
            },
        },
        [COMPONENTS_UTILS]: {
            PolicyComponentsUtils: {
                GetPolicyUserByDID: async () => policyUser,
            },
        },
        [ACTIONS_UTILS]: {
            PolicyActionsUtils: {
                validate: async (...args) => {
                    calls.validated.push(args);
                    return true;
                },
            },
        },
    });

    const service = new PolicyActionsService(
        'policy-1',
        {},
        { owner: 'did:policy-owner', status: PolicyStatus.PUBLISH, actionsTopicId: '0.0.1', messageId: 'm-1' },
        'user-1'
    );
    service.accessPolicy = async () => true;
    service.executeBlock = async (row) => { calls.executed.push(row); };
    service.executeGroup = async (row) => { calls.executed.push(row); };
    service.executeRemoteAction = async (row) => { calls.executed.push(row); };
    service.sentErrorMessage = async (row, error) => { calls.errors.push(error); };
    return { service, calls };
}

const action = (sender, accountId = '0.0.100') => ({
    owner: 'did:user',
    accountId,
    sender,
    blockTag: 'block-1',
    document: { data: 1 },
});

describe('@unit PolicyActionsService — Hedera payer checks', function () {
    this.timeout(60000);

    const policyUser = { did: 'did:user', hederaAccountId: '0.0.100' };

    it('executes an action paid by the user s own account', async () => {
        const { service, calls } = await makeService({ policyUser });

        await service.executeAction(action('0.0.100'));

        assert.lengthOf(calls.executed, 1);
    });

    it('drops an action paid by another account', async () => {
        const { service, calls } = await makeService({ policyUser });

        await service.executeAction(action('0.0.666'));

        assert.lengthOf(calls.executed, 0, 'a foreign payer must not run the block');
        assert.lengthOf(calls.errors, 0, 'no reply is published for a forged action');
    });

    it('drops an action whose claimed account differs from the payer', async () => {
        const { service, calls } = await makeService({ policyUser });

        await service.executeAction(action('0.0.100', '0.0.666'));

        assert.lengthOf(calls.executed, 0);
    });

    it('completes a request answered by the addressed account', async () => {
        const request = { messageId: 'req-1', accountId: '0.0.100' };
        const { service, calls } = await makeService({ request });
        service.callback.set('req-1', async (response) => { calls.callbacks.push(response); });

        await service.completeRequest({ startMessageId: 'req-1', sender: '0.0.100' });

        assert.lengthOf(calls.callbacks, 1);
    });

    it('ignores a response paid by another account', async () => {
        const request = { messageId: 'req-1', accountId: '0.0.100' };
        const { service, calls } = await makeService({ request });
        service.callback.set('req-1', async (response) => { calls.callbacks.push(response); });

        await service.completeRequest({ startMessageId: 'req-1', sender: '0.0.666' });

        assert.lengthOf(calls.validated, 0);
        assert.lengthOf(calls.callbacks, 0);
        assert.isTrue(service.callback.has('req-1'), 'the genuine response can still complete it');
    });
});
