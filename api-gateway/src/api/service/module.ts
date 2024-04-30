import { Logger } from '@guardian/common';
import { Guardians } from '../../helpers/guardians.js';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Put, Query, Req, Res, Response } from '@nestjs/common';
import { SchemaCategory, SchemaHelper, UserRole } from '@guardian/interfaces';
import { ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator.js';
import { SchemaUtils } from '../../helpers/schema-utils.js';
import { UseCache } from '../../helpers/decorators/cache.js';
import { Auth } from '../../auth/auth.decorator.js';

@Controller('modules')
@ApiTags('modules')
export class ModulesApi {
    @ApiOperation({
        summary: 'Creates a new module.',
        description: 'Creates a new module. Only users with the Standard Registry role are allowed to make the request.',
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async postModules(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            const module = req.body;
            if (!module.config || module.config.blockType !== 'module') {
                throw new HttpException('Invalid module config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const item = await guardian.createModule(module, req.user.did);
            return res.status(201).send(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Return a list of all modules.',
        description: 'Returns all modules. Only users with the Standard Registry and Installer role are allowed to make the request.',
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async getModules(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();

            let pageIndex: any;
            let pageSize: any;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            const { items, count } = await guardians.getModule({
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
     * @param req
     * @param res
     * @param pageIndex
     * @param pageSize
     * @param topicId
     */
    @Get('/schemas')
    @HttpCode(HttpStatus.OK)
    @UseCache({ isExpress: true })
    @Auth(UserRole.STANDARD_REGISTRY)
    async getModuleSchemas(
        @Req() req,
        @Res() res,
        @Query('pageIndex') pageIndex,
        @Query('pageSize') pageSize,
        @Query('topicId') topicId
    ): Promise<any> {
        try {
            const user = req.user;
            const guardians = new Guardians();
            const owner = user.did;

            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.MODULE,
                owner,
                topicId,
                pageIndex,
                pageSize
            });
            items.forEach((s) => {
                s.readonly = s.readonly || s.owner !== owner
            });
            res.locals.data = SchemaUtils.toOld(items)
            return res
                .header('X-Total-Count', count)
                .send(SchemaUtils.toOld(items));
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/schemas')
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async postSchemas(@Req() req, @Response() res): Promise<any> {
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

            newSchema.category = SchemaCategory.MODULE;
            SchemaHelper.updateOwner(newSchema, owner);
            const schema = await guardians.createSchema(newSchema);

            return res.status(201).send(SchemaUtils.toOld(schema));
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @ApiOperation({
        summary: 'Deletes the module with the provided module ID. Only users with the Standard Registry role are allowed to make the request.',
        description: 'Deletes the module.'
    })
    @ApiSecurity('bearerAuth')
    @Delete('/:uuid')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async deleteModule(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new Error('Invalid uuid')
            }
            const result = await guardian.deleteModule(req.params.uuid, req.user.did);
            return res.status(200).send(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * @param req
     */
    @ApiOperation({
        summary: 'Return a list of modules.',
        description: 'Returns modules menu. Only users with the Standard Registry and Installer role are allowed to make the request.'
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
    @UseCache()
    @Auth(UserRole.STANDARD_REGISTRY)
    async getMenu(@Req() req): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.getMenuModule(req.user.did);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * @param req
     * @param res
     */
    @ApiOperation({
        summary: 'Retrieves module configuration.',
        description: 'Retrieves module configuration for the specified module ID. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async getModule(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const item = await guardian.getModuleById(req.params.uuid, req.user.did);
            return res.send(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Updates module configuration.',
        description: 'Updates module configuration for the specified module ID. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async putModule(@Req() req, @Response() res): Promise<any> {
        if (!req.params.uuid) {
            throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const guardian = new Guardians();
        const module = req.body;
        if (!module.config || module.config.blockType !== 'module') {
            throw new HttpException('Invalid module config', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const result = await guardian.updateModule(req.params.uuid, module, req.user.did);
            return res.status(201).send(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Return module and its artifacts in a zip file format for the specified module.',
        description: 'Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async moduleExportFile(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const file: any = await guardian.exportModuleFile(req.params.uuid, req.user.did);
            res.header('Content-disposition', `attachment; filename=module_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Return Heder message ID for the specified published module.',
        description: 'Returns the Hedera message ID for the specified module published onto IPFS. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async moduleExportMessage(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            return res.send(await guardian.exportModuleMessage(req.params.uuid, req.user.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new module from IPFS.',
        description: 'Imports new module and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async moduleImportMessage(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.importModuleMessage(req.body.messageId, req.user.did);
            return res.status(201).send(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new module from a zip file.',
        description: 'Imports new module and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async moduleImportFile(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.importModuleFile(req.body, req.user.did);
            return res.status(201).send(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new module from IPFS.',
        description: 'Imports new module and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async moduleImportMessagePreview(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.previewModuleMessage(req.body.messageId, req.user.did);
            return res.send(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new module from a zip file.',
        description: 'Imports new module and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async moduleImportFilePreview(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.previewModuleFile(req.body, req.user.did);
            return res.send(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Publishes the module onto IPFS.',
        description: 'Publishes the module with the specified (internal) module ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async publishModule(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.publishModule(req.params.uuid, req.user.did, req.body);
            return res.send(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Validates selected module.',
        description: 'Validates selected module. Only users with the Standard Registry role are allowed to make the request.'
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async validateModule(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            return res.send(await guardian.validateModule(req.user.did, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }
}
