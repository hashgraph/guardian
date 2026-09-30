import {
    DataBaseHelper,
    DatabaseServer,
    DidDocument,
    ExternalPolicy,
    IRemoteJoinDocument,
    IRemoteJoinReply,
    ITopicMessage,
    KeyType,
    MessageAction,
    MessageServer,
    NotificationHelper,
    openRemoteJoinMessageKey,
    PolicyActionMessage,
    PolicyJoinMessage,
    RemotePolicyParticipant,
    resolvePublishedDidDocument,
    sendRemoteJoinReply,
    Topic,
    Users,
    VcHelper,
    verifyRemoteJoinProof,
    Wallet,
} from '@guardian/common';
import { DidDocumentStatus, RemoteJoinStatus, RemoteParticipantStatus, TopicType } from '@guardian/interfaces';

/**
 * Consensus time of a message id (`seconds.nanos`) in milliseconds
 * @param messageId
 */
export function consensusTime(messageId: string): number {
    const time = Number.parseFloat(messageId) * 1000;
    return Number.isFinite(time) ? time : Date.now();
}

/**
 * Compare two message ids by consensus time
 * @param a
 * @param b
 */
function compareMessageIds(a: string, b: string): number {
    const [as, an] = String(a).split('.');
    const [bs, bn] = String(b).split('.');
    const seconds = BigInt(as || '0') - BigInt(bs || '0');
    if (seconds !== BigInt(0)) {
        return seconds > BigInt(0) ? 1 : -1;
    }
    const nanos = BigInt((an || '').padEnd(9, '0') || '0') - BigInt((bn || '').padEnd(9, '0') || '0');
    return nanos === BigInt(0) ? 0 : (nanos > BigInt(0) ? 1 : -1);
}

/**
 * Join requests of remote users.
 * On the Main instance a join request creates a remote user without a login and a
 * pending participant the policy owner approves or rejects. On the home instance
 * the reply of the policy owner updates the status of the remote policy.
 */
export class PolicyJoinService {
    constructor(
        private readonly policyId: string,
        private readonly policyMessageId: string,
        private readonly policyOwner: string,
        private readonly policyOwnerId: string | null
    ) {
    }

    /**
     * Process a join request on the Main instance
     * @param data - topic message
     * @returns the participant, or null when the request is ignored
     */
    public async processJoinRequest(data: ITopicMessage): Promise<RemotePolicyParticipant | null> {
        const message = PolicyJoinMessage.from(data);
        await MessageServer.loadDocument(message, null, { dryRun: null, mockId: null } as any);
        const document: IRemoteJoinDocument = message.getDocument();
        const proof = document?.proof;
        if (!proof || typeof proof !== 'object') {
            throw new Error('Join proof is missing.');
        }

        // the payer is the only part of the message a sender cannot choose
        if (
            !message.payer ||
            message.payer !== proof.hederaAccountId ||
            message.payer !== message.accountId ||
            message.owner !== proof.did
        ) {
            throw new Error('Join request is not paid by the account of the user.');
        }
        if (proof.policyMessageId !== this.policyMessageId) {
            throw new Error('Join request is for another policy.');
        }

        const collection = new DataBaseHelper(RemotePolicyParticipant);
        const existing = await collection.findOne({ policyId: this.policyId, did: proof.did });
        if (existing) {
            // a replayed or older join changes nothing
            if (existing.joinMessageId === message.id) {
                return existing;
            }
            if (existing.joinMessageId && compareMessageIds(message.id, existing.joinMessageId) <= 0) {
                return existing;
            }
        }

        const didDocument = await resolvePublishedDidDocument(
            proof.did,
            proof.topicId,
            proof.hederaAccountId,
            this.policyOwnerId
        );
        verifyRemoteJoinProof(
            document,
            didDocument,
            message.payer,
            this.policyMessageId,
            consensusTime(message.id)
        );

        const ownerDidDocument = await new VcHelper().loadDidDocument(this.policyOwner, this.policyOwnerId);
        if (!ownerDidDocument) {
            throw new Error('Policy owner DID document is not available.');
        }
        const messageKey = openRemoteJoinMessageKey(document, ownerDidDocument);

        const user = await new Users().createRemoteUser(
            proof.did,
            proof.hederaAccountId,
            this.policyOwner,
            this.policyOwnerId
        );
        await this.saveDidDocument(didDocument.getDid(), didDocument.getDocument(), proof.topicId);
        await this.saveMessageKey(proof.did, messageKey);

        let participant: RemotePolicyParticipant;
        if (existing) {
            participant = existing;
            participant.hederaAccountId = proof.hederaAccountId;
            participant.topicId = proof.topicId;
            participant.joinMessageId = message.id;
            participant.issued = proof.issued;
            if (participant.status !== RemoteParticipantStatus.APPROVED) {
                participant.status = RemoteParticipantStatus.PENDING;
            }
            await collection.save(participant);
        } else {
            participant = await collection.save({
                policyId: this.policyId,
                policyMessageId: this.policyMessageId,
                owner: this.policyOwner,
                did: proof.did,
                hederaAccountId: proof.hederaAccountId,
                topicId: proof.topicId,
                joinMessageId: message.id,
                issued: proof.issued,
                status: RemoteParticipantStatus.PENDING
            });
        }

        if (participant.status === RemoteParticipantStatus.APPROVED) {
            // the home instance sent a new join, so it lost the earlier reply
            participant.replyMessageId = await sendRemoteJoinReply(participant, true, this.policyOwnerId);
            await collection.save(participant);
        } else if (this.policyOwnerId) {
            NotificationHelper.info(
                'Remote participant',
                `A remote user ${user?.did || proof.did} asked to join the policy`,
                this.policyOwnerId
            ).catch(() => null);
        }
        return participant;
    }

    /**
     * Process the reply of the policy owner on the home instance
     * @param message
     * @returns the updated remote policy, or null when the reply is ignored
     */
    public async processJoinReply(message: PolicyActionMessage): Promise<ExternalPolicy | null> {
        const accepted = message.action === MessageAction.RemotePolicyJoinAccepted;
        if (!accepted && message.action !== MessageAction.RemotePolicyJoinRejected) {
            return null;
        }
        const item = await DatabaseServer.getExternalPolicy({
            messageId: this.policyMessageId,
            creator: message.owner
        });
        if (!item?.joinMessageId || item.joinMessageId !== message.parent) {
            return null;
        }
        if (item.joinReplyMessageId && compareMessageIds(message.id, item.joinReplyMessageId) <= 0) {
            return item;
        }

        // only the holder of the message key, sealed to the policy owner, can write the reply
        const messageKey = await new Wallet().getUserKey(
            message.owner,
            KeyType.MESSAGE_KEY,
            `${message.owner}#${this.policyMessageId}`,
            null
        );
        if (!messageKey) {
            return null;
        }
        let reply: IRemoteJoinReply;
        try {
            await MessageServer.loadDocument(message, messageKey, { dryRun: null, mockId: null } as any);
            reply = message.getDocument();
        } catch (error) {
            return null;
        }
        if (
            !reply ||
            reply.did !== message.owner ||
            reply.policyMessageId !== this.policyMessageId ||
            reply.joinMessageId !== item.joinMessageId ||
            reply.accepted !== accepted
        ) {
            return null;
        }

        item.joinStatus = accepted ? RemoteJoinStatus.ACCEPTED : RemoteJoinStatus.REJECTED;
        item.joinReplyMessageId = message.id;
        item.joinError = null;
        await DatabaseServer.updateExternalPolicy(item);

        try {
            const user = await new Users().getUserById(message.owner, null);
            if (user?.id) {
                await NotificationHelper.info(
                    'Remote policy',
                    accepted
                        ? `The Main instance approved your participation in ${item.name || 'the policy'}`
                        : `The Main instance rejected your participation in ${item.name || 'the policy'}`,
                    user.id
                );
            }
        } catch (error) {
            // notification is best-effort
        }
        return item;
    }

    private async saveDidDocument(did: string, document: any, topicId: string): Promise<void> {
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

    private async saveMessageKey(did: string, messageKey: string): Promise<void> {
        const keys = await DatabaseServer.getKeys({ messageId: this.policyMessageId, owner: did });
        if (!keys?.length) {
            await DatabaseServer.saveKey({ messageId: this.policyMessageId, owner: did });
        }
        await new Wallet().setUserKey(
            did,
            KeyType.MESSAGE_KEY,
            `${did}#${this.policyMessageId}`,
            messageKey,
            this.policyOwnerId
        );
    }
}
