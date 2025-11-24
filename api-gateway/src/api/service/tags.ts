import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Permissions, SchemaCategory, SchemaHelper, TaskAction } from '@guardian/interfaces';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, Version } from '@nestjs/common';
import { ApiTags, ApiInternalServerErrorResponse, ApiExtraModels, ApiOperation, ApiBody, ApiOkResponse, ApiParam, ApiCreatedResponse, ApiQuery } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, SchemaDTO, TagDTO, TagFilterDTO, TagMapDTO, TaskDTO, pageHeader } from '#middlewares';
import { AuthUser, Auth } from '#auth';
import { ONLY_SR, SchemaUtils, Guardians, InternalException, EntityOwner, CacheService, getCacheKey, UseCache, TaskManager, ServiceError } from '#helpers';
import { PREFIXES, SCHEMA_REQUIRED_PROPS } from '#constants';

@Controller('tags')
@ApiTags('tags')
export class TagsApi {

    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }

    /**
     * Create tag
     */
    @Post('/')
    @Auth(
        Permissions.TAGS_TAG_CREATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Creates new tag.',
        description: 'Creates new tag.',
    })
    @ApiBody({
        description: 'Object that contains tag information.',
        required: true,
        type: TagDTO,
    })
    @ApiOkResponse({
        description: 'Created tag.',
        type: TagDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TagDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async setTags(
        @AuthUser() user: IAuthUser,
        @Body() body: TagDTO,
        @Req() req: Request
    ): Promise<TagDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const invalidedCacheTags = [`${PREFIXES.TAGS}schemas`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardian.createTag(body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get tags
     */
    @Post('/search')
    @Auth(
        Permissions.TAGS_TAG_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Search tags.',
        description: 'Search tags.',
    })
    @ApiBody({
        description: 'Object that contains filters',
        required: true,
        type: TagFilterDTO,
        examples: {
            Single: {
                value: {
                    entity: 'PolicyDocument',
                    target: Examples.MESSAGE_ID,
                },
            },
            Multiple: {
                value: {
                    entity: 'PolicyDocument',
                    targets: [
                        Examples.MESSAGE_ID,
                        Examples.MESSAGE_ID,
                    ],
                },
            },
        },
    })
    @ApiOkResponse({
        description: 'Created tag.',
        type: TagMapDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TagFilterDTO, TagMapDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async searchTags(
        @AuthUser() user: IAuthUser,
        @Body() body: TagFilterDTO,
        @Req() req
    ): Promise<{ [localTarget: string]: TagMapDTO }> {
        try {
            const { entity, target, targets } = body;

            let _targets: string[];
            if (!entity) {
                throw new HttpException('Invalid entity', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (target) {
                if (typeof target !== 'string') {
                    throw new HttpException('Invalid target', HttpStatus.UNPROCESSABLE_ENTITY);
                } else {
                    _targets = [target];
                }
            } else if (targets) {
                if (!Array.isArray(targets)) {
                    throw new HttpException('Invalid target', HttpStatus.UNPROCESSABLE_ENTITY);
                } else {
                    _targets = targets;
                }
            } else {
                throw new HttpException('Invalid target', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const items = await guardians.getTags(owner, entity, _targets);
            const dates = await guardians.getTagCache(owner, entity, _targets);

            const dateMap = {};
            for (const date of dates) {
                dateMap[date.localTarget] = date.date;
            }

            const tagMap = {};
            for (const tag of items) {
                if (tagMap[tag.localTarget]) {
                    tagMap[tag.localTarget].tags.push(tag);
                } else {
                    tagMap[tag.localTarget] = {
                        entity,
                        refreshDate: dateMap[tag.localTarget],
                        target: tag.localTarget,
                        tags: [tag],
                    };
                }
            }

            const invalidedCacheTags = [`${PREFIXES.TAGS}schemas`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], req.user));

            return tagMap;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete tag
     */
    @Delete('/:uuid')
    @Auth(
        Permissions.TAGS_TAG_CREATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Delete tag.',
        description: 'Delete tag.',
    })
    @ApiParam({
        name: 'uuid',
        type: String,
        description: 'Tag identifier',
        required: true,
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
    async deleteTag(
        @AuthUser() user: IAuthUser,
        @Param('uuid') uuid: string,
        @Req() req: Request
    ): Promise<boolean> {
        try {
            if (!uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();

            const invalidedCacheTags = [`${PREFIXES.TAGS}schemas`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardian.deleteTag(uuid, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Synchronization
     */
    @Post('/synchronization')
    @Auth(
        Permissions.TAGS_TAG_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Synchronization of tags with an external network.',
        description: 'Synchronization of tags with an external network.',
    })
    @ApiBody({
        description: 'Object that contains filters',
        required: true,
        type: TagFilterDTO,
        examples: {
            Single: {
                value: {
                    entity: 'PolicyDocument',
                    target: Examples.MESSAGE_ID,
                },
            },
        },
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TagMapDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TagMapDTO, TagFilterDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async synchronizationTags(
        @AuthUser() user: IAuthUser,
        @Body() body: TagFilterDTO,
        @Req() req
    ): Promise<TagMapDTO> {
        try {
            const { entity, target } = body;
            if (!entity) {
                throw new HttpException('Invalid entity', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (typeof target !== 'string') {
                throw new HttpException('Invalid target', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const tags = await guardians.synchronizationTags(owner, entity, target);

            const invalidedCacheTags = [`${PREFIXES.TAGS}schemas`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], req.user));

            return {
                entity,
                target,
                tags,
                refreshDate: (new Date()).toISOString(),
            };
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
        summary: 'Return a list of all tag schemas.',
        description: 'Returns all tag schemas.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20,
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
    @UseCache({ isFastify: true })
    @HttpCode(HttpStatus.OK)
    async getSchemas(
        @AuthUser() user: IAuthUser,
        @Req() req,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const { items, count } = await guardians.getTagSchemas(owner, pageIndex, pageSize);
            items.forEach((s) => {
                s.readonly = s.readonly || s.owner !== owner.creator;
            });

            req.locals = SchemaUtils.toOld(items)

            return res
                .header('X-Total-Count', count)
                .send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get list of all schemas V2 03.06.2024
     */
    @Get('/schemas')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all tag schemas.',
        description: 'Returns all tag schemas.' + ONLY_SR,
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
    @UseCache({ isFastify: true })
    @HttpCode(HttpStatus.OK)
    @Version('2')
    async getSchemasV2(
        @AuthUser() user: IAuthUser,
        @Req() req,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const fields: string[] = Object.values(SCHEMA_REQUIRED_PROPS)

            const { items, count } = await guardians.getTagSchemasV2(owner, fields, pageIndex, pageSize);
            items.forEach((s) => { s.readonly = s.readonly || s.owner !== owner.creator });

            req.locals = SchemaUtils.toOld(items)

            return res
                .header('X-Total-Count', count)
                .send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        summary: 'Creates a new tag schema.',
        description: 'Creates a new tag schema.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Schema config.',
        type: SchemaDTO,
    })
    @ApiCreatedResponse({
        description: 'Created schema.',
        type: SchemaDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postSchemas(
        @AuthUser() user: IAuthUser,
        @Body() newSchema: SchemaDTO,
        @Req() req,
    ): Promise<SchemaDTO> {
        try {
            if (!newSchema) {
                throw new HttpException('Schema does not exist.', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            newSchema.category = SchemaCategory.TAG;
            SchemaUtils.fromOld(newSchema);
            SchemaUtils.clearIds(newSchema);
            SchemaHelper.updateOwner(newSchema, owner);

            const invalidedCacheTags = [
                `${PREFIXES.TAGS}schemas`,
                `${PREFIXES.SCHEMES}schema-with-sub-schemas`
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            const schemas = await guardians.createTagSchema(newSchema, owner);

            return SchemaUtils.toOld(schemas);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete schema
     */
    @Delete('/schemas/:schemaId')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Deletes the schema.',
        description: 'Deletes the schema with the provided schema ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: 'string',
        required: true,
        description: 'Schema Identifier',
        example: Examples.DB_ID,
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
    @HttpCode(HttpStatus.OK)
    async deleteSchema(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Req() req: Request
    ): Promise<boolean> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const schema = await guardians.getSchemaById(user, schemaId);
            const error = SchemaUtils.checkPermission(schema, owner, SchemaCategory.TAG);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN);
            }
            
            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.DELETE_SCHEMAS, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.deleteSchema(schemaId, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
            });

            const invalidedCacheTags = [
                `${PREFIXES.TAGS}schemas`,
                `${PREFIXES.SCHEMES}schema-with-sub-schemas`
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return true;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update schema
     */
    @Put('/schemas/:schemaId')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates schema configuration.',
        description: 'Updates schema configuration for the specified schema ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: 'string',
        required: true,
        description: 'Schema Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Schema config.',
        type: SchemaDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO,
        isArray: true,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateSchema(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Body() newSchema: SchemaDTO,
        @Req() req
    ): Promise<SchemaDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const schema = await guardians.getSchemaById(user, newSchema.id);
            const error = SchemaUtils.checkPermission(schema, owner, SchemaCategory.TAG);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN);
            }
            SchemaUtils.fromOld(newSchema);
            SchemaHelper.checkSchemaKey(newSchema);
            SchemaHelper.updateOwner(newSchema, owner);

            const invalidedCacheTags = [
                `${PREFIXES.TAGS}schemas`,
                `${PREFIXES.SCHEMES}schema-with-sub-schemas`
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardians.updateSchema(newSchema, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish schema
     */
    @Put('/schemas/:schemaId/publish')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Publishes the schema.',
        description: 'Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: 'string',
        required: true,
        description: 'Schema Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO,
        isArray: true,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishTag(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Req() req
    ): Promise<SchemaDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const schema = await guardians.getSchemaById(user, schemaId);
            const error = SchemaUtils.checkPermission(schema, owner, SchemaCategory.TAG);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN)
            }
            const version = '1.0.0';

            const invalidedCacheTags = [
                `${PREFIXES.TAGS}schemas`,
                `${PREFIXES.SCHEMES}schema-with-sub-schemas`
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardians.publishTagSchema(schemaId, version, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get published schema
     */
    @Get('/schemas/published')
    @Auth()
    @ApiOperation({
        summary: 'Return a list of all published schemas.',
        description: 'Return a list of all published schemas.' + ONLY_SR,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO,
        isArray: true,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    async getPublished(
        @AuthUser() user: IAuthUser,
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            return await guardians.getPublishedTagSchemas(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
