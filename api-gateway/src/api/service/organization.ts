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
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    Response,
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
 * All endpoints are owner-scoped through @Auth + EntityOwner(user). Record-layer CRUD goes
 * directly to auth-service via the Users helper (mirroring the relayer-accounts / permissions
 * controllers). On-ledger publish + member enrollment go through guardian-service via the
 * Guardians helper, which in turn delegates to the orchestration handlers added in Phase 3.
 *
 * Intentionally NOT exposed at REST: GET_ORG_MEMBERSHIP_BY_DID, GET_POLICY_ORGS,
 * GET_POLICIES_FOR_ORG, GET_ORG_POLICY_IDS_FOR_USER — those are internal NATS-only lookups.
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
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_READ)
    @ApiOperation({
        summary: 'List organizations owned by the active Standard Registry.',
        description:
            'Returns a paginated list of organizations owned by the calling Standard Registry. Supports filtering by name (case-insensitive partial match).'
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
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_READ)
    @ApiOperation({
        summary: 'Get one organization by id.',
        description: 'Returns the organization identified by the path parameter. Must be owned by the calling Standard Registry.'
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
        @Body() body: UpdateOrganizationDTO,
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
            'Deletes the organization and cascades its OrgRoles, OrganizationMembers, and PolicyOrgAssignments at the record layer. Hedera-side artefacts (topic, DID document, on-ledger messages) are immutable and are NOT removed.'
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
            'Creates the organization topic under the SR/global topic, publishes the organization DID and OrganizationMessage, stores the Hedera key in the org wallet, and persists the hydrated record. The provided Hedera key is stored securely and never echoed.'
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
        description: 'Creates a named role under the organization with a subset of OrgRolePermission (TOKEN_MINTING, TOKEN_RETIREMENT, TOKEN_TRANSFER). Role names are unique within an organization.'
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
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_READ)
    @ApiOperation({
        summary: 'List roles under an organization.',
        description: 'Returns all OrgRoles defined under the organization.'
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
    @Auth(Permissions.ORGANIZATIONS_ORG_MEMBER_MANAGE)
    @ApiOperation({
        summary: 'Enroll a user as a member of an organization.',
        description:
            'Publishes a RegistrationMessage(Init) on the organization topic (carrying member DID + role name as attributes), then persists the OrganizationMember record with the resulting messageId. A user can belong to at most one organization (enforced by @Unique(did)).'
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
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_READ)
    @ApiOperation({
        summary: 'List members of an organization.',
        description: 'Returns a paginated list of OrganizationMember rows. Supports filtering by active flag, OrgRole id, and member DID.'
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
    @Auth(Permissions.ORGANIZATIONS_ORGANIZATION_READ)
    @ApiOperation({
        summary: 'Get an organization member by id.',
        description: 'Returns one OrganizationMember row by its database identifier. Owner-scoped via the parent organization.'
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
    @Auth(Permissions.ORGANIZATIONS_ORG_MEMBER_MANAGE)
    @ApiOperation({
        summary: 'Update an organization member\'s role.',
        description: 'Re-assigns the OrgRole of an existing OrganizationMember. The new role must belong to the same organization.'
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
    @Auth(Permissions.ORGANIZATIONS_ORG_MEMBER_MANAGE)
    @ApiOperation({
        summary: 'Remove an organization member.',
        description: 'Removes an OrganizationMember row. The delete is hard (not soft) so the @Unique(did) constraint is freed and the user can be enrolled in another organization.'
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
            'Creates a PolicyOrgAssignment row that surfaces the policy to current and future members of the organization (visibility layer). Idempotent: an existing assignment is returned unchanged; a previously revoked assignment is reactivated.'
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
}
