import { BaseEntity } from '../models';
import { GenerateUUIDv4, ModuleStatus } from '@guardian/interfaces';
import { BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers';

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
    @Property({ persist: false })
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
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || ModuleStatus.DRAFT;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';
        this.type = this.type || 'CUSTOM';
    }

    /**
     * Create config
     */
    @BeforeCreate()
    createConfig() {
        if (this.config) {
            const fileStream = DataBaseHelper.gridFS.openUploadStream(
                GenerateUUIDv4()
            );
            this.configFileId = fileStream.id;
            fileStream.write(JSON.stringify(this.config));
            fileStream.end();
        }
    }

    /**
     * Update config
     */
    @BeforeUpdate()
    updateConfig() {
        if (this.config) {
            if (this.configFileId) {
                DataBaseHelper.gridFS
                    .delete(this.configFileId)
                    .catch(console.error);
            }
            const fileStream = DataBaseHelper.gridFS.openUploadStream(
                GenerateUUIDv4()
            );
            this.configFileId = fileStream.id;
            fileStream.write(JSON.stringify(this.config));
            fileStream.end();
        }
    }

    /**
     * Load config
     */
    @OnLoad()
    async loadConfig() {
        if (this.configFileId && !this.config) {
            const fileRS = DataBaseHelper.gridFS.openDownloadStream(
                this.configFileId
            );
            const bufferArray = [];
            for await (const data of fileRS) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.config = JSON.parse(buffer.toString());
        }
    }
}
