import {AfterDelete, BeforeCreate, Entity, Property} from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { EntityStatus, GenerateUUIDv4, IStatistic, IStatisticConfig } from '@guardian/interfaces';
import {ObjectId} from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';

/**
 * PolicyStatistic collection
 */
@Entity()
export class PolicyStatistic extends BaseEntity implements IStatistic {
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
     * Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    topicId?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Policy Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyTopicId?: string;

    /**
     * Policy Instance Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyInstanceTopicId?: string;

    /**
     * Config
     */
    @Property({ nullable: true, type: 'unknown' })
    config?: IStatisticConfig;

    /**
     * Method
     */
    @Property({ nullable: true })
    method?: string;

    /**
     * File id of the original Policy Statistic file (publish flow).
     */
    @Property({ nullable: true })
    contentFileId?: ObjectId;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
        this.status = this.status || EntityStatus.DRAFT;
    }

    /**
     * Delete original Policy Statistic file (publish flow)
     */
    @AfterDelete()
    deleteContentFile() {
        if (this.contentFileId) {
            DataBaseHelper.gridFS
                .delete(this.contentFileId)
                .catch((reason) => {
                    console.error('AfterDelete: PolicyStatistic, contentFileId');
                    console.error(reason);
                });
        }
    }
}
