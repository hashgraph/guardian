import { Auth, AuthUser } from '#auth';
import { EntityOwner, Guardians, InternalException, Users } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Permissions } from '@guardian/interfaces';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    Response,
    ValidationPipe,
} from '@nestjs/common';
import {
    ApiBody,
    ApiCreatedResponse,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import {
    AssignPolicyToOrgDTO,
    CreateOrgRoleDTO,
    CreateOrganizationDTO,
    EnrollMemberDTO,
    Examples,
    InternalServerErrorDTO,
    OrgRoleDTO,
    OrganizationDTO,
    OrganizationMemberDTO,
    PolicyOrgAssignmentDTO,
    PublishOrganizationDTO,
    TokenInfoDTO,
    UpdateMemberRoleDTO,
    UpdateOrgRoleDTO,
    UpdateOrganizationDTO,
    pageHeader,
} from '#middlewares';

/**
 * Coerce query-string booleans (which arrive as 'true' / 'false' / undefined) to a real boolean.
 * Returns undefined when the input is unset so the caller can preserve "no filter" semantics.
 */
function coerceBool(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }
    }
    return undefined;
}

/**
 * Organization REST surface.
 *
 * Dual-auth model: every endpoint is gated through @Auth + EntityOwner(user), but that gate is
 * coarse — it only proves the caller may reach the handler, not that they may act on *this*
 * organization. The authoritative decision is resolved handler-side in auth-service
 * (`resolveOrgManagementAuth`): either the SR owner (`Organization.owner === owner.creator`, no
 * ceiling — the historical behaviour every route originally had), or a delegated organization
 * administrator — an active `OrganizationMember` of the organization whose `OrgRole` carries
 * `OrgRolePermission.MEMBER_MANAGE`. Member-management writes and the read routes below OR in
 * `Permissions.ORGANIZATIONS_ORG_MEMBER_SELF_MANAGE` (granted to every user by default, disabled
 * in the role-builder) alongside their SR-only permission so a delegated admin's request can
 * reach the handler at all; the handler then enforces R1 (only the SR owner branch may grant
 * MEMBER_MANAGE or touch a member who already holds it) and R2 (an admin may only assign a role
 * whose permissions are a subset of their own). Record-layer CRUD goes directly to auth-service
 * via the Users helper (mirroring the relayer-accounts / permissions controllers). On-ledger
 * publish + member enrollment go through guardian-service via the Guardians helper, which in
 * turn delegates to the orchestration handlers added in Phase 3.
 *
 * Intentionally NOT exposed at REST: GET_ORG_MEMBERSHIP_BY_DID, GET_POLICY_ORGS,
 * GET_POLICIES_FOR_ORG, GET_ORG_POLICY_IDS_FOR_USER, GET_ORG_HEDERA_INFO,
 * GET_ORG_CONTEXT_BY_DID, GET_ORG_MEMBER_DIDS, VALIDATE_ORG_MANAGEMENT_ACCESS — those are
 * internal NATS-only lookups.
 */
@Controller('organizations')
@ApiTags('organizations')
export class OrganizationApi {
    constructor(private readonly logger: PinoLogger) {
    }

    //#region Organization CRUD

    /**
     * Create a DRAFT organization (record-layer only; publish is a separate explicit step).
     */
    @Post('/')
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_CREATE)
    @ApiOperation({
        summary: 'Create a new (DRAFT) organization.',
        description:
            'Creates a registry-scoped organization record owned by the calling Standard Registry. ' +
            'The record is created with status DRAFT; on-ledger topic/DID/message publishing is a separate explicit action: POST /organizations/{id}/publish.'
    })
    @ApiBody({
        description: 'Organization name and optional description.',
        type: CreateOrganizationDTO,
        required: true,
    })
    @ApiCreatedResponse({
        description: 'Organization created.',
        type: OrganizationDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.CREATED)
    async createOrganization(
        @AuthUser() user: IAuthUser,
        @Body() body: CreateOrganizationDTO,
    ): Promise<OrganizationDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).createOrganization(body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * List organizations owned by the calling SR (paged).
     */
    @Get('/')
    @Auth(
        Permissions.ORGANIZATIONS_ORGANIZATION_READ,
        Permissions.ORGANIZATIONS_ORG_MEMBER_SELF_MANAGE
    )
    @ApiOperation({
        summary: 'List organizations owned by the active Standard Registry.',
        description:
            'Returns a paginated list of organizations owned by the calling Standard Registry. Supports filtering by name (case-insensitive partial match). ' +
            'If the caller is instead an organization administrator (an active member whose OrgRole carries MEMBER_MANAGE), the single organization they administer is also included — their discovery path for that organization\'s id.'
    })
    @ApiQuery({
        name: 'name',
        type: String,
        description: 'Filter by organization name (case-insensitive, partial match). Leave empty to return all.',
        required: false,
        example: ''
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns organizations array and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        type: OrganizationDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getOrganizations(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('name') name?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<OrganizationDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const { items, count } = await (new Users()).getOrganizations(
                owner,
                { name },
                pageIndex,
                pageSize
            );
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get one organization by id.
     */
    @Get('/:id')
    @Auth(
        Permissions.ORGANIZATIONS_ORGANIZATION_READ,
        Permissions.ORGANIZATIONS_ORG_MEMBER_SELF_MANAGE
    )
    @ApiOperation({
        summary: 'Get one organization by id.',
        description: 'Returns the organization identified by the path parameter. Must be owned by the calling Standard Registry, or the calling organization administrator\'s own organization (an active member whose OrgRole carries MEMBER_MANAGE).'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiOkResponse({ description: 'Successful operation.', type: OrganizationDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async getOrganization(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
    ): Promise<OrganizationDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).getOrganization(id, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update record-layer fields on an organization (name / description only).
     */
    @Put('/:id')
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_UPDATE)
    @ApiOperation({
        summary: 'Update an organization (record-layer fields only).',
        description:
            'Updates the human-readable fields of an organization. On-ledger fields (did, topicId, parentTopicId, hederaAccountId, status, location) are hydrated by the explicit publish action and are not settable here.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiBody({
        description: 'Fields to update. All fields are optional; only provided fields are written.',
        type: UpdateOrganizationDTO,
        required: true,
    })
    @ApiOkResponse({ description: 'Organization updated.', type: OrganizationDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async updateOrganization(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        // whitelist strips undeclared fields: the UPDATE_ORGANIZATION handler also writes
        // the publish-flow fields (status, did, topicId, hederaAccountId) when present.
        @Body(new ValidationPipe({ transform: true, whitelist: true })) body: UpdateOrganizationDTO,
    ): Promise<OrganizationDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).updateOrganization(id, body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete an organization (cascades dependent records at the record layer).
     */
    @Delete('/:id')
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_DELETE)
    @ApiOperation({
        summary: 'Delete an organization.',
        description:
            'Deletes the organization and cascades its OrgRoles, OrganizationMembers, and PolicyOrgAssignments at the record layer. Only DRAFT organizations can be deleted; once publishing has begun (PUBLISHED or PUBLISH_ERROR) the organization is permanent — a PUBLISH_ERROR organization can be republished, and decommissioning a published organization is future work. Hedera-side artefacts (topic, DID document, on-ledger messages) are immutable and are NOT removed.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiOkResponse({ description: 'Organization deleted. Returns the removed record.', type: OrganizationDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async deleteOrganization(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
    ): Promise<OrganizationDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).deleteOrganization(id, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish a DRAFT organization on the ledger.
     */
    @Post('/:id/publish')
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_UPDATE)
    @ApiOperation({
        summary: 'Publish a DRAFT organization on the ledger.',
        description:
            'Creates the organization topic under the SR/global topic, publishes the organization DID and OrganizationMessage, stores the Hedera key in the org wallet, and persists the hydrated record (status PUBLISHED) as the final step. If publishing fails after the first ledger write the organization is marked PUBLISH_ERROR and can be republished (a retry creates a fresh topic/DID set). The provided Hedera key is stored securely and never echoed.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiBody({
        description: 'Hedera account ID and key to associate with the organization (key stored in vault).',
        type: PublishOrganizationDTO,
        required: true,
    })
    @ApiOkResponse({ description: 'Organization published. Returns the hydrated record.', type: OrganizationDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async publishOrganization(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() body: PublishOrganizationDTO,
    ): Promise<OrganizationDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Guardians()).publishOrganization(
                {
                    organizationId: id,
                    hederaAccountId: body.hederaAccountId,
                    hederaAccountKey: body.hederaAccountKey,
                    description: body.description,
                },
                owner,
                user.id
            );
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region OrgRole CRUD

    /**
     * Create an OrgRole under an organization.
     */
    @Post('/:id/roles')
    @Auth(Permissions.ORGANIZATIONS_ORG_ROLE_MANAGE)
    @ApiOperation({
        summary: 'Create a role under an organization.',
        description: 'Creates a named role under the organization with a subset of OrgRolePermission (TOKEN_MINTING, TOKEN_RETIREMENT, TOKEN_TRANSFER, MEMBER_MANAGE). MEMBER_MANAGE makes members holding the role organization administrators, able to manage their own organization\'s non-admin membership; granting or revoking it is always Standard-Registry-only. Role names are unique within an organization.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiBody({ description: 'Role name + optional permissions list.', type: CreateOrgRoleDTO, required: true })
    @ApiCreatedResponse({ description: 'Role created.', type: OrgRoleDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.CREATED)
    async createOrgRole(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() body: CreateOrgRoleDTO,
    ): Promise<OrgRoleDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).createOrgRole(id, body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * List OrgRoles under an organization.
     */
    @Get('/:id/roles')
    @Auth(
        Permissions.ORGANIZATIONS_ORGANIZATION_READ,
        Permissions.ORGANIZATIONS_ORG_MEMBER_SELF_MANAGE
    )
    @ApiOperation({
        summary: 'List roles under an organization.',
        description: 'Returns all OrgRoles defined under the organization. Callable by the owning Standard Registry, or by an organization administrator (an active member whose OrgRole carries MEMBER_MANAGE) for their own organization.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiOkResponse({ description: 'Successful operation.', isArray: true, type: OrgRoleDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async getOrgRoles(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
    ): Promise<OrgRoleDTO[]> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).getOrgRoles(id, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update an OrgRole.
     */
    @Put('/:id/roles/:roleId')
    @Auth(Permissions.ORGANIZATIONS_ORG_ROLE_MANAGE)
    @ApiOperation({
        summary: 'Update an organization role.',
        description: 'Updates the name, description, or permissions of an OrgRole. A name change propagates to the denormalized OrganizationMember.orgRoleName on all existing members.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'roleId', type: String, required: true, description: 'OrgRole identifier', example: Examples.DB_ID_2 })
    @ApiBody({ description: 'Role fields to update.', type: UpdateOrgRoleDTO, required: true })
    @ApiOkResponse({ description: 'Role updated.', type: OrgRoleDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async updateOrgRole(
        @AuthUser() user: IAuthUser,
        @Param('id') _id: string,
        @Param('roleId') roleId: string,
        @Body() body: UpdateOrgRoleDTO,
    ): Promise<OrgRoleDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).updateOrgRole(roleId, body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete an OrgRole. Refused while members are still assigned to the role.
     */
    @Delete('/:id/roles/:roleId')
    @Auth(Permissions.ORGANIZATIONS_ORG_ROLE_MANAGE)
    @ApiOperation({
        summary: 'Delete an organization role.',
        description: 'Removes an OrgRole. The operation is refused if any active OrganizationMember is still assigned to the role; re-assign or remove those members first.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'roleId', type: String, required: true, description: 'OrgRole identifier', example: Examples.DB_ID_2 })
    @ApiOkResponse({ description: 'Role deleted. Returns the removed record.', type: OrgRoleDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async deleteOrgRole(
        @AuthUser() user: IAuthUser,
        @Param('id') _id: string,
        @Param('roleId') roleId: string,
    ): Promise<OrgRoleDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).deleteOrgRole(roleId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Membership

    /**
     * Enroll a member: publish RegistrationMessage(Init) on the org topic + persist the row.
     */
    @Post('/:id/members')
    @Auth(
        Permissions.ORGANIZATIONS_ORG_MEMBER_MANAGE,
        Permissions.ORGANIZATIONS_ORG_MEMBER_SELF_MANAGE
    )
    @ApiOperation({
        summary: 'Enroll a user as a member of an organization.',
        description:
            'Validates the member first (user exists, not already in an organization), then publishes a RegistrationMessage(Init) on the organization topic (carrying member DID + role name as attributes), then persists the OrganizationMember record with the resulting messageId. A user can belong to at most one organization (enforced by @Unique(did)). ' +
            'Callable by the owning Standard Registry (no restriction), or by an organization administrator (an active member whose OrgRole carries MEMBER_MANAGE) enrolling into their own organization — subject to server-side rules: an admin cannot assign a role that itself carries MEMBER_MANAGE, and the assigned role\'s permissions must be a subset of the admin\'s own role\'s permissions.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiBody({ description: 'Member DID + target OrgRole identifier.', type: EnrollMemberDTO, required: true })
    @ApiCreatedResponse({ description: 'Member enrolled.', type: OrganizationMemberDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.CREATED)
    async enrollOrganizationMember(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() body: EnrollMemberDTO,
    ): Promise<OrganizationMemberDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Guardians()).enrollOrganizationMember(
                {
                    organizationId: id,
                    did: body.did,
                    orgRoleId: body.orgRoleId,
                },
                owner,
                user.id
            );
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * List members of an organization (paged).
     */
    @Get('/:id/members')
    @Auth(
        Permissions.ORGANIZATIONS_ORGANIZATION_READ,
        Permissions.ORGANIZATIONS_ORG_MEMBER_SELF_MANAGE
    )
    @ApiOperation({
        summary: 'List members of an organization.',
        description: 'Returns a paginated list of OrganizationMember rows. Supports filtering by active flag, OrgRole id, and member DID. Callable by the owning Standard Registry, or by an organization administrator (an active member whose OrgRole carries MEMBER_MANAGE) for their own organization.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiQuery({ name: 'active', type: Boolean, required: false, description: 'Filter by active flag (true/false). Omit to return all.', example: true })
    @ApiQuery({ name: 'orgRoleId', type: String, required: false, description: 'Filter by OrgRole identifier.', example: Examples.DB_ID_2 })
    @ApiQuery({ name: 'did', type: String, required: false, description: 'Filter by member DID.', example: Examples.DID })
    @ApiQuery({ name: 'pageIndex', type: Number, required: false, description: 'The number of pages to skip before starting to collect the result set', example: 0 })
    @ApiQuery({ name: 'pageSize', type: Number, required: false, description: 'The numbers of items to return', example: 20 })
    @ApiOkResponse({
        description: 'Successful operation. Returns members array and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        type: OrganizationMemberDTO,
    })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async getOrgMembers(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('id') id: string,
        @Query('active') active?: string | boolean,
        @Query('orgRoleId') orgRoleId?: string,
        @Query('did') did?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<OrganizationMemberDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const filters: { active?: boolean, orgRoleId?: string, did?: string } = {};
            const activeBool = coerceBool(active);
            if (activeBool !== undefined) {
                filters.active = activeBool;
            }
            if (orgRoleId) {
                filters.orgRoleId = orgRoleId;
            }
            if (did) {
                filters.did = did;
            }
            const { items, count } = await (new Users()).getOrgMembers(
                id,
                owner,
                filters,
                pageIndex,
                pageSize
            );
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get a single member by id.
     */
    @Get('/:id/members/:memberId')
    @Auth(
        Permissions.ORGANIZATIONS_ORGANIZATION_READ,
        Permissions.ORGANIZATIONS_ORG_MEMBER_SELF_MANAGE
    )
    @ApiOperation({
        summary: 'Get an organization member by id.',
        description: 'Returns one OrganizationMember row by its database identifier. Scoped via the parent organization: the owning Standard Registry, or an organization administrator (an active member whose OrgRole carries MEMBER_MANAGE) for their own organization.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'memberId', type: String, required: true, description: 'OrganizationMember identifier', example: Examples.DB_ID_2 })
    @ApiOkResponse({ description: 'Successful operation.', type: OrganizationMemberDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async getOrgMember(
        @AuthUser() user: IAuthUser,
        @Param('id') _id: string,
        @Param('memberId') memberId: string,
    ): Promise<OrganizationMemberDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).getOrgMember(memberId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update a member's role (record-layer only; no on-ledger message).
     */
    @Put('/:id/members/:memberId/role')
    @Auth(
        Permissions.ORGANIZATIONS_ORG_MEMBER_MANAGE,
        Permissions.ORGANIZATIONS_ORG_MEMBER_SELF_MANAGE
    )
    @ApiOperation({
        summary: 'Update an organization member\'s role.',
        description: 'Re-assigns the OrgRole of an existing OrganizationMember. The new role must belong to the same organization. ' +
            'Callable by the owning Standard Registry (no restriction), or by an organization administrator (an active member whose OrgRole carries MEMBER_MANAGE) re-assigning a member of their own organization — subject to server-side rules: an admin cannot re-role a member who currently holds MEMBER_MANAGE (including themselves) or assign a role that itself carries MEMBER_MANAGE, and the new role\'s permissions must be a subset of the admin\'s own role\'s permissions.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'memberId', type: String, required: true, description: 'OrganizationMember identifier', example: Examples.DB_ID_2 })
    @ApiBody({ description: 'Target OrgRole identifier.', type: UpdateMemberRoleDTO, required: true })
    @ApiOkResponse({ description: 'Member role updated.', type: OrganizationMemberDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async updateOrgMemberRole(
        @AuthUser() user: IAuthUser,
        @Param('id') _id: string,
        @Param('memberId') memberId: string,
        @Body() body: UpdateMemberRoleDTO,
    ): Promise<OrganizationMemberDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).updateOrgMemberRole(memberId, body.orgRoleId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Remove a member (hard delete to free the @Unique(did) constraint).
     */
    @Delete('/:id/members/:memberId')
    @Auth(
        Permissions.ORGANIZATIONS_ORG_MEMBER_MANAGE,
        Permissions.ORGANIZATIONS_ORG_MEMBER_SELF_MANAGE
    )
    @ApiOperation({
        summary: 'Remove an organization member.',
        description: 'Removes an OrganizationMember row. The delete is hard (not soft) so the @Unique(did) constraint is freed and the user can be enrolled in another organization. ' +
            'Callable by the owning Standard Registry (no restriction), or by an organization administrator (an active member whose OrgRole carries MEMBER_MANAGE) removing a member of their own organization — subject to server-side rules: an admin cannot remove a member who currently holds MEMBER_MANAGE (including themselves).'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'memberId', type: String, required: true, description: 'OrganizationMember identifier', example: Examples.DB_ID_2 })
    @ApiOkResponse({ description: 'Member removed. Returns the removed record.', type: OrganizationMemberDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async removeOrgMember(
        @AuthUser() user: IAuthUser,
        @Param('id') _id: string,
        @Param('memberId') memberId: string,
    ): Promise<OrganizationMemberDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).removeOrgMember(memberId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Policy assignment

    /**
     * Assign a policy to an organization (idempotent — also reactivates a revoked assignment).
     */
    @Post('/:id/policies/assign')
    @Auth(Permissions.ORGANIZATIONS_ORG_POLICY_ASSIGN)
    @ApiOperation({
        summary: 'Assign a policy to an organization.',
        description:
            'Creates a PolicyOrgAssignment row that grants current and future members of the organization visibility into the policy and open/execute access to it. Does NOT auto-enroll members into policy groups (PolicyRoles group selection still applies on first entry). Idempotent: an existing assignment is returned unchanged; a previously revoked assignment is reactivated.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiBody({ description: 'Policy identifier to assign.', type: AssignPolicyToOrgDTO, required: true })
    @ApiCreatedResponse({ description: 'Policy assigned.', type: PolicyOrgAssignmentDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.CREATED)
    async assignPolicyToOrg(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() body: AssignPolicyToOrgDTO,
    ): Promise<PolicyOrgAssignmentDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).assignPolicyToOrg(id, body.policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Revoke a policy assignment (soft revoke — keeps the row for audit).
     */
    @Delete('/:id/policies/:policyId')
    @Auth(Permissions.ORGANIZATIONS_ORG_POLICY_ASSIGN)
    @ApiOperation({
        summary: 'Revoke a policy assignment from an organization.',
        description: 'Soft-revokes a PolicyOrgAssignment by setting assigned=false; the row is kept for audit purposes and can be reactivated by re-assigning the same policy.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'policyId', type: String, required: true, description: 'Policy identifier', example: Examples.DB_ID_3 })
    @ApiOkResponse({ description: 'Assignment revoked. Returns the updated record (assigned=false).', type: PolicyOrgAssignmentDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async revokePolicyFromOrg(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Param('policyId') policyId: string,
    ): Promise<PolicyOrgAssignmentDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).revokePolicyFromOrg(id, policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * List policy assignments for an organization (active by default).
     */
    @Get('/:id/policies')
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_READ)
    @ApiOperation({
        summary: 'List policies assigned to an organization.',
        description: 'Returns the PolicyOrgAssignment rows for an organization. By default only active assignments are returned; pass includeRevoked=true to include soft-revoked rows.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiQuery({ name: 'includeRevoked', type: Boolean, required: false, description: 'Set to true to include soft-revoked assignments.', example: false })
    @ApiOkResponse({ description: 'Successful operation.', isArray: true, type: PolicyOrgAssignmentDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async getOrgPolicies(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Query('includeRevoked') includeRevoked?: string | boolean,
    ): Promise<PolicyOrgAssignmentDTO[]> {
        try {
            const owner = new EntityOwner(user);
            return await (new Users()).getOrgPolicies(id, owner, coerceBool(includeRevoked));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Org-wallet token association

    /**
     * Associate the organization's Hedera wallet with a token.
     * Gated by the org-role permission TOKEN_ASSOCIATE; the organization's owner always bypasses
     * the check.
     */
    @Put('/:id/tokens/:tokenId/associate')
    @Auth(Permissions.TOKENS_TOKEN_EXECUTE)
    @ApiOperation({
        summary: 'Associate a token with the organization\'s Hedera wallet.',
        description: 'Associates the provided token with the organization\'s Hedera account. Requires the caller to be an active member of the organization whose OrgRole carries TOKEN_ASSOCIATE, or the organization\'s owner (always allowed).'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'tokenId', type: String, required: true, description: 'Token identifier', example: Examples.DB_ID_2 })
    @ApiOkResponse({ description: 'Successful operation.', type: TokenInfoDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async associateOrgToken(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Param('tokenId') tokenId: string,
    ): Promise<TokenInfoDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Guardians()).associateOrgToken(id, tokenId, true, owner);
        } catch (error) {
            await this.mapOrgTokenAccessError(error, user.id);
        }
    }

    /**
     * Dissociate the organization's Hedera wallet from a token.
     * Gated by the org-role permission TOKEN_DISSOCIATE; the organization's owner always bypasses
     * the check.
     */
    @Put('/:id/tokens/:tokenId/dissociate')
    @Auth(Permissions.TOKENS_TOKEN_EXECUTE)
    @ApiOperation({
        summary: 'Dissociate a token from the organization\'s Hedera wallet.',
        description: 'Dissociates the provided token from the organization\'s Hedera account. Requires the caller to be an active member of the organization whose OrgRole carries TOKEN_DISSOCIATE, or the organization\'s owner (always allowed).'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'tokenId', type: String, required: true, description: 'Token identifier', example: Examples.DB_ID_2 })
    @ApiOkResponse({ description: 'Successful operation.', type: TokenInfoDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async dissociateOrgToken(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Param('tokenId') tokenId: string,
    ): Promise<TokenInfoDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Guardians()).associateOrgToken(id, tokenId, false, owner);
        } catch (error) {
            await this.mapOrgTokenAccessError(error, user.id);
        }
    }

    /**
     * Grant KYC for a token to the organization's Hedera wallet.
     * SR org-owner only: KYC is signed with the SR's token KYC key, so it is a
     * token-owner action rather than an org-wallet action (no org-role permission).
     */
    @Put('/:id/tokens/:tokenId/grant-kyc')
    @Auth(Permissions.TOKENS_TOKEN_MANAGE)
    @ApiOperation({
        summary: 'Grant KYC for a token to the organization\'s Hedera wallet.',
        description: 'Sets the KYC flag for the organization\'s Hedera account on the provided token. Requires the caller to be the organization\'s owner (Standard Registry) and the owner of the token\'s KYC key.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'tokenId', type: String, required: true, description: 'Token identifier', example: Examples.DB_ID_2 })
    @ApiOkResponse({ description: 'Successful operation.', type: TokenInfoDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async grantKycOrgToken(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Param('tokenId') tokenId: string,
    ): Promise<TokenInfoDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Guardians()).grantKycOrgToken(id, tokenId, true, owner);
        } catch (error) {
            await this.mapOrgTokenAccessError(error, user.id);
        }
    }

    /**
     * Revoke KYC for a token from the organization's Hedera wallet.
     * SR org-owner only (see grant-kyc).
     */
    @Put('/:id/tokens/:tokenId/revoke-kyc')
    @Auth(Permissions.TOKENS_TOKEN_MANAGE)
    @ApiOperation({
        summary: 'Revoke KYC for a token from the organization\'s Hedera wallet.',
        description: 'Unsets the KYC flag for the organization\'s Hedera account on the provided token. Requires the caller to be the organization\'s owner (Standard Registry) and the owner of the token\'s KYC key.'
    })
    @ApiParam({ name: 'id', type: String, required: true, description: 'Organization identifier', example: Examples.DB_ID })
    @ApiParam({ name: 'tokenId', type: String, required: true, description: 'Token identifier', example: Examples.DB_ID_2 })
    @ApiOkResponse({ description: 'Successful operation.', type: TokenInfoDTO })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async revokeKycOrgToken(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Param('tokenId') tokenId: string,
    ): Promise<TokenInfoDTO> {
        try {
            const owner = new EntityOwner(user);
            return await (new Guardians()).grantKycOrgToken(id, tokenId, false, owner);
        } catch (error) {
            await this.mapOrgTokenAccessError(error, user.id);
        }
    }

    /**
     * Maps `associateOrgToken` / `grantKycOrgToken` error messages to their appropriate HTTP
     * status: membership / permission failures are 403, 'Organization not found' /
     * 'Token not found' are 404, an organization without a Hedera account (not yet published)
     * is 422, everything else falls through to the controller's standard InternalException
     * handling.
     */
    private async mapOrgTokenAccessError(error: any, userId: string): Promise<void> {
        const message: string = String(error?.message || '').toLowerCase();
        if (message.includes('not an active member') ||
            message.includes('insufficient organization permissions') ||
            message.includes('insufficient permissions to manage kyc')) {
            await this.logger.error(error, ['API_GATEWAY'], userId);
            throw new HttpException(error.message, HttpStatus.FORBIDDEN);
        }
        if (message.includes('organization not found') || message.includes('token not found')) {
            await this.logger.error(error, ['API_GATEWAY'], userId);
            throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        if (message.includes('not linked to an hedera account')) {
            await this.logger.error(error, ['API_GATEWAY'], userId);
            throw new HttpException(error.message, HttpStatus.UNPROCESSABLE_ENTITY);
        }
        await InternalException(error, this.logger, userId);
    }

    //#endregion
}
