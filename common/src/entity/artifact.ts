import { BeforeCreate, Entity, Enum, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Artifact collection
 */
@Entity()
export class Artifact extends BaseEntity {
    /**
     * Group UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy Id name
     */
    @Property({ nullable: true })
    policyId?: string;

    /**
     * User name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Member (User DID)
     */
    @Enum({ nullable: true })
    type?: string;

    /**
     * Group owner (User DID)
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Extention
     */
    @Property({ nullable: true })
    extention?: string;

    /**
     * Default document values
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
    }
}
