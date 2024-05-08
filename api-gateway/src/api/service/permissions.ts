import { IAuthUser } from '@guardian/common';
import { Permissions } from '@guardian/interfaces';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { ApiTags, ApiInternalServerErrorResponse, ApiExtraModels, ApiOperation, ApiBody, ApiOkResponse, ApiParam, ApiCreatedResponse, ApiQuery } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, RoleDTO, UserRolesDTO, pageHeader } from '#middlewares';
import { AuthUser, Auth } from '#auth';
import { Guardians, InternalException, Users } from '#helpers';

@Controller('permissions')
@ApiTags('permissions')
export class PermissionsApi {
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
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Response() res: any
    ): Promise<RoleDTO[]> {
        try {
            const options: any = {
                filters: null,
                owner: user.did,
                pageIndex,
                pageSize
            };
            const { items, count } = await (new Users()).getRoles(options);
            return res.setHeader('X-Total-Count', count).json(items);
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
        summary: 'Updates policy configuration.',
        description: 'Updates policy configuration for the specified policy ID.'
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        required: true,
        description: 'Role Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: RoleDTO,
    })
    @ApiOkResponse({
        description: 'Policy configuration.',
        type: RoleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RoleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updatePolicy(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() role: RoleDTO
    ): Promise<RoleDTO> {
        let row: any;
        const users = new Users();
        try {
            row = await users.getRoleById(id);
        } catch (error) {
            await InternalException(error);
        }
        if (!row) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            return await users.updateRole(id, role, user.did);
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
            return await (new Users()).deleteRole(id, user.did);
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
        @Response() res: any
    ): Promise<UserRolesDTO[]> {
        try {
            const options: any = {
                filters: null,
                owner: user.did,
                pageIndex,
                pageSize
            };
            const { items, count } = { items: [], count: 0 };
            return res.setHeader('X-Total-Count', count).json(items);
        } catch (error) {
            await InternalException(error);
        }
    }
}