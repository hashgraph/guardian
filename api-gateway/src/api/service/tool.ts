import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, UseInterceptors, Version } from '@nestjs/common';
import { Permissions, TaskAction } from '@guardian/interfaces';
import { ApiAcceptedResponse, ApiBody, ApiConsumes, ApiCreatedResponse, ApiExcludeEndpoint, ApiHeader, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { CreateToolDTO, ImportMessageDTO, InternalServerErrorDTO, ObjectExamples, TaskDTO, ToolDTO, ToolDryRunResponseDTO, ToolExportMessageDTO, ToolImportResponseDTO, ToolListV1ItemDTO, ToolListV2ItemDTO, ToolMenuItemDTO, ToolPreviewDTO, ToolPublishResponseDTO, ToolValidationDTO, UnprocessableEntityErrorDTO, Examples, pageHeader, ToolVersionDTO } from '#middlewares';
import { UseCache, ServiceError, TaskManager, Guardians, InternalException, ONLY_SR, MultipartFile, UploadedFiles, AnyFilesInterceptor, EntityOwner, CacheService } from '#helpers';
import { AuthUser, Auth } from '#auth';
import { CACHE_PREFIXES, TOOL_REQUIRED_PROPS } from '#constants';

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
        summary: 'Creates a new tool (sync).',
        description: 'Creates a new tool. Waits for completion and returns the created tool.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Tool configuration. Only config with blockType: "tool" is required. Other fields (name, description) are optional. Fields like id, uuid, creator, owner are set by the server.',
        type: CreateToolDTO,
        required: true,
        examples: {
            create: {
                summary: 'Minimal create',
                value: ObjectExamples.TOOL_CREATE_REQUEST
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: ToolDTO,
        example: ObjectExamples.TOOL_CREATE_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid tool config (missing config or config.blockType !== "tool").',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Invalid tool config' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.CREATED)
    async createNewTool(
        @AuthUser() user: IAuthUser,
        @Body() tool: CreateToolDTO,
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

            return await guardian.createTool(tool as ToolDTO, owner);
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
        summary: 'Creates a new tool (async).',
        description: 'Creates a new tool asynchronously. Returns task ID for progress tracking.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Tool configuration. Only config with blockType: "tool" is required. Other fields (name, description) are optional.',
        type: CreateToolDTO,
        examples: {
            create: {
                summary: 'Minimal create',
                value: ObjectExamples.TOOL_CREATE_REQUEST
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: 'c2a271c0-4b6a-4893-8dd9-f23c936a747e',
            expectation: 8,
            action: 'Create tool',
            userId: '69bcfd90c98df6ceb05e8a78'
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid tool config (missing config or config.blockType !== "tool").',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Invalid tool config' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async createNewToolAsync(
        @AuthUser() user: IAuthUser,
        @Body() tool: CreateToolDTO,
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
                await guardian.createToolAsync(tool as ToolDTO, owner, task);
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
     * Get page (v1 — without search/tag)
     */
    @Get('/')
    @ApiExcludeEndpoint()
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
        type: ToolListV1ItemDTO,
        example: ObjectExamples.TOOLS_V1_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
     * Get tools V2 — with search and tag filters. Requires Api-Version: 2 header.
     */
    @Get('/')
    @Auth(
        Permissions.TOOLS_TOOL_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiHeader({
        name: 'Api-Version',
        description: 'Use "2" for this endpoint (supports search, tag)',
        required: true,
        example: '2'
    })
    @ApiOperation({
        summary: 'Return a list of all tools.',
        description: 'Returns all tools. Add Api-Version: 2 header to use search and tag filters.' + ONLY_SR,
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
    @ApiQuery({
        name: 'tag',
        type: String,
        description: 'Tag',
        required: false,
        example: 'text'
    })
    @ApiOkResponse({
        description: 'Successful operation. Example shows V2 response format (no uuid, no hash).',
        isArray: true,
        headers: pageHeader,
        type: ToolListV2ItemDTO,
        example: ObjectExamples.TOOLS_V2_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    @Version('2')
    async getToolsV2(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string,
        @Query('tag') tag?: string
    ): Promise<ToolDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const fields: string[] = Object.values(TOOL_REQUIRED_PROPS);

            const { items, count } = await guardians.getToolsV2(fields, {
                pageIndex,
                pageSize,
                search,
                tag
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
        type: Boolean,
        example: true
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid id (empty, "undefined", "null", or tool not found/not owned/published).',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Invalid id' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        type: ToolDTO,
        example: ObjectExamples.TOOL_GET_BY_ID_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid id (empty, "undefined", "null", or tool not found/not owned).',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Invalid id' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        description: 'Tool configuration. Must include config with blockType: "tool". name and description are updatable.',
        type: ToolDTO,
        required: true,
        examples: {
            update: {
                summary: 'Update tool example',
                value: ObjectExamples.TOOL_UPDATE_REQUEST
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: ToolDTO,
        example: ObjectExamples.TOOL_UPDATE_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid id or invalid tool config (missing config or config.blockType !== "tool").',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Invalid tool config' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        description: 'Tool version for publish. Required: toolVersion (e.g. "1.0.0").',
        type: ToolVersionDTO,
        required: true,
        examples: {
            publish: {
                summary: 'Publish tool example',
                value: { toolVersion: '1.0.0' }
            }
        }
    })
    @ApiOkResponse({
        description:
            'Publish result (HTTP 200). If isValid is true, the tool was published. If isValid is false, the tool stays DRAFT and was not published — see errors.',
        type: ToolPublishResponseDTO,
        examples: {
            success: {
                summary: 'Validation passed — tool published',
                value: ObjectExamples.TOOL_PUBLISH_RESPONSE
            },
            validationFailed: {
                summary: 'Validation failed — publish not started',
                value: ObjectExamples.TOOL_PUBLISH_RESPONSE_INVALID
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Request validation failed (e.g. missing or invalid toolVersion).',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: ['toolVersion must be a string'],
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async publishTool(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() body: ToolVersionDTO,
        @Req() req
    ): Promise<ToolPublishResponseDTO> {
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
        description: 'Tool version for publish. Required: toolVersion (e.g. "1.0.0").',
        type: ToolVersionDTO,
        required: true,
        examples: {
            publish: {
                summary: 'Publish tool example',
                value: { toolVersion: '1.0.0' }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: ObjectExamples.TOOL_PUBLISH_ASYNC_TASK_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Request validation failed (e.g. missing or invalid toolVersion).',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: ['toolVersion must be a string'],
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        summary: 'Dry run tool.',
        description:
            'Validates the tool config; when valid, dry run starts (tool state updated server-side). Returns isValid and errors (no full tool body).' +
            ONLY_SR,
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description:
            'Validation result (HTTP 200). Dry run started when isValid is true; dry run not started when isValid is false (see errors.blocks and nested messages).',
        type: ToolDryRunResponseDTO,
        examples: {
            success: {
                summary: 'Validation passed — dry run started',
                value: ObjectExamples.TOOL_DRY_RUN_RESPONSE
            },
            validationFailed: {
                summary: 'Validation failed — dry run not started',
                value: ObjectExamples.TOOL_DRY_RUN_RESPONSE_VALIDATION_FAILED
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid id (empty or missing path segment).',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: 'Invalid id',
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async dryRunPolicy(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Req() req
    ): Promise<ToolDryRunResponseDTO> {
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
        summary: 'Return tool to draft (editing).',
        description:
            'Sets the tool to DRAFT when allowed (not already DRAFT, not PUBLISHED, config present, not referenced by a policy in dry run). Response body is JSON `true`.' +
            ONLY_SR,
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation. Response body is the JSON boolean `true`.',
        type: Boolean,
        example: true
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid id (empty or missing path segment).',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: 'Invalid id',
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async draftPolicy(
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
        description:
            'Full tool document (same shape as GET /tools/:id). `customLogicBlock.expression` in examples uses a short placeholder; production tools use longer scripts.',
        type: ToolDTO,
        required: true,
        examples: {
            valid: {
                summary: 'Valid DRAFT tool — validation passes',
                value: ObjectExamples.TOOL_VALIDATE_REQUEST_VALID
            },
            invalid: {
                summary: 'Invalid — createTokenBlock fails (empty template / token)',
                value: ObjectExamples.TOOL_VALIDATE_REQUEST_INVALID
            }
        }
    })
    @ApiOkResponse({
        description:
            'Validation outcome (HTTP 200). `results` is ValidationErrors-style output (blocks, tools, common errors, aggregate isValid). `tool` echoes the submitted tool.',
        type: ToolValidationDTO,
        examples: {
            valid: {
                summary: 'All blocks valid',
                value: ObjectExamples.TOOL_VALIDATE_RESPONSE_VALID
            },
            invalid: {
                summary: 'createTokenBlock + tool-level aggregate invalid',
                value: ObjectExamples.TOOL_VALIDATE_RESPONSE_INVALID
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async validateTool(
        @AuthUser() user: IAuthUser,
        @Body() tool: ToolDTO
    ): Promise<ToolValidationDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const prefixInvalidatedCacheTags = [`${CACHE_PREFIXES.TAG}/tools`];
            await this.cacheService.invalidateAllTagsByPrefixes([...prefixInvalidatedCacheTags])

            return (await guardian.validateTool(owner, tool)) as ToolValidationDTO;
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
    @ApiProduces('application/zip')
    @ApiOkResponse({
        description:
            'Binary ZIP archive (`Content-Type: application/zip`, `Content-Disposition: attachment`). Not JSON.',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid id (empty or missing path segment).',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: 'Invalid id',
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Return tool identity and Hedera message id for export.',
        description:
            'Returns id, uuid, name, description, messageId, owner. `messageId` is set when the tool is published to the topic; for DRAFT / dry-run it is null.' +
            ONLY_SR
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Tool export metadata (JSON).',
        type: ToolExportMessageDTO,
        examples: {
            published: {
                summary: 'Published tool — messageId present',
                value: ObjectExamples.TOOL_EXPORT_MESSAGE_RESPONSE_PUBLISHED
            },
            draft: {
                summary: 'DRAFT / dry-run — messageId null',
                value: ObjectExamples.TOOL_EXPORT_MESSAGE_RESPONSE_DRAFT
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Invalid id (empty or missing path segment).',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: 'Invalid id',
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        summary: 'Preview tool package from a Hedera message (IPFS ZIP).',
        description:
            'Loads the tool ZIP from IPFS via `messageId`, parses `tool.json`, `schemas/*`, `tags/*`, `tools/*`, then adds `messageId` and `toolTopicId` from the message. Does not persist to the DB.' +
            ONLY_SR
    })
    @ApiBody({
        description: 'Hedera topic message id (`messageId`).',
        type: ImportMessageDTO,
        examples: {
            byMessageId: {
                summary: 'Preview by Hedera message id',
                value: { messageId: '1726593517.484578000' }
            }
        }
    })
    @ApiOkResponse({
        description:
            'Parsed archive components plus message metadata. `schemas` entries are full schema records in production; the example lists all metadata fields with `document` and `context` as empty objects (omitted payload).',
        type: ToolPreviewDTO,
        example: ObjectExamples.TOOL_IMPORT_MESSAGE_PREVIEW_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description:
            'Missing or empty `messageId` in the body (gateway throws before calling guardian), or global request validation failure.',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: 'Message ID in body is empty',
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        examples: {
            byMessageId: {
                summary: 'Import by Hedera message id',
                value: {
                    messageId: '1726593517.484578000'
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: ToolImportResponseDTO,
        example: ObjectExamples.TOOL_IMPORT_MESSAGE_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
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
        summary: 'Preview tool package from an uploaded *.tool file.',
        description:
            'Parses the uploaded tool archive (`*.tool`, ZIP format; `tool.json`, `schemas/*`, `tags/*`, `tools/*`) without persisting. Shape matches message preview; `messageId` / `toolTopicId` may be absent when not sourced from a Hedera message.' +
            ONLY_SR
    })
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Tool archive (`*.tool`, ZIP format) as raw binary request body.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary',
        }
    })
    @ApiOkResponse({
        description:
            'Parsed archive components. Same structure as `POST /tools/import/message/preview`; the example matches that response shape (`document` / `context` empty in `schemas`).',
        type: ToolPreviewDTO,
        example: ObjectExamples.TOOL_IMPORT_FILE_PREVIEW_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        summary: 'Imports new tool from a *.tool file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided `*.tool` file (ZIP format) into the local DB.' + ONLY_SR
    })
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Tool archive (`*.tool`, ZIP format) as raw binary request body.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary',
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: ToolDTO,
        example: ObjectExamples.TOOL_IMPORT_FILE_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        summary: 'Imports new tool from a *.tool file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided `*.tool` file (ZIP format) into the local DB.' + ONLY_SR
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: ToolDTO,
        example: ObjectExamples.TOOL_IMPORT_FILE_METADATA_RESPONSE
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Multipart form data with a tool archive (`*.tool`, ZIP format) and optional metadata JSON file.',
        required: true,
        schema: {
            type: 'object',
            required: ['file'],
            properties: {
                'file': {
                    type: 'string',
                    format: 'binary',
                    description: 'Tool archive (`*.tool`, ZIP format).'
                },
                'metadata': {
                    type: 'string',
                    format: 'binary',
                    nullable: true,
                    description: 'Optional JSON file (for example `metadata.json`) with content like `{ "tools": { "1706867530.884259218": "1774367941.594676930" } }`.'
                }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Imports new tool from a *.tool file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided `*.tool` file (ZIP format) into the local DB.' + ONLY_SR
    })
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Tool archive (`*.tool`, ZIP format) as raw binary request body.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary',
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object',
            required: ['taskId', 'expectation', 'action', 'userId'],
            properties: {
                taskId: {
                    type: 'string',
                    description: 'Task Id',
                    example: '4c4bb402-197a-4682-a5eb-ff52e7542f28'
                },
                expectation: {
                    type: 'number',
                    description: 'Expected count of task phases',
                    example: 9
                },
                action: {
                    type: 'string',
                    description: 'Task action',
                    example: 'Import tool file'
                },
                userId: {
                    type: 'string',
                    description: 'User Id',
                    example: '69bcfd90c98df6ceb05e8a78'
                }
            }
        },
        example: ObjectExamples.TOOL_IMPORT_FILE_ASYNC_TASK_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        summary: 'Imports new tool from a *.tool file.',
        description:
            'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided `*.tool` file (ZIP format) into the local DB.' +
            ONLY_SR,
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Multipart form data with a tool archive (`*.tool`, ZIP format) and optional metadata JSON file.',
        required: true,
        schema: {
            type: 'object',
            required: ['file'],
            properties: {
                'file': {
                    type: 'string',
                    format: 'binary',
                    description: 'Tool archive (`*.tool`, ZIP format).'
                },
                'metadata': {
                    type: 'string',
                    format: 'binary',
                    nullable: true,
                    description: 'Optional JSON file (for example `metadata.json`) with content like `{ "tools": { "1706867530.884259218": "1774367941.594676930" } }`.'
                }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object',
            required: ['taskId', 'expectation', 'action', 'userId'],
            properties: {
                taskId: {
                    type: 'string',
                    description: 'Task Id',
                    example: 'e2869118-935c-4f13-bbed-e7868b058606'
                },
                expectation: {
                    type: 'number',
                    description: 'Expected count of task phases',
                    example: 9
                },
                action: {
                    type: 'string',
                    description: 'Task action',
                    example: 'Import tool file'
                },
                userId: {
                    type: 'string',
                    description: 'User Id',
                    example: '69b806bbd51470fcd6ea9ba3'
                }
            }
        },
        example: ObjectExamples.TOOL_IMPORT_FILE_METADATA_ASYNC_TASK_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        examples: {
            byMessageId: {
                summary: 'Import by Hedera message id',
                value: {
                    messageId: '1726593517.484578000'
                }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object',
            required: ['taskId', 'expectation', 'action', 'userId'],
            properties: {
                taskId: {
                    type: 'string',
                    description: 'Task Id',
                    example: '4c4bb402-197a-4682-a5eb-ff52e7542f28'
                },
                expectation: {
                    type: 'number',
                    description: 'Expected count of task phases',
                    example: 11
                },
                action: {
                    type: 'string',
                    description: 'Task action',
                    example: 'Import tool message'
                },
                userId: {
                    type: 'string',
                    description: 'User Id',
                    example: '69bcfd90c98df6ceb05e8a78'
                }
            }
        },
        example: ObjectExamples.TOOL_IMPORT_MESSAGE_ASYNC_TASK_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
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
        description: 'Tools menu.',
        isArray: true,
        type: ToolMenuItemDTO,
        example: ObjectExamples.TOOL_MENU_ALL_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getMenu(
        @AuthUser() user: IAuthUser
    ): Promise<ToolMenuItemDTO[]> {
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
        example: '1709106946.913157840'
    })
    @ApiOkResponse({
        description: 'Availability of the tool.',
        type: Boolean,
        example: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
