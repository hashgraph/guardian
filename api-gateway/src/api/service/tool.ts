import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Query,
    Req,
    Res,
    Response
} from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { SchemaHelper, UserRole } from '@guardian/interfaces';
import {
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags,
    ApiUnauthorizedResponse,
    getSchemaPath
} from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator';
import { SchemaUtils } from '@helpers/schema-utils';

@Controller('tools')
@ApiTags('tools')
export class ToolsApi {
    @ApiOperation({
        summary: 'Creates a new tool.',
        description: 'Creates a new tool. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/')
    @HttpCode(HttpStatus.CREATED)
    async postTools(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardian = new Guardians();
            const tool = req.body;
            if (!tool.config || tool.config.blockType !== 'tool') {
                throw new HttpException('Invalid tool config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const item = await guardian.createTool(tool, req.user.did);
            return res.status(201).json(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @ApiOperation({
        summary: 'Return a list of all tools.',
        description: 'Returns all tools. Only users with the Standard Registry and Installer role are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiImplicitQuery({
        name: 'policyId',
        type: String,
        description: 'Policy identifier',
        required: false
    })
    @ApiImplicitQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false
    })
    @ApiImplicitQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'string'
                },
                'uuid': {
                    'type': 'string'
                },
                'name': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                },
                'config': {
                    'type': 'object'
                },
                'status': {
                    'type': 'string'
                },
                'creator': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'topicId': {
                    'type': 'string'
                },
                'messageId': {
                    'type': 'string'
                },
                'codeVersion': {
                    'type': 'string'
                },
                'createDate': {
                    'type': 'string'
                },
                'type': {
                    'type': 'string'
                }
            }
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getTools(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
            return res.setHeader('X-Total-Count', count).json(items);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/schemas')
    @HttpCode(HttpStatus.OK)
    async getToolSchemas(
        @Req() req,
        @Res() res,
        @Query('pageIndex') pageIndex,
        @Query('pageSize') pageSize
    ): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const owner = user.did;

            const { items, count } = await guardians.getToolSchemas(owner, pageIndex, pageSize);
            items.forEach((s) => {
                s.readonly = s.readonly || s.owner !== owner
            });
            return res
                .setHeader('X-Total-Count', count)
                .json(SchemaUtils.toOld(items));
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/schemas')
    @HttpCode(HttpStatus.CREATED)
    async postSchemas(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const newSchema = req.body;

            if (!newSchema) {
                throw new HttpException('Schema does not exist.', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const owner = user.did;

            SchemaUtils.fromOld(newSchema);
            delete newSchema.version;
            delete newSchema.id;
            delete newSchema._id;
            delete newSchema.status;
            delete newSchema.topicId;

            SchemaHelper.updateOwner(newSchema, owner);
            const schema = await guardians.createToolSchema(newSchema);

            return res.status(201).json(SchemaUtils.toOld(schema));
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @ApiOperation({
        summary: 'Deletes the tool with the provided tool ID. Only users with the Standard Registry role are allowed to make the request.',
        description: 'Deletes the tool.'
    })
    @ApiSecurity('bearerAuth')
    @Delete('/:uuid')
    @HttpCode(HttpStatus.OK)
    async deleteTool(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new Error('Invalid uuid')
            }
            const result = await guardian.deleteTool(req.params.uuid, req.user.did);
            return res.status(200).json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Return a list of tools.',
        description: 'Returns tools menu. Only users with the Standard Registry and Installer role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Get('/menu')
    @HttpCode(HttpStatus.OK)
    async getMenu(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const items = await guardians.getMenuTool(req.user.did);
            return res.json(items);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Retrieves tool configuration.',
        description: 'Retrieves tool configuration for the specified tool ID. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Get('/:uuid')
    @HttpCode(HttpStatus.OK)
    async getTool(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const item = await guardian.getToolById(req.params.uuid, req.user.did);
            return res.json(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Updates tool configuration.',
        description: 'Updates tool configuration for the specified tool ID. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiOkResponse({
        schema: {
            type: 'object'
        }
    })
    @ApiSecurity('bearerAuth')
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
    @Put('/:uuid')
    @HttpCode(HttpStatus.CREATED)
    async putTool(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        if (!req.params.uuid) {
            throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const guardian = new Guardians();
        const tool = req.body;
        if (!tool.config || tool.config.blockType !== 'tool') {
            throw new HttpException('Invalid tool config', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const result = await guardian.updateTool(req.params.uuid, tool, req.user.did);
            return res.status(201).json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Return tool and its artifacts in a zip file format for the specified tool.',
        description: 'Returns a zip file containing the published tool and all associated artifacts, i.e. schemas and VCs. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Get('/:uuid/export/file')
    @HttpCode(HttpStatus.OK)
    async toolExportFile(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const guardian = new Guardians();
        try {
            const file: any = await guardian.exportToolFile(req.params.uuid, req.user.did);
            res.setHeader('Content-disposition', `attachment; filename=tool_${Date.now()}`);
            res.setHeader('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Return Heder message ID for the specified published tool.',
        description: 'Returns the Hedera message ID for the specified tool published onto IPFS. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Get('/:uuid/export/message')
    @HttpCode(HttpStatus.OK)
    async toolExportMessage(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const guardian = new Guardians();
        try {
            return res.send(await guardian.exportToolMessage(req.params.uuid, req.user.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new tool from IPFS.',
        description: 'Imports new tool and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Post('/import/message')
    @HttpCode(HttpStatus.CREATED)
    async toolImportMessage(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const guardian = new Guardians();
        try {
            const tool = await guardian.importToolMessage(req.body.messageId, req.user.did);
            return res.status(201).send(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Post('/import/file')
    @HttpCode(HttpStatus.CREATED)
    async toolImportFile(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const guardian = new Guardians();
        try {
            const tool = await guardian.importToolFile(req.body, req.user.did);
            return res.status(201).send(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new tool from IPFS.',
        description: 'Imports new tool and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Post('/import/message/preview')
    @HttpCode(HttpStatus.OK)
    async toolImportMessagePreview(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const guardian = new Guardians();
        try {
            const tool = await guardian.previewToolMessage(req.body.messageId, req.user.did);
            return res.send(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new tool from a zip file.',
        description: 'Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Post('/import/file/preview')
    @HttpCode(HttpStatus.OK)
    async toolImportFilePreview(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const guardian = new Guardians();
        try {
            const tool = await guardian.previewToolFile(req.body, req.user.did);
            return res.send(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Publishes the tool onto IPFS.',
        description: 'Publishes the tool with the specified (internal) tool ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Put('/:uuid/publish')
    @HttpCode(HttpStatus.OK)
    async publishTool(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const guardian = new Guardians();
        try {
            const tool = await guardian.publishTool(req.params.uuid, req.user.did, req.body);
            return res.json(tool);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Validates selected tool.',
        description: 'Validates selected tool. Only users with the Standard Registry role are allowed to make the request.'
    })
    @ApiSecurity('bearerAuth')
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
    @Post('/validate')
    @HttpCode(HttpStatus.OK)
    async validateTool(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const guardian = new Guardians();
        try {
            return res.send(await guardian.validateTool(req.user.did, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }
}
