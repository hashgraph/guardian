import { AssignedEntityType } from '@guardian/interfaces';
import { BaseEntity } from '../models/index.js';
import {
    Entity,
    Property,
    Index,
    Unique,
} from '@mikro-orm/core';

/**
 * Block state
 */
@Entity()
@Index({ name: 'user_idx', properties: ['type', 'did'] })
@Index({ name: 'entity_idx', properties: ['type', 'did', 'entityId'] })
@Unique({ name: 'unique_idx', properties: ['type', 'did', 'entityId'] })
export class AssignEntity extends BaseEntity {
    /**
     * Type
     */
    @Index({ name: 'type' })
    @Property()
    type: AssignedEntityType;

    /**
     * User DID
     */
    @Index({ name: 'did' })
    @Property()
    did: string;

    /**
     * Entity Id
     */
    @Property()
    entityId: string;

    /**
     * Assigned
     */
    @Property()
    assigned: boolean;

    /**
     * Owner DID
     */
    @Property()
    owner: string;
}
