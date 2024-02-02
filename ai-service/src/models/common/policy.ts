import { PolicyType } from '@guardian/interfaces';
import { Entity, Property, Unique } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

/**
 * Policy collection
 */
@Entity()
@Unique({properties: ['policyTag'], options: {partialFilterExpression: {policyTag: {$type: 'string'}}}})
export class Policy {

    /**
     * Policy UUID
     */
    @Property({nullable: true})
    _id: string;
    /**
     * Policy UUID
     */
    @Property({nullable: true})
    uuid?: string;

    /**
     * Policy name
     */
    @Property({nullable: true})
    name?: string;

    /**
     * Policy version
     */
    @Property({nullable: true})
    version?: string;

    /**
     * Policy previous version
     */
    @Property({nullable: true})
    previousVersion?: string;

    /**
     * Policy description
     */
    @Property({nullable: true})
    description?: string;

    /**
     * Policy topic description
     */
    @Property({nullable: true})
    topicDescription?: string;

    /**
     * Policy config
     */
    @Property({persist: false, type: 'unknown'})
    config?: any;

    /**
     * Config file id
     */
    @Property({nullable: true})
    configFileId?: ObjectId;

    /**
     * Policy status
     */
    @Property({nullable: true})
    status?: PolicyType;

    /**
     * Policy creator
     */
    @Property({nullable: true})
    creator?: string;

    /**
     * Policy owner
     */
    @Property({nullable: true})
    owner?: string;

    /**
     * Policy roles
     */
    @Property({nullable: true})
    policyRoles?: string[];

    /**
     * Policy navigation
     */
    @Property({nullable: true, type: 'unknown'})
    policyNavigation?: any[];

    /**
     * Policy groups
     */
    @Property({nullable: true, type: 'unknown'})
    policyGroups?: any[];

    /**
     * Policy topics
     */
    @Property({nullable: true, type: 'unknown'})
    policyTopics?: any[];

    /**
     * Policy tokens
     */
    @Property({nullable: true, type: 'unknown'})
    policyTokens?: any;

    /**
     * Policy topic id
     */
    @Property({nullable: true})
    topicId?: string;

    /**
     * Policy instance topic id
     */
    @Property({nullable: true})
    instanceTopicId?: string;

    /**
     * Synchronization topic id
     */
    @Property({nullable: true})
    synchronizationTopicId?: string;

    /**
     * Policy tag
     */
    @Property({
        nullable: true
    })
    policyTag?: string;

    /**
     * Policy message id
     */
    @Property({nullable: true})
    messageId?: string;

    /**
     * Policy code version
     */
    @Property({nullable: true})
    codeVersion?: string;

    /**
     * User roles
     * @deprecated
     */
    @Property({nullable: true, type: 'unknown'})
    registeredUsers?: any

    /**
     * Policy hash
     */
    @Property({nullable: true})
    hash?: string;

    /**
     * HashMap
     */
    @Property({persist: false, type: 'unknown'})
    hashMap?: any;

    /**
     * HashMap file id
     */
    @Property({nullable: true})
    hashMapFileId?: ObjectId;

    /**
     * Important Parameters
     */
    @Property({nullable: true})
    importantParameters?: {
        atValidation?: string,
        monitored?: string
    }

    /**
     * Typical Projects
     */
    @Property({nullable: true})
    typicalProjects?: string;

    /**
     * Applicability Conditions
     */
    @Property({nullable: true})
    applicabilityConditions?: string;

    /**
     * Policy category ids
     */
    @Property({nullable: true})
    categories?: string[];

    /**
     * Policy details url
     */
    @Property({nullable: true})
    detailsUrl?: string;
}
