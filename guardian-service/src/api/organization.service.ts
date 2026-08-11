import { ApiResponse } from './helpers/api-response.js';
import {
    MessageError,
    MessageResponse,
    NewNotifier,
    PinoLogger,
} from '@guardian/common';
import { IOwner, MessageAPI } from '@guardian/interfaces';
import {
    enrollOrganizationMember,
    getOrgPolicyIdsForUser,
    IEnrollMemberPayload,
    IPublishOrganizationPayload,
    publishOrganization,
} from './helpers/organization-helper.js';

/**
 * Organization orchestration API (guardian-service side).
 *
 * Owns the on-ledger / cross-service orchestration for Organization publishing and member
 * enrollment, plus the dynamic org → policy-ids lookup that PolicyEngine.addAccessFilters uses
 * to additively widen policy visibility for org members.
 *
 * Record-layer CRUD lives in auth-service. REST surface lives in api-gateway.
 */
export async function organizationAPI(logger: PinoLogger): Promise<void> {
    /**
     * Publish a DRAFT organization: create the org topic under the SR/global topic, publish DID
     * + OrganizationMessage, store keys in the org wallet, and persist the hydrated record.
     */
    ApiResponse(MessageAPI.PUBLISH_ORGANIZATION, async (msg: {
        payload: IPublishOrganizationPayload,
        owner: IOwner,
        userId: string | null
    }) => {
        try {
            if (!msg) {
                throw new Error('Invalid publish organization parameters');
            }
            const { payload, owner, userId } = msg;
            const org = await publishOrganization({
                payload,
                owner,
                logger,
                notifier: NewNotifier.empty(),
                logId: userId
            });
            return new MessageResponse(org);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], msg?.userId);
            return new MessageError(error);
        }
    });

    /**
     * Enroll a user as a member of a published organization: publish a RegistrationMessage(Init)
     * on the org topic carrying the member DID + role-name attributes, then persist the
     * OrganizationMember record with the resulting messageId.
     */
    ApiResponse(MessageAPI.ENROLL_ORGANIZATION_MEMBER, async (msg: {
        payload: IEnrollMemberPayload,
        owner: IOwner,
        userId: string | null
    }) => {
        try {
            if (!msg) {
                throw new Error('Invalid enroll organization member parameters');
            }
            const { payload, owner, userId } = msg;
            const member = await enrollOrganizationMember({
                payload,
                owner,
                logger,
                notifier: NewNotifier.empty(),
                logId: userId
            });
            return new MessageResponse(member);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], msg?.userId);
            return new MessageError(error);
        }
    });

    /**
     * Resolve all active policy IDs that should be visible to a user through their organization
     * membership. Returns []  if the user has no active membership or the org has no assigned
     * policies. Pure NATS-internal helper consumed by PolicyEngine.addAccessFilters; not intended
     * for direct REST exposure.
     */
    ApiResponse(MessageAPI.GET_ORG_POLICY_IDS_FOR_USER, async (msg: {
        did: string,
        userId: string | null
    }) => {
        try {
            if (!msg || !msg.did) {
                return new MessageResponse<string[]>([]);
            }
            const ids = await getOrgPolicyIdsForUser(msg.did, msg.userId);
            return new MessageResponse(ids);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], msg?.userId);
            return new MessageError(error);
        }
    });
}
