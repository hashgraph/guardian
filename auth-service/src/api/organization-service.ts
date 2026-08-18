import {
    DatabaseServer,
    MessageError,
    MessageResponse,
    NatsService,
    PinoLogger,
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
import { OrgRole } from '../entity/org-role.js';
import { OrganizationMember } from '../entity/organization-member.js';
import { PolicyOrgAssignment } from '../entity/policy-org-assignment.js';
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
 * Result of resolving whether the caller may manage a given organization: either the SR owner
 * (unrestricted, exactly today's behaviour) or an active member whose OrgRole carries
 * MEMBER_MANAGE (R1/R2 ceilings apply at the call site — see `roleCarriesMemberManage` /
 * `isPermissionSubset`).
 */
type OrgManagementAuth =
    | { organization: Organization, actor: 'owner' }
    | { organization: Organization, actor: 'admin', adminRole: OrgRole };

/**
 * Resolve whether the caller may manage the given organization's membership: the SR owner
 * (`Organization.owner === owner.creator`) or an active `OrganizationMember` whose `OrgRole`
 * carries `MEMBER_MANAGE`. Throws with `notFoundMessage` (default: the org-not-found wording
 * every owner-scoped handler already used) when neither applies — same opaque error style as
 * today's owner filter, so callers can `await` this and let their existing try/catch surface it.
 */
async function resolveOrgManagementAuth(
    entityRepository: DatabaseServer,
    owner: IOwner,
    organizationId: string,
    notFoundMessage = 'Invalid organization'
): Promise<OrgManagementAuth> {
    const creator = ownerFilter(owner);

    const organization = await entityRepository.findOne(Organization, { id: organizationId });
    if (!organization) {
        throw new Error(notFoundMessage);
    }
    if (organization.owner === creator) {
        return { organization, actor: 'owner' };
    }

    const member = await entityRepository.findOne(OrganizationMember, {
        did: creator,
        organizationId,
        active: true
    });
    const adminRole = member?.orgRoleId
        ? await entityRepository.findOne(OrgRole, { id: member.orgRoleId })
        : null;
    if (roleCarriesMemberManage(adminRole)) {
        return { organization, actor: 'admin', adminRole };
    }

    throw new Error(notFoundMessage);
}

/**
 * R1 — true when a role's permission set carries MEMBER_MANAGE. Used to reject any admin-branch
 * operation that grants MEMBER_MANAGE or targets a member whose current role carries it
 * (including the admin themselves) — only the SR owner branch may touch admins.
 */
function roleCarriesMemberManage(role: OrgRole | null | undefined): boolean {
    return !!role?.permissions?.includes(OrgRolePermission.MEMBER_MANAGE);
}

/**
 * R2 — subset ceiling: on the admin branch, an assigned role's permissions must be a subset of
 * the admin's own role's permissions. The SR owner branch has no ceiling.
 */
function isPermissionSubset(adminRole: OrgRole, assignedRole: OrgRole | null | undefined): boolean {
    const adminPermissions = new Set(adminRole?.permissions ?? []);
    return (assignedRole?.permissions ?? []).every((permission) => adminPermissions.has(permission));
}

/**
 * Shallow-copy an Organization without its `walletToken` (vault key handle) for responses on the
 * delegated-admin (MEMBER_MANAGE) branch — a USER-admin never sees the org's vault credential
 * locator; only the SR owner branch and internal NATS-only callers (e.g.
 * VALIDATE_ORG_MANAGEMENT_ACCESS, which guardian-service needs it to sign with) keep it. Copies
 * rather than mutating the loaded entity so the original stays intact for any other consumer.
 */
function redactWalletToken(organization: Organization): Organization {
    // Cast through `unknown`: the object-literal copy carries every own data property but not
    // the entity's prototype methods — irrelevant here since the result only ever flows out as a
    // MessageResponse body (serialized over NATS), never invoked as an Organization instance.
    const copy = { ...organization } as unknown as Organization;
    delete copy.walletToken;
    return copy;
}

/**
 * User input reaches a $regex below. Unescaped, `?name=[` is an invalid expression
 * and Mongo answers with a 500 instead of a result set.
 */
function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
         * List organizations owned by the caller, plus — if the caller is an active member whose
         * role carries MEMBER_MANAGE — the single organization they administer (their discovery
         * path for that organizationId). Deduped and name-filtered like the owned query; the
         * admin case adds at most one row, and it is folded into the query rather than appended
         * to a page, so the count and the paging stay exact.
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
                    const entityRepository = new DatabaseServer();

                    const otherOptions = buildPaging(pageIndex, pageSize);

                    /*
                     * The administered organization is part of the query, not an extra
                     * row appended to the first page.
                     *
                     * Appending it only when offset is 0, and incrementing the count
                     * only there, meant a delegated admin who owns no organizations
                     * reported count 1 on page 0 and count 0 on page 1 - a total that
                     * moves between pages breaks any paging client - and page 0 carried
                     * pageSize + 1 items. The dedup also inspected page-0 items only, so
                     * an owner who is additionally enrolled with MEMBER_MANAGE and owns
                     * more than pageSize organizations received the same row twice, with
                     * the count double-counting it.
                     *
                     * Folding it into the filter makes the count and the paging exact,
                     * and a document cannot match a query twice, so the dedup is
                     * inherent.
                     */
                    const adminMember = await entityRepository.findOne(OrganizationMember, {
                        did: creator,
                        active: true
                    });
                    const adminRole = adminMember?.orgRoleId
                        ? await entityRepository.findOne(OrgRole, { id: adminMember.orgRoleId })
                        : null;
                    const administeredOrgId = roleCarriesMemberManage(adminRole)
                        ? adminMember?.organizationId
                        : null;

                    const scope: any[] = [{ owner: creator }];
                    if (administeredOrgId) {
                        scope.push({ id: administeredOrgId });
                    }
                    const options: any = scope.length > 1 ? { $or: scope } : scope[0];
                    if (filters?.name) {
                        // Escaped, and case-insensitive as the API documents. Applied to
                        // one query now, so the owned and administered rows can no longer
                        // filter by different rules - the admin branch used String.includes
                        // while the owned query used a regex.
                        options.name = { $regex: '.*' + escapeRegex(filters.name) + '.*', $options: 'i' };
                    }

                    const [items, count] = await entityRepository.findAndCount(Organization, options, otherOptions);

                    // The wallet token belongs to the owner: a row reachable only through
                    // the administered-organization branch is still redacted.
                    const resultItems = items.map((item) =>
                        item.owner === creator ? item : redactWalletToken(item));

                    return new MessageResponse({ items: resultItems, count });
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get one organization by id — owner-scoped, plus a dual-auth admin branch
         * (MEMBER_MANAGE). Also invoked internally by guardian-service publish/enroll flows with
         * SR owners: the owner branch returns exactly what the owner-scoped lookup always
         * returned (the org, or `null` when it isn't found/owned) — never a MessageError — so
         * those flows stay byte-for-byte unchanged.
         */
        this.getMessages(AuthEvents.GET_ORGANIZATION,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid get organization parameters');
                    }
                    const { id, owner } = msg;
                    const entityRepository = new DatabaseServer();
                    let auth: OrgManagementAuth;
                    try {
                        auth = await resolveOrgManagementAuth(entityRepository, owner, id);
                    } catch {
                        return new MessageResponse(null);
                    }
                    const item = auth.actor === 'admin'
                        ? redactWalletToken(auth.organization)
                        : auth.organization;
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

                    // Deletable ⇔ zero ledger footprint. Only DRAFT guarantees that: topic
                    // creation is the first publish side effect, and both PUBLISHED and
                    // PUBLISH_ERROR orgs may already carry the CreateOrganization message on
                    // the global discovery topic plus a vault key — a hard delete would leave
                    // those dangling and a future restore/discovery-from-Hedera consumer would
                    // resurrect the record. Mirrors the deletePolicy status guards. A
                    // PUBLISH_ERROR org remains republishable, not deletable; decommissioning
                    // a published org (deactivate + on-ledger tombstone) is future work.
                    if (item.status !== 'DRAFT') {
                        return new MessageError('Only draft organizations can be deleted');
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
         * List OrgRoles for an organization — owner-scoped, plus a dual-auth admin branch
         * (MEMBER_MANAGE).
         */
        this.getMessages(AuthEvents.GET_ORG_ROLES,
            async (msg: { organizationId: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid list org roles parameters');
                    }
                    const { organizationId, owner } = msg;
                    const entityRepository = new DatabaseServer();

                    await resolveOrgManagementAuth(entityRepository, owner, organizationId);

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
                        // Raw targeted $set: touches only the denorm field, so a concurrent
                        // member role change can never be reverted, and a member switched away
                        // between operations no longer matches the orgRoleId filter.
                        if (nameChanged && newName) {
                            await entityRepository.updateEntity(
                                OrganizationMember,
                                { $set: { orgRoleName: newName, updateDate: new Date() } },
                                { orgRoleId: id }
                            );
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
                        active: true
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
         * Enroll a user into an organization with a role. Owner-scoped, plus a dual-auth admin
         * branch (MEMBER_MANAGE): R1 — the assigned role must not carry MEMBER_MANAGE (only the
         * SR owner branch may mint admins); R2 — the assigned role's permissions must be a
         * subset of the admin's own role's permissions.
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
                    const entityRepository = new DatabaseServer();

                    const auth = await resolveOrgManagementAuth(entityRepository, owner, organizationId);

                    const role = await entityRepository.findOne(OrgRole, {
                        id: orgRoleId,
                        organizationId
                    });
                    if (!role) {
                        return new MessageError('Invalid role for this organization');
                    }

                    if (auth.actor === 'admin') {
                        if (roleCarriesMemberManage(role) || !isPermissionSubset(auth.adminRole, role)) {
                            return new MessageError('Invalid organization');
                        }
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
         * List members of an organization — owner-scoped, plus a dual-auth admin branch
         * (MEMBER_MANAGE).
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
                    const entityRepository = new DatabaseServer();

                    await resolveOrgManagementAuth(entityRepository, owner, organizationId);

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
         * Get one member by id — owner-scoped via the parent org, plus a dual-auth admin branch
         * (MEMBER_MANAGE).
         */
        this.getMessages(AuthEvents.GET_ORG_MEMBER,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid get member parameters');
                    }
                    const { id, owner } = msg;
                    const entityRepository = new DatabaseServer();

                    const item = await entityRepository.findOne(OrganizationMember, { id });
                    if (!item) {
                        return new MessageResponse(null);
                    }
                    await resolveOrgManagementAuth(entityRepository, owner, item.organizationId, 'Invalid member');
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
                        active: true
                    });
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Look up an organization's Hedera credential locators by org id (unscoped, internal).
         * Returns { did, hederaAccountId, walletToken, owner } or null.
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
                        walletToken: org.walletToken,
                        owner: org.owner
                    });
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Look up a user's org context by DID (unscoped, internal).
         * Joins the active membership with its OrgRole in one round trip so callers get an
         * atomic snapshot of { organizationId, orgRoleName, orgRolePermissions } — or null
         * when the user has no active membership.
         */
        this.getMessages(AuthEvents.GET_ORG_CONTEXT_BY_DID,
            async (msg: { did: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg || !msg.did) {
                        return new MessageResponse(null);
                    }
                    const entityRepository = new DatabaseServer();
                    const member = await entityRepository.findOne(OrganizationMember, {
                        did: msg.did,
                        active: true
                    });
                    if (!member?.organizationId) {
                        return new MessageResponse(null);
                    }
                    let orgRolePermissions: string[] = [];
                    if (member.orgRoleId) {
                        const role = await entityRepository.findOne(OrgRole, { id: member.orgRoleId });
                        orgRolePermissions = role?.permissions ?? [];
                    }
                    return new MessageResponse({
                        organizationId: member.organizationId,
                        orgRoleName: member.orgRoleName ?? null,
                        orgRolePermissions
                    });
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * List the DIDs of an organization's active members (unscoped, internal).
         * Returns the full DID set — it feeds `$in` document filters in the policy engine.
         */
        this.getMessages(AuthEvents.GET_ORG_MEMBER_DIDS,
            async (msg: { organizationId: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg || !msg.organizationId) {
                        return new MessageResponse([]);
                    }
                    const members = await new DatabaseServer().find(OrganizationMember, {
                        organizationId: msg.organizationId,
                        active: true
                    });
                    return new MessageResponse(members.map((m) => m.did).filter(Boolean));
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Update a member's role (validates the new role belongs to the same org). Owner-scoped,
         * plus a dual-auth admin branch (MEMBER_MANAGE): R1 — the member's CURRENT role must not
         * carry MEMBER_MANAGE (covers self-demotion, since the admin's own row carries it) and
         * the NEW role must not carry it either; R2 — the new role's permissions must be a subset
         * of the admin's own role's permissions.
         */
        this.getMessages(AuthEvents.UPDATE_ORG_MEMBER_ROLE,
            async (msg: { id: string, orgRoleId: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid update member role parameters');
                    }
                    const { id, orgRoleId, owner } = msg;
                    const entityRepository = new DatabaseServer();

                    const member = await entityRepository.findOne(OrganizationMember, { id });
                    if (!member) {
                        return new MessageError('Invalid member');
                    }
                    const auth = await resolveOrgManagementAuth(
                        entityRepository, owner, member.organizationId, 'Invalid member'
                    );

                    const role = await entityRepository.findOne(OrgRole, {
                        id: orgRoleId,
                        organizationId: member.organizationId
                    });
                    if (!role) {
                        return new MessageError('Invalid role for this organization');
                    }

                    if (auth.actor === 'admin') {
                        const currentRole = member.orgRoleId
                            ? await entityRepository.findOne(OrgRole, { id: member.orgRoleId })
                            : null;
                        if (roleCarriesMemberManage(currentRole) || roleCarriesMemberManage(role)) {
                            return new MessageError('Invalid member');
                        }
                        if (!isPermissionSubset(auth.adminRole, role)) {
                            return new MessageError('Invalid member');
                        }
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
         * Remove a member (hard delete to free the @Unique(did) constraint). Owner-scoped, plus a
         * dual-auth admin branch (MEMBER_MANAGE): R1 — the member's current role must not carry
         * MEMBER_MANAGE (covers self-removal, since the admin's own row carries it).
         */
        this.getMessages(AuthEvents.REMOVE_ORG_MEMBER,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid remove member parameters');
                    }
                    const { id, owner } = msg;
                    const entityRepository = new DatabaseServer();

                    const member = await entityRepository.findOne(OrganizationMember, { id });
                    if (!member) {
                        return new MessageError('Invalid member');
                    }
                    const auth = await resolveOrgManagementAuth(
                        entityRepository, owner, member.organizationId, 'Invalid member'
                    );

                    if (auth.actor === 'admin') {
                        const currentRole = member.orgRoleId
                            ? await entityRepository.findOne(OrgRole, { id: member.orgRoleId })
                            : null;
                        if (roleCarriesMemberManage(currentRole)) {
                            return new MessageError('Invalid member');
                        }
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
         * Intentionally UNSCOPED (no IOwner check) — internal NATS-only lookup invoked by an
         * arbitrary user's own org membership, via Users.getOrgPolicyIds, from three consumers:
         *  1. guardian-service PolicyEngine.addAccessFilters — extends the ACCESS_POLICY_ASSIGNED*
         *     policy *list* visibility through org membership (fail-open/best-effort).
         *  2. guardian-service PolicyEngine.accessPolicyCode — the policy open/execute *access
         *     gate* (fail-closed): org assignment grants access equivalent to a personal
         *     AssignEntity, but does NOT auto-enroll the member into policy groups.
         *  3. policy-service actions-service.accessPolicy — the same access gate on the relayed
         *     block-action path.
         * Do NOT expose at the api-gateway layer.
         *
         * Note: GET_ORG_POLICIES is the owner-scoped sibling intended for SR management; this
         * event exists specifically so these dynamic lookups are not blocked by owner scoping
         * when the requesting user is a member rather than the org's SR owner.
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

        /**
         * Validate that the caller (SR owner or MEMBER_MANAGE admin) may manage the given
         * organization, and — when `orgRoleId` is supplied — that role is a valid assignment
         * target under R1/R2 on the admin branch. Internal NATS-only pre-flight for
         * guardian-service's enroll orchestration; the authoritative re-check remains in
         * ENROLL_ORG_MEMBER, since this event must be safe to call speculatively without itself
         * performing the enrollment.
         */
        this.getMessages(AuthEvents.VALIDATE_ORG_MANAGEMENT_ACCESS,
            async (msg: {
                organizationId: string,
                orgRoleId?: string,
                owner: IOwner,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid validate org management access parameters');
                    }
                    const { organizationId, orgRoleId, owner } = msg;
                    const entityRepository = new DatabaseServer();

                    const auth = await resolveOrgManagementAuth(entityRepository, owner, organizationId);

                    let orgRole: OrgRole | null = null;
                    if (orgRoleId) {
                        orgRole = await entityRepository.findOne(OrgRole, {
                            id: orgRoleId,
                            organizationId
                        });
                        if (!orgRole) {
                            return new MessageError('Invalid role for this organization');
                        }
                        if (auth.actor === 'admin') {
                            if (roleCarriesMemberManage(orgRole) || !isPermissionSubset(auth.adminRole, orgRole)) {
                                return new MessageError('Invalid organization');
                            }
                        }
                    }

                    return new MessageResponse({ organization: auth.organization, orgRole });
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });
    }
}
