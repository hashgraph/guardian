import { AfterDelete, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';

/**
 * PolicyRoles collection
 */
@Entity()
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
