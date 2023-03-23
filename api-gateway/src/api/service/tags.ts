import { Response, Router } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';

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