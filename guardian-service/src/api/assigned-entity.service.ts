import { ApiResponse } from './helpers/api-response.js';
import {
    DatabaseServer,
    Logger,
    MessageError,
    MessageResponse,
} from '@guardian/common';
import { AssignedEntityType, MessageAPI } from '@guardian/interfaces';

/**
 * Get target
 * @param entity
 * @param id
 */
export async function getTarget(
    entity: AssignedEntityType,
    id: string
): Promise<any | null> {
    switch (entity) {
        case AssignedEntityType.Policy: {
            return await DatabaseServer.getPolicyById(id);
        }
        case AssignedEntityType.Schema: {
            const schema = await DatabaseServer.getSchemaById(id);
            if (schema && schema.topicId) {
                return await DatabaseServer.getPolicy({ topicId: schema.topicId });
            } else {
                return null;
            }
        }
        default: {
            return null;
        }
    }
}

/**
 * Connect to the message broker methods of working with assigned entity.
 */
export async function AssignedEntityAPI(): Promise<void> {
    /**
     * Assign entity
     *
     * @param payload - option
     */
    ApiResponse(MessageAPI.ASSIGN_ENTITY, async (msg: {
        type: AssignedEntityType,
        entityIds: string[],
        assign: boolean,
        did: string,
        owner: string
    }) => {
        try {
            if (!msg) {
                throw new Error('Invalid assign parameters');
            }
            const { type, entityIds, assign, did, owner } = msg;
            for (const entityId of entityIds) {
                const target = await getTarget(type, entityId);
                if (!target && target.owner !== owner) {
                    throw new Error('Entity not found');
                }
                if (assign) {
                    const assigned = await DatabaseServer.getAssignedEntity(type, entityId, did);
                    if (!assigned) {
                        await DatabaseServer.assignEntity(type, entityId, true, did, owner);
                    }
                } else {
                    await DatabaseServer.removeAssignEntity(type, entityId, did);
                }
            }
            return new MessageResponse(assign);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Check entity
     *
     * @param payload - option
     */
    ApiResponse(MessageAPI.CHECK_ENTITY, async (msg: {
        type: AssignedEntityType,
        entityId: string,
        checkAssign: boolean,
        did: string
    }) => {
        try {
            if (!msg) {
                throw new Error('Invalid assign parameters');
            }
            const { type, entityId, checkAssign, did } = msg;

            const target = await getTarget(type, entityId);
            if (!target) {
                return new MessageResponse(false);
            }

            if (checkAssign) {
                const item = await DatabaseServer.getAssignedEntity(type, entityId, did);
                return new MessageResponse(item && item.assigned);
            }

            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Get assigned entities
     *
     * @param payload - option
     */
    ApiResponse(MessageAPI.ASSIGNED_ENTITIES, async (msg: {
        did: string,
        type?: AssignedEntityType
    }) => {
        try {
            if (!msg) {
                throw new Error('Invalid assign parameters');
            }
            const { type, did } = msg;
            const items = await DatabaseServer.getAssignedEntities(did, type);
            return new MessageResponse(items);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Assign entity
     *
     * @param payload - option
     */
    ApiResponse(MessageAPI.DELEGATE_ENTITY, async (msg: {
        type: AssignedEntityType,
        entityIds: string[],
        assign: boolean,
        did: string,
        owner: string
    }) => {
        try {
            if (!msg) {
                throw new Error('Invalid assign parameters');
            }
            const { type, entityIds, assign, did, owner } = msg;
            for (const entityId of entityIds) {
                const target = await getTarget(type, entityId);
                if (!target) {
                    throw new Error('Entity not found');
                }
                const own = await DatabaseServer.getAssignedEntity(AssignedEntityType.Policy, entityId, owner);
                if (!own) {
                    throw new Error('Entity not found');
                }
                if (assign) {
                    const assigned = await DatabaseServer.getAssignedEntity(type, entityId, did);
                    if (!assigned) {
                        await DatabaseServer.assignEntity(type, entityId, true, did, owner);
                    }
                } else {
                    await DatabaseServer.removeAssignEntity(type, entityId, did, owner);
                }
            }
            return new MessageResponse(assign);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.GET_ASSIGNED_POLICIES,
        async (msg: {
            owner: string,
            user: string,
            target: string,
            status: string,
            onlyOwn: boolean,
            pageIndex: string,
            pageSize: string
        }) => {
            try {
                const { owner, user, target, status, onlyOwn, pageIndex, pageSize } = msg;
                const otherOptions: any = {
                    fields: [
                        'id',
                        'uuid',
                        'name',
                        'version',
                        'description',
                        'status',
                        'owner',
                        'topicId',
                        'messageId',
                        'instanceTopicId',
                        'discontinuedDate'
                    ]
                };
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                } else {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = 100;
                }
                const filters: any = {
                    owner
                };
                if (status && status !== 'ALL') {
                    filters.status = status;
                }
                if (onlyOwn) {
                    const ownPolicies = await DatabaseServer.getAssignedEntities(user, AssignedEntityType.Policy);
                    if (ownPolicies.length) {
                        const ids = ownPolicies.map((p) => p.entityId);
                        filters.id = { $in: ids };
                    } else {
                        return new MessageResponse({ items: [], count: 0 });
                    }
                }
                const [policies, count] = await DatabaseServer.getPoliciesAndCount(filters, otherOptions);
                const assigned = await DatabaseServer.getAssignedEntities(target, AssignedEntityType.Policy);
                const assignedMap = new Map<string, string>();
                for (const e of assigned) {
                    assignedMap.set(e.entityId, e.owner);
                }
                for (const policy of policies) {
                    (policy as any).assigned = assignedMap.has(policy.id);
                    (policy as any).assignedBy = assignedMap.get(policy.id);
                }
                return new MessageResponse({ policies, count });
            } catch (error) {
                return new MessageError(error);
            }
        });
}
