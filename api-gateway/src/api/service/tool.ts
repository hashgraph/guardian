import { Logger, RunFunctionAsync } from '@guardian/common';
import { Guardians } from '../../helpers/guardians.js';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Req,
  Response,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { TaskAction, UserRole } from '@guardian/interfaces';
import {
    ApiBody,
    ApiConsumes,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags,
    ApiUnauthorizedResponse,
    getSchemaPath
} from '@nestjs/swagger';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator.js';
import { TaskManager } from '../../helpers/task-manager.js';
import { ServiceError } from '../../helpers/service-requests-base.js';
import { InternalServerErrorDTO, TaskDTO, ToolDTO } from '../../middlewares/validation/schemas/index.js';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { UseCache } from '../../helpers/decorators/cache.js';
import { Auth } from '../../auth/auth.decorator.js';

const ONLY_SR = ' Only users with the Standard Registry role are allowed to make the request.'

@Controller('tools')
@ApiTags('tools')
export class ToolsApi {
    /**
     * Create new tool
     */
    @Post('/')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Creates a new tool.',
        description: 'Creates a new tool.' + ONLY_SR,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(ToolDTO)
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async createNewTool(@Req() req, @Response() res): Promise<any> {
        try {
            const tool = req.body;
            if (!tool.config || tool.config.blockType !== 'tool') {
                throw new HttpException('Invalid tool config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const guardian = new Guardians();
            const item = await guardian.createTool(tool, req.user.did);
            return res.status(201).send(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    /**
     * Create new tool (Async)
     */
    @Post('/push')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Creates a new tool.',
        description: 'Creates a new tool.' + ONLY_SR,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(TaskDTO)
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async createNewToolAsync(@Req() req, @Response() res): Promise<any> {
        try {
            const tool = req.body;
            const user = req.user;
            if (!tool.config || tool.config.blockType !== 'tool') {
                throw new HttpException('Invalid tool config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const guardian = new Guardians();
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.CREATE_TOOL, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardian.createToolAsync(tool, user.did, task);
            }, async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });
            return res.status(202).send(task);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return a list of all tools.',
        description: 'Returns all tools.' + ONLY_SR,
    })
    @ApiImplicitQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiImplicitQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        schema: {
            $ref: getSchemaPath(ToolDTO)
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async getTools(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            let pageIndex: any;
            let pageSize: any;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            const { items, count } = await guardians.getTools({
                owner: req.user.did,
                pageIndex,
                pageSize
            });
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete tool
     */
    @Delete('/:id')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Deletes the tool with the provided tool ID.' + ONLY_SR,
        description: 'Deletes the tool.'
    })
    @ApiImplicitParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: '000000000000000000000000'
    })
    @ApiOkResponse({
        description: 'Successful operation.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async deleteTool(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            if (!req.params.id) {
                throw new Error('Invalid id')
            }
            const result = await guardian.deleteTool(req.params.id, req.user.did);
            return res.status(200).send(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get tool by id
     */
    @Get('/:id')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Retrieves tool configuration.',
        description: 'Retrieves tool configuration for the specified tool ID.' + ONLY_SR
    })
    @ApiImplicitParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: '000000000000000000000000'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(ToolDTO)
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async getToolById(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            if (!req.params.id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const item = await guardian.getToolById(req.params.id, req.user.did);
            return res.send(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update tool
     */
    @Put('/:id')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Updates tool configuration.',
        description: 'Updates tool configuration for the specified tool ID.' + ONLY_SR
    })
    @ApiImplicitParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: '000000000000000000000000'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(ToolDTO)
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async updateTool(@Req() req, @Response() res): Promise<any> {
        if (!req.params.id) {
            throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const guardian = new Guardians();
        const tool = req.body;
        if (!tool.config || tool.config.blockType !== 'tool') {
            throw new HttpException('Invalid tool config', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const result = await guardian.updateTool(req.params.id, tool, req.user.did);
            return res.status(201).send(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Publish tool
     */
    @Put('/:id/publish')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Publishes the tool onto IPFS.',
        description: 'Publishes the tool with the specified (internal) tool ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.' + ONLY_SR
    })
    @ApiImplicitParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: '000000000000000000000000'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(ToolDTO)
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async publishTool(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const tool = await guardian.publishTool(req.params.id, req.user.did, req.body);
            return res.send(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Publish tool (Async)
     */
    @Put('/:id/push/publish')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Publishes the tool onto IPFS.',
        description: 'Publishes the tool with the specified (internal) tool ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.' + ONLY_SR
    })
    @ApiImplicitParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: '000000000000000000000000'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(TaskDTO)
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async publishToolAsync(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PUBLISH_TOOL, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardian = new Guardians();
            await guardian.publishToolAsync(req.params.id, user.did, req.body, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message || error });
        });
        return res.status(202).send(task);
    }

    /**
     * Validate tool
     */
    @Post('/validate')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Validates selected tool.',
        description: 'Validates selected tool.' + ONLY_SR
    })
    @ApiOkResponse({
        schema: {
            type: 'object'
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async validateTool(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            return res.send(await guardian.validateTool(req.user.did, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    /**
     * Export tool in file
     */
    @Get('/:id/export/file')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return tool and its artifacts in a zip file format for the specified tool.',
        description: 'Returns a zip file containing the published tool and all associated artifacts, i.e. schemas and VCs.' + ONLY_SR
    })
    @ApiImplicitParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: '000000000000000000000000'
    })
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.'
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolExportFile(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const file: any = await guardian.exportToolFile(req.params.id, req.user.did);
            res.header('Content-disposition', `attachment; filename=tool_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Export tool in message
     */
    @Get('/:id/export/message')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return Heder message ID for the specified published tool.',
        description: 'Returns the Hedera message ID for the specified tool published onto IPFS.' + ONLY_SR
    })
    @ApiImplicitParam({
        name: 'id',
        type: String,
        description: 'Tool ID',
        required: true,
        example: '000000000000000000000000'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object'
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolExportMessage(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            return res.send(await guardian.exportToolMessage(req.params.id, req.user.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Preview tool from IPFS
     */
    @Post('/import/message/preview')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new tool from IPFS.',
        description: 'Imports new tool and all associated artifacts from IPFS into the local DB.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object'
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolImportMessagePreview(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const tool = await guardian.previewToolMessage(req.body.messageId, req.user.did);
            return res.send(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import tool from IPFS
     */
    @Post('/import/message')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new tool from IPFS.',
        description: 'Imports new tool and all associated artifacts from IPFS into the local DB.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(ToolDTO)
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolImportMessage(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const tool = await guardian.importToolMessage(req.body.messageId, req.user.did);
            return res.status(201).send(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Preview tool from file
     */
    @Post('/import/file/preview')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolImportFilePreview(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const tool = await guardian.previewToolFile(req.body, req.user.did);
            return res.send(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import tool from IPFS
     */
    @Post('/import/file')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(ToolDTO)
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolImportFile(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const tool = await guardian.importToolFile(req.body, req.user.did);
            return res.status(201).send(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import tool from file with metadata
     */
    @Post('/import/file-metadata')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(ToolDTO)
        }
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolImportFileWithMetadata(
        @Req() req,
        @UploadedFiles() files: any
    ): Promise<any> {
        const guardian = new Guardians();
        try {
            const file = files.find((item) => item.fieldname === 'file');
            if (!file) {
                throw new Error('There is no tool file');
            }
            const metadata = files.find(
                (item) => item.fieldname === 'metadata'
            );
            const tool = await guardian.importToolFile(
                file.buffer,
                req.user.did,
                metadata?.buffer && JSON.parse(metadata.buffer.toString())
            );
            return tool;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Import tool from IPFS (Async)
     */
    @Post('/push/import/file')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(TaskDTO)
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolImportFileAsync(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const owner = req.user.did;
            const zip = req.body;
            const guardian = new Guardians();
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.IMPORT_TOOL_FILE, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardian.importToolFileAsync(zip, owner, task);
            }, async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });
            return res.status(202).send(task);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import tool from file with metadata (Async)
     */
    @Post('/push/import/file-metadata')
    @ApiSecurity('bearerAuth')
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
        schema: {
            $ref: getSchemaPath(TaskDTO),
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO),
        },
    })
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolImportFileWithMetadataAsync(
        @Req() req,
        @UploadedFiles() files: any
    ): Promise<any> {
        try {
            const file = files.find(item => item.fieldname === 'file');
            if (!file) {
                throw new Error('There is no tool file');
            }
            const metadata = files.find(item => item.fieldname === 'metadata');
            const user = req.user;
            const owner = req.user.did;
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
                    new Logger().error(error, ['API_GATEWAY']);
                    taskManager.addError(task.taskId, {
                        code: 500,
                        message: error.message,
                    });
                }
            );
            return task;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Import tool from IPFS (Async)
     */
    @Post('/push/import/message')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new tool from IPFS.',
        description: 'Imports new tool and all associated artifacts from IPFS into the local DB.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(TaskDTO)
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async toolImportMessageAsync(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const owner = req.user.did;
            const messageId = req.body.messageId;
            const guardian = new Guardians();
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.IMPORT_TOOL_MESSAGE, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardian.importToolMessageAsync(messageId, owner, task);
            }, async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, { code: 500, message: error.message });
            });
            return res.status(202).send(task);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Policy config menu
     */
    @Get('/menu/all')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return a list of tools.',
        description: 'Returns tools menu.' + ONLY_SR
    })
    @ApiOkResponse({
        schema: {
            type: 'array'
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @UseCache()
    @Auth(UserRole.STANDARD_REGISTRY)
    async getMenu(@Req() req): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.getMenuTool(req.user.did);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
