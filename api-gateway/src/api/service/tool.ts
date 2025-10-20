import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, UseInterceptors, Version } from '@nestjs/common';
import { Permissions, TaskAction } from '@guardian/interfaces';
import { ApiBody, ApiConsumes, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { ExportMessageDTO, ImportMessageDTO, InternalServerErrorDTO, TaskDTO, ToolDTO, ToolPreviewDTO, ToolValidationDTO, Examples, pageHeader, ToolVersionDTO } from '#middlewares';
import { UseCache, ServiceError, TaskManager, Guardians, InternalException, ONLY_SR, MultipartFile, UploadedFiles, AnyFilesInterceptor, EntityOwner, CacheService } from '#helpers';
import { AuthUser, Auth } from '#auth';
import {CACHE_PREFIXES, TOOL_REQUIRED_PROPS} from '#constants';

@Controller('tools')
@ApiTags('tools')
export class ToolsApi {
    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }
    /**
     * Creates a new tool
     */
    @Post('/')
    @Auth(
        Permissions.TOOLS_TOOL_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new tool.',
        description: 'Creates a new tool.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: ToolDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ToolDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createNewTool(
        @AuthUser() user: IAuthUser,
        @Body() tool: ToolDTO,
        @Req() req
    ): Promise<ToolDTO> {
        try {
            if (!tool.config || tool.config.blockType !== 'tool') {
                throw new HttpException('Invalid tool config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.createTool(tool, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create new tool (Async)
     */
    @Post('/push')
    @Auth(
        Permissions.TOOLS_TOOL_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new tool.',
        description: 'Creates a new tool.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: ToolDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TaskDTO, ToolDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async createNewToolAsync(
        @AuthUser() user: IAuthUser,
        @Body() tool: ToolDTO,
        @Req() req
    ): Promise<TaskDTO> {
        try {
            if (!tool.config || tool.config.blockType !== 'tool') {
                throw new HttpException('Invalid tool config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.CREATE_TOOL, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardian.createToolAsync(tool, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @Auth(
        Permissions.TOOLS_TOOL_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all tools.',
        description: 'Returns all tools.' + ONLY_SR,
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
        type: ToolDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getTools(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<ToolDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getTools({
                pageIndex,
                pageSize
            }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get tools V2 05.06.2024
     */
    @Get('/')
    @Auth(
        Permissions.TOOLS_TOOL_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all tools.',
        description: 'Returns all tools.' + ONLY_SR,
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
        name: 'search',
        type: String,
        description: 'Search',
        required: false,
        example: 'text'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: ToolDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @Version('2')
    async getToolsV2(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string
    ): Promise<ToolDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const fields: string[] = Object.values(TOOL_REQUIRED_PROPS);

            const { items, count } = await guardians.getToolsV2(fields, {
                pageIndex,
                pageSize,
                search,
            }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete tool
     */
    @Delete('/:id')
    @Auth(
        Permissions.TOOLS_TOOL_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Deletes the tool with the provided tool ID.' + ONLY_SR,
        description: 'Deletes the tool.'
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteTool(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Req() req
    ): Promise<boolean> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.deleteTool(id, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get tool by id
     */
    @Get('/:id')
    @Auth(
        Permissions.TOOLS_TOOL_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Retrieves tool configuration.',
        description: 'Retrieves tool configuration for the specified tool ID.' + ONLY_SR
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ToolDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getToolById(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<ToolDTO> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getToolById(id, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update tool
     */
    @Put('/:id')
    @Auth(
        Permissions.TOOLS_TOOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates tool configuration.',
        description: 'Updates tool configuration for the specified tool ID.' + ONLY_SR
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Tool configuration.',
        type: ToolDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ToolDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async updateTool(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() tool: ToolDTO,
        @Req() req
    ): Promise<any> {
        if (!id) {
            throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (!tool.config || tool.config.blockType !== 'tool') {
            throw new HttpException('Invalid tool config', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.updateTool(id, tool, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish tool
     */
    @Put('/:id/publish')
    @Auth(
        Permissions.TOOLS_TOOL_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Publishes the tool onto IPFS.',
        description: 'Publishes the tool with the specified (internal) tool ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.' + ONLY_SR
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Tool version.',
        type: ToolVersionDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ToolValidationDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolValidationDTO, ToolVersionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishTool(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() body: ToolVersionDTO,
        @Req() req
    ): Promise<ToolValidationDTO> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.publishTool(id, owner, body);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish tool (Async)
     */
    @Put('/:id/push/publish')
    @Auth(
        Permissions.TOOLS_TOOL_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Publishes the tool onto IPFS.',
        description: 'Publishes the tool with the specified (internal) tool ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.' + ONLY_SR
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Tool version.',
        type: ToolVersionDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolVersionDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishToolAsync(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() body: ToolVersionDTO,
        @Req() req
    ): Promise<TaskDTO> {
        if (!id) {
            throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PUBLISH_TOOL, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardian = new Guardians();
            await guardian.publishToolAsync(id, owner, body, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: error.message || error });
        });

        const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
        await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

        return task;
    }

    /**
     * Go to dry-run tool
     */
    @Put('/:id/dry-run')
    @Auth(
        Permissions.TOOLS_TOOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Dry Run policy.',
        description: 'Run policy without making any persistent changes or executing transaction.' + ONLY_SR,
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ToolValidationDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async dryRunPolicy(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Req() req
    ): Promise<TaskDTO> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.dryRunTool(id, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Go to dry-run draft
     */
    @Put('/:id/draft')
    @Auth(
        Permissions.TOOLS_TOOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return policy to editing.',
        description: 'Return policy to editing.' + ONLY_SR,
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ToolValidationDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async draftPolicy(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Req() req
    ): Promise<TaskDTO[]> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.draftTool(id, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Validate tool
     */
    @Post('/validate')
    @Auth(
        Permissions.TOOLS_TOOL_UPDATE,
        Permissions.TOOLS_TOOL_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Validates selected tool.',
        description: 'Validates selected tool.' + ONLY_SR
    })
    @ApiBody({
        description: 'Tool configuration.',
        type: ToolDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Validation result.',
        type: ToolValidationDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, ToolValidationDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async validateTool(
        @AuthUser() user: IAuthUser,
        @Body() tool: ToolDTO
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.validateTool(owner, tool);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export tool in file
     */
    @Get('/:id/export/file')
    @Auth(
        Permissions.TOOLS_TOOL_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return tool and its artifacts in a zip file format for the specified tool.',
        description: 'Returns a zip file containing the published tool and all associated artifacts, i.e. schemas and VCs.' + ONLY_SR
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async toolExportFile(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Response() res: any
    ): Promise<any> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            const file: any = await guardian.exportToolFile(id, owner);
            res.header('Content-disposition', `attachment; filename=tool_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export tool in message
     */
    @Get('/:id/export/message')
    @Auth(
        Permissions.TOOLS_TOOL_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return Heder message ID for the specified published tool.',
        description: 'Returns the Hedera message ID for the specified tool published onto IPFS.' + ONLY_SR
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ExportMessageDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ExportMessageDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async toolExportMessage(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
    ): Promise<any> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.exportToolMessage(id, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Preview tool from IPFS
     */
    @Post('/import/message/preview')
    @Auth(
        Permissions.TOOLS_TOOL_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new tool from IPFS.',
        description: 'Imports new tool and all associated artifacts from IPFS into the local DB.' + ONLY_SR
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Tool preview.',
        type: ToolPreviewDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, ToolPreviewDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async toolImportMessagePreview(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO
    ): Promise<ToolPreviewDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.previewToolMessage(messageId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import tool from IPFS
     */
    @Post('/import/message')
    @Auth(
        Permissions.TOOLS_TOOL_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new tool from IPFS.',
        description: 'Imports new tool and all associated artifacts from IPFS into the local DB.' + ONLY_SR
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ToolDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, ToolDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async toolImportMessage(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO
    ): Promise<ToolDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const guardian = new Guardians();

        try {
            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.importToolMessage(messageId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Preview tool from file
     */
    @Post('/import/file/preview')
    @Auth(
        Permissions.TOOLS_TOOL_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR
    })
    @ApiBody({
        description: 'File.',
    })
    @ApiOkResponse({
        description: 'Module preview.',
        type: ToolPreviewDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolPreviewDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async toolImportFilePreview(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.previewToolFile(body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import tool from IPFS
     */
    @Post('/import/file')
    @Auth(
        Permissions.TOOLS_TOOL_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR
    })
    @ApiBody({
        description: 'File.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ToolDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async toolImportFile(
        @AuthUser() user: IAuthUser,
        @Body() body: any,
        @Req() req
    ): Promise<ToolDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return await guardian.importToolFile(body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import tool from file with metadata
     */
    @Post('/import/file-metadata')
    @Auth(
        Permissions.TOOL_MIGRATION_CREATE,
        //UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ToolDTO
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Form data with tool file and metadata.',
        required: true,
        schema: {
            type: 'object',
            properties: {
                'file': {
                    type: 'string',
                    format: 'binary',
                },
                'metadata': {
                    type: 'string',
                    format: 'binary',
                }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.CREATED)
    async toolImportFileWithMetadata(
        @AuthUser() user: IAuthUser,
        @UploadedFiles() files: any,
        @Req() req
    ): Promise<ToolDTO> {
        try {
            const owner = new EntityOwner(user);
            const file = files.find((item) => item.fieldname === 'file');
            if (!file) {
                throw new Error('There is no tool file');
            }
            const metadata = files.find(
                (item) => item.fieldname === 'metadata'
            );
            const guardian = new Guardians();
            const tool = await guardian.importToolFile(
                file.buffer,
                owner,
                metadata?.buffer && JSON.parse(metadata.buffer.toString())
            );

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return tool;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import tool from IPFS (Async)
     */
    @Post('/push/import/file')
    @Auth(
        Permissions.TOOLS_TOOL_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR
    })
    @ApiBody({
        description: 'A zip file containing tool config.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async toolImportFileAsync(
        @AuthUser() user: IAuthUser,
        @Body() zip: any,
        @Req() req
    ): Promise<TaskDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.IMPORT_TOOL_FILE, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardian.importToolFileAsync(zip, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import tool from file with metadata (Async)
     */
    @Post('/push/import/file-metadata')
    @Auth(
        Permissions.TOOL_MIGRATION_CREATE,
        //UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description:
            'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' +
            ONLY_SR,
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Form data with tool file and metadata.',
        required: true,
        schema: {
            type: 'object',
            properties: {
                'file': {
                    type: 'string',
                    format: 'binary',
                },
                'metadata': {
                    type: 'string',
                    format: 'binary',
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.ACCEPTED)
    async toolImportFileWithMetadataAsync(
        @AuthUser() user: IAuthUser,
        @UploadedFiles() files: MultipartFile[],
        @Req() req
    ): Promise<TaskDTO> {
        try {
            const file = files.find(item => item.fieldname === 'file');
            if (!file) {
                throw new Error('There is no tool file');
            }
            const owner = new EntityOwner(user);
            const metadata = files.find(item => item.fieldname === 'metadata');
            const guardian = new Guardians();
            const taskManager = new TaskManager();
            const task = taskManager.start(
                TaskAction.IMPORT_TOOL_FILE,
                user.id
            );
            RunFunctionAsync<ServiceError>(
                async () => {
                    await guardian.importToolFileAsync(
                        file.buffer,
                        owner,
                        task,
                        metadata?.buffer && JSON.parse(metadata.buffer.toString())
                    );
                },
                async (error) => {
                    await this.logger.error(error, ['API_GATEWAY'], user.id);
                    taskManager.addError(task.taskId, {
                        code: 500,
                        message: error.message,
                    });
                }
            );

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import tool from IPFS (Async)
     */
    @Post('/push/import/message')
    @Auth(
        Permissions.TOOLS_TOOL_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new tool from IPFS.',
        description: 'Imports new tool and all associated artifacts from IPFS into the local DB.' + ONLY_SR
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async toolImportMessageAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO
    ): Promise<TaskDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.IMPORT_TOOL_MESSAGE, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardian.importToolMessageAsync(messageId, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Policy config menu
     */
    @Get('/menu/all')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        Permissions.MODULES_MODULE_UPDATE,
        Permissions.TOOLS_TOOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of tools.',
        description: 'Returns tools menu.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Modules.',
        isArray: true,
        type: ToolDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getMenu(
        @AuthUser() user: IAuthUser
    ): Promise<ToolDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.getMenuTool(owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Policy config menu
     */
    @Get('/check/:messageId')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        Permissions.MODULES_MODULE_UPDATE,
        Permissions.TOOLS_TOOL_UPDATE
    )
    @ApiOperation({
        summary: 'Checks the availability of the tool.',
        description: 'Checks the availability of the tool.' + ONLY_SR
    })
    @ApiParam({
        name: 'messageId',
        type: String,
        description: 'Tool message ID',
        required: true,
        example: Examples.MESSAGE_ID
    })
    @ApiOkResponse({
        description: 'Availability of the tool.',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ToolDTO, InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async checkTool(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<boolean> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.checkTool(messageId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
