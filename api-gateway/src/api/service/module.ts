import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, Version } from '@nestjs/common';
import { Permissions, SchemaCategory, SchemaHelper } from '@guardian/interfaces';
import { ApiParam, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiBody, ApiExtraModels, ApiQuery } from '@nestjs/swagger';
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
    @ApiOkResponse({
        description: 'Created module.',
        type: ModuleDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postModules(
        @AuthUser() user: IAuthUser,
        @Body() body: ModuleDTO
    ): Promise<ModuleDTO> {
        try {
            const guardian = new Guardians();
            const module = body;
            if (!module.config || module.config.blockType !== 'module') {
                throw new HttpException('Invalid module config', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            return await guardian.createModule(module, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    // @UseCache({ isExpress: true })
    @HttpCode(HttpStatus.OK)
    async getModuleSchemas(
        @AuthUser() user: IAuthUser,
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
            // res.locals.data = SchemaUtils.toOld(items)
            return res
                .header('X-Total-Count', count)
                .send(SchemaUtils.toOld(items));
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY']);
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postSchemas(
        @AuthUser() user: IAuthUser,
        @Body() newSchema: SchemaDTO
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

            return SchemaUtils.toOld(schemas);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY']);

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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteModule(
        @AuthUser() user: IAuthUser,
        @Param('uuid') uuid: string,
    ): Promise<boolean> {
        try {
            const guardian = new Guardians();
            if (!uuid) {
                throw new Error('Invalid uuid');
            }
            return await guardian.deleteModule(uuid, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    // @UseCache()
    @HttpCode(HttpStatus.OK)
    async getMenu(
        @AuthUser() user: IAuthUser,
    ): Promise<ModuleDTO[]> {
        try {
            const guardians = new Guardians();
            return await guardians.getMenuModule(new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
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
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ModuleDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
              `${PREFIXES.MODULES}${req.params.uuid}/export/message`
            ];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], req.user));

            return await guardian.updateModule(uuid, module, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
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
    @ApiOkResponse({
        description: 'File.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
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
        type: ExportMessageDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
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
    @ApiOkResponse({
        description: 'Created module.',
        type: ModuleDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async moduleImportMessage(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO
    ): Promise<ModuleDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardian = new Guardians();

            return await guardian.importModuleMessage(messageId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
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
    @ApiOkResponse({
        description: 'Created module.',
        type: ModuleDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ModuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async moduleImportFile(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<ModuleDTO> {
        const guardian = new Guardians();
        try {
            return await guardian.importModuleFile(body, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
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
        type: ModulePreviewDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, ModulePreviewDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async moduleImportMessagePreview(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO
    ): Promise<ModulePreviewDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardian = new Guardians();
            return await guardian.previewModuleMessage(messageId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
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
        type: ModulePreviewDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ModulePreviewDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async moduleImportFilePreview(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<ModulePreviewDTO> {
        try {
            const guardian = new Guardians();
            return await guardian.previewModuleFile(body, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
                `${PREFIXES.MODULES}${req.params.uuid}/export/message`
            ];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], req.user));

            return await guardian.publishModule(uuid, new EntityOwner(user), module);
        } catch (error) {
            await InternalException(error);
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
        }
    }
}
