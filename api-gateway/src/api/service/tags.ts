import { Response, Router } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { permissionHelper } from '@auth/authorization-helper';
import { SchemaHelper, UserRole } from '@guardian/interfaces';
import { SchemaUtils } from '@helpers/schema-utils';

/**
 * Tags route
 */
export const tagsAPI = Router();

tagsAPI.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardian = new Guardians();
        const item = await guardian.createTag(req.body, req.user.did);
        res.status(201).json(item);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});

tagsAPI.post('/search', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const { entity, target, targets } = req.body;
        let _targets: string[];
        if (!entity) {
            throw new Error('Invalid entity');
        }
        if (target) {
            if (typeof target !== 'string') {
                throw new Error('Invalid target');
            } else {
                _targets = [target];
            }
        } else if (targets) {
            if (!Array.isArray(targets)) {
                throw new Error('Invalid target');
            } else {
                _targets = targets;
            }
        } else {
            throw new Error('Invalid target');
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
        res.status(200).json(tagMap);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});

tagsAPI.delete('/:uuid', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardian = new Guardians();
        if (!req.params.uuid) {
            throw new Error('Invalid uuid');
        }
        const result = await guardian.deleteTag(req.params.uuid, req.user.did);
        res.status(201).json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});

tagsAPI.post('/synchronization', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const { entity, target } = req.body;

        if (!entity) {
            throw new Error('Invalid entity');
        }

        if (typeof target !== 'string') {
            throw new Error('Invalid target');
        }

        const tags = await guardians.synchronizationTags(entity, target);

        const result = {
            entity,
            target,
            tags,
            refreshDate: (new Date()).toISOString(),
        }
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});




tagsAPI.get('/schemas', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const owner = user.username;
        let pageIndex: any;
        let pageSize: any;
        if (req.query && req.query.pageIndex && req.query.pageSize) {
            pageIndex = req.query.pageIndex;
            pageSize = req.query.pageSize;
        }
        const { items, count } = await guardians.getTagSchemas(owner, pageIndex, pageSize);
        items.forEach((s) => { s.readonly = s.readonly || s.owner !== owner });
        res.status(200)
            .setHeader('X-Total-Count', count)
            .json(SchemaUtils.toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500)
            .json({ code: error.code, message: error.message });
    }
});

tagsAPI.post('/schemas', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;

        if (!newSchema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }

        const guardians = new Guardians();
        const owner = user.username;

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
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tagsAPI.delete('/schemas/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        // if (schema.system) {
        //     if (schema.owner !== user.username) {
        //         res.status(500).json({ code: 500, message: 'Invalid creator.' });
        //         return;
        //     }
        //     if (schema.active) {
        //         res.status(500).json({ code: 500, message: 'Schema is active.' });
        //         return;
        //     }
        // } else {
        //     if (schema.owner !== user.did) {
        //         res.status(500).json({ code: 500, message: 'Invalid creator.' });
        //         return;
        //     } else {
        //         res.status(500).json({ code: 500, message: 'Schema is not system.' });
        //         return;
        //     }
        // }
        await guardians.deleteSchema(schemaId);
        res.status(200).json(null);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tagsAPI.put('/schemas/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const owner = user.username;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        // if (schema.system) {
        //     if (schema.owner !== user.username) {
        //         res.status(500).json({ code: 500, message: 'Invalid creator.' });
        //         return;
        //     }
        //     if (schema.active) {
        //         res.status(500).json({ code: 500, message: 'Schema is active.' });
        //         return;
        //     }
        // } else {
        //     if (schema.owner !== user.did) {
        //         res.status(500).json({ code: 500, message: 'Invalid creator.' });
        //         return;
        //     } else {
        //         res.status(500).json({ code: 500, message: 'Schema is not system.' });
        //         return;
        //     }
        // }
        SchemaUtils.fromOld(newSchema);
        SchemaHelper.checkSchemaKey(newSchema);
        SchemaHelper.updateOwner(newSchema, owner);
        await guardians.updateSchema(newSchema);
        res.status(200).json(newSchema);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tagsAPI.put('/schemas/:schemaId/publish', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        const version = '1.0.0';
        // if (schema.system) {
        //     if (schema.creator !== user.username) {
        //         res.status(500).json({ code: 500, message: 'Invalid creator.' });
        //         return;
        //     } else {
        //         res.status(500).json({ code: 500, message: 'Schema is system.' });
        //         return;
        //     }
        // } else {
        //     if (schema.creator !== user.did) {
        //         res.status(500).json({ code: 500, message: 'Invalid creator.' });
        //         return;
        //     }
        // }
        const result = await guardians.publishTagSchema(schemaId, version, user.did);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tagsAPI.get('/schemas/published', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const schemas = await guardians.getPublishedTagSchemas();
        res.status(200).send(schemas);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});