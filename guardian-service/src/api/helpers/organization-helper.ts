import {
    AuthEvents,
    DidDocumentStatus,
    IOwner,
    ISignOptions,
    LocationType,
    SignType,
    TopicType,
    WorkerTaskType,
} from '@guardian/interfaces';
import {
    DatabaseServer,
    DidDocument as DidDocumentCollection,
    DIDMessage,
    INotificationStep,
    KeyType,
    MessageAction,
    MessageServer,
    OrganizationMessage,
    PinoLogger,
    RegistrationMessage,
    Topic,
    TopicConfig,
    TopicHelper,
    Users,
    VcHelper,
    Wallet,
    Workers,
} from '@guardian/common';
import { getGlobalTopic } from './profile-helper.js';
import { validateHederaAccountKey } from './hedera-key-validator.js';

/**
 * Lightweight shape used by guardian-service to round-trip Organization records over NATS.
 * The authoritative entity lives in auth-service/src/entity/organization.ts; we deliberately
 * avoid importing it across the service boundary and type the payload by-shape instead.
 */
export interface IOrganizationRecord {
    id: string;
    name?: string;
    description?: string;
    owner?: string;
    did?: string;
    walletToken?: string;
    hederaAccountId?: string;
    topicId?: string;
    parentTopicId?: string;
    status?: string;
    location?: LocationType;
}

/**
 * Lightweight shape used to round-trip OrganizationMember records.
 */
export interface IOrganizationMemberRecord {
    id: string;
    organizationId?: string;
    did?: string;
    userId?: string;
    username?: string;
    orgRoleId?: string;
    orgRoleName?: string;
    active?: boolean;
    messageId?: string;
}

/**
 * Lightweight shape used to round-trip OrgRole records.
 */
export interface IOrgRoleRecord {
    id: string;
    organizationId?: string;
    name?: string;
    description?: string;
    permissions?: string[];
}

/**
 * Publish organization payload
 */
export interface IPublishOrganizationPayload {
    organizationId: string;
    hederaAccountId: string;
    hederaAccountKey: string;
    description?: string;
}

/**
 * Enroll member payload
 */
export interface IEnrollMemberPayload {
    organizationId: string;
    did: string;
    orgRoleId: string;
}

/**
 * Publish an existing DRAFT organization to the ledger:
 * resolve global topic → create org topic → one-way-link to SR/global topic → publish DID to org
 * topic → publish OrganizationMessage(CreateOrganization) to global topic → store org key in vault
 * → persist hydrated org record via auth-service.
 *
 * The final persist (status = PUBLISHED + all on-ledger fields) is the commit point: the org
 * record is never left half-published. A failure in the side-effecting phase marks the org
 * PUBLISH_ERROR and rethrows; retry publishes a fresh topic/DID set (no ledger rollback exists).
 *
 * Mirrors guardian-service/src/api/helpers/profile-helper.ts::createUserProfile.
 *
 * @param payload publish payload
 * @param owner caller (Standard Registry IOwner)
 * @param logger pino logger
 * @param notifier step notifier
 * @param logId log/user id passed through for tracing
 */
export async function publishOrganization({
    payload,
    owner,
    logger,
    notifier,
    logId
}: {
    payload: IPublishOrganizationPayload,
    owner: IOwner,
    logger: PinoLogger,
    notifier: INotificationStep,
    logId: string | null
}): Promise<IOrganizationRecord> {
    if (!payload || !payload.organizationId) {
        throw new Error('Invalid publish organization parameters');
    }
    if (!payload.hederaAccountId || !payload.hederaAccountKey) {
        throw new Error('Invalid Hedera account or key.');
    }
    if (!owner || !owner.creator) {
        throw new Error('Invalid owner');
    }

    // <-- Steps
    const STEP_RESOLVE_ORG = 'Resolve organization';
    const STEP_RESOLVE_ROLES = 'Resolve roles';
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_RESOLVE_TOPIC = 'Resolve global topic';
    const STEP_CREATE_TOPIC = 'Create organization topic';
    const STEP_PUBLISH_DID = 'Publish DID Document';
    const STEP_PUBLISH_ORG_MSG = 'Publish Organization message';
    const STEP_SAVE_KEYS = 'Save keys';
    const STEP_PERSIST = 'Persist organization';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ORG);
    notifier.addStep(STEP_RESOLVE_ROLES);
    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_RESOLVE_TOPIC);
    notifier.addStep(STEP_CREATE_TOPIC);
    notifier.addStep(STEP_PUBLISH_DID);
    notifier.addStep(STEP_PUBLISH_ORG_MSG);
    notifier.addStep(STEP_SAVE_KEYS);
    notifier.addStep(STEP_PERSIST);
    notifier.start();

    const dataBaseServer = new DatabaseServer();
    const users = new Users();

    // ------------------------
    // <-- Resolve organization
    // ------------------------
    notifier.startStep(STEP_RESOLVE_ORG);
    const org = await users.sendMessage<IOrganizationRecord>(
        AuthEvents.GET_ORGANIZATION,
        { id: payload.organizationId, owner, userId: logId }
    );
    if (!org) {
        throw new Error('Organization not found');
    }
    if (org.status === 'PUBLISHED') {
        throw new Error('Organization is already published');
    }
    if (!org.walletToken) {
        throw new Error('Organization wallet token is not initialized');
    }
    notifier.completeStep(STEP_RESOLVE_ORG);
    // ------------------------
    // Resolve organization -->
    // ------------------------

    // ------------------------
    // <-- Resolve roles snapshot
    // ------------------------
    notifier.startStep(STEP_RESOLVE_ROLES);
    const rolesRaw = await users.sendMessage<IOrgRoleRecord[]>(
        AuthEvents.GET_ORG_ROLES,
        { organizationId: payload.organizationId, owner, userId: logId }
    );
    const rolesSnapshot: { name: string, permissions: string[] }[] = (rolesRaw || []).map((r) => ({
        name: r.name || '',
        permissions: Array.isArray(r.permissions) ? r.permissions : []
    }));
    notifier.completeStep(STEP_RESOLVE_ROLES);
    // ------------------------
    // Resolve roles snapshot -->
    // ------------------------

    // ------------------------
    // <-- Check hedera key
    // ------------------------
    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    try {
        await validateHederaAccountKey(payload.hederaAccountId, payload.hederaAccountKey, {
            userId: owner.id,
            interception: owner.id
        });
    } catch (error) {
        logger.error(error, ['GUARDIAN_SERVICE'], logId);
        throw error;
    }
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);
    // ------------------------
    // Check hedera key -->
    // ------------------------

    // ------------------------
    // <-- Resolve global topic
    // ------------------------
    notifier.startStep(STEP_RESOLVE_TOPIC);
    const globalTopic = await getGlobalTopic();
    if (!globalTopic) {
        throw new Error('Global topic not found.');
    }
    notifier.completeStep(STEP_RESOLVE_TOPIC);
    // ------------------------
    // Resolve global topic -->
    // ------------------------

    // ------------------------
    // <-- On-ledger publish phase
    // ------------------------
    // Everything from here on has side effects (Hedera topic + messages, satellite Topic /
    // DidDocument rows, vault keys) and the ledger cannot be rolled back. On failure, mark the
    // organization PUBLISH_ERROR (same idiom as policy/tool publishing) and rethrow; retry is
    // allowed (the guard above only rejects PUBLISHED) and creates a fresh topic/DID set — the
    // prior set stays orphaned on the ledger and is not referenced by the org record.
    try {
        // ------------------------
        // <-- Create org topic + one-way-link to global
        // ------------------------
        notifier.startStep(STEP_CREATE_TOPIC);
        const signOptions: ISignOptions = { signType: SignType.INTERNAL };
        const messageServer = new MessageServer({
            operatorId: payload.hederaAccountId,
            operatorKey: payload.hederaAccountKey,
            signOptions
        });
        const topicHelper = new TopicHelper(
            payload.hederaAccountId,
            payload.hederaAccountKey,
            signOptions
        );
        const topicConfig = await topicHelper.create({
            type: TopicType.OrganizationTopic,
            name: TopicType.OrganizationTopic,
            description: TopicType.OrganizationTopic,
            owner: null,
            policyId: null,
            policyUUID: null
        }, {
            admin: true,
            submit: true
        }, {
            userId: logId
        });
        await topicHelper.oneWayLink({
            topic: topicConfig,
            parent: globalTopic,
            rationale: null,
            userId: owner.id
        });
        const newTopic = await dataBaseServer.save(Topic, topicConfig.toObject());
        messageServer.setTopicObject(topicConfig);
        notifier.completeStep(STEP_CREATE_TOPIC);
        // ------------------------
        // Create org topic -->
        // ------------------------

        // ------------------------
        // <-- Publish DID Document for the org
        // ------------------------
        notifier.startStep(STEP_PUBLISH_DID);
        logger.info('Create Organization DID Document', ['GUARDIAN_SERVICE'], logId);

        const vcHelper = new VcHelper();
        const orgDidDocument = await vcHelper.generateNewDid(
            topicConfig.topicId,
            payload.hederaAccountKey
        );
        const orgDid = orgDidDocument.getDid();

        // The on-disk DID-document row requires an IAuthUser to attribute creation; use the SR caller.
        const srUser = await users.getUserById(owner.creator, logId);
        if (!srUser) {
            throw new Error('Standard Registry user not found.');
        }
        const didRow = await vcHelper.saveDidDocument(orgDidDocument, srUser);

        try {
            const didMessage = new DIDMessage(MessageAction.CreateDID);
            didMessage.setDocument(orgDidDocument);
            const didResult = await messageServer
                .setTopicObject(topicConfig)
                .sendMessage(didMessage, {
                    sendToIPFS: true,
                    memo: null,
                    userId: owner.id,
                    interception: owner.id
                });
            didRow.status = DidDocumentStatus.CREATE;
            didRow.messageId = didResult.getId();
            didRow.topicId = didResult.getTopicId();
            await dataBaseServer.update(DidDocumentCollection, null, didRow);
        } catch (error) {
            logger.error(error, ['GUARDIAN_SERVICE'], logId);
            throw error;
        }
        notifier.completeStep(STEP_PUBLISH_DID);
        // ------------------------
        // Publish DID Document -->
        // ------------------------

        // ------------------------
        // <-- Publish OrganizationMessage to the global topic
        // ------------------------
        notifier.startStep(STEP_PUBLISH_ORG_MSG);
        let orgMessageId: string | null = null;
        try {
            const orgMessage = new OrganizationMessage(MessageAction.CreateOrganization);
            orgMessage.setDocument(
                orgDid,
                topicConfig.topicId,
                org.name || '',
                rolesSnapshot
            );
            const orgMessageResult = await messageServer
                .setTopicObject(globalTopic)
                .sendMessage(orgMessage, {
                    sendToIPFS: true,
                    memo: null,
                    userId: owner.id,
                    interception: owner.id
                });
            orgMessageId = orgMessageResult.getId();
        } catch (error) {
            logger.error(error, ['GUARDIAN_SERVICE'], logId);
            throw error;
        }
        notifier.completeStep(STEP_PUBLISH_ORG_MSG);
        // ------------------------
        // Publish OrganizationMessage -->
        // ------------------------

        // ------------------------
        // <-- Save org wallet + topic keys
        // ------------------------
        notifier.startStep(STEP_SAVE_KEYS);
        newTopic.owner = orgDid;
        newTopic.parent = globalTopic.topicId;
        await dataBaseServer.update(Topic, null, newTopic);
        topicConfig.owner = orgDid;
        topicConfig.parent = globalTopic.topicId;
        // Org wallet uses the org's own walletToken (generated at draft creation in Phase 2).
        await topicConfig.saveKeysByUser({ walletToken: org.walletToken });
        const wallet = new Wallet();
        await wallet.setKey(org.walletToken, KeyType.KEY, orgDid, payload.hederaAccountKey);
        notifier.completeStep(STEP_SAVE_KEYS);
        // ------------------------
        // Save org wallet + topic keys -->
        // ------------------------

        // ------------------------
        // <-- Persist hydrated org record
        // ------------------------
        notifier.startStep(STEP_PERSIST);
        const updated = await users.sendMessage<IOrganizationRecord>(
            AuthEvents.UPDATE_ORGANIZATION,
            {
                id: org.id,
                organization: {
                    description: payload.description ?? org.description,
                    status: 'PUBLISHED',
                    did: orgDid,
                    topicId: topicConfig.topicId,
                    parentTopicId: globalTopic.topicId,
                    hederaAccountId: payload.hederaAccountId,
                    location: LocationType.LOCAL
                },
                owner,
                userId: logId
            }
        );
        notifier.completeStep(STEP_PERSIST);
        // ------------------------
        // Persist hydrated org record -->
        // ------------------------

        logger.info(
            `Organization ${org.id} published (did=${orgDid} topicId=${topicConfig.topicId} msgId=${orgMessageId})`,
            ['GUARDIAN_SERVICE'],
            logId
        );

        notifier.complete();
        return updated;
    } catch (error) {
        // Best-effort marker in its own try/catch: auth-service may itself be the failing
        // dependency, and a failed marker write must not mask the original publish error.
        try {
            await users.sendMessage(
                AuthEvents.UPDATE_ORGANIZATION,
                {
                    id: org.id,
                    organization: { status: 'PUBLISH_ERROR' },
                    owner,
                    userId: logId
                }
            );
        } catch (markerError) {
            logger.error(markerError, ['GUARDIAN_SERVICE'], logId);
        }
        throw error;
    }
}

/**
 * Enroll a user as a member of a published organization:
 * validate the member (user exists, not already in an organization) BEFORE any ledger write,
 * publish a RegistrationMessage(Init) on the org topic carrying the member DID, orgRoleName,
 * and the role's permission set as of enrollment (a self-describing event record — the DB
 * stays authoritative for current permissions), then persist the OrganizationMember record
 * (carrying the messageId) via auth-service.
 *
 * Ledger-first ordering is deliberate: every persisted member row carries the messageId of its
 * on-ledger enrollment message. The trade-off is that a persist failure after the publish
 * leaves a ghost message on the org topic; ghosts grant nothing (membership is DB-authoritative)
 * and the pre-flight validation keeps the deterministic failure cases from ever publishing.
 *
 * @param payload enrollment payload
 * @param owner caller (Standard Registry IOwner)
 * @param logger pino logger
 * @param notifier step notifier
 * @param logId log/user id for tracing
 */
export async function enrollOrganizationMember({
    payload,
    owner,
    logger,
    notifier,
    logId
}: {
    payload: IEnrollMemberPayload,
    owner: IOwner,
    logger: PinoLogger,
    notifier: INotificationStep,
    logId: string | null
}): Promise<IOrganizationMemberRecord> {
    if (!payload || !payload.organizationId || !payload.did || !payload.orgRoleId) {
        throw new Error('Invalid enroll member parameters');
    }
    if (!owner || !owner.creator) {
        throw new Error('Invalid owner');
    }

    // <-- Steps
    const STEP_RESOLVE_ORG = 'Resolve organization';
    const STEP_RESOLVE_ROLE = 'Resolve role';
    const STEP_VALIDATE_MEMBER = 'Validate member';
    const STEP_RESOLVE_TOPIC = 'Resolve organization topic';
    const STEP_PUBLISH_ENROLLMENT = 'Publish enrollment message';
    const STEP_PERSIST = 'Persist member';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ORG);
    notifier.addStep(STEP_RESOLVE_ROLE);
    notifier.addStep(STEP_VALIDATE_MEMBER);
    notifier.addStep(STEP_RESOLVE_TOPIC);
    notifier.addStep(STEP_PUBLISH_ENROLLMENT);
    notifier.addStep(STEP_PERSIST);
    notifier.start();

    const users = new Users();
    const wallet = new Wallet();

    // ------------------------
    // <-- Resolve organization + role in one dual-auth pre-flight
    // ------------------------
    // Single call replaces the old owner-scoped GET_ORGANIZATION + GET_ORG_ROLE pair: it also
    // authorizes the caller (SR owner or a MEMBER_MANAGE admin, per R1/R2) so a delegated admin's
    // enrollment can reach this far. This pre-flight is best-effort — ENROLL_ORG_MEMBER re-runs
    // the authoritative dual-auth + R1/R2 check at persist time.
    notifier.startStep(STEP_RESOLVE_ORG);
    const access = await users.validateOrgManagementAccess(
        payload.organizationId, payload.orgRoleId, owner, logId
    );
    const org = access?.organization as IOrganizationRecord;
    if (!org) {
        throw new Error('Organization not found');
    }
    if (org.status !== 'PUBLISHED' || !org.topicId || !org.did || !org.walletToken || !org.hederaAccountId) {
        throw new Error('Organization is not published');
    }
    notifier.completeStep(STEP_RESOLVE_ORG);

    notifier.startStep(STEP_RESOLVE_ROLE);
    const role = access.orgRole as IOrgRoleRecord;
    if (!role || role.organizationId !== org.id) {
        throw new Error('Invalid role for this organization');
    }
    notifier.completeStep(STEP_RESOLVE_ROLE);
    // ------------------------
    // Resolve organization + role -->
    // ------------------------

    // ------------------------
    // <-- Pre-flight member validation (before any ledger write)
    // ------------------------
    // Deterministic failures (unknown user, user already in an organization) must be rejected
    // here — the RegistrationMessage published below cannot be removed from the ledger.
    // Best-effort only: the @Unique(did) constraint at persist remains the authoritative,
    // race-safe check. GET_ORG_MEMBERSHIP_BY_DID filters active = true, which matches the
    // did-only unique scope only because membership has no soft-deactivate state (removal is a
    // hard delete); if soft-deactivate is ever introduced, revisit this check together with the
    // active-predicate reads in auth-service.
    notifier.startStep(STEP_VALIDATE_MEMBER);
    const memberUser = await users.getUserById(payload.did, logId);
    if (!memberUser) {
        throw new Error('User not found');
    }
    const existingMembership = await users.sendMessage<IOrganizationMemberRecord>(
        AuthEvents.GET_ORG_MEMBERSHIP_BY_DID,
        { did: payload.did, userId: logId }
    );
    if (existingMembership) {
        throw new Error('This user is already a member of an organization');
    }
    notifier.completeStep(STEP_VALIDATE_MEMBER);
    // ------------------------
    // Pre-flight member validation -->
    // ------------------------

    // ------------------------
    // <-- Build org topic config from vault
    // ------------------------
    notifier.startStep(STEP_RESOLVE_TOPIC);
    const orgKey = await wallet.getKey(org.walletToken, KeyType.KEY, org.did);
    if (!orgKey) {
        throw new Error('Organization Hedera key not found.');
    }
    const submitKey = await wallet.getKey(
        org.walletToken,
        KeyType.TOPIC_SUBMIT_KEY,
        org.topicId
    );

    const topicRow = await new DatabaseServer().findOne(Topic, { topicId: org.topicId });
    if (!topicRow) {
        throw new Error('Organization topic not found.');
    }
    const topicConfig = await TopicConfig.fromObject(topicRow, true, logId);
    if (submitKey) {
        topicConfig.submitKey = submitKey;
    }
    notifier.completeStep(STEP_RESOLVE_TOPIC);
    // ------------------------
    // Build org topic config -->
    // ------------------------

    // ------------------------
    // <-- Publish RegistrationMessage(Init) on the org topic
    // ------------------------
    notifier.startStep(STEP_PUBLISH_ENROLLMENT);
    const signOptions: ISignOptions = { signType: SignType.INTERNAL };
    const messageServer = new MessageServer({
        operatorId: org.hederaAccountId,
        operatorKey: orgKey,
        signOptions
    });
    const attributes: { [k: string]: string } = {
        organizationId: org.id,
        orgRoleId: payload.orgRoleId,
        orgRoleName: role.name || '',
        // Permission snapshot as of enrollment (JSON array string). Makes the enrollment
        // event self-describing on the ledger; NOT a live mirror — authorization always
        // reads OrgRole.permissions from the DB, and later role edits are record-layer only.
        orgRolePermissions: JSON.stringify(role.permissions || [])
    };
    const regMessage = new RegistrationMessage(MessageAction.Init);
    regMessage.setDocument(payload.did, org.topicId, attributes);
    const regResult = await messageServer
        .setTopicObject(topicConfig)
        .sendMessage(regMessage, {
            sendToIPFS: true,
            memo: null,
            userId: owner.id,
            interception: owner.id
        });
    const enrollmentMessageId = regResult.getId();
    notifier.completeStep(STEP_PUBLISH_ENROLLMENT);
    // ------------------------
    // Publish RegistrationMessage -->
    // ------------------------

    // ------------------------
    // <-- Persist member record
    // ------------------------
    notifier.startStep(STEP_PERSIST);
    const enrolled = await users.sendMessage<IOrganizationMemberRecord>(
        AuthEvents.ENROLL_ORG_MEMBER,
        {
            organizationId: org.id,
            did: payload.did,
            orgRoleId: payload.orgRoleId,
            messageId: enrollmentMessageId,
            owner,
            userId: logId
        }
    );
    if (!enrolled) {
        throw new Error('Failed to enroll member');
    }
    notifier.completeStep(STEP_PERSIST);
    // ------------------------
    // Persist member record -->
    // ------------------------

    logger.info(
        `Organization ${org.id} member ${payload.did} enrolled with role ${payload.orgRoleId} (msgId=${enrollmentMessageId})`,
        ['GUARDIAN_SERVICE'],
        logId
    );

    notifier.complete();
    return enrolled;
}

/**
 * Look up all active policy IDs visible to and accessible by a user through their organization
 * membership. Org assignment grants both list visibility (PolicyEngine.addAccessFilters) and
 * open/execute access (PolicyEngine.accessPolicyCode) — it does NOT auto-enroll the member into
 * the policy's groups (normal PolicyRoles flow still applies on first entry).
 *
 * Two-hop NATS dynamic lookup:
 *  1. AuthEvents.GET_ORG_MEMBERSHIP_BY_DID — find the user's organizationId (or null)
 *  2. Users.getOrgPolicyIds — list active PolicyOrgAssignment policy IDs for that org
 *
 * Returns a deduped array of policy IDs. Empty array if the user has no active membership,
 * or if the org has no policy assignments.
 *
 * Consumers: PolicyEngine.addAccessFilters (list, fail-open/best-effort) and
 * PolicyEngine.accessPolicyCode (access gate, fail-closed — see call site).
 *
 * @param did user DID
 * @param logId log/user id for tracing
 */
export async function getOrgPolicyIdsForUser(
    did: string,
    logId: string | null
): Promise<string[]> {
    if (!did) {
        return [];
    }
    const users = new Users();
    const membership = await users.sendMessage<IOrganizationMemberRecord>(
        AuthEvents.GET_ORG_MEMBERSHIP_BY_DID,
        { did, userId: logId }
    );
    if (!membership || !membership.organizationId) {
        return [];
    }
    return users.getOrgPolicyIds(membership.organizationId, logId);
}
