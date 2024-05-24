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
        entityId: string,
        assign: boolean,
        did: string,
        owner: string
    }) => {
        try {
            if (!msg) {
                throw new Error('Invalid assign parameters');
            }
            const { type, entityId, assign, did, owner } = msg;
            const target = await getTarget(type, entityId);
            if (!target && target.owner !== owner) {
                throw new Error('Entity not found');
            }
            if (assign) {
                await DatabaseServer.assignEntity(type, entityId, true, did);
                return new MessageResponse(true);
            } else {
                await DatabaseServer.removeAssignEntity(type, entityId, did);
                return new MessageResponse(false);
            }

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
}
