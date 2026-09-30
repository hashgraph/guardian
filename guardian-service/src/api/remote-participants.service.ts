import { ApiResponse } from './helpers/api-response.js';
import {
    DataBaseHelper,
    DatabaseServer,
    MessageError,
    MessageResponse,
    PinoLogger,
    RemotePolicyParticipant,
    sendRemoteJoinReply,
} from '@guardian/common';
import { AssignedEntityType, IOwner, MessageAPI, RemoteParticipantStatus } from '@guardian/interfaces';

/**
 * Load a participant of a policy owned by the user
 * @param participantId
 * @param owner
 */
async function getOwnParticipant(participantId: string, owner: IOwner): Promise<RemotePolicyParticipant> {
    if (!participantId || !owner?.owner) {
        throw new Error('Invalid parameters.');
    }
    const participant = await new DataBaseHelper(RemotePolicyParticipant).findOne({ id: participantId });
    if (!participant || participant.owner !== owner.owner) {
        throw new Error('Participant does not exist.');
    }
    const policy = await DatabaseServer.getPolicyById(participant.policyId);
    if (!policy || policy.owner !== owner.owner) {
        throw new Error('Participant does not exist.');
    }
    return participant;
}

/**
 * Approve a remote participant: assign the policy to the remote user and reply to the home instance
 * @param participantId
 * @param owner
 */
export async function approveRemoteParticipant(
    participantId: string,
    owner: IOwner
): Promise<RemotePolicyParticipant> {
    const participant = await getOwnParticipant(participantId, owner);
    const assigned = await DatabaseServer.getAssignedEntity(AssignedEntityType.Policy, participant.policyId, participant.did);
    if (!assigned) {
        await DatabaseServer.assignEntity(AssignedEntityType.Policy, participant.policyId, true, participant.did, owner.owner);
    }
    participant.status = RemoteParticipantStatus.APPROVED;
    const collection = new DataBaseHelper(RemotePolicyParticipant);
    await collection.save(participant);
    // approving again publishes the reply again, e.g. after a failed attempt
    participant.replyMessageId = await sendRemoteJoinReply(participant, true, owner.id);
    return await collection.save(participant);
}

/**
 * Reject a remote participant: leave the policy unassigned and reply to the home instance
 * @param participantId
 * @param owner
 */
export async function rejectRemoteParticipant(
    participantId: string,
    owner: IOwner
): Promise<RemotePolicyParticipant> {
    const participant = await getOwnParticipant(participantId, owner);
    await DatabaseServer.removeAssignEntity(AssignedEntityType.Policy, participant.policyId, participant.did);
    participant.status = RemoteParticipantStatus.REJECTED;
    const collection = new DataBaseHelper(RemotePolicyParticipant);
    await collection.save(participant);
    participant.replyMessageId = await sendRemoteJoinReply(participant, false, owner.id);
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
                const [items, count] = await new DataBaseHelper(RemotePolicyParticipant)
                    .findAndCount({ policyId, owner: owner.owner }, options);
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
