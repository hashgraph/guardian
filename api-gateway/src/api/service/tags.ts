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
        if (!entity) {
            throw new Error('Invalid entity');
        }
        if (target) {
            if (typeof target !== 'string') {
                throw new Error('Invalid target');
            }
        } else if (targets) {
            if (!Array.isArray(targets)) {
                throw new Error('Invalid target');
            }
        } else {
            throw new Error('Invalid target');
        }
        const items = await guardians.getTags({
            owner: req.user.did,
            entity,
            target,
            targets
        });

        const refreshDate = (new Date()).toISOString();
        const map = {};
        for (const tag of items) {
            if (map[tag.target]) {
                map[tag.target].tags.push(tag);
            } else {
                map[tag.target] = {
                    entity,
                    refreshDate,
                    target: tag.target,
                    tags: [tag]
                }
            }
        }

        map['63e0f9d2b1e383314701b1bc'] = {
            entity: 'Schema',
            target: '63e0f9d2b1e383314701b1bc',
            refreshDate: '2023-03-09T12:13:45.682Z',
            tags: [{
                uuid: '1',
                target: '63e0f9d2b1e383314701b1bc',
                name: 'Test',
                owner: 'did:hedera:testnet:8AvszwobPqq5kHmWWq52cFg3i8wZo9oy8xSY1mBZsfD7_0.0.2128',
                operation: 'CREATE'
            }, {
                uuid: '2',
                target: '63e0f9d2b1e383314701b1bc',
                name: 'Test',
                owner: 'did:hedera:testnet:9MgtzwobPqq5kHmWWq52cFg3i8wZo9oy8xSY1mBZsfD7_0.0.2128',
                operation: 'CREATE'
            }, {
                uuid: '3',
                target: '63e0f9d2b1e383314701b1bc',
                name: 'Test 1',
                owner: 'did:hedera:testnet:8AvszwobPqq5kHmWWq52cFg3i8wZo9oy8xSY1mBZsfD7_0.0.2121',
                operation: 'CREATE'
            }, {
                uuid: '3',
                target: '63e0f9d2b1e383314701b1bc',
                name: 'Test 1',
                owner: 'did:hedera:testnet:8AvszwobPqq5kHmWWq52cFg3i8wZo9oy8xSY1mBZsfD7_0.0.2121',
                operation: 'DELETE'
            }, {
                uuid: '4',
                target: '63e0f9d2b1e383314701b1bc',
                name: 'Test 2',
                owner: 'did:hedera:testnet:8AvszwobPqq5kHmWWq52cFg3i8wZo9oy8xSY1mBZsfD7_0.0.2128',
                operation: 'CREATE'
            }]
        }

        res.status(200).json(map);
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