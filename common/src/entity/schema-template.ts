import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { GenerateUUIDv4, ISchemaTemplate, ISchemaTemplateConfig, ModuleStatus } from '@guardian/interfaces';
import { DataBaseHelper } from '../helpers/index.js';
import { BaseEntity } from '../models/index.js';

/**
 * Schema template collection.
 */
@Entity()
export class SchemaTemplate extends BaseEntity implements ISchemaTemplate {
    /**
     * Template UUID.
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Template name.
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Template description.
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Owner DID.
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Creator DID.
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Template status.
     */
    @Property({ nullable: true })
    status?: ModuleStatus;

    /**
     * Template version.
     */
    @Property({ nullable: true })
    version?: string;

    /**
     * Previous template version.
     */
    @Property({ nullable: true })
    previousVersion?: string;

    /**
     * Topic containing template schemas.
     */
    @Property({
        nullable: true,
        index: true
    })
    topicId?: string;

    /**
     * Published template message id.
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Template constraints and editor configuration.
     */
    @Property({ persist: false, type: 'unknown' })
    config?: ISchemaTemplateConfig;

    /**
     * Config file id.
     */
    @Property({ nullable: true })
    configFileId?: ObjectId;

    /**
     * Old config file id.
     */
    @Property({ persist: false, nullable: true })
    _configFileId?: ObjectId;

    /**
     * File id of the published template package.
     */
    @Property({ nullable: true })
    contentFileId?: ObjectId;

    /**
     * Set defaults.
     */
    @BeforeCreate()
    async setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
        this.status = this.status || ModuleStatus.DRAFT;
        this.config = this.config || {};

        if (this.config) {
            const config = JSON.stringify(this.config);
            this.configFileId = await this._createFile(config, 'SchemaTemplate');
            delete this.config;
        }
    }

    /**
     * Load the config file.
     */
    @OnLoad()
    @AfterCreate()
    @AfterUpdate()
    async loadFiles() {
        if (this.configFileId && !this.config) {
            const buffer = await this._loadFile(this.configFileId);
            this.config = JSON.parse(buffer.toString());
        }
    }

    /**
     * Update the config file.
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.config) {
            const config = JSON.stringify(this.config);
            const configFileId = await this._createFile(config, 'SchemaTemplate');
            if (configFileId) {
                this._configFileId = this.configFileId;
                this.configFileId = configFileId;
            }
            delete this.config;
        }
    }

    /**
     * Delete the old config file.
     */
    @AfterUpdate()
    postUpdateFiles() {
        if (this._configFileId) {
            DataBaseHelper.gridFS
                .delete(this._configFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: SchemaTemplate, ${this._id}, _configFileId`);
                    console.error(reason);
                });
            delete this._configFileId;
        }
    }

    /**
     * Delete template files.
     */
    @AfterDelete()
    deleteFiles() {
        if (this.configFileId) {
            DataBaseHelper.gridFS
                .delete(this.configFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: SchemaTemplate, ${this._id}, configFileId`);
                    console.error(reason);
                });
        }
        if (this.contentFileId) {
            DataBaseHelper.gridFS
                .delete(this.contentFileId)
                .catch((reason) => {
                    console.error('AfterDelete: SchemaTemplate, contentFileId');
                    console.error(reason);
                });
        }
    }
}
