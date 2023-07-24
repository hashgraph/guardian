import { BeforeCreate, Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Module collection
 */
@Entity()
export class AnalyticsDashboard extends BaseEntity {
    /**
     * Report UUID
     */
    @Index({ name: 'report_uuid' })
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Topic ID
     */
    @Property({ nullable: true })
    root?: string;

    /**
     * Date
     */
    @Property({ nullable: true })
    date?: Date;

    /**
     * Report
     */
    @Property({ nullable: true })
    report?: any;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
    }
}
