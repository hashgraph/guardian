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
     * File id of the original module zip (publish flow).
     */
    @Property({ nullable: true })
    contentFileId?: ObjectId;

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
            this.configFileId = await this._createFile(config, 'PolicyModule');
            delete this.config;
        }
    }

    /**
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.configFileId) {
            const buffer = await this._loadFile(this.configFileId);
            this.config = JSON.parse(buffer.toString());
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.config) {
            const config = JSON.stringify(this.config);
            const configFileId = await this._createFile(config, 'PolicyModule');
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
    deleteFiles() {
        if (this.configFileId) {
            DataBaseHelper.gridFS
                .delete(this.configFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: PolicyModule, ${this._id}, configFileId`)
                    console.error(reason)
                });
        }
    }

    /**
     * Delete original module zip (publish flow)
     */
    @AfterDelete()
    deleteContentFile() {
        if (this.contentFileId) {
            DataBaseHelper.gridFS
                .delete(this.contentFileId)
                .catch((reason) => {
                    console.error('AfterDelete: PolicyModule, contentFileId');
                    console.error(reason);
                });
        }
    }
}
