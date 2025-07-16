import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4, ModuleStatus } from '@guardian/interfaces';
import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';

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
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _configFileId?: ObjectId;

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    async setDefaults() {
        this.status = this.status || ModuleStatus.DRAFT;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';

        if (this.config) {
            this.configFileId = await this.createFile(this.config);
        }
    }

    /**
     * Create File
     */
    private createFile(json: string) {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileName = `Tool_${this._id?.toString()}_${GenerateUUIDv4()}`;
                const fileStream = DataBaseHelper.gridFS.openUploadStream(fileName);
                const fileId = fileStream.id;
                fileStream.write(json);
                fileStream.end(() => resolve(fileId));
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Load File
     */
    private async loadFile(fileId: ObjectId) {
        const fileStream = DataBaseHelper.gridFS.openDownloadStream(fileId);
        const bufferArray = [];
        for await (const data of fileStream) {
            bufferArray.push(data);
        }
        const buffer = Buffer.concat(bufferArray);
        return buffer.toString();
    }

    /**
     * Load config
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadConfig() {
        if (this.configFileId && !this.config) {
            this.config = await this.loadFile(this.configFileId);
        }
    }

    /**
     * Update config
     */
    @BeforeUpdate()
    async updateConfig() {
        if (this.config) {
            const configFileId = await this.createFile(this.config);
            if (configFileId) {
                this._configFileId = this.configFileId;
                this.configFileId = configFileId;
            }
            delete this.config;
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
                    console.error(`AfterUpdate: PolicyTool, ${this._id}, _configFileId`)
                    console.error(reason)
                });
            delete this._configFileId;
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
                .catch((reason) => {
                    console.error(`AfterDelete: PolicyTool, ${this._id}, configFileId`)
                    console.error(reason)
                });
        }
    }
}
