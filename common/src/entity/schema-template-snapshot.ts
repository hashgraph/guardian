import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { ISchemaTemplateConfig, ISchemaTemplateSnapshot, ISchemaTemplateSnapshotSchemas, ModuleStatus } from '@guardian/interfaces';
import { DataBaseHelper } from '../helpers/index.js';
import { BaseEntity } from '../models/index.js';

/**
 * Policy-specific schema template snapshot.
 */
@Entity()
export class SchemaTemplateSnapshot extends BaseEntity implements ISchemaTemplateSnapshot {
    /**
     * Policy id.
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Policy uuid.
     */
    @Property({ nullable: true })
    policyUUID?: string;

    /**
     * Template id.
     */
    @Property({
        nullable: true,
        index: true
    })
    templateId?: string;

    /**
     * Template uuid.
     */
    @Property({ nullable: true })
    templateUUID?: string;

    /**
     * Template name.
     */
    @Property({ nullable: true })
    templateName?: string;

    /**
     * Template version.
     */
    @Property({ nullable: true })
    templateVersion?: string;

    /**
     * Template status at snapshot creation.
     */
    @Property({ nullable: true })
    templateStatus?: ModuleStatus;

    /**
     * Published template message id.
     */
    @Property({ nullable: true })
    templateMessageId?: string;

    /**
     * Published template hash.
     */
    @Property({ nullable: true })
    templateHash?: string;

    /**
     * Hash of normalized template state stored in this snapshot.
     */
    @Property({
        nullable: true,
        index: true
    })
    templateStateHash?: string;

    /**
     * Apply timestamp.
     */
    @Property({ nullable: true })
    appliedAt?: string;

    /**
     * Template schema id to policy schema id map.
     */
    @Property({ nullable: true, type: 'unknown' })
    schemaMap?: Record<string, string>;

    /**
     * Template config snapshot.
     */
    @Property({ persist: false, type: 'unknown' })
    config?: ISchemaTemplateConfig;

    /**
     * Template schemas snapshot.
     */
    @Property({ persist: false, type: 'unknown' })
    schemas?: ISchemaTemplateSnapshotSchemas;

    /**
     * Config file id.
     */
    @Property({ nullable: true })
    configFileId?: ObjectId;

    /**
     * Schemas file id.
     */
    @Property({ nullable: true })
    schemasFileId?: ObjectId;

    /**
     * Old config file id.
     */
    @Property({ persist: false, nullable: true })
    _configFileId?: ObjectId;

    /**
     * Old schemas file id.
     */
    @Property({ persist: false, nullable: true })
    _schemasFileId?: ObjectId;

    /**
     * Store heavy snapshot payloads in GridFS.
     */
    @BeforeCreate()
    async setFiles() {
        if (this.config) {
            const config = JSON.stringify(this.config);
            this.configFileId = await this._createFile(config, 'SchemaTemplateSnapshot');
            delete this.config;
        }
        if (this.schemas) {
            const schemas = JSON.stringify(this.schemas);
            this.schemasFileId = await this._createFile(schemas, 'SchemaTemplateSnapshot');
            delete this.schemas;
        }
    }

    /**
     * Load heavy snapshot payloads.
     */
    @OnLoad()
    @AfterCreate()
    @AfterUpdate()
    async loadFiles() {
        if (this.configFileId && !this.config) {
            const buffer = await this._loadFile(this.configFileId);
            this.config = JSON.parse(buffer.toString());
        }
        if (this.schemasFileId && !this.schemas) {
            const buffer = await this._loadFile(this.schemasFileId);
            this.schemas = JSON.parse(buffer.toString());
        }
    }

    /**
     * Update heavy snapshot payloads.
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.config) {
            const config = JSON.stringify(this.config);
            const configFileId = await this._createFile(config, 'SchemaTemplateSnapshot');
            if (configFileId) {
                this._configFileId = this.configFileId;
                this.configFileId = configFileId;
            }
            delete this.config;
        }
        if (this.schemas) {
            const schemas = JSON.stringify(this.schemas);
            const schemasFileId = await this._createFile(schemas, 'SchemaTemplateSnapshot');
            if (schemasFileId) {
                this._schemasFileId = this.schemasFileId;
                this.schemasFileId = schemasFileId;
            }
            delete this.schemas;
        }
    }

    /**
     * Delete replaced files.
     */
    @AfterUpdate()
    postUpdateFiles() {
        if (this._configFileId) {
            DataBaseHelper.gridFS
                .delete(this._configFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: SchemaTemplateSnapshot, ${this._id}, _configFileId`);
                    console.error(reason);
                });
            delete this._configFileId;
        }
        if (this._schemasFileId) {
            DataBaseHelper.gridFS
                .delete(this._schemasFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: SchemaTemplateSnapshot, ${this._id}, _schemasFileId`);
                    console.error(reason);
                });
            delete this._schemasFileId;
        }
    }

    /**
     * Delete snapshot files.
     */
    @AfterDelete()
    deleteFiles() {
        if (this.configFileId) {
            DataBaseHelper.gridFS
                .delete(this.configFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: SchemaTemplateSnapshot, ${this._id}, configFileId`);
                    console.error(reason);
                });
        }
        if (this.schemasFileId) {
            DataBaseHelper.gridFS
                .delete(this.schemasFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: SchemaTemplateSnapshot, ${this._id}, schemasFileId`);
                    console.error(reason);
                });
        }
    }
}
