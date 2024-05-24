import { IAuthUser } from '@guardian/common';
import { AssignedEntityType, Permissions } from '@guardian/interfaces';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { ApiTags, ApiInternalServerErrorResponse, ApiExtraModels, ApiOperation, ApiBody, ApiOkResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AssignPolicyDTO, Examples, InternalServerErrorDTO, PermissionsDTO, PolicyDTO, RoleDTO, UserRolesDTO, pageHeader } from '#middlewares';
import { AuthUser, Auth } from '#auth';
import { Guardians, InternalException, PolicyEngine, Users } from '#helpers';
import { WebSocketsService } from './websockets.js';

@Controller('permissions')
@ApiTags('permissions')
export class PermissionsApi {
    /**
     * Return a list of all permissions
     */
    @Get('/')
    @Auth(
        Permissions.PERMISSIONS_ROLE_READ
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
    async getPermissions(): Promise<PermissionsDTO[]> {
        try {
            return await (new Users()).getPermissions();
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Return a list of all roles
     */
    @Get('/roles/')
    @Auth(
        Permissions.PERMISSIONS_ROLE_READ
    )
    @ApiOperation({
        summary: 'Return a list of all roles.',
        description: 'Returns all roles.',
    })
    @ApiQuery({
        name: 'name',
        type: String,
        description: 'Filter by role name',
        example: 'name'
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set'
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return'
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
        @Query('name') name: string,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Response() res: any
    ): Promise<RoleDTO[]> {
        try {
            const options: any = {
                filters: {
                    name
                },
                owner: user.did,
                pageIndex,
                pageSize
            };
            const { items, count } = await (new Users()).getRoles(options);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error);
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
            return await (new Users()).createRole(body, user.did);
        } catch (error) {
            await InternalException(error);
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
            row = await userService.getRoleById(id);
        } catch (error) {
            await InternalException(error);
        }
        if (!row) {
            throw new HttpException('Role does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const result = await userService.updateRole(id, role, user.did);
            const users = await userService.refreshUserPermissions(id, user.did);
            const wsService = new WebSocketsService();
            wsService.updatePermissions(users);
            return result;
        } catch (error) {
            await InternalException(error);
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
            const userService = new Users();
            const result = await userService.deleteRole(id, user.did);
            const users = await userService.refreshUserPermissions(id, user.did);
            const wsService = new WebSocketsService();
            wsService.updatePermissions(users);
            return result;
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Create role
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
            return await (new Users()).setDefaultRole(body?.id, user.did);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Return a list of all users
     */
    @Get('/users/')
    @Auth(
        Permissions.PERMISSIONS_USER_READ
    )
    @ApiOperation({
        summary: 'Return a list of all users.',
        description: 'Returns all users.',
    })

    @ApiQuery({
        name: 'role',
        type: String,
        description: 'Filter by role',
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'status',
        type: String,
        enum: ['Active', 'Inactive'],
        description: 'Filter by status',
        example: 'Active'
    })
    @ApiQuery({
        name: 'username',
        type: String,
        description: 'Filter by username',
        example: 'username'
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set'
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: UserRolesDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(UserRolesDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getUsers(
        @AuthUser() user: IAuthUser,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Query('role') role: string,
        @Query('status') status: string,
        @Query('username') username: string,
        @Response() res: any
    ): Promise<UserRolesDTO[]> {
        try {
            const options: any = {
                filters: {
                    role,
                    status,
                    username
                },
                parent: user.did,
                pageIndex,
                pageSize
            };
            const { items, count } = await (new Users()).getWorkers(options);
            const guardians = new Guardians();
            for (const item of items) {
                item.assignedEntities = await guardians.assignedEntities(item.did);
            }
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get user
     */
    @Get('/users/:username')
    @Auth(
        Permissions.PERMISSIONS_ROLE_UPDATE,
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
        type: UserRolesDTO,
    })
    @ApiOkResponse({
        description: 'User permissions.',
        type: UserRolesDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(UserRolesDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getUser(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string
    ): Promise<UserRolesDTO> {
        try {
            const users = new Users();
            const row = await users.getUser(username);
            if (!row || row.parent !== user.did) {
                throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND);
            }
            return row as any;
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Updates user
     */
    @Put('/users/:username')
    @Auth(
        Permissions.PERMISSIONS_ROLE_UPDATE,
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
        type: UserRolesDTO,
    })
    @ApiOkResponse({
        description: 'User permissions.',
        type: UserRolesDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(UserRolesDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateUser(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string,
        @Body() body: UserRolesDTO
    ): Promise<UserRolesDTO> {
        let row: any;
        const users = new Users();
        try {
            row = await users.getUser(username);
        } catch (error) {
            await InternalException(error);
        }
        if (!row || row.parent !== user.did) {
            throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const result = await users.updateUserRole(username, body, user.did);
            const wsService = new WebSocketsService();
            wsService.updatePermissions(result);
            return result;
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get policies
     */
    @Get('/users/:username/policies')
    @Auth(
        Permissions.PERMISSIONS_ROLE_READ
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
        description: 'The number of pages to skip before starting to collect the result set'
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return'
    })
    @ApiQuery({
        name: 'status',
        type: String,
        enum: ['ALL', 'DRAFT', 'DRY-RUN', 'PUBLISH_ERROR', 'DISCONTINUED', 'PUBLISH'],
        description: 'Filter by status',
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
        @Param('username') username: string,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Query('status') status: string,
        @Response() res: any
    ): Promise<PolicyDTO[]> {
        let row: any;
        const users = new Users();
        try {
            row = await users.getUser(username);
        } catch (error) {
            await InternalException(error);
        }
        if (!row || row.parent !== user.did) {
            throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const options: any = {
                filters: {
                    owner: user.did
                },
                userDid: row.did,
                pageIndex,
                pageSize
            };
            if (status && status !== 'ALL') {
                options.filters.status = status;
            }
            const engineService = new PolicyEngine();
            const { policies, count } = await engineService.getAssignedPolicies(options);
            return res.header('X-Total-Count', count).send(policies);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Assign policy
     */
    @Post('/users/:username/policies/assign')
    @Auth(
        Permissions.PERMISSIONS_ROLE_CREATE
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
        const users = new Users();
        try {
            row = await users.getUser(username);
        } catch (error) {
            await InternalException(error);
        }
        if (!row || row.parent !== user.did) {
            throw new HttpException('User does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const { policyId, assign } = body;
            return await (new Guardians()).assignEntity(
                AssignedEntityType.Policy,
                policyId,
                assign,
                row.did,
                user.did
            );
        } catch (error) {
            await InternalException(error);
        }
    }
}