import { Response, Router, NextFunction } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { permissionHelper } from '@auth/authorization-helper';
import { SchemaCategory, SchemaHelper, UserRole } from '@guardian/interfaces';
import { SchemaUtils } from '@helpers/schema-utils';
import createError from 'http-errors';

/**
 * Tags route
 */
export const tagsAPI = Router();

tagsAPI.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardian = new Guardians();
        const item = await guardian.createTag(req.body, req.user.did);
        res.status(201).json(item);
    } catch (error) {
        await (new Logger()).error(error, ['API_GATEWAY']);
        return next(error);
    }
});

tagsAPI.post('/search', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const { entity, target, targets } = req.body;
        let _targets: string[];
        if (!entity) {
            return next(createError(422, 'Invalid entity'));
        }
        if (target) {
            if (typeof target !== 'string') {
                return next(createError(422, 'Invalid target'));
            } else {
                _targets = [target];
            }
        } else if (targets) {
            if (!Array.isArray(targets)) {
                return next(createError(422, 'Invalid target'));
            } else {
                _targets = targets;
            }
        } else {
            return next(createError(422, 'Invalid target'));
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
        return next(error);
    }
});

tagsAPI.delete('/:uuid', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardian = new Guardians();
        if (!req.params.uuid) {
            return next(createError(422, 'Invalid uuid'));
        }
        const result = await guardian.deleteTag(req.params.uuid, req.user.did);
        res.json(result);
    } catch (error) {
        await (new Logger()).error(error, ['API_GATEWAY']);
        return next(error);
    }
});

tagsAPI.post('/synchronization', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const { entity, target } = req.body;

        if (!entity) {
            return next(createError(422, 'Invalid entity'));
        }

        if (typeof target !== 'string') {
            return next(createError(422, 'Invalid target'));
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
        return next(error);
    }
});

tagsAPI.get('/schemas', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        return next(error);
    }
});

tagsAPI.post('/schemas', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const newSchema = req.body;

        if (!newSchema) {
            return next(createError(422, 'Schema does not exist.'));
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

        res.status(201).json(SchemaUtils.toOld(schema));
    } catch (error) {
        await (new Logger()).error(error, ['API_GATEWAY']);
        return next(error);
    }
});

tagsAPI.delete('/schemas/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.TAG);
        if (error) {
            return next(createError(403, error));
        }
        await guardians.deleteSchema(schemaId);
        return res.json(true);
    } catch (error) {
        await (new Logger()).error(error, ['API_GATEWAY']);
        return next(error);
    }
});

tagsAPI.put('/schemas/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const owner = user.did;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(newSchema.id);
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.TAG);
        if (error) {
            return next(createError(403, error));
        }
        SchemaUtils.fromOld(newSchema);
        SchemaHelper.checkSchemaKey(newSchema);
        SchemaHelper.updateOwner(newSchema, owner);
        await guardians.updateSchema(newSchema);
        return res.json(newSchema);
    } catch (error) {
        await (new Logger()).error(error, ['API_GATEWAY']);
        return next(error);
    }
});

tagsAPI.put('/schemas/:schemaId/publish', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        const version = '1.0.0';
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.TAG);
        if (error) {
            return next(createError(403, error));
        }
        const result = await guardians.publishTagSchema(schemaId, version, user.did);
        return res.json(result);
    } catch (error) {
        await (new Logger()).error(error, ['API_GATEWAY']);
        return next(error);
    }
});

tagsAPI.get('/schemas/published', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const schemas = await guardians.getPublishedTagSchemas();
        return res.send(schemas);
    } catch (error) {
        await (new Logger()).error(error, ['API_GATEWAY']);
        return next(error);
    }
});
