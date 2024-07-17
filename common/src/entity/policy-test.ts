import { AfterDelete, Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';

/**
 * PolicyRoles collection
 */
@Entity()
@Index({
    properties: ['id', 'policyId'],
    name: 'id_index',
})
@Index({
    properties: ['resultId'],
    name: 'result_id_index',
})
@Index({
    properties: ['policyId'],
    name: 'policy_id_index',
})
export class PolicyTest extends BaseEntity {
    /**
     * Test UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy Id
     */
    @Property({ nullable: true })
    policyId?: string;

    /**
     * Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Status
     */
    @Property({ nullable: true })
    status?: string;

    /**
     * Start date
     */
    @Property({ nullable: true })
    date?: string;

    /**
     * Test result
     */
    @Property({ nullable: true })
    result?: any;

    /**
     * Test result id
     */
    @Property({ nullable: true })
    resultId?: string;

    /**
     * Progress
     */
    @Property({ nullable: true })
    progress?: any;

    /**
     * Error
     */
    @Property({ nullable: true })
    error?: any;

    /**
     * Duration
     */
    @Property({ nullable: true })
    duration?: any;
    
    /**
     * File
     */
    @Property({ nullable: true })
    file?: ObjectId;

    /**
     * Delete File
     */
    @AfterDelete()
    deleteConfig() {
        if (this.file) {
            DataBaseHelper.gridFS
                .delete(this.file)
                .catch(console.error);
        }
    }
}
