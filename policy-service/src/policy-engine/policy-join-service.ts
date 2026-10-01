import {
    DataBaseHelper,
    DatabaseServer,
    DisconnectedPolicy,
    ExternalPolicy,
    expireRemoteParticipants,
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
    remoteJoinLimits,
    resolvePublishedDidDocument,
    saveRemoteUserMessageKey,
    sendRemoteJoinReply,
    Users,
    VcHelper,
    verifyRemoteJoinProof,
    Wallet,
} from '@guardian/common';
import { RemoteJoinStatus, RemoteParticipantStatus } from '@guardian/interfaces';

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
     * Process a join request on the Main instance.
     * Anyone can post to the actions topic, so a verified join only records a pending
     * participant with the message key still sealed: the remote user, its DID document
     * and its key are stored when the policy owner approves it.
     * A newer join of an approved participant (for example after a full disconnection)
     * reconnects the user.
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
        await expireRemoteParticipants(this.policyId);
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
        const approved = existing?.status === RemoteParticipantStatus.APPROVED;
        const newPending = !existing || existing.status === RemoteParticipantStatus.REJECTED;
        if (newPending) {
            const { pendingLimit } = remoteJoinLimits();
            const pending = await collection.count({ policyId: this.policyId, status: RemoteParticipantStatus.PENDING });
            if (pending >= pendingLimit) {
                console.warn(`Remote join of ${proof.did} to policy ${this.policyId} dropped: ${pending} requests are pending.`);
                return null;
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

        if (approved) {
            return await this.rejoin(existing, document, message.id);
        }

        const participant = existing || collection.create({
            policyId: this.policyId,
            policyMessageId: this.policyMessageId,
            owner: this.policyOwner,
            did: proof.did
        });
        participant.hederaAccountId = proof.hederaAccountId;
        participant.topicId = proof.topicId;
        participant.joinMessageId = message.id;
        participant.issued = proof.issued;
        participant.joinedAt = new Date();
        participant.sealedKey = document.messageKey;
        participant.status = RemoteParticipantStatus.PENDING;
        const saved = await collection.save(participant);

        if (this.policyOwnerId) {
            NotificationHelper.info(
                'Remote participant',
                `A remote user ${proof.did} asked to join the policy`,
                this.policyOwnerId
            ).catch(() => null);
        }
        return saved;
    }

    /**
     * A newer verified join of an approved participant: the home instance may have a new
     * message key, and the user may have disconnected from the policy.
     * @param participant
     * @param document
     * @param joinMessageId
     */
    private async rejoin(
        participant: RemotePolicyParticipant,
        document: IRemoteJoinDocument,
        joinMessageId: string
    ): Promise<RemotePolicyParticipant> {
        const collection = new DataBaseHelper(RemotePolicyParticipant);
        const ownerDidDocument = await new VcHelper().loadDidDocument(this.policyOwner, this.policyOwnerId);
        if (!ownerDidDocument) {
            throw new Error('Policy owner DID document is not available.');
        }
        const messageKey = openRemoteJoinMessageKey(document, ownerDidDocument);
        await saveRemoteUserMessageKey(participant.did, this.policyMessageId, messageKey, this.policyOwnerId);

        const disconnected = await new DataBaseHelper(DisconnectedPolicy)
            .findOne({ policyId: this.policyId, owner: participant.did });
        if (disconnected) {
            await DatabaseServer.reconnectPolicy(this.policyId, participant.did);
            await new DatabaseServer().reconnectPolicyDocuments(this.policyId, { did: participant.did } as any);
        }

        participant.hederaAccountId = document.proof.hederaAccountId;
        participant.topicId = document.proof.topicId;
        participant.joinMessageId = joinMessageId;
        participant.issued = document.proof.issued;
        participant.joinedAt = new Date();
        participant.sealedKey = null;
        await collection.save(participant);

        // the home instance sent a new join, so it waits for a new answer
        participant.replyMessageId = await sendRemoteJoinReply(participant, true, this.policyOwnerId, messageKey);
        return await collection.save(participant);
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
}
