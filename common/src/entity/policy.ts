import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4, LocationType, PolicyAvailability, PolicyCategoryExport, PolicyStatus } from '@guardian/interfaces';
import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property, Unique } from '@mikro-orm/core';
import { DataBaseHelper } from '../helpers/index.js';
import { ObjectId } from '@mikro-orm/mongodb';

/**
 * Policy collection
 */
@Entity()
@Unique({ properties: ['policyTag'], options: { partialFilterExpression: { policyTag: { $type: 'string' } } } })
export class Policy extends BaseEntity {

    /**
     * Policy UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Policy version
     */
    @Property({ nullable: true })
    version?: string;

    /**
     * Policy previous version
     */
    @Property({ nullable: true })
    previousVersion?: string;

    /**
     * Policy description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Policy topic description
     */
    @Property({ nullable: true })
    topicDescription?: string;

    /**
     * Policy config
     */
    @Property({ persist: false, type: 'unknown' })
    config?: any;

    /**
     * Config file id
     */
    @Property({ nullable: true })
    configFileId?: ObjectId;

    /**
     * Policy status
     */
    @Property({ nullable: true })
    status?: PolicyStatus;

    /**
     * Policy creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Policy owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Policy owner Id
     */
    @Property({ nullable: true })
    ownerId?: string;

    /**
     * Policy roles
     */
    @Property({ nullable: true })
    policyRoles?: string[];

    /**
     * Policy navigation
     */
    @Property({ nullable: true, type: 'unknown' })
    policyNavigation?: any[];

    /**
     * Policy groups
     */
    @Property({ nullable: true, type: 'unknown' })
    policyGroups?: any[];

    /**
     * Policy topics
     */
    @Property({ nullable: true, type: 'unknown' })
    policyTopics?: any[];

    /**
     * Policy tokens
     */
    @Property({ nullable: true, type: 'unknown' })
    policyTokens?: any;

    /**
     * Policy topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Policy instance topic id
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * Synchronization topic id
     */
    @Property({ nullable: true })
    synchronizationTopicId?: string;

    /**
     * TopicId
     */
    @Property({ nullable: true })
    commentsTopicId?: string;

    /**
     * Policy tag
     */
    @Property({ nullable: true })
    policyTag?: string;

    /**
     * Policy message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Policy code version
     */
    @Property({ nullable: true })
    codeVersion?: string;

    /**
     * User roles
     * @deprecated
     */
    @Property({ nullable: true, type: 'unknown' })
    registeredUsers?: any

    /**
     * Policy hash
     */
    @Property({ nullable: true })
    hash?: string;

    /**
     * HashMap
     */
    @Property({ persist: false, type: 'unknown' })
    hashMap?: any;

    /**
     * HashMap file id
     */
    @Property({ nullable: true })
    hashMapFileId?: ObjectId;

    /**
     * Important Parameters
     */
    @Property({ nullable: true, type: 'unknown' })
    importantParameters?: {
        atValidation?: string,
        monitored?: string
    }

    /**
     * Typical Projects
     */
    @Property({ nullable: true })
    typicalProjects?: string;

    /**
     * Applicability Conditions
     */
    @Property({ nullable: true })
    applicabilityConditions?: string;

    /**
     * Policy category ids
     */
    @Property({ nullable: true })
    categories?: string[];

    /**
     * Policy category data for export file
     */
    @Property({ nullable: true })
    categoriesExport?: PolicyCategoryExport[];

    /**
     * Policy details url
     */
    @Property({ nullable: true })
    detailsUrl?: string;

    /**
     * Id of project's schema
     */
    @Property({ nullable: true })
    projectSchema?: string;

    /**
     * Tools
     */
    @Property({ nullable: true, type: 'unknown' })
    tools?: any;

    /**
     * Discontinued date
     */
    @Property({ nullable: true })
    discontinuedDate?: Date;

    /**
     * TopicId
     */
    @Property({ nullable: true })
    restoreTopicId?: string;

    /**
     * Policy Availability
     */
    @Property({ nullable: true })
    availability?: PolicyAvailability;

    /**
     * Location Type
     */
    @Property({ nullable: true })
    locationType?: LocationType;

    /**
     * TopicId
     */
    @Property({ nullable: true })
    actionsTopicId?: string;


    /**
     * RecordsTopicId
     */
    @Property({ nullable: true })
    recordsTopicId?: string;

    /**
     * Source message id
     */
    @Property({ nullable: true })
    fromMessageId?: string;

    /**
     * Automatically record policy steps
     */
    @Property({ nullable: true })
    autoRecordSteps?: boolean;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _configFileId?: ObjectId;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _hashMapFileId?: ObjectId;

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    async setDefaults() {
        this.locationType = this.locationType || LocationType.LOCAL;
        this.status = this.status || PolicyStatus.DRAFT;
        this.availability = this.availability || PolicyAvailability.PRIVATE;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';
        delete this.registeredUsers;

        if (this.config) {
            const config = JSON.stringify(this.config);
            this.configFileId = await this._createFile(config, 'Policy');
        }
        if (this.hashMap) {
            const hashMap = JSON.stringify(this.hashMap);
            this.hashMapFileId = await this._createFile(hashMap, 'Policy');
        }
    }

    /**
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.configFileId && !this.config) {
            const buffer = await this._loadFile(this.configFileId);
            this.config = JSON.parse(buffer.toString());
        }
        if (this.hashMapFileId && !this.hashMap) {
            const buffer = await this._loadFile(this.hashMapFileId);
            this.hashMap = JSON.parse(buffer.toString());
        }
    }

    /**
     * Update File
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.config) {
            const config = JSON.stringify(this.config);
            const configFileId = await this._createFile(config, 'Policy');
            if (configFileId) {
                this._configFileId = this.configFileId;
                this.configFileId = configFileId;
            }
            delete this.config;
        }
        if (this.hashMap) {
            const hashMap = JSON.stringify(this.hashMap);
            const hashMapFileId = await this._createFile(hashMap, 'Policy');
            if (hashMapFileId) {
                this._hashMapFileId = this.hashMapFileId;
                this.hashMapFileId = hashMapFileId;
            }
            delete this.hashMap;
        }
    }

    /**
     * Delete File
     */
    @AfterUpdate()
    postUpdateFiles() {
        if (this._configFileId) {
            DataBaseHelper.gridFS
                .delete(this._configFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: Policy, ${this._id}, _configFileId`)
                    console.error(reason)
                });
            delete this._configFileId;
        }
        if (this._hashMapFileId) {
            DataBaseHelper.gridFS
                .delete(this._hashMapFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: Policy, ${this._id}, _hashMapFileId`)
                    console.error(reason)
                });
            delete this._hashMapFileId;
        }
    }

    /**
     * Delete File
     */
    @AfterDelete()
    deleteFiles() {
        if (this.configFileId) {
            DataBaseHelper.gridFS
                .delete(this.configFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: Policy, ${this._id}, configFileId`)
                    console.error(reason)
                });
        }
        if (this.hashMapFileId) {
            DataBaseHelper.gridFS
                .delete(this.hashMapFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: Policy, ${this._id}, hasMapFileId`)
                    console.error(reason)
                });
        }
    }
}
