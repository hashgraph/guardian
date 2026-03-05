import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, Version } from '@nestjs/common';
import { Permissions, SchemaCategory, SchemaHelper } from '@guardian/interfaces';
import { ApiBody, ApiCreatedResponse, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { AuthUser, Auth } from '#auth';
import { ExportMessageDTO, ImportMessageDTO, ModuleDTO, ModulePreviewDTO, SchemaDTO, ModuleValidationDTO, Examples, pageHeader, InternalServerErrorDTO } from '#middlewares';
import { Guardians, SchemaUtils, UseCache, InternalException, EntityOwner, CacheService, getCacheKey } from '#helpers';
import { MODULE_REQUIRED_PROPS, PREFIXES } from '#constants';

const ONLY_SR = ' Only users with the Standard Registry role are allowed to make the request.'

@Controller('modules')
@ApiTags('modules')
export class ModulesApi {
    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }

    /**
     * Creates a new module
     */
    @Post('/')
    @Auth(
        Permissions.MODULES_MODULE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new module.',
        description: 'Creates a new module.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Module config.',
        type: ModuleDTO,
    })
    @ApiCreatedResponse({
        description: 'Created module.',
        type: ModuleDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', uuid: 'f3b2a9c1e4d5678901234567', type: 'string', name: 'string', description: 'string', status: 'string', creator: 'string', owner: 'string', topicId: 'f3b2a9c1e4d5678901234567', messageId: 'f3b2a9c1e4d5678901234567', codeVersion: 'string', createDate: 'string', config: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postModules(
        @AuthUser() user: IAuthUser,
        @Body() body: ModuleDTO,
        @Req() req
    ): Promise<ModuleDTO> {
        try {
            const guardian = new Guardians();
            const module = body;
            if (!module.config || module.config.blockType !== 'module') {
                throw new HttpException('Invalid module config', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            const invalidedCacheTags = [
                `${PREFIXES.MODULES}schemas`,
                `${PREFIXES.MODULES}menu`,
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardian.createModule(module, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get list of all modules
     */
    @Get('/')
    @Auth(
        Permissions.MODULES_MODULE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all modules.',
        description: 'Returns all modules.' + ONLY_SR,
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
        type: ModuleDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567', uuid: 'f3b2a9c1e4d5678901234567', type: 'string', name: 'string', description: 'string', status: 'string', creator: 'string', owner: 'string', topicId: 'f3b2a9c1e4d5678901234567', messageId: 'f3b2a9c1e4d5678901234567', codeVersion: 'string', createDate: 'string', config: {} }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getModules(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<ModuleDTO[]> {
        try {
            const options: any = {
                pageIndex,
                pageSize
            };
            const guardians = new Guardians();
            const { items, count } = await guardians.getModule(options, new EntityOwner(user));
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get list of all modules V2 03.06.2024
     */
    @Get('/')
    @Auth(
        Permissions.MODULES_MODULE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all modules.',
        description: 'Returns all modules.' + ONLY_SR,
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
        type: ModuleDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567', uuid: 'f3b2a9c1e4d5678901234567', type: 'string', name: 'string', description: 'string', status: 'string', creator: 'string', owner: 'string', topicId: 'f3b2a9c1e4d5678901234567', messageId: 'f3b2a9c1e4d5678901234567', codeVersion: 'string', createDate: 'string', config: {} }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @Version('2')
    async getModulesV2(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<ModuleDTO[]> {
        try {
            const options: any = {
                fields: Object.values(MODULE_REQUIRED_PROPS),
                pageIndex,
                pageSize
            };
            const guardians = new Guardians();

            const { items, count } = await guardians.getModuleV2(options, new EntityOwner(user));
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get list of all schemas
     */
    @Get('/schemas')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all module schemas.',
        description: 'Returns all module schemas.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'topicId',
        type: String,
        description: 'Topic id',
        required: false,
        example: Examples.ACCOUNT_ID
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
        type: SchemaDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Schema name',
            description: 'Description',
            entity: 'string',
            iri: 'string',
            status: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            version: '1.0.0',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            category: 'string',
            documentURL: 'https://example.com',
            contextURL: 'https://example.com',
            document: {},
            context: {} }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @UseCache({ isFastify: true })
    @HttpCode(HttpStatus.OK)
    async getModuleSchemas(
        @AuthUser() user: IAuthUser,
        @Req() req,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('topicId') topicId?: string,
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.MODULE,
                topicId,
                pageIndex,
                pageSize
            }, owner);
            items.forEach((s) => {
                s.readonly = s.readonly || s.owner !== owner.owner
            });

            req.locals = SchemaUtils.toOld(items)

            return res
                .header('X-Total-Count', count)
                .send(SchemaUtils.toOld(items));
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Create schema
     */
    @Post('/schemas')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new module schema.',
        description: 'Creates a new module schema.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Schema config.',
        type: SchemaDTO,
    })
    @ApiCreatedResponse({
        description: 'Created schema.',
        type: SchemaDTO,
        isArray: true,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Schema name',
            description: 'Description',
            entity: 'string',
            iri: 'string',
            status: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            version: '1.0.0',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            category: 'string',
            documentURL: 'https://example.com',
            contextURL: 'https://example.com',
            document: {},
            context: {} }]
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postSchemas(
        @AuthUser() user: IAuthUser,
        @Body() newSchema: SchemaDTO,
        @Req() req: Request
    ): Promise<SchemaDTO[]> {
        try {
            if (!newSchema) {
                throw new HttpException('Schema does not exist.', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const owner = new EntityOwner(user);

            newSchema.category = SchemaCategory.MODULE;
            SchemaUtils.fromOld(newSchema);
            SchemaUtils.clearIds(newSchema);
            SchemaHelper.updateOwner(newSchema, owner);

            const schemas = await guardians.createSchema(newSchema, owner);

            const invalidedCacheTags = [
                `${PREFIXES.MODULES}schemas`,
                `${PREFIXES.SCHEMES}schema-with-sub-schemas`
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return SchemaUtils.toOld(schemas);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);

            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove module
     */
    @Delete('/:uuid')
    @Auth(
        Permissions.MODULES_MODULE_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Deletes the module.',
        description: 'Deletes the module with the provided module ID.' + ONLY_SR
    })
    @ApiParam({
        name: 'uuid',
        type: 'string',
        required: true,
        description: 'Module Identifier',
        example: Examples.UUID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
        example: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteModule(
        @AuthUser() user: IAuthUser,
        @Param('uuid') uuid: string,
        @Req() req: Request
    ): Promise<boolean> {
        try {
            const guardian = new Guardians();
            if (!uuid) {
                throw new Error('Invalid uuid');
            }

            const invalidedCacheKeys = [
                `${PREFIXES.MODULES}${uuid}/export/file`,
                `${PREFIXES.MODULES}${uuid}/export/message`,
                `${PREFIXES.MODULES}schemas`,
                `${PREFIXES.MODULES}menu`,
            ];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user));

            return await guardian.deleteModule(uuid, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get all modules
     */
    @Get('/menu')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        Permissions.MODULES_MODULE_UPDATE,
        Permissions.TOOLS_TOOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of modules.',
        description: 'Returns modules menu.' + ONLY_SR,
    })
    @ApiOkResponse({
        description: 'Modules.',
        isArray: true,
        type: ModuleDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567', uuid: 'f3b2a9c1e4d5678901234567', type: 'string', name: 'string', description: 'string', status: 'string', creator: 'string', owner: 'string', topicId: 'f3b2a9c1e4d5678901234567', messageId: 'f3b2a9c1e4d5678901234567', codeVersion: 'string', createDate: 'string', config: {} }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getMenu(
        @AuthUser() user: IAuthUser,
    ): Promise<ModuleDTO[]> {
        try {
            const guardians = new Guardians();
            return await guardians.getMenuModule(new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Retrieves module configuration
     */
    @Get('/:uuid')
    @Auth(
        Permissions.MODULES_MODULE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Retrieves module configuration.',
        description: 'Retrieves module configuration for the specified module ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'uuid',
        type: 'string',
        required: true,
        description: 'Module Identifier',
        example: Examples.UUID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ModuleDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', uuid: 'f3b2a9c1e4d5678901234567', type: 'string', name: 'string', description: 'string', status: 'string', creator: 'string', owner: 'string', topicId: 'f3b2a9c1e4d5678901234567', messageId: 'f3b2a9c1e4d5678901234567', codeVersion: 'string', createDate: 'string', config: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getModule(
        @AuthUser() user: IAuthUser,
        @Param('uuid') uuid: string,
    ): Promise<ModuleDTO> {
        try {
            if (!uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const guardian = new Guardians();
            return await guardian.getModuleById(uuid, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Updates module configuration
     */
    @Put('/:uuid')
    @Auth(
        Permissions.MODULES_MODULE_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates module configuration.',
        description: 'Updates module configuration for the specified module ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'uuid',
        type: 'string',
        required: true,
        description: 'Module Identifier',
        example: Examples.UUID
    })
    @ApiBody({
        description: 'Module config.',
        type: ModuleDTO,
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: ModuleDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', uuid: 'f3b2a9c1e4d5678901234567', type: 'string', name: 'string', description: 'string', status: 'string', creator: 'string', owner: 'string', topicId: 'f3b2a9c1e4d5678901234567', messageId: 'f3b2a9c1e4d5678901234567', codeVersion: 'string', createDate: 'string', config: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async putModule(
        @AuthUser() user: IAuthUser,
        @Param('uuid') uuid: string,
        @Body() module: ModuleDTO,
        @Req() req
    ): Promise<ModuleDTO> {
        if (!uuid) {
            throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (!module.config || module.config.blockType !== 'module') {
            throw new HttpException('Invalid module config', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardian = new Guardians();

            const invalidedCacheKeys = [
              `${PREFIXES.MODULES}${req.params.uuid}/export/file`,
              `${PREFIXES.MODULES}${req.params.uuid}/export/message`,
              `${PREFIXES.MODULES}schemas`,
              `${PREFIXES.MODULES}menu`,
            ];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], req.user));

            return await guardian.updateModule(uuid, module, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export module
     */
    @Get('/:uuid/export/file')
    @Auth(
        Permissions.MODULES_MODULE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return module and its artifacts in a zip file format for the specified module.',
        description: 'Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs.' + ONLY_SR,
    })
    @ApiParam({
        name: 'uuid',
        type: 'string',
        required: true,
        description: 'Module Identifier',
        example: Examples.UUID
    })
    @ApiProduces('application/zip')
    @ApiOkResponse({
        description: 'File.',
        schema: {
            type: 'string',
            format: 'binary'
        },
        example: { result: 'ok' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async moduleExportFile(
        @AuthUser() user: IAuthUser,
        @Param('uuid') uuid: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const guardian = new Guardians();
            const file: any = await guardian.exportModuleFile(uuid, new EntityOwner(user));
            res.header('Content-disposition', `attachment; filename=module_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export module
     */
    @Get('/:uuid/export/message')
    @Auth(
        Permissions.MODULES_MODULE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return Heder message ID for the specified published module.',
        description: 'Returns the Hedera message ID for the specified module published onto IPFS.' + ONLY_SR,
    })
    @ApiParam({
        name: 'uuid',
        type: 'string',
        required: true,
        description: 'Module Identifier',
        example: Examples.UUID,
    })
    @ApiOkResponse({
        description: 'Message.',
        type: ExportMessageDTO,
        example: { uuid: 'f3b2a9c1e4d5678901234567', name: 'string', description: 'string', messageId: 'f3b2a9c1e4d5678901234567', owner: 'string' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ExportMessageDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async moduleExportMessage(
        @AuthUser() user: IAuthUser,
        @Param('uuid') uuid: string
    ): Promise<ExportMessageDTO> {
        try {
            const guardian = new Guardians();
            return await guardian.exportModuleMessage(uuid, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Imports new module from IPFS
     */
    @Post('/import/message')
    @Auth(
        Permissions.MODULES_MODULE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new module from IPFS.',
        description: 'Imports new module and all associated artifacts from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiCreatedResponse({
        description: 'Created module.',
        type: ModuleDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', uuid: 'f3b2a9c1e4d5678901234567', type: 'string', name: 'string', description: 'string', status: 'string', creator: 'string', owner: 'string', topicId: 'f3b2a9c1e4d5678901234567', messageId: 'f3b2a9c1e4d5678901234567', codeVersion: 'string', createDate: 'string', config: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ImportMessageDTO, ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async moduleImportMessage(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO,
        @Req() req: Request
    ): Promise<ModuleDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardian = new Guardians();

            const invalidedCacheTags = [
                `${PREFIXES.MODULES}schemas`,
                `${PREFIXES.MODULES}menu`,
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardian.importModuleMessage(messageId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Imports new module from a zip file
     */
    @Post('/import/file')
    @Auth(
        Permissions.MODULES_MODULE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new module from a zip file.',
        description: 'Imports new module and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'File.',
    })
    @ApiCreatedResponse({
        description: 'Created module.',
        type: ModuleDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', uuid: 'f3b2a9c1e4d5678901234567', type: 'string', name: 'string', description: 'string', status: 'string', creator: 'string', owner: 'string', topicId: 'f3b2a9c1e4d5678901234567', messageId: 'f3b2a9c1e4d5678901234567', codeVersion: 'string', createDate: 'string', config: {} }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async moduleImportFile(
        @AuthUser() user: IAuthUser,
        @Body() body: any,
        @Req() req: Request
    ): Promise<ModuleDTO> {
        const guardian = new Guardians();
        try {
            const invalidedCacheTags = [
                `${PREFIXES.MODULES}schemas`,
                `${PREFIXES.MODULES}menu`,
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardian.importModuleFile(body, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import preview
     */
    @Post('/import/message/preview')
    @Auth(
        Permissions.MODULES_MODULE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new module from IPFS.',
        description: 'Imports new module and all associated artifacts from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Module preview.',
        type: ModulePreviewDTO,
        example: { module: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            type: 'string',
            name: 'string',
            description: 'string',
            status: 'string',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            codeVersion: 'string',
            createDate: 'string',
            config: {} },
            messageId: 'f3b2a9c1e4d5678901234567',
            schemas: [{}],
            tags: [{}],
            moduleTopicId: 'f3b2a9c1e4d5678901234567' }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ImportMessageDTO, ModulePreviewDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async moduleImportMessagePreview(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO,
        @Req() req: Request
    ): Promise<ModulePreviewDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardian = new Guardians();

            const invalidedCacheTags = [
                `${PREFIXES.MODULES}schemas`,
                `${PREFIXES.MODULES}menu`,
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardian.previewModuleMessage(messageId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import preview
     */
    @Post('/import/file/preview')
    @Auth(
        Permissions.MODULES_MODULE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new module from a zip file.',
        description: 'Imports new module and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'File.',
    })
    @ApiOkResponse({
        description: 'Module preview.',
        type: ModulePreviewDTO,
        example: { module: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            type: 'string',
            name: 'string',
            description: 'string',
            status: 'string',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            codeVersion: 'string',
            createDate: 'string',
            config: {} },
            messageId: 'f3b2a9c1e4d5678901234567',
            schemas: [{}],
            tags: [{}],
            moduleTopicId: 'f3b2a9c1e4d5678901234567' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModulePreviewDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async moduleImportFilePreview(
        @AuthUser() user: IAuthUser,
        @Body() body: any,
        @Req() req
    ): Promise<ModulePreviewDTO> {
        try {
            const guardian = new Guardians();

            const invalidedCacheTags = [
                `${PREFIXES.MODULES}schemas`,
                `${PREFIXES.MODULES}menu`,
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardian.previewModuleFile(body, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish module
     */
    @Put('/:uuid/publish')
    @Auth(
        Permissions.MODULES_MODULE_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Publishes the module onto IPFS.',
        description: 'Publishes the module with the specified (internal) module ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
    })
    @ApiParam({
        name: 'uuid',
        type: 'string',
        required: true,
        description: 'Module Identifier',
        example: Examples.UUID
    })
    @ApiBody({
        description: 'Module.',
        type: ModuleDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ModuleDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', uuid: 'f3b2a9c1e4d5678901234567', type: 'string', name: 'string', description: 'string', status: 'string', creator: 'string', owner: 'string', topicId: 'f3b2a9c1e4d5678901234567', messageId: 'f3b2a9c1e4d5678901234567', codeVersion: 'string', createDate: 'string', config: {} }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishModule(
        @AuthUser() user: IAuthUser,
        @Param('uuid') uuid: string,
        @Body() module: ModuleDTO,
        @Req() req
    ): Promise<ModuleDTO> {
        try {
            const guardian = new Guardians();

            const invalidedCacheKeys = [
                `${PREFIXES.MODULES}${req.params.uuid}/export/file`,
                `${PREFIXES.MODULES}${req.params.uuid}/export/message`,
                `${PREFIXES.MODULES}schemas`,
                `${PREFIXES.MODULES}menu`,
            ];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], req.user));

            return await guardian.publishModule(uuid, new EntityOwner(user), module);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Validates selected module
     */
    @Post('/validate')
    @Auth(
        Permissions.MODULES_MODULE_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Validates selected module.',
        description: 'Validates selected module.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Module config.',
        type: ModuleDTO,
    })
    @ApiOkResponse({
        description: 'Validation result.',
        type: ModuleValidationDTO,
        example: { module: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            type: 'string',
            name: 'string',
            description: 'string',
            status: 'string',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            codeVersion: 'string',
            createDate: 'string',
            config: {} },
            results: { blocks: [{ id: 'f3b2a9c1e4d5678901234567',
            name: 'string',
            errors: [{}],
            warnings: [{}],
            infos: [{}],
            isValid: true }],
            errors: ['string'],
            warnings: ['string'],
            infos: ['string'] } }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ModuleDTO, ModuleValidationDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async validateModule(
        @AuthUser() user: IAuthUser,
        @Body() module: ModuleDTO
    ): Promise<ModuleValidationDTO> {
        try {
            const guardian = new Guardians();
            return await guardian.validateModule(new EntityOwner(user), module);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
