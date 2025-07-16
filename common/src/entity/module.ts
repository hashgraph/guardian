import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4, ModuleStatus } from '@guardian/interfaces';
import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';

/**
 * PolicyModule collection
 */
@Entity()
export class PolicyModule extends BaseEntity {

    /**
     * Module UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Module name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Module description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Module config
     */
    @Property({ persist: false, type: 'unknown' })
    config?: any;

    /**
     * Config file id
     */
    @Property({ nullable: true })
    configFileId?: ObjectId;

    /**
     * Module status
     */
    @Property({ nullable: true })
    status?: ModuleStatus;

    /**
     * Module creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Module owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Module topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Module message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Module code version
     */
    @Property({ nullable: true })
    codeVersion?: string;

    /**
     * Type
     */
    @Property({ nullable: true })
    type?: string;

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
     * Set defaults
     */
    @BeforeCreate()
    async setDefaults() {
        this.status = this.status || ModuleStatus.DRAFT;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';
        this.type = this.type || 'CUSTOM';
        if (this.config) {
            const config = JSON.stringify(this.config);
            this.configFileId = await this.createFile(config);
            delete this.config;
        }
    }

    /**
     * Create File
     */
    private createFile(json: string) {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileName = `PolicyModule_${this._id?.toString()}_${GenerateUUIDv4()}`;
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
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.configFileId) {
            const buffer = await this.loadFile(this.configFileId);
            this.config = JSON.parse(buffer);
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.config) {
            const config = JSON.stringify(this.config);
            const configFileId = await this.createFile(config);
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
                    console.error(`AfterUpdate: PolicyModule, ${this._id}, _configFileId`)
                    console.error(reason)
                });
            delete this._configFileId;
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteDocument() {
        if (this.configFileId) {
            DataBaseHelper.gridFS
                .delete(this.configFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: PolicyModule, ${this._id}, configFileId`)
                    console.error(reason)
                });
        }
    }
}
