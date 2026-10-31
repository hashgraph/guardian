import { DidDocumentStatus, GenerateUUIDv4, RemoteParticipantStatus, TopicType } from '@guardian/interfaces';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { DidDocument } from '@guardian/common/entity/did-document';
import { RemotePolicyParticipant } from '@guardian/common/entity/remote-policy-participant';
import { Topic } from '@guardian/common/entity/topic';
import { DataBaseHelper } from '@guardian/common/helpers/db-helper';
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
 * Default number of pending participants a policy accepts
 */
const DEFAULT_PENDING_JOIN_LIMIT = 100;

/**
 * Default number of days a pending participant waits for the policy owner
 */
const DEFAULT_PENDING_JOIN_EXPIRY_DAYS = 30;

function positiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Limits of pending join requests:
 * REMOTE_POLICY_PENDING_JOIN_LIMIT - pending participants per policy (default 100),
 * REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS - days a pending participant is kept (default 30)
 */
export function remoteJoinLimits(): { pendingLimit: number, pendingExpiryMs: number } {
    return {
        pendingLimit: Math.floor(positiveNumber(process.env.REMOTE_POLICY_PENDING_JOIN_LIMIT, DEFAULT_PENDING_JOIN_LIMIT)),
        pendingExpiryMs: positiveNumber(
            process.env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS, DEFAULT_PENDING_JOIN_EXPIRY_DAYS
        ) * 24 * 60 * 60 * 1000
    };
}

/**
 * A pending participant that waited longer than the expiry period
 * @param participant
 * @param now
 */
export function isRemoteParticipantExpired(participant: RemotePolicyParticipant, now: number = Date.now()): boolean {
    if (participant?.status !== RemoteParticipantStatus.PENDING) {
        return false;
    }
    const joinedAt = participant.joinedAt ? new Date(participant.joinedAt).getTime() : NaN;
    return Number.isFinite(joinedAt) && now - joinedAt > remoteJoinLimits().pendingExpiryMs;
}

/**
 * Delete the pending participants of a policy that expired
 * @param policyId
 * @param now
 */
export async function expireRemoteParticipants(policyId: string, now: number = Date.now()): Promise<void> {
    const before = new Date(now - remoteJoinLimits().pendingExpiryMs);
    await new DataBaseHelper(RemotePolicyParticipant).delete({
        policyId,
        status: RemoteParticipantStatus.PENDING,
        joinedAt: { $lt: before }
    } as any);
}

/**
 * Store the DID document (resolved from Hedera) and the DID topic of a remote user, if missing
 * @param did
 * @param document
 * @param topicId
 */
export async function saveRemoteUserDidDocument(did: string, document: any, topicId: string): Promise<void> {
    const didCollection = new DataBaseHelper(DidDocument);
    const row = await didCollection.findOne({ did });
    if (!row) {
        await didCollection.save({
            did,
            document,
            status: DidDocumentStatus.CREATE,
            topicId,
            verificationMethods: {}
        });
    }
    const topicCollection = new DataBaseHelper(Topic);
    const topic = await topicCollection.findOne({ topicId });
    if (!topic) {
        await topicCollection.save({
            type: TopicType.UserTopic,
            name: TopicType.UserTopic,
            description: TopicType.UserTopic,
            owner: did,
            topicId,
            policyId: null,
            policyUUID: null,
        });
    }
}

/**
 * Store the message key of a remote user for a policy
 * @param did
 * @param policyMessageId
 * @param messageKey
 * @param userId
 */
export async function saveRemoteUserMessageKey(
    did: string,
    policyMessageId: string,
    messageKey: string,
    userId: string | null
): Promise<void> {
    const keys = await DatabaseServer.getKeys({ messageId: policyMessageId, owner: did });
    if (!keys?.length) {
        await DatabaseServer.saveKey({ messageId: policyMessageId, owner: did });
    }
    await new Wallet().setUserKey(did, KeyType.MESSAGE_KEY, `${did}#${policyMessageId}`, messageKey, userId);
}

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
 * @param key - message key, when it is not stored (a request rejected before approval)
 * @returns reply message id
 */
export async function sendRemoteJoinReply(
    participant: RemotePolicyParticipant,
    accepted: boolean,
    userId: string | null,
    key?: string
): Promise<string> {
    const policy = await DatabaseServer.getPolicyById(participant.policyId);
    if (!policy?.actionsTopicId) {
        throw new Error('Policy does not exist.');
    }
    const messageKey = key || await new Wallet().getUserKey(
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
