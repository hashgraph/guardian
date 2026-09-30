import { GenerateUUIDv4 } from '@guardian/interfaces';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import type { RemotePolicyParticipant } from '@guardian/common/entity/remote-policy-participant';
import { Users } from '@guardian/common/helpers/users';
import { KeyType, Wallet } from '@guardian/common/helpers/wallet';
import { MessageAction } from './message/message-action.js';
import { MessageServer } from './message/message-server.js';
import { PolicyActionMessage } from './message/policy-action-message.js';
import { TopicConfig } from './topic.js';

/**
 * Tag of the join messages
 */
export const REMOTE_POLICY_JOIN_TAG = 'RemotePolicyJoin';

/**
 * Document of a join reply
 */
export interface IRemoteJoinReply {
    did: string;
    policyMessageId: string;
    joinMessageId: string;
    accepted: boolean;
}

/**
 * Publish the answer of the policy owner to a join request on the actions topic.
 * The reply is encrypted with the message key of the participant, so the home
 * instance can tell it was sent by the holder of the key it sealed to the owner.
 * @param participant
 * @param accepted
 * @param userId
 * @returns reply message id
 */
export async function sendRemoteJoinReply(
    participant: RemotePolicyParticipant,
    accepted: boolean,
    userId: string | null
): Promise<string> {
    const policy = await DatabaseServer.getPolicyById(participant.policyId);
    if (!policy?.actionsTopicId) {
        throw new Error('Policy does not exist.');
    }
    const messageKey = await new Wallet().getUserKey(
        participant.did,
        KeyType.MESSAGE_KEY,
        `${participant.did}#${participant.policyMessageId}`,
        userId
    );
    if (!messageKey) {
        throw new Error('Decentralized access key is not set');
    }
    const root = await new Users().getHederaAccount(policy.owner, userId);
    const topic = await TopicConfig.fromObject(
        await DatabaseServer.getTopicById(policy.actionsTopicId), false, userId
    );
    if (!topic) {
        throw new Error('Invalid action topic');
    }
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        encryptKey: messageKey,
        signOptions: root.signOptions
    });
    const reply: IRemoteJoinReply = {
        did: participant.did,
        policyMessageId: participant.policyMessageId,
        joinMessageId: participant.joinMessageId,
        accepted
    };
    const message = new PolicyActionMessage(
        accepted ? MessageAction.RemotePolicyJoinAccepted : MessageAction.RemotePolicyJoinRejected
    );
    message.setDocument({
        uuid: GenerateUUIDv4(),
        owner: participant.did,
        policyId: participant.policyId,
        accountId: participant.hederaAccountId,
        relayerAccount: null,
        blockTag: REMOTE_POLICY_JOIN_TAG,
        startMessageId: participant.joinMessageId
    } as any, reply);
    const result = await messageServer
        .setTopicObject(topic)
        .sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            userId,
            interception: null
        });
    return result.getId();
}
