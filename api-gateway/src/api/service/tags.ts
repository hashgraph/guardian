import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { SchemaCategory, SchemaHelper, UserRole } from '@guardian/interfaces';
import { SchemaUtils } from '@helpers/schema-utils';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Put, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiTags } from '@nestjs/swagger';

@Controller('tags')
@ApiTags('tags')
export class TagsApi {
    @Post('/')
    @HttpCode(HttpStatus.CREATED)
    async setTags(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        try {
            if (!req.headers.authorization || !req.user || !req.user.did) {
                throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
            }
            const guardian = new Guardians();
            const item = await guardian.createTag(req.body, req.user.did);
            return res.status(201).json(item);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/search')
    @HttpCode(HttpStatus.OK)
    async searchTags(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            if (!req.headers.authorization || !req.user || !req.user.did) {
                throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
            }
            const { entity, target, targets } = req.body;
            let _targets: string[];
            if (!entity) {
                throw new HttpException('Invalid entity', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            if (target) {
                if (typeof target !== 'string') {
                    throw new HttpException('Invalid target', HttpStatus.UNPROCESSABLE_ENTITY)
                } else {
                    _targets = [target];
                }
            } else if (targets) {
                if (!Array.isArray(targets)) {
                    throw new HttpException('Invalid target', HttpStatus.UNPROCESSABLE_ENTITY)
                } else {
                    _targets = targets;
                }
            } else {
                throw new HttpException('Invalid target', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const items = await guardians.getTags(entity, _targets);
            const dates = await guardians.getTagCache(entity, _targets);

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
                        tags: [tag]
                    }
                }
            }
            return res.json(tagMap);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Delete('/:uuid')
    @HttpCode(HttpStatus.OK)
    async deleteTag(@Req() req, @Response() res): Promise<any> {
        if (!req.user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const result = await guardian.deleteTag(req.params.uuid, req.user.did);
            return res.json(result);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
            // return next(error);
        }
    }

    @Post('/synchronization')
    @HttpCode(HttpStatus.OK)
    async synchronizationTags(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        if (!req.headers.authorization || !req.user || !req.user.did) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        try {
            const guardians = new Guardians();
            const { entity, target } = req.body;

            if (!entity) {
                throw new HttpException('Invalid entity', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            if (typeof target !== 'string') {
                throw new HttpException('Invalid target', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const tags = await guardians.synchronizationTags(entity, target);

            const result = {
                entity,
                target,
                tags,
                refreshDate: (new Date()).toISOString(),
            }
            return res.json(result);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * use cache
     * @param req
     * @param res
     */
    @Get('/schemas')
    @HttpCode(HttpStatus.OK)
    async getSchemas(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const owner = user.did;
            let pageIndex: any;
            let pageSize: any;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            const { items, count } = await guardians.getTagSchemas(owner, pageIndex, pageSize);
            items.forEach((s) => { s.readonly = s.readonly || s.owner !== owner });
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
            const schema = await guardians.createTagSchema(newSchema);

            return res.status(201).json(SchemaUtils.toOld(schema));
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Delete('/schemas/:schemaId')
    @HttpCode(HttpStatus.OK)
    async deleteSchema(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const schemaId = req.params.schemaId;
            const schema = await guardians.getSchemaById(schemaId);
            const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.TAG);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN)
            }
            await guardians.deleteSchema(schemaId, user?.did);
            return res.json(true);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/schemas/:schemaId')
    @HttpCode(HttpStatus.OK)
    async setTag(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const newSchema = req.body;
            const owner = user.did;
            const guardians = new Guardians();
            const schema = await guardians.getSchemaById(newSchema.id);
            const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.TAG);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN)
            }
            SchemaUtils.fromOld(newSchema);
            SchemaHelper.checkSchemaKey(newSchema);
            SchemaHelper.updateOwner(newSchema, owner);
            await guardians.updateSchema(newSchema);
            return res.json(newSchema);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/schemas/:schemaId/publish')
    @HttpCode(HttpStatus.OK)
    async publishTag(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        let schema;
        try {
            schema = await guardians.getSchemaById(schemaId);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const version = '1.0.0';
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.TAG);
        if (error) {
            throw new HttpException(error, HttpStatus.FORBIDDEN)
        }
        try {
            const result = await guardians.publishTagSchema(schemaId, version, user.did);
            return res.json(result);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/schemas/published')
    @HttpCode(HttpStatus.OK)
    async getPublished(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        try {
            const guardians = new Guardians();
            const schemas = await guardians.getPublishedTagSchemas();
            return res.send(schemas);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
