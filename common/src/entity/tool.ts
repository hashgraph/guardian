import { BaseEntity } from '../models';
import { GenerateUUIDv4, ModuleStatus } from '@guardian/interfaces';
import { AfterDelete, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers';

/**
 * PolicyTool collection
 */
@Entity()
export class PolicyTool extends BaseEntity {
    /**
     * Policy hash
     */
    @Property({ nullable: true })
    hash?: string;

    /**
     * Tool UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Tool name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Tool description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Tool config
     */
    @Property({ persist: false, type: 'unknown' })
    config?: any;

    /**
     * Config file id
     */
    @Property({ nullable: true })
    configFileId?: ObjectId;

    /**
     * Tool status
     */
    @Property({ nullable: true })
    status?: ModuleStatus;

    /**
     * Tool creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Tool owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Tool topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Tool message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Tool code version
     */
    @Property({ nullable: true })
    codeVersion?: string;

    /**
     * Tool topic id
     */
    @Property({ nullable: true })
    tagsTopicId?: string;

    /**
     * Tools
     */
    @Property({ nullable: true, type: 'unknown' })
    tools?: any;

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || ModuleStatus.DRAFT;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';
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
