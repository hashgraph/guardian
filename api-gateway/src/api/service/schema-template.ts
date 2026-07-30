import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { ISchemaTemplate, Permissions, StatusType, TaskAction } from '@guardian/interfaces';
import { ApiAcceptedResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser, Auth } from '#auth';
import { CacheService, EntityOwner, Guardians, InternalException, ServiceError, TaskManager } from '#helpers';
import { InternalServerErrorDTO, pageHeader, TaskDTO } from '#middlewares';
import { PREFIXES } from '#constants';

const ONLY_SR = ' Only users with the Standard Registry role are allowed to make the request.';

@Controller('schema-templates')
@ApiTags('schema-templates')
export class SchemaTemplatesApi {
    constructor(
        private readonly cacheService: CacheService,
        private readonly logger: PinoLogger
    ) {
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
     * Create schema template async.
     */
    @Post('/push')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new schema template asynchronously.',
        description: 'Creates a new schema template and a dedicated template topic asynchronously.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Schema template metadata and configuration.',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                config: { type: 'object' }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Task created.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async createSchemaTemplateAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: ISchemaTemplate
    ): Promise<TaskDTO> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.CREATE_SCHEMA_TEMPLATE, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                taskManager.addStatus(task.taskId, 'Create schema template and topic', StatusType.PROCESSING);
                const result = await guardians.createSchemaTemplate(body, owner);
                taskManager.addStatus(task.taskId, 'Create schema template and topic', StatusType.COMPLETED);
                taskManager.addResult(task.taskId, result);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });
            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create schema template version async.
     */
    @Post('/:templateId/push/new-version')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new draft version of a schema template asynchronously.',
        description: 'Copies a published schema template and its schemas into a new editable draft version.' + ONLY_SR,
    })
    @ApiParam({
        name: 'templateId',
        type: String,
        required: true
    })
    @ApiAcceptedResponse({
        description: 'Task created.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async createSchemaTemplateVersionAsync(
        @AuthUser() user: IAuthUser,
        @Param('templateId') templateId: string
    ): Promise<TaskDTO> {
        if (!templateId) {
            throw new HttpException('Invalid template id', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.CREATE_SCHEMA_TEMPLATE_VERSION, user.id);
            await guardians.createSchemaTemplateVersionAsync(templateId, owner, task);
            await this.cacheService.invalidateAllTagsByPrefixes([PREFIXES.SCHEMES]);
            return task;
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
    @ApiQuery({
        name: 'search',
        type: String,
        required: false
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
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string
    ): Promise<ISchemaTemplate[]> {
        try {
            const guardians = new Guardians();
            const { items, count } = await guardians.getSchemaTemplates({
                pageIndex,
                pageSize,
                search
            }, new EntityOwner(user));
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export schema template in file.
     */
    @Get('/:templateId/export/file')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Exports schema template as a file.',
        description: 'Exports schema template metadata, configuration, and schemas as a zip-based *.template file.' + ONLY_SR,
    })
    @HttpCode(HttpStatus.OK)
    async exportSchemaTemplateFile(
        @AuthUser() user: IAuthUser,
        @Param('templateId') templateId: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const file: any = await guardians.exportSchemaTemplateFile(templateId, new EntityOwner(user));
            res.header('Content-disposition', `attachment; filename=schema-template_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export schema template in message.
     */
    @Get('/:templateId/export/message')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns schema template identity and Hedera message id for export.',
        description: 'Returns template metadata and message id when the template has been published.' + ONLY_SR,
    })
    @HttpCode(HttpStatus.OK)
    async exportSchemaTemplateMessage(
        @AuthUser() user: IAuthUser,
        @Param('templateId') templateId: string
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.exportSchemaTemplateMessage(templateId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Check schema template message.
     */
    @Get('/check/:messageId')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Checks schema template message availability.',
        description: 'Checks whether a schema template message is available locally or from Hedera/IPFS.' + ONLY_SR,
    })
    @HttpCode(HttpStatus.OK)
    async checkSchemaTemplate(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.checkSchemaTemplate(messageId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Preview schema template from file.
     */
    @Post('/import/file/preview')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Previews schema template package from uploaded file.',
        description: 'Parses a schema template archive without persisting it.' + ONLY_SR,
    })
    @HttpCode(HttpStatus.OK)
    async previewSchemaTemplateFile(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.previewSchemaTemplateFile(body, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Preview schema template from message.
     */
    @Post('/import/message/preview')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Previews schema template package from message.',
        description: 'Loads a schema template package from a Hedera message/IPFS and parses it without persisting.' + ONLY_SR,
    })
    @HttpCode(HttpStatus.OK)
    async previewSchemaTemplateMessage(
        @AuthUser() user: IAuthUser,
        @Body() body: { messageId: string }
    ): Promise<any> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
            return await guardians.previewSchemaTemplateMessage(messageId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import schema template from file async.
     */
    @Post('/push/import/file')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports schema template from uploaded file asynchronously.',
        description: 'Imports schema template metadata, configuration, and schemas from a local archive.' + ONLY_SR,
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async importSchemaTemplateFileAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<TaskDTO> {
        try {
            const guardians = new Guardians();
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.IMPORT_SCHEMA_TEMPLATE_FILE, user.id);
            await guardians.importSchemaTemplateFileAsync(body, new EntityOwner(user), task);
            await this.cacheService.invalidateAllTagsByPrefixes([PREFIXES.SCHEMES]);
            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import schema template from message async.
     */
    @Post('/push/import/message')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports schema template from message asynchronously.',
        description: 'Imports schema template metadata, configuration, and schemas from a Hedera message/IPFS archive.' + ONLY_SR,
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async importSchemaTemplateMessageAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: { messageId: string }
    ): Promise<TaskDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.IMPORT_SCHEMA_TEMPLATE_MESSAGE, user.id);
            await guardians.importSchemaTemplateMessageAsync(messageId, new EntityOwner(user), task);
            await this.cacheService.invalidateAllTagsByPrefixes([PREFIXES.SCHEMES]);
            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get effective applied schema template by policy topic id.
     */
    @Get('/policies/topic/:topicId/applied')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns effective applied schema template state by policy topic.',
        description: 'Returns policy-specific schema template state. Snapshot configuration is used when available.' + ONLY_SR,
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        required: true
    })
    @ApiOkResponse({
        description: 'Applied schema template state.',
        schema: { type: 'object' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async getAppliedSchemaTemplateByPolicyTopic(
        @AuthUser() user: IAuthUser,
        @Param('topicId') topicId: string
    ): Promise<ISchemaTemplate | null> {
        try {
            const guardians = new Guardians();
            return await guardians.getAppliedSchemaTemplateByPolicyTopic(topicId, new EntityOwner(user));
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

    /**
     * Delete schema template async.
     */
    @Delete('/push/:templateId')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Deletes schema template asynchronously.',
        description: 'Deletes draft schema template and its draft schemas asynchronously.' + ONLY_SR,
    })
    @ApiParam({
        name: 'templateId',
        type: String,
        required: true
    })
    @ApiAcceptedResponse({
        description: 'Task created.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async deleteSchemaTemplateAsync(
        @AuthUser() user: IAuthUser,
        @Param('templateId') templateId: string
    ): Promise<TaskDTO> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.DELETE_SCHEMA_TEMPLATE, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                taskManager.addStatus(task.taskId, 'Delete schema template and schemas', StatusType.PROCESSING);
                const result = await guardians.deleteSchemaTemplate(templateId, owner);
                taskManager.addStatus(task.taskId, 'Delete schema template and schemas', StatusType.COMPLETED);
                taskManager.addResult(task.taskId, result);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });
            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish schema template async.
     */
    @Put('/:templateId/push/publish')
    @Auth(
        Permissions.TEMPLATES_TEMPLATE_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Publishes schema template asynchronously.',
        description: 'Publishes schema template package with metadata, configuration, and schemas.' + ONLY_SR,
    })
    @ApiParam({
        name: 'templateId',
        type: String,
        required: true
    })
    @ApiBody({
        description: 'Schema template version for publish.',
        schema: {
            type: 'object',
            properties: {
                templateVersion: {
                    type: 'string',
                    example: '1.0.0'
                }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Task created.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async publishSchemaTemplateAsync(
        @AuthUser() user: IAuthUser,
        @Param('templateId') templateId: string,
        @Body() body: { templateVersion: string }
    ): Promise<TaskDTO> {
        if (!templateId) {
            throw new HttpException('Invalid template id', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (!body?.templateVersion) {
            throw new HttpException('Schema template version in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.PUBLISH_SCHEMA_TEMPLATE, user.id);
            await guardians.publishSchemaTemplateAsync(templateId, owner, body, task);
            await this.cacheService.invalidateAllTagsByPrefixes([PREFIXES.SCHEMES]);
            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Apply schema template to policy async.
     */
    @Post('/:templateId/policies/:policyId/push/apply')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Applies schema template to policy asynchronously.',
        description: 'Copies template schemas into the selected draft policy and stores template binding metadata on the policy.' + ONLY_SR,
    })
    @ApiParam({
        name: 'templateId',
        type: String,
        required: true
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        required: true
    })
    @ApiAcceptedResponse({
        description: 'Task created.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async applySchemaTemplateAsync(
        @AuthUser() user: IAuthUser,
        @Param('templateId') templateId: string,
        @Param('policyId') policyId: string
    ): Promise<TaskDTO> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.APPLY_SCHEMA_TEMPLATE, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                taskManager.addStatus(task.taskId, 'Copy template schemas', StatusType.PROCESSING);
                const result = await guardians.applySchemaTemplate(templateId, policyId, owner);
                taskManager.addStatus(task.taskId, 'Copy template schemas', StatusType.COMPLETED);
                taskManager.addStatus(task.taskId, 'Save template binding', StatusType.PROCESSING);
                await this.cacheService.invalidateAllTagsByPrefixes([PREFIXES.SCHEMES]);
                taskManager.addStatus(task.taskId, 'Save template binding', StatusType.COMPLETED);
                taskManager.addResult(task.taskId, result);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });
            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Detach schema template from policy async.
     */
    @Post('/policies/:policyId/push/detach')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Detaches schema template from policy asynchronously.',
        description: 'Removes template binding metadata from the selected draft policy and turns copied template schemas into regular policy schemas.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        required: true
    })
    @ApiAcceptedResponse({
        description: 'Task created.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async detachSchemaTemplateAsync(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string
    ): Promise<TaskDTO> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.DETACH_SCHEMA_TEMPLATE, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                taskManager.addStatus(task.taskId, 'Validate policy template binding', StatusType.PROCESSING);
                taskManager.addStatus(task.taskId, 'Validate policy template binding', StatusType.COMPLETED);
                taskManager.addStatus(task.taskId, 'Detach template from policy schemas', StatusType.PROCESSING);
                const result = await guardians.detachSchemaTemplate(policyId, owner);
                taskManager.addStatus(task.taskId, 'Detach template from policy schemas', StatusType.COMPLETED);
                taskManager.addStatus(task.taskId, 'Finalize policy binding', StatusType.PROCESSING);
                await this.cacheService.invalidateAllTagsByPrefixes([PREFIXES.SCHEMES]);
                taskManager.addStatus(task.taskId, 'Finalize policy binding', StatusType.COMPLETED);
                taskManager.addResult(task.taskId, result);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });
            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
