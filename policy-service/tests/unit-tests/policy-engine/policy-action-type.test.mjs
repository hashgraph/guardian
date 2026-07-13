import { assert } from 'chai';
import { PolicyActionType } from '../../../dist/policy-engine/policy-actions/policy-action.type.js';

const expected = {
    SignAndSendRole: 'sign-and-send-role',
    GenerateDID: 'generate-did',
    SignVC: 'sign-vc',
    SendMessage: 'send-message',
    SendMessages: 'send-messages',
    CreateTopic: 'create-topic',
    AssociateToken: 'associate-token',
    DissociateToken: 'dissociate-token',
    AddRelayerAccount: 'add-relayer-account',
    CreatePolicyDiscussion: 'create-policy-discussion',
    CreatePolicyComment: 'create-policy-comment',
    DisconnectPolicy: 'disconnect-policy'
};

describe('PolicyActionType', () => {
    for (const [key, value] of Object.entries(expected)) {
        it(`maps ${key} to "${value}"`, () => {
            assert.equal(PolicyActionType[key], value);
        });
    }

    it('exposes exactly the expected members', () => {
        assert.deepEqual(Object.keys(PolicyActionType).sort(), Object.keys(expected).sort());
    });

    it('has unique string values', () => {
        const values = Object.values(PolicyActionType);
        assert.equal(new Set(values).size, values.length);
    });
});
