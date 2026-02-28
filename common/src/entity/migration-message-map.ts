import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/base-entity.js';

/**
 * Migration message mapping collection.
 * Stores source->destination message identifiers for resume after restart.
 */
@Entity()
@Index<typeof MigrationMessageMap, 'srcPolicyId' | 'dstPolicyId' | 'startedBy' | 'entityType' | 'srcMessageId'>({
    name: 'migration_message_map_scope_entity_src_idx',
    properties: ['srcPolicyId', 'dstPolicyId', 'startedBy', 'entityType', 'srcMessageId'],
})
export class MigrationMessageMap extends BaseEntity {
    /**
     * Source policy identifier
     */
    @Property({ index: true })
    srcPolicyId!: string;

    /**
     * Destination policy identifier
     */
    @Property({ index: true })
    dstPolicyId!: string;

    /**
     * Entity type (vcDocument, vpDocument, etc.)
     */
    @Property({ index: true })
    entityType!: string;

    /**
     * User scope for migration mapping
     */
    @Property({ nullable: true, index: true })
    startedBy?: string;

    /**
     * Source message identifier
     */
    @Property({ index: true })
    srcMessageId!: string;

    /**
     * Destination message identifier
     */
    @Property({ index: true })
    dstMessageId!: string;

    /**
     * Optional source entity identifier
     */
    @Property({ nullable: true, index: true })
    srcEntityId?: string;
}
