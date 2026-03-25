import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, Version } from '@nestjs/common';
import { Permissions, SchemaCategory, SchemaHelper } from '@guardian/interfaces';
import { ApiBody, ApiConsumes, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { AuthUser, Auth } from '#auth';
import {
    ExportMessageDTO,
    ImportMessageDTO,
    ModuleDTO,
    ModuleImportFileResponseDTO,
    ModulePublishResponseDTO,
    ModulePreviewDTO,
    SchemaDTO,
    ModuleValidationDTO,
    Examples,
    pageHeader,
    InternalServerErrorDTO,
    ObjectExamples,
    UnprocessableEntityErrorDTO
} from '#middlewares';
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
        description:
            'Module configuration. Only config with blockType: "module" is required. ' +
            'Other fields (name, description) are optional. Fields like id, uuid, creator, owner are set by the server.',
        required: true,
        type: ModuleDTO,
        examples: {
            createModule: {
                summary: 'Minimal create',
                value: ObjectExamples.MODULE_POST_CREATE_REQUEST
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: ModuleDTO,
        example: ObjectExamples.MODULE_POST_CREATE_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid module config (missing config or config.blockType !== "module").',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Invalid module config'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        example: ObjectExamples.MODULES_GET_RESPONSE_LIST
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        example: ObjectExamples.MODULES_GET_RESPONSE_LIST
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        description: 'Filter module schemas by topic id.',
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
        example: ObjectExamples.MODULE_SCHEMAS_GET_RESPONSE_LIST
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        examples: {
            createModuleSchema: {
                summary: 'Create module schema',
                value: ObjectExamples.MODULE_SCHEMAS_POST_REQUEST
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Created schema.',
        type: SchemaDTO,
        isArray: true,
        example: ObjectExamples.MODULE_SCHEMAS_POST_RESPONSE_LIST
    })
    @ApiUnprocessableEntityResponse({
        description: 'Schema does not exist.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Schema does not exist.'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        example: { statusCode: 500, message: 'Error message' }
    })
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
        example: ObjectExamples.MODULES_MENU_RESPONSE_LIST
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        example: {
            createDate: '2026-03-25T12:23:29.549Z',
            uuid: 'e4ecf6f4-36fb-4872-99b8-9b592aac241d',
            name: 'Device configuration module',
            description: 'Part of devices flow',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            codeVersion: '1.0.0',
            type: 'CUSTOM',
            config: {},
            id: '69c3d3c1462c9c1141de3066'
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid uuid.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Invalid uuid'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        examples: {
            updateModule: {
                summary: 'Update module',
                value: ObjectExamples.MODULE_PUT_UPDATE_REQUEST
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: ModuleDTO,
        example: ObjectExamples.MODULE_PUT_UPDATE_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid module config.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Invalid module config'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        description:
            'Binary ZIP archive (`Content-Type: application/zip`, `Content-Disposition: attachment`). Not JSON.',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        example: {
            uuid: '2abde099-08f6-4d75-9de3-d6f33d95bc72',
            name: 'New Module',
            description: 'New module description',
            messageId: '1774441459.171929000',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        examples: {
            importModuleMessage: {
                summary: 'Import module by message',
                value: ObjectExamples.MODULE_IMPORT_MESSAGE_REQUEST
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Created module.',
        type: ModuleDTO,
        example: ObjectExamples.MODULE_IMPORT_MESSAGE_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Message ID in body is empty.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Message ID in body is empty'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Module archive as raw binary request body.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiCreatedResponse({
        description: 'Created module.',
        type: ModuleDTO,
        example: ObjectExamples.MODULE_IMPORT_FILE_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        examples: {
            importModuleMessagePreview: {
                summary: 'Preview module by message',
                value: ObjectExamples.MODULE_IMPORT_MESSAGE_REQUEST
            }
        }
    })
    @ApiOkResponse({
        description: 'Module preview.',
        type: ModulePreviewDTO,
        example: ObjectExamples.MODULE_IMPORT_MESSAGE_PREVIEW_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Message ID in body is empty.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Message ID in body is empty'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Module archive as raw binary request body.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiOkResponse({
        description: 'Module preview.',
        type: ModuleImportFileResponseDTO,
        example: ObjectExamples.MODULE_IMPORT_FILE_PREVIEW_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async moduleImportFilePreview(
        @AuthUser() user: IAuthUser,
        @Body() body: any,
        @Req() req
    ): Promise<ModuleImportFileResponseDTO> {
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
        description:
            'Ignored by the current implementation. Publish uses the `uuid` path parameter and the module stored in DB.',
        required: false,
        type: ModuleDTO,
        examples: {
            ignoredBody: {
                summary: 'Body is ignored',
                value: {}
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ModulePublishResponseDTO,
        example: ObjectExamples.MODULE_PUBLISH_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async publishModule(
        @AuthUser() user: IAuthUser,
        @Param('uuid') uuid: string,
        @Body() module: ModuleDTO,
        @Req() req
    ): Promise<ModulePublishResponseDTO> {
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
        examples: {
            valid: {
                summary: 'Valid module',
                value: ObjectExamples.MODULE_VALIDATE_REQUEST_VALID
            },
            invalid: {
                summary: 'Invalid createTokenBlock',
                value: ObjectExamples.MODULE_VALIDATE_REQUEST_INVALID
            }
        }
    })
    @ApiOkResponse({
        description: 'Validation result.',
        type: ModuleValidationDTO,
        examples: {
            valid: {
                summary: 'All blocks valid',
                value: ObjectExamples.MODULE_VALIDATE_RESPONSE_VALID
            },
            invalid: {
                summary: 'createTokenBlock fails validation',
                value: ObjectExamples.MODULE_VALIDATE_RESPONSE_INVALID
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
