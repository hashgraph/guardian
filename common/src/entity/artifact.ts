import { BeforeCreate, Entity, Enum, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Artifact collection
 */
@Entity()
export class Artifact extends BaseEntity {
    /**
     * Artifact UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy identifier
     */
    @Property({ nullable: true })
    policyId?: string;

    /**
     * Artifact name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Artifact type
     */
    @Enum({ nullable: true })
    type?: string;

    /**
     * Artifact owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Artifact extention
     */
    @Property({ nullable: true })
    extention?: string;

    /**
     * Artifact Category.
     */
    @Property({ nullable: true })
    category?: 'tool' | 'policy';

    /**
     * Default document values
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
    }
}
