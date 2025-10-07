import { IAuthUser, PinoLogger } from '@guardian/common';
import { AssignedEntityType, Permissions, PolicyStatus, UserPermissions } from '@guardian/interfaces';
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
    Req,
    Response
} from '@nestjs/common';
import { ApiTags, ApiInternalServerErrorResponse, ApiExtraModels, ApiOperation, ApiBody, ApiOkResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AssignPolicyDTO, Examples, InternalServerErrorDTO, PermissionsDTO, PolicyDTO, RoleDTO, UserDTO, pageHeader } from '#middlewares';
import { AuthUser, Auth } from '#auth';
import { CacheService, EntityOwner, getCacheKey, Guardians, InternalException, Users } from '#helpers';
import { WebSocketsService } from './websockets.js';
import { CACHE_PREFIXES, PREFIXES } from '#constants';

@Controller('permissions')
@ApiTags('permissions')
export class PermissionsApi {
    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }

    /**
     * Return a list of all permissions
     */
    @Get('/')
    @Auth(
        Permissions.PERMISSIONS_ROLE_READ,
        Permissions.DELEGATION_ROLE_MANAGE
    )
    @ApiOperation({
        summary: 'Return a list of all permissions.',
        description: 'Returns all permissions.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PermissionsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RoleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPermissions(
        @AuthUser() user: IAuthUser,
    ): Promise<PermissionsDTO[]> {
        try {
            return await (new Users()).getPermissions(user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Return a list of all roles
     */
    @Get('/roles/')
    @Auth(
        Permissions.PERMISSIONS_ROLE_READ,
        Permissions.DELEGATION_ROLE_MANAGE
    )
    @ApiOperation({
        summary: 'Return a list of all roles.',
        description: 'Returns all roles.',
    })
    @ApiQuery({
        name: 'name',
        type: String,
        description: 'Filter by role name',
        required: false,
        example: 'name'
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
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: RoleDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RoleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRoles(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('name') name?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<RoleDTO[]> {
        try {
            const owner = user.parent || user.did;
            const options: any = {
                name,
                owner,
                user: user.did,
                onlyOwn: !UserPermissions.has(user, Permissions.PERMISSIONS_ROLE_READ),
                pageIndex,
                pageSize
            };
            const { items, count } = await (new Users()).getRoles(options, user.id);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create role
     */
    @Post('/roles/')
    @Auth(
        Permissions.PERMISSIONS_ROLE_CREATE
    )
    @ApiOperation({
        summary: 'Creates new role.',
        description: 'Creates new role.',
    })
    @ApiBody({
        description: 'Object that contains role information.',
        required: true,
        type: RoleDTO,
    })
    @ApiOkResponse({
        description: 'Created role.',
        type: RoleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RoleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createRole(
        @AuthUser() user: IAuthUser,
        @Body() body: RoleDTO
    ): Promise<RoleDTO> {
        try {
            const owner = new EntityOwner(user);
            const role = await (new Users()).createRole(body, owner);
            await (new Guardians()).createRole(role, owner);
            return role;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Updates role
     */
    @Put('/roles/:id')
    @Auth(
        Permissions.PERMISSIONS_ROLE_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates role configuration.',
        description: 'Updates role configuration for the specified role ID.'
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        required: true,
        description: 'Role Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Role configuration.',
        type: RoleDTO,
    })
    @ApiOkResponse({
        description: 'Role configuration.',
        type: RoleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RoleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateRole(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() role: RoleDTO
    ): Promise<RoleDTO> {
        let row: any;
        const userService = new Users();
        try {
            row = await userService.getRoleById(id, user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
        if (!row) {
            throw new HttpException('Role does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const owner = new EntityOwner(user);
            const result = await userService.updateRole(id, role, owner);
            const users = await userService.refreshUserPermissions(id, user.did, user.id);
            await (new Guardians()).updateRole(result, owner);
            const wsService = new WebSocketsService(this.logger);
            wsService.updatePermissions(users);

            const prefixInvalidatedCacheTags = [
                `${CACHE_PREFIXES.TAG}/${PREFIXES.PROFILES}`,
                `${CACHE_PREFIXES.TAG}/${PREFIXES.ACCOUNTS}`,
            ];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return result;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Remove role
     */
    @Delete('/roles/:id')
    @Auth(
        Permissions.PERMISSIONS_ROLE_DELETE
    )
    @ApiOperation({
        summary: 'Deletes the role.',
        description: 'Deletes the role with the provided role ID.'
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        required: true,
        description: 'Role Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteModule(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
    ): Promise<boolean> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const userService = new Users();
            const result = await userService.deleteRole(id, owner);
            const users = await userService.refreshUserPermissions(id, user.did, user.id);
            await (new Guardians()).deleteRole(result, owner);
            const wsService = new WebSocketsService(this.logger);
            wsService.updatePermissions(users);
            return result;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Set default role
     */
    @Post('/roles/default')
    @Auth(
        Permissions.PERMISSIONS_ROLE_CREATE
    )
    @ApiOperation({
        summary: 'Set default role.',
        description: 'Set the role as default for new users.',
    })
    @ApiBody({
        description: 'Object that contains role information.',
        required: true,
        schema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Role Identifier',
                    example: Examples.DB_ID
                }
            },
            required: ['id']
        },
        examples: {
            Default: {
                value: {
                    id: Examples.DB_ID
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Created role.',
        type: RoleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RoleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async setDefaultRole(
        @AuthUser() user: IAuthUser,
        @Body() body: { id: string }
    ): Promise<RoleDTO> {
        try {
            return await (new Users()).setDefaultRole(body?.id, user.did, user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Return a list of all users
     */
    @Get('/users/')
    @Auth(
        Permissions.PERMISSIONS_ROLE_MANAGE,
        Permissions.DELEGATION_ROLE_MANAGE
    )
    @ApiOperation({
        summary: 'Return a list of all users.',
        description: 'Returns all users.',
    })
    @ApiQuery({
        name: 'role',
        type: String,
        description: 'Filter by role',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'status',
        type: String,
        enum: ['Active', 'Inactive'],
        description: 'Filter by status',
        required: false,
        example: 'Active'
    })
    @ApiQuery({
        name: 'username',
        type: String,
        description: 'Filter by username',
        required: false,
        example: 'username'
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
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: UserDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(UserDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getUsers(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('role') role?: string,
        @Query('status') status?: string,
        @Query('username') username?: string
    ): Promise<UserDTO[]> {
        try {
            const options: any = {
                filters: {
                    role,
                    status,
                    username,
                    did: { $ne: user.did }
                },
                parent: user.parent ? user.parent : user.did,
                pageIndex,
                pageSize
            };
            const { items, count } = await (new Users()).getWorkers(options, user.id);
            const guardians = new Guardians();
            for (const item of items) {
                item.assignedEntities = await guardians.assignedEntities(user, item.did);
            }
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get user
     */
    @Get('/users/:username')
    @Auth(
        Permissions.PERMISSIONS_ROLE_MANAGE,
        Permissions.DELEGATION_ROLE_MANAGE
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates user permissions.',
        description: 'Updates user permissions for the specified username.'
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'User Identifier',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'User permissions.',
        type: UserDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(UserDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getUser(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string
    ): Promise<UserDTO> {
        try {
            const owner = user.parent || user.did;
            const users = new Users();
            const row = await users.getUserPermissions(username, user.id);
            if (!row || row.parent !== owner || row.did === user.did) {
                throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND);
            }
            return row as any;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Updates user
     */
    @Put('/users/:username')
    @Auth(
        Permissions.PERMISSIONS_ROLE_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates user permissions.',
        description: 'Updates user permissions for the specified username.'
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'User Identifier',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'User permissions.',
        type: String,
        isArray: true,
        examples: {
            Roles: {
                value: [Examples.DB_ID, Examples.DB_ID]
            }
        }
    })
    @ApiOkResponse({
        description: 'User permissions.',
        type: UserDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(UserDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateUser(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string,
        @Body() body: string[],
        @Req() req
    ): Promise<UserDTO> {
        let row: any;
        const ownerDid = user.parent || user.did;
        const users = new Users();
        try {
            row = await users.getUserPermissions(username, user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
        if (!row || row.parent !== ownerDid || row.did === user.did) {
            throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const owner = new EntityOwner(user);
            const result = await users.updateUserRole(username, body, owner);
            await (new Guardians()).setRole(result, owner);
            const wsService = new WebSocketsService(this.logger);
            wsService.updatePermissions(result);

            const invalidedCacheTags = [
                `/${PREFIXES.PROFILES}/${username}`,
                `/${PREFIXES.ACCOUNTS}/session`
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], result))

            return result;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get policies
     */
    @Get('/users/:username/policies')
    @Auth(
        Permissions.PERMISSIONS_ROLE_MANAGE,
        Permissions.DELEGATION_ROLE_MANAGE
    )
    @ApiOperation({
        summary: 'Return a list of all roles.',
        description: 'Returns all roles.',
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'User Identifier',
        required: true,
        example: 'username'
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
    @ApiQuery({
        name: 'status',
        type: String,
        enum: PolicyStatus,
        description: 'Filter by status',
        required: false,
        example: 'Active'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: PolicyDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getAssignedPolicies(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('username') username: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('status') status?: string
    ): Promise<PolicyDTO[]> {
        const owner = user.parent || user.did;
        let target: any;
        try {
            target = await (new Users()).getUserPermissions(username, user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
        if (!target || target.parent !== owner) {
            throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const options: any = {
                owner,
                user: user.did,
                target: target.did,
                onlyOwn: !UserPermissions.has(user, Permissions.PERMISSIONS_ROLE_READ),
                pageIndex,
                pageSize,
                status
            };
            const { policies, count } = await (new Guardians())
                .getAssignedPolicies(user, options);
            return res.header('X-Total-Count', count).send(policies);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Assign policy
     */
    @Post('/users/:username/policies/assign')
    @Auth(
        Permissions.PERMISSIONS_ROLE_MANAGE
    )
    @ApiOperation({
        summary: 'Assign policy.',
        description: 'Assign policy.',
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'User Identifier',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'Options.',
        required: true,
        type: AssignPolicyDTO,
    })
    @ApiOkResponse({
        description: 'Assigned policy.',
        type: PolicyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async assignPolicy(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string,
        @Body() body: AssignPolicyDTO
    ): Promise<PolicyDTO> {
        let row: any;
        const owner = user.parent || user.did;
        const users = new Users();
        try {
            row = await users.getUserPermissions(username, user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
        if (!row || row.parent !== owner || row.did === user.did) {
            throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const { policyIds, assign } = body;
            return await (new Guardians()).assignEntity(
                user,
                AssignedEntityType.Policy,
                policyIds,
                assign,
                row.did,
                user.did
            );
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delegate role
     */
    @Put('/users/:username/delegate')
    @Auth(Permissions.DELEGATION_ROLE_MANAGE)
    @ApiOperation({
        summary: 'Delegate user permissions.',
        description: 'Delegate user permissions for the specified username.'
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'User Identifier',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'User permissions.',
        type: String,
        isArray: true,
        examples: {
            Roles: {
                value: [Examples.DB_ID, Examples.DB_ID]
            }
        }
    })
    @ApiOkResponse({
        description: 'User permissions.',
        type: UserDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(UserDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async delegateRole(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string,
        @Body() body: string[]
    ): Promise<UserDTO> {
        let row: any;
        const users = new Users();
        try {
            row = await users.getUserPermissions(username, user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
        if (!row || row.parent !== user.parent || row.did === user.did) {
            throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const owner = new EntityOwner(user);
            const result = await users.delegateUserRole(username, body, owner);
            await (new Guardians()).setRole(result, owner);
            const wsService = new WebSocketsService(this.logger);
            wsService.updatePermissions(result);
            return result;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delegate policy
     */
    @Post('/users/:username/policies/delegate')
    @Auth(
        Permissions.DELEGATION_ROLE_MANAGE
    )
    @ApiOperation({
        summary: 'Delegate policy.',
        description: 'Delegate policy.',
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'User Identifier',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'Options.',
        required: true,
        type: AssignPolicyDTO,
    })
    @ApiOkResponse({
        description: 'Assigned policy.',
        type: PolicyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async delegatePolicy(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string,
        @Body() body: AssignPolicyDTO
    ): Promise<PolicyDTO> {
        let row: any;
        const users = new Users();
        try {
            row = await users.getUserPermissions(username, user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
        if (!row || row.parent !== user.parent || row.did === user.did) {
            throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const { policyIds, assign } = body;
            return await (new Guardians()).delegateEntity(
                user,
                AssignedEntityType.Policy,
                policyIds,
                assign,
                row.did,
                user.did
            );
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
