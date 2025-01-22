import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, MethodologyDTO, MethodologyRelationshipsDTO, pageHeader } from '#middlewares';
import { Guardians, InternalException, EntityOwner } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('methodologies')
@ApiTags('methodologies')
export class MethodologiesApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Creates a new methodology
     */
    @Post('/')
    @Auth(Permissions.METHODOLOGIES_METHODOLOGY_CREATE)
    @ApiOperation({
        summary: 'Creates a new methodology.',
        description: 'Creates a new methodology.',
    })
    @ApiBody({
        description: 'Configuration.',
        type: MethodologyDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: MethodologyDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(MethodologyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createMethodology(
        @AuthUser() user: IAuthUser,
        @Body() methodology: MethodologyDTO
    ): Promise<MethodologyDTO> {
        try {
            if (!methodology) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createMethodology(methodology, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @Auth(Permissions.METHODOLOGIES_METHODOLOGY_READ)
    @ApiOperation({
        summary: 'Return a list of all methodologies.',
        description: 'Returns all methodologies.',
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
        name: 'policyInstanceTopicId',
        type: String,
        description: 'Policy Instance Topic Id',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: MethodologyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(MethodologyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getMethodologies(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyInstanceTopicId') policyInstanceTopicId?: string
    ): Promise<MethodologyDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getMethodologies({
                policyInstanceTopicId,
                pageIndex,
                pageSize
            }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get methodology by id
     */
    @Get('/:methodologyId')
    @Auth(Permissions.METHODOLOGIES_METHODOLOGY_READ)
    @ApiOperation({
        summary: 'Retrieves methodology.',
        description: 'Retrieves methodology for the specified ID.'
    })
    @ApiParam({
        name: 'methodologyId',
        type: String,
        description: 'Methodology Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: MethodologyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(MethodologyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getMethodologyById(
        @AuthUser() user: IAuthUser,
        @Param('methodologyId') methodologyId: string
    ): Promise<MethodologyDTO> {
        try {
            if (!methodologyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getMethodologyById(methodologyId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Update methodology
     */
    @Put('/:methodologyId')
    @Auth(Permissions.METHODOLOGIES_METHODOLOGY_CREATE)
    @ApiOperation({
        summary: 'Updates methodology.',
        description: 'Updates methodology configuration for the specified methodology ID.',
    })
    @ApiParam({
        name: 'methodologyId',
        type: 'string',
        required: true,
        description: 'Methodology Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: MethodologyDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: MethodologyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(MethodologyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateMethodology(
        @AuthUser() user: IAuthUser,
        @Param('methodologyId') methodologyId: string,
        @Body() item: MethodologyDTO
    ): Promise<MethodologyDTO> {
        try {
            if (!methodologyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getMethodologyById(methodologyId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.updateMethodology(methodologyId, item, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Delete methodology
     */
    @Delete('/:methodologyId')
    @Auth(Permissions.METHODOLOGIES_METHODOLOGY_CREATE)
    @ApiOperation({
        summary: 'Deletes the methodology.',
        description: 'Deletes the methodology with the provided ID.',
    })
    @ApiParam({
        name: 'methodologyId',
        type: 'string',
        required: true,
        description: 'Methodology Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteMethodology(
        @AuthUser() user: IAuthUser,
        @Param('methodologyId') methodologyId: string
    ): Promise<boolean> {
        try {
            if (!methodologyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.deleteMethodology(methodologyId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }


    /**
     * Get relationships by id
     */
    @Get('/:methodologyId/relationships')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Retrieves Methodology relationships.',
        description: 'Retrieves Methodology relationships for the specified ID.'
    })
    @ApiParam({
        name: 'methodologyId',
        type: String,
        description: 'Methodology Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: MethodologyRelationshipsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(MethodologyRelationshipsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaRuleRelationships(
        @AuthUser() user: IAuthUser,
        @Param('methodologyId') methodologyId: string
    ): Promise<MethodologyRelationshipsDTO> {
        try {
            if (!methodologyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getMethodologyRelationships(methodologyId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Import methodology
     */
    @Post('/:policyId/import/file')
    @Auth(Permissions.METHODOLOGIES_METHODOLOGY_CREATE)
    @ApiOperation({
        summary: 'Imports new methodology from a zip file.',
        description: 'Imports new methodology from the provided zip file into the local DB.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A zip file containing methodology to be imported.',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: MethodologyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(MethodologyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importMethodology(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() zip: any
    ): Promise<MethodologyDTO> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            return await guardian.importMethodology(zip, policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Export methodology
     */
    @Get('/:methodologyId/export/file')
    @Auth(Permissions.METHODOLOGIES_METHODOLOGY_READ)
    @ApiOperation({
        summary: 'Returns a zip file containing methodology.',
        description: 'Returns a zip file containing methodology.',
    })
    @ApiParam({
        name: 'methodologyId',
        type: String,
        description: 'Methodology Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async exportMethodology(
        @AuthUser() user: IAuthUser,
        @Param('methodologyId') methodologyId: string,
        @Response() res: any
    ): Promise<any> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            const file: any = await guardian.exportMethodology(methodologyId, owner);
            res.header('Content-disposition', `attachment; filename=theme_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Preview methodology
     */
    @Post('/import/file/preview')
    @Auth(Permissions.METHODOLOGIES_METHODOLOGY_CREATE)
    @ApiOperation({
        summary: 'Imports a zip file containing methodology.',
        description: 'Imports a zip file containing methodology.',
    })
    @ApiBody({
        description: 'File.',
    })
    @ApiOkResponse({
        description: 'Methodology preview.',
        type: MethodologyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(MethodologyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async previewMethodology(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.previewMethodology(body, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }
}
