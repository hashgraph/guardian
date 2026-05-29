import {
    DatabaseServer,
    MessageError,
    MessageResponse,
    NatsService,
    OrgRole,
    OrganizationMember,
    PinoLogger,
    PolicyOrgAssignment,
    Singleton,
} from '@guardian/common';
import {
    AuthEvents,
    GenerateUUIDv4,
    IOwner,
    LocationType,
    OrgRolePermission,
} from '@guardian/interfaces';
import { Organization } from '../entity/organization.js';
import { UserProp, UserUtils } from '#utils';

/**
 * Sanitize an OrgRolePermission[] payload: keep only known enum values, deduplicate.
 */
function sanitizePermissions(permissions: unknown): OrgRolePermission[] {
    if (!Array.isArray(permissions)) {
        return [];
    }
    const allowed = new Set<string>(Object.values(OrgRolePermission));
    const out = new Set<OrgRolePermission>();
    for (const p of permissions) {
        if (typeof p === 'string' && allowed.has(p)) {
            out.add(p as OrgRolePermission);
        }
    }
    return Array.from(out);
}

/**
 * Detect MongoDB duplicate-key error (E11000) so we can surface a friendly message.
 */
function isDuplicateKeyError(error: any): boolean {
    if (!error) {
        return false;
    }
    if (error.code === 11000 || error.code === '11000') {
        return true;
    }
    if (typeof error.message === 'string' && error.message.includes('E11000')) {
        return true;
    }
    return false;
}

/**
 * Translate IOwner.creator (SR DID) into the filter we use on owner-scoped collections.
 */
function ownerFilter(owner: IOwner | undefined | null): string {
    if (!owner || !owner.creator) {
        throw new Error('Invalid owner');
    }
    return owner.creator;
}

/**
 * Standard pagination shape borrowed from RoleService.GET_ROLES.
 */
function buildPaging(pageIndex: any, pageSize: any): any {
    const otherOptions: any = {
        orderBy: { createDate: 'DESC' }
    };
    const _pageSize = parseInt(pageSize, 10);
    const _pageIndex = parseInt(pageIndex, 10);
    if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
        otherOptions.limit = _pageSize;
        otherOptions.offset = _pageIndex * _pageSize;
    } else {
        otherOptions.limit = 100;
    }
    return otherOptions;
}

/**
 * Organization service
 *
 * Owns CRUD for Organization, OrgRole, OrganizationMember, and PolicyOrgAssignment.
 * Record-layer only — Hedera topic creation, DID, and key publishing happen in guardian-service
 * using the walletToken this service generates at org creation.
 */
@Singleton
export class OrganizationService extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'auth-organizations-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'auth-organizations-queue-reply-' + GenerateUUIDv4();

    /**
     * Register listeners
     */
    registerListeners(logger: PinoLogger): void {

        // ============================================================
        // Organization CRUD
        // ============================================================

        /**
         * Create organization (record-layer only)
         */
        this.getMessages(AuthEvents.CREATE_ORGANIZATION,
            async (msg: {
                organization: { name: string, description?: string },
                owner: IOwner,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid create organization parameters');
                    }
                    const { organization, owner } = msg;
                    if (!organization || typeof organization.name !== 'string' || !organization.name.trim()) {
                        return new MessageError('Organization name is required');
                    }

                    const entityRepository = new DatabaseServer();
                    const creator = ownerFilter(owner);

                    const row = entityRepository.create(Organization, {
                        name: organization.name,
                        description: organization.description,
                        owner: creator,
                        walletToken: GenerateUUIDv4(),
                        status: 'DRAFT',
                        location: LocationType.LOCAL,
                    });
                    const saved = await entityRepository.save(Organization, row);
                    return new MessageResponse(saved);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * List organizations owned by the caller
         */
        this.getMessages(AuthEvents.GET_ORGANIZATIONS,
            async (msg: {
                owner: IOwner,
                filters?: { name?: string },
                pageIndex?: any,
                pageSize?: any,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid list organizations parameters');
                    }
                    const { owner, filters, pageIndex, pageSize } = msg;
                    const creator = ownerFilter(owner);

                    const otherOptions = buildPaging(pageIndex, pageSize);
                    const options: any = { owner: creator };
                    if (filters?.name) {
                        options.name = { $regex: '.*' + filters.name + '.*' };
                    }

                    const [items, count] = await new DatabaseServer().findAndCount(Organization, options, otherOptions);
                    return new MessageResponse({ items, count });
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get one organization by id (owner-scoped)
         */
        this.getMessages(AuthEvents.GET_ORGANIZATION,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid get organization parameters');
                    }
                    const { id, owner } = msg;
                    const creator = ownerFilter(owner);
                    const item = await new DatabaseServer().findOne(Organization, { id, owner: creator });
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Update organization (whitelist: name, description, status, plus the on-ledger fields
         * hydrated by guardian-service after publishing: did, topicId, parentTopicId,
         * hederaAccountId, location)
         */
        this.getMessages(AuthEvents.UPDATE_ORGANIZATION,
            async (msg: {
                id: string,
                organization: {
                    name?: string,
                    description?: string,
                    status?: string,
                    did?: string,
                    topicId?: string,
                    parentTopicId?: string,
                    hederaAccountId?: string,
                    location?: LocationType
                },
                owner: IOwner,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid update organization parameters');
                    }
                    const { id, organization, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const item = await entityRepository.findOne(Organization, { id, owner: creator });
                    if (!item) {
                        return new MessageError('Invalid organization');
                    }

                    if (organization) {
                        if (typeof organization.name === 'string') {
                            item.name = organization.name;
                        }
                        if (typeof organization.description === 'string') {
                            item.description = organization.description;
                        }
                        if (typeof organization.status === 'string') {
                            item.status = organization.status;
                        }
                        if (typeof organization.did === 'string') {
                            item.did = organization.did;
                        }
                        if (typeof organization.topicId === 'string') {
                            item.topicId = organization.topicId;
                        }
                        if (typeof organization.parentTopicId === 'string') {
                            item.parentTopicId = organization.parentTopicId;
                        }
                        if (typeof organization.hederaAccountId === 'string') {
                            item.hederaAccountId = organization.hederaAccountId;
                        }
                        if (organization.location !== undefined && organization.location !== null) {
                            item.location = organization.location;
                        }
                    }

                    const result = await entityRepository.update(Organization, null, item);
                    return new MessageResponse(result);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Delete organization + cascade record-layer dependents
         */
        this.getMessages(AuthEvents.DELETE_ORGANIZATION,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid delete organization parameters');
                    }
                    const { id, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const item = await entityRepository.findOne(Organization, { id, owner: creator });
                    if (!item) {
                        return new MessageError('Invalid organization');
                    }

                    // Cascade in dependency order — record-layer only, no Hedera calls.
                    await entityRepository.deleteEntity(OrganizationMember, { organizationId: id });
                    await entityRepository.deleteEntity(OrgRole, { organizationId: id });
                    await entityRepository.deleteEntity(PolicyOrgAssignment, { organizationId: id });
                    await entityRepository.remove(Organization, item);

                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        // ============================================================
        // OrgRole CRUD
        // ============================================================

        /**
         * Create an OrgRole under an organization owned by the caller
         */
        this.getMessages(AuthEvents.CREATE_ORG_ROLE,
            async (msg: {
                organizationId: string,
                role: { name: string, description?: string, permissions?: string[] },
                owner: IOwner,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid create org role parameters');
                    }
                    const { organizationId, role, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const org = await entityRepository.findOne(Organization, {
                        id: organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid organization');
                    }

                    if (!role || typeof role.name !== 'string' || !role.name.trim()) {
                        return new MessageError('Role name is required');
                    }

                    const row = entityRepository.create(OrgRole, {
                        organizationId,
                        name: role.name,
                        description: role.description,
                        permissions: sanitizePermissions(role.permissions),
                    });

                    try {
                        const saved = await entityRepository.save(OrgRole, row);
                        return new MessageResponse(saved);
                    } catch (error) {
                        if (isDuplicateKeyError(error)) {
                            return new MessageError('A role with this name already exists in the organization');
                        }
                        throw error;
                    }
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * List OrgRoles for an organization owned by the caller
         */
        this.getMessages(AuthEvents.GET_ORG_ROLES,
            async (msg: { organizationId: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid list org roles parameters');
                    }
                    const { organizationId, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const org = await entityRepository.findOne(Organization, {
                        id: organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid organization');
                    }

                    const items = await entityRepository.find(OrgRole, { organizationId });
                    return new MessageResponse(items);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get one OrgRole by id (owner-scoped via the parent org)
         */
        this.getMessages(AuthEvents.GET_ORG_ROLE,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid get org role parameters');
                    }
                    const { id, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const item = await entityRepository.findOne(OrgRole, { id });
                    if (!item) {
                        return new MessageResponse(null);
                    }
                    const org = await entityRepository.findOne(Organization, {
                        id: item.organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid role');
                    }
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Update an OrgRole (name change propagates to OrganizationMember.orgRoleName denorm)
         */
        this.getMessages(AuthEvents.UPDATE_ORG_ROLE,
            async (msg: {
                id: string,
                role: { name?: string, description?: string, permissions?: string[] },
                owner: IOwner,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid update org role parameters');
                    }
                    const { id, role, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const item = await entityRepository.findOne(OrgRole, { id });
                    if (!item) {
                        return new MessageError('Invalid role');
                    }
                    const org = await entityRepository.findOne(Organization, {
                        id: item.organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid role');
                    }

                    let nameChanged = false;
                    let newName: string | undefined;
                    if (role) {
                        if (typeof role.name === 'string' && role.name.trim() && role.name !== item.name) {
                            nameChanged = true;
                            newName = role.name;
                            item.name = role.name;
                        }
                        if (typeof role.description === 'string') {
                            item.description = role.description;
                        }
                        if (role.permissions !== undefined) {
                            item.permissions = sanitizePermissions(role.permissions);
                        }
                    }

                    try {
                        const updated = await entityRepository.update(OrgRole, null, item);

                        // Propagate the denormalized orgRoleName on members if the name changed.
                        if (nameChanged && newName) {
                            const members = await entityRepository.find(OrganizationMember, { orgRoleId: id });
                            if (members.length) {
                                for (const m of members) {
                                    m.orgRoleName = newName;
                                }
                                await entityRepository.update(OrganizationMember, null, members);
                            }
                        }

                        return new MessageResponse(updated);
                    } catch (error) {
                        if (isDuplicateKeyError(error)) {
                            return new MessageError('A role with this name already exists in the organization');
                        }
                        throw error;
                    }
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Delete an OrgRole (refused if any active member still uses it)
         */
        this.getMessages(AuthEvents.DELETE_ORG_ROLE,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid delete org role parameters');
                    }
                    const { id, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const item = await entityRepository.findOne(OrgRole, { id });
                    if (!item) {
                        return new MessageError('Invalid role');
                    }
                    const org = await entityRepository.findOne(Organization, {
                        id: item.organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid role');
                    }

                    const active = await entityRepository.count(OrganizationMember, {
                        orgRoleId: id,
                        active: { $ne: false }
                    });
                    if (active > 0) {
                        return new MessageError('Cannot delete a role that is still assigned to members');
                    }

                    await entityRepository.remove(OrgRole, item);
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        // ============================================================
        // Membership
        // ============================================================

        /**
         * Enroll a user into an organization with a role.
         * Optionally carries the on-ledger enrollment messageId so guardian-service can record
         * the RegistrationMessage(Init) reference published on the org topic.
         */
        this.getMessages(AuthEvents.ENROLL_ORG_MEMBER,
            async (msg: {
                organizationId: string,
                did: string,
                orgRoleId: string,
                messageId?: string,
                owner: IOwner,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid enroll member parameters');
                    }
                    const { organizationId, did, orgRoleId, messageId, owner } = msg;
                    if (!did) {
                        return new MessageError('Member DID is required');
                    }
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const org = await entityRepository.findOne(Organization, {
                        id: organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid organization');
                    }

                    const role = await entityRepository.findOne(OrgRole, {
                        id: orgRoleId,
                        organizationId
                    });
                    if (!role) {
                        return new MessageError('Invalid role for this organization');
                    }

                    const user = await UserUtils.getUser({ did }, UserProp.RAW);
                    if (!user) {
                        return new MessageError('User not found');
                    }

                    const row = entityRepository.create(OrganizationMember, {
                        organizationId,
                        did,
                        userId: user.id ? user.id.toString() : undefined,
                        username: user.username,
                        orgRoleId,
                        orgRoleName: role.name,
                        active: true,
                        messageId: typeof messageId === 'string' ? messageId : undefined,
                    });

                    try {
                        const saved = await entityRepository.save(OrganizationMember, row);
                        return new MessageResponse(saved);
                    } catch (error) {
                        if (isDuplicateKeyError(error)) {
                            return new MessageError('This user is already a member of an organization');
                        }
                        throw error;
                    }
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * List members of an organization owned by the caller
         */
        this.getMessages(AuthEvents.GET_ORG_MEMBERS,
            async (msg: {
                organizationId: string,
                owner: IOwner,
                filters?: { active?: boolean, orgRoleId?: string, did?: string },
                pageIndex?: any,
                pageSize?: any,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid list members parameters');
                    }
                    const { organizationId, owner, filters, pageIndex, pageSize } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const org = await entityRepository.findOne(Organization, {
                        id: organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid organization');
                    }

                    const options: any = { organizationId };
                    if (filters) {
                        if (typeof filters.active === 'boolean') {
                            options.active = filters.active;
                        }
                        if (filters.orgRoleId) {
                            options.orgRoleId = filters.orgRoleId;
                        }
                        if (filters.did) {
                            options.did = filters.did;
                        }
                    }
                    const otherOptions = buildPaging(pageIndex, pageSize);
                    const [items, count] = await entityRepository.findAndCount(
                        OrganizationMember,
                        options,
                        otherOptions
                    );
                    return new MessageResponse({ items, count });
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get one member by id (owner-scoped via the parent org)
         */
        this.getMessages(AuthEvents.GET_ORG_MEMBER,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid get member parameters');
                    }
                    const { id, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const item = await entityRepository.findOne(OrganizationMember, { id });
                    if (!item) {
                        return new MessageResponse(null);
                    }
                    const org = await entityRepository.findOne(Organization, {
                        id: item.organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid member');
                    }
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Look up a user's active organization membership by DID
         */
        this.getMessages(AuthEvents.GET_ORG_MEMBERSHIP_BY_DID,
            async (msg: { did: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg || !msg.did) {
                        return new MessageResponse(null);
                    }
                    const item = await new DatabaseServer().findOne(OrganizationMember, {
                        did: msg.did,
                        active: { $ne: false }
                    });
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Look up an organization's Hedera credential locators by org id (unscoped, internal).
         * Returns { did, hederaAccountId, walletToken } or null.
         */
        this.getMessages(AuthEvents.GET_ORG_HEDERA_INFO,
            async (msg: { organizationId: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg || !msg.organizationId) {
                        return new MessageResponse(null);
                    }
                    const org = await new DatabaseServer().findOne(Organization, {
                        id: msg.organizationId
                    });
                    if (!org) {
                        return new MessageResponse(null);
                    }
                    return new MessageResponse({
                        did: org.did,
                        hederaAccountId: org.hederaAccountId,
                        walletToken: org.walletToken
                    });
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Update a member's role (validates the new role belongs to the same org)
         */
        this.getMessages(AuthEvents.UPDATE_ORG_MEMBER_ROLE,
            async (msg: { id: string, orgRoleId: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid update member role parameters');
                    }
                    const { id, orgRoleId, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const member = await entityRepository.findOne(OrganizationMember, { id });
                    if (!member) {
                        return new MessageError('Invalid member');
                    }
                    const org = await entityRepository.findOne(Organization, {
                        id: member.organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid member');
                    }

                    const role = await entityRepository.findOne(OrgRole, {
                        id: orgRoleId,
                        organizationId: member.organizationId
                    });
                    if (!role) {
                        return new MessageError('Invalid role for this organization');
                    }

                    member.orgRoleId = orgRoleId;
                    member.orgRoleName = role.name;
                    const updated = await entityRepository.update(OrganizationMember, null, member);
                    return new MessageResponse(updated);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Remove a member (hard delete to free the @Unique(did) constraint)
         */
        this.getMessages(AuthEvents.REMOVE_ORG_MEMBER,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid remove member parameters');
                    }
                    const { id, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const member = await entityRepository.findOne(OrganizationMember, { id });
                    if (!member) {
                        return new MessageError('Invalid member');
                    }
                    const org = await entityRepository.findOne(Organization, {
                        id: member.organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid member');
                    }

                    await entityRepository.remove(OrganizationMember, member);
                    return new MessageResponse(member);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        // ============================================================
        // Policy assignment
        // ============================================================

        /**
         * Assign a policy to an organization (idempotent, also re-activates a revoked assignment)
         */
        this.getMessages(AuthEvents.ASSIGN_POLICY_TO_ORG,
            async (msg: {
                organizationId: string,
                policyId: string,
                owner: IOwner,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid assign policy parameters');
                    }
                    const { organizationId, policyId, owner } = msg;
                    if (!policyId) {
                        return new MessageError('Policy id is required');
                    }
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const org = await entityRepository.findOne(Organization, {
                        id: organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid organization');
                    }

                    const existing = await entityRepository.findOne(PolicyOrgAssignment, {
                        organizationId,
                        policyId
                    });
                    if (existing) {
                        if (existing.assigned === true) {
                            return new MessageResponse(existing);
                        }
                        existing.assigned = true;
                        existing.owner = creator;
                        const updated = await entityRepository.update(PolicyOrgAssignment, null, existing);
                        return new MessageResponse(updated);
                    }

                    const row = entityRepository.create(PolicyOrgAssignment, {
                        organizationId,
                        policyId,
                        owner: creator,
                        assigned: true,
                    });
                    try {
                        const saved = await entityRepository.save(PolicyOrgAssignment, row);
                        return new MessageResponse(saved);
                    } catch (error) {
                        if (isDuplicateKeyError(error)) {
                            // Race condition: another caller just inserted; re-read and return.
                            const after = await entityRepository.findOne(PolicyOrgAssignment, {
                                organizationId,
                                policyId
                            });
                            return new MessageResponse(after);
                        }
                        throw error;
                    }
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Revoke a policy assignment (soft — flips assigned=false, keeps the record)
         */
        this.getMessages(AuthEvents.REVOKE_POLICY_FROM_ORG,
            async (msg: {
                organizationId: string,
                policyId: string,
                owner: IOwner,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid revoke policy parameters');
                    }
                    const { organizationId, policyId, owner } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const org = await entityRepository.findOne(Organization, {
                        id: organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid organization');
                    }

                    const item = await entityRepository.findOne(PolicyOrgAssignment, {
                        organizationId,
                        policyId
                    });
                    if (!item) {
                        return new MessageError('Policy is not assigned to this organization');
                    }
                    item.assigned = false;
                    const updated = await entityRepository.update(PolicyOrgAssignment, null, item);
                    return new MessageResponse(updated);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * List policies assigned to an organization (active by default, all if includeRevoked)
         */
        this.getMessages(AuthEvents.GET_ORG_POLICIES,
            async (msg: {
                organizationId: string,
                owner: IOwner,
                includeRevoked?: boolean,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid list org policies parameters');
                    }
                    const { organizationId, owner, includeRevoked } = msg;
                    const creator = ownerFilter(owner);
                    const entityRepository = new DatabaseServer();

                    const org = await entityRepository.findOne(Organization, {
                        id: organizationId,
                        owner: creator
                    });
                    if (!org) {
                        return new MessageError('Invalid organization');
                    }

                    const options: any = { organizationId };
                    if (!includeRevoked) {
                        options.assigned = true;
                    }
                    const items = await entityRepository.find(PolicyOrgAssignment, options);
                    return new MessageResponse(items);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * List active org-assignments for a policy
         */
        this.getMessages(AuthEvents.GET_POLICY_ORGS,
            async (msg: { policyId: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg || !msg.policyId) {
                        return new MessageResponse([]);
                    }
                    const items = await new DatabaseServer().find(PolicyOrgAssignment, {
                        policyId: msg.policyId,
                        assigned: true
                    });
                    return new MessageResponse(items);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * List active PolicyOrgAssignment rows for an organization.
         *
         * Intentionally UNSCOPED (no IOwner check) — internal NATS-only lookup invoked by
         * guardian-service.PolicyEngine.addAccessFilters on behalf of an arbitrary user to extend
         * policy visibility through org membership. Do NOT expose at the api-gateway layer.
         *
         * Note: GET_ORG_POLICIES is the owner-scoped sibling intended for SR management; this
         * event exists specifically so the access-filter dynamic lookup is not blocked by owner
         * scoping when the requesting user is a member rather than the org's SR owner.
         */
        this.getMessages(AuthEvents.GET_POLICIES_FOR_ORG,
            async (msg: { organizationId: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg || !msg.organizationId) {
                        return new MessageResponse([]);
                    }
                    const items = await new DatabaseServer().find(PolicyOrgAssignment, {
                        organizationId: msg.organizationId,
                        assigned: true
                    });
                    return new MessageResponse(items);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });
    }
}
