import { BaseEntity } from '../models';
import { GenerateUUIDv4, PolicyType } from '@guardian/interfaces';
import { AfterDelete, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property, Unique } from '@mikro-orm/core';
import { DataBaseHelper } from '../helpers';
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
    status?: PolicyType;

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
     * Policy roles
     */
    @Property({ nullable: true })
    policyRoles?: string[];

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
     * Policy tag
     */
    @Property({
        nullable: true
    })
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
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || PolicyType.DRAFT;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';
        delete this.registeredUsers;
    }

    /**
     * Create config
     */
    @BeforeCreate()
    async createConfig() {
        await new Promise<void>((resolve, reject) => {
            try {
                if (this.config) {
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(
                        GenerateUUIDv4()
                    );
                    this.configFileId = fileStream.id;
                    fileStream.write(JSON.stringify(this.config));
                    fileStream.end(() => resolve());
                } else {
                    resolve();
                }
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Update config
     */
    @BeforeUpdate()
    async updateConfig() {
        if (this.config) {
            if (this.configFileId) {
                DataBaseHelper.gridFS
                    .delete(this.configFileId)
                    .catch(console.error);
            }
            await this.createConfig();
        }
    }

    /**
     * Load config
     */
    @OnLoad()
    async loadConfig() {
        if (this.configFileId && !this.config) {
            const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                this.configFileId
            );
            const bufferArray = [];
            for await (const data of fileStream) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.config = JSON.parse(buffer.toString());
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteConfig() {
        if (this.configFileId) {
            DataBaseHelper.gridFS
                .delete(this.configFileId)
                .catch(console.error);
        }
    }
}
