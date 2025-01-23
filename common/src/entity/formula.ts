import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { EntityStatus, GenerateUUIDv4, IFormula, IFormulaConfig } from '@guardian/interfaces';

/**
 * Formula collection
 */
@Entity()
export class Formula extends BaseEntity implements IFormula {
    /**
     * ID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Label
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Status
     */
    @Property({ nullable: true })
    status?: EntityStatus;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyTopicId?: string;

    /**
     * Config
     */
    @Property({ nullable: true, type: 'unknown' })
    config?: IFormulaConfig;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
        this.status = this.status || EntityStatus.DRAFT;
    }
}