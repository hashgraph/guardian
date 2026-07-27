import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { ISchemaTemplate, Permissions } from '@guardian/interfaces';
import { ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser, Auth } from '#auth';
import { EntityOwner, Guardians, InternalException } from '#helpers';
import { InternalServerErrorDTO, pageHeader } from '#middlewares';

const ONLY_SR = ' Only users with the Standard Registry role are allowed to make the request.';

@Controller('schema-templates')
@ApiTags('schema-templates')
export class SchemaTemplatesApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Create schema template.
     */
    @Post('/')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new schema template.',
        description: 'Creates a new schema template and a dedicated template topic.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Schema template metadata and configuration.',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                version: { type: 'string' },
                config: { type: 'object' }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Created schema template.',
        schema: { type: 'object' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.CREATED)
    async createSchemaTemplate(
        @AuthUser() user: IAuthUser,
        @Body() body: ISchemaTemplate
    ): Promise<ISchemaTemplate> {
        try {
            const guardians = new Guardians();
            return await guardians.createSchemaTemplate(body, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get schema templates page.
     */
    @Get('/')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns schema templates.',
        description: 'Returns schema templates visible to the current user.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Schema templates page.',
        headers: pageHeader,
        schema: {
            type: 'array',
            items: { type: 'object' }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async getSchemaTemplates(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<ISchemaTemplate[]> {
        try {
            const guardians = new Guardians();
            const { items, count } = await guardians.getSchemaTemplates({
                pageIndex,
                pageSize
            }, new EntityOwner(user));
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get a schema template by id.
     */
    @Get('/:templateId')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns schema template by id.',
        description: 'Returns schema template by internal id.' + ONLY_SR,
    })
    @ApiParam({
        name: 'templateId',
        type: String,
        required: true
    })
    @ApiOkResponse({
        description: 'Schema template.',
        schema: { type: 'object' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async getSchemaTemplate(
        @AuthUser() user: IAuthUser,
        @Param('templateId') templateId: string
    ): Promise<ISchemaTemplate> {
        try {
            const guardians = new Guardians();
            return await guardians.getSchemaTemplateById(templateId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update schema template.
     */
    @Put('/:templateId')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates schema template.',
        description: 'Updates schema template metadata and configuration.' + ONLY_SR,
    })
    @ApiParam({
        name: 'templateId',
        type: String,
        required: true
    })
    @ApiBody({
        description: 'Schema template metadata and configuration.',
        schema: { type: 'object' }
    })
    @ApiOkResponse({
        description: 'Updated schema template.',
        schema: { type: 'object' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async updateSchemaTemplate(
        @AuthUser() user: IAuthUser,
        @Param('templateId') templateId: string,
        @Body() body: ISchemaTemplate
    ): Promise<ISchemaTemplate> {
        try {
            const guardians = new Guardians();
            return await guardians.updateSchemaTemplate(templateId, body, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete schema template.
     */
    @Delete('/:templateId')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Deletes schema template.',
        description: 'Deletes draft schema template and its draft schemas.' + ONLY_SR,
    })
    @ApiParam({
        name: 'templateId',
        type: String,
        required: true
    })
    @ApiOkResponse({
        description: 'Operation result.',
        schema: { type: 'boolean' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async deleteSchemaTemplate(
        @AuthUser() user: IAuthUser,
        @Param('templateId') templateId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.deleteSchemaTemplate(templateId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
