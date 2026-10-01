import { ApiResponse } from './helpers/api-response.js';
import {
    DataBaseHelper,
    DatabaseServer,
    DisconnectedPolicy,
    expireRemoteParticipants,
    isRemoteParticipantExpired,
    KeyType,
    MessageError,
    MessageResponse,
    openRemoteJoinMessageKey,
    PinoLogger,
    RemotePolicyParticipant,
    resolvePublishedDidDocument,
    saveRemoteUserDidDocument,
    saveRemoteUserMessageKey,
    sendRemoteJoinReply,
    Users,
    VcHelper,
    Wallet,
} from '@guardian/common';
import { AssignedEntityType, EntityOwner, IOwner, MessageAPI, RemoteParticipantStatus } from '@guardian/interfaces';
import { serDefaultRole } from './permission.service.js';

/**
 * Load a participant of a policy owned by the user
 * @param participantId
 * @param owner
 */
async function getOwnParticipant(participantId: string, owner: IOwner): Promise<RemotePolicyParticipant> {
    if (!participantId || !owner?.owner) {
        throw new Error('Invalid parameters.');
    }
    const collection = new DataBaseHelper(RemotePolicyParticipant);
    const participant = await collection.findOne({ id: participantId });
    if (!participant || participant.owner !== owner.owner) {
        throw new Error('Participant does not exist.');
    }
    const policy = await DatabaseServer.getPolicyById(participant.policyId);
    if (!policy || policy.owner !== owner.owner) {
        throw new Error('Participant does not exist.');
    }
    if (isRemoteParticipantExpired(participant)) {
        await collection.remove(participant);
        throw new Error('The join request has expired.');
    }
    return participant;
}

/**
 * Open the sealed message key of a participant with the DID key of the policy owner
 * @param participant
 * @param owner
 */
async function openParticipantKey(participant: RemotePolicyParticipant, owner: IOwner): Promise<string> {
    const ownerDidDocument = await new VcHelper().loadDidDocument(participant.owner, owner.id);
    if (!ownerDidDocument) {
        throw new Error('Policy owner DID document is not available.');
    }
    return openRemoteJoinMessageKey({
        proof: { did: participant.did, policyMessageId: participant.policyMessageId } as any,
        messageKey: participant.sealedKey
    }, ownerDidDocument);
}

/**
 * Approve a remote participant: create the remote user without a login, store its DID
 * document and message key, assign the policy to it, publish its USER_PERMISSIONS
 * credential and reply to the home instance. Nothing is created before this point, so
 * join requests from strangers cost the policy owner nothing.
 * @param participantId
 * @param owner
 */
export async function approveRemoteParticipant(
    participantId: string,
    owner: IOwner
): Promise<RemotePolicyParticipant> {
    const participant = await getOwnParticipant(participantId, owner);
    const collection = new DataBaseHelper(RemotePolicyParticipant);

    if (participant.sealedKey) {
        const didDocument = await resolvePublishedDidDocument(
            participant.did,
            participant.topicId,
            participant.hederaAccountId,
            owner.id
        );
        const messageKey = await openParticipantKey(participant, owner);
        // a DID that belongs to another user is refused here
        const user = await new Users().createRemoteUser(
            participant.did,
            participant.hederaAccountId,
            participant.owner,
            owner.id
        );
        if (user?.created) {
            participant.permissionsPending = true;
        }
        await saveRemoteUserDidDocument(participant.did, didDocument.getDocument(), participant.topicId);
        await saveRemoteUserMessageKey(participant.did, participant.policyMessageId, messageKey, owner.id);
        participant.sealedKey = null;
        await collection.save(participant);
    } else {
        const messageKey = await new Wallet().getUserKey(
            participant.did,
            KeyType.MESSAGE_KEY,
            `${participant.did}#${participant.policyMessageId}`,
            owner.id
        );
        if (!messageKey) {
            throw new Error('The join request was rejected. The user must send a new one.');
        }
    }

    const assigned = await DatabaseServer.getAssignedEntity(AssignedEntityType.Policy, participant.policyId, participant.did);
    if (!assigned) {
        await DatabaseServer.assignEntity(AssignedEntityType.Policy, participant.policyId, true, participant.did, owner.owner);
    }
    // approval admits the user again after a full disconnection
    const disconnected = await new DataBaseHelper(DisconnectedPolicy)
        .findOne({ policyId: participant.policyId, owner: participant.did });
    if (disconnected) {
        await DatabaseServer.reconnectPolicy(participant.policyId, participant.did);
        await new DatabaseServer().reconnectPolicyDocuments(participant.policyId, { did: participant.did } as any);
    }

    if (participant.permissionsPending) {
        // the same credential the manual registration publishes
        const user = await new Users().getUserById(participant.did, owner.id);
        await serDefaultRole(user, EntityOwner.sr(null, participant.owner));
        participant.permissionsPending = false;
    }

    participant.status = RemoteParticipantStatus.APPROVED;
    await collection.save(participant);
    // approving again publishes the reply again, e.g. after a failed attempt
    participant.replyMessageId = await sendRemoteJoinReply(participant, true, owner.id);
    return await collection.save(participant);
}

/**
 * Reject a remote participant: leave the policy unassigned, delete the sealed key and
 * reply to the home instance
 * @param participantId
 * @param owner
 */
export async function rejectRemoteParticipant(
    participantId: string,
    owner: IOwner
): Promise<RemotePolicyParticipant> {
    const participant = await getOwnParticipant(participantId, owner);
    let messageKey: string | undefined;
    if (participant.sealedKey) {
        // the reply is encrypted with the key; it is opened for that only and not stored
        try {
            messageKey = await openParticipantKey(participant, owner);
        } catch (error) {
            messageKey = undefined;
        }
    }
    await DatabaseServer.removeAssignEntity(AssignedEntityType.Policy, participant.policyId, participant.did);
    participant.status = RemoteParticipantStatus.REJECTED;
    participant.sealedKey = null;
    const collection = new DataBaseHelper(RemotePolicyParticipant);
    await collection.save(participant);
    participant.replyMessageId = await sendRemoteJoinReply(participant, false, owner.id, messageKey);
    return await collection.save(participant);
}

/**
 * Connect to the message broker methods of working with remote participants.
 */
export async function remoteParticipantsAPI(logger: PinoLogger): Promise<void> {
    /**
     * Get remote participants of a policy
     *
     * @param {any} msg - policy id, page
     *
     * @returns {any} - participants and count
     */
    ApiResponse(MessageAPI.GET_REMOTE_PARTICIPANTS,
        async (msg: { policyId: string, pageIndex?: any, pageSize?: any, owner: IOwner }) => {
            try {
                if (!msg?.policyId || !msg.owner?.owner) {
                    return new MessageError('Invalid parameters.');
                }
                const { policyId, pageIndex, pageSize, owner } = msg;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.owner !== owner.owner) {
                    return new MessageError('Policy does not exist.', 404);
                }
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                const options: any = { orderBy: { createDate: 'DESC' } };
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    options.limit = _pageSize;
                    options.offset = _pageIndex * _pageSize;
                } else {
                    options.limit = 100;
                    options.offset = 0;
                }
                await expireRemoteParticipants(policyId);
                const [items, count] = await new DataBaseHelper(RemotePolicyParticipant)
                    .findAndCount({ policyId, owner: owner.owner }, options);
                for (const item of items) {
                    // the sealed key is for the approval only
                    delete item.sealedKey;
                }
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Approve a remote participant
     *
     * @param {any} msg - participant id
     *
     * @returns {any} - participant
     */
    ApiResponse(MessageAPI.APPROVE_REMOTE_PARTICIPANT,
        async (msg: { participantId: string, owner: IOwner }) => {
            try {
                return new MessageResponse(await approveRemoteParticipant(msg?.participantId, msg?.owner));
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Reject a remote participant
     *
     * @param {any} msg - participant id
     *
     * @returns {any} - participant
     */
    ApiResponse(MessageAPI.REJECT_REMOTE_PARTICIPANT,
        async (msg: { participantId: string, owner: IOwner }) => {
            try {
                return new MessageResponse(await rejectRemoteParticipant(msg?.participantId, msg?.owner));
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });
}
