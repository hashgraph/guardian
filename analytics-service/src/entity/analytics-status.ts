import { BeforeCreate, Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';
import { ReportStatus } from '../interfaces/report-status.type.js';
import { ReportSteep } from '../interfaces/report-steep.type.js';
import { ReportType } from '../interfaces/report.type.js';

/**
 * Report collection
 */
@Entity()
@Unique({ properties: ['uuid'] })
export class AnalyticsStatus extends BaseEntity {
    /**
     * Report UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Topic ID
     */
    @Property({ nullable: true })
    root?: string;

    /**
     * Status
     */
    @Property({ nullable: true })
    status?: ReportStatus;

    /**
     * Steep
     */
    @Property({ nullable: true })
    steep?: ReportSteep;

    /**
     * Steep
     */
    @Property({ nullable: true })
    type?: ReportType;

    /**
     * Progress
     */
    @Property({ nullable: true })
    progress?: number;

    /**
     * Progress
     */
    @Property({ nullable: true })
    maxProgress?: number;

    /**
     * Error
     */
    @Property({ nullable: true })
    error?: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.type = this.type || ReportType.ALL;
    }
}
