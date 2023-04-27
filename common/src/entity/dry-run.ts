import { ApproveStatus, DocumentSignature, DocumentStatus, GenerateUUIDv4, GroupAccessType, GroupRelationshipType, SchemaEntity } from '@guardian/interfaces';
import { Entity, Property, BeforeCreate, BeforeUpdate, OnLoad, AfterDelete, AfterCreate, AfterUpdate } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';

/**
 * DryRun document
 */
@Entity()
export class DryRun extends BaseEntity {
    /**
     * id
     */
    @Property({ nullable: true })
    dryRunId?: string;

    /**
     * Class
     */
    @Property({ nullable: true })
    dryRunClass?: string;

    /**
     * Document owner
     */
    @Property({ nullable: true, type: 'unknown' })
    owner?: any;

    /**
     * Document hash
     */
    @Property({ nullable: true, type: 'unknown' })
    hash?: any;

    /**
     * Document instance
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: any;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * Document fields
     */
    @Property({ nullable: true })
    documentFields?: string[];

    /**
     * Document status
     */
    @Property({ nullable: true, type: 'unknown' })
    status?: any;

    /**
     * Document signature
     */
    @Property({ nullable: true, type: 'unknown' })
    signature?: any;

    /**
     * Document type
     */
    @Property({ nullable: true, type: 'unknown' })
    type?: any;

    /**
     * Policy id
     */
    @Property({ nullable: true, type: 'unknown' })
    policyId?: any;

    /**
     * Tag
     */
    @Property({ nullable: true, type: 'unknown' })
    tag?: any;

    /**
     * Message id
     */
    @Property({ nullable: true, type: 'unknown' })
    messageId?: any;

    /**
     * Topic id
     */
    @Property({ nullable: true, type: 'unknown' })
    topicId?: any;

    /**
     * Relationships
     */
    @Property({ nullable: true, type: 'unknown' })
    relationships?: any;

    /**
     * Option
     */
    @Property({ nullable: true, type: 'unknown' })
    option?: any;

    /**
     * Comment
     */
    @Property({ nullable: true, type: 'unknown' })
    comment?: any;

    /**
     * Assign
     */
    @Property({ nullable: true, type: 'unknown' })
    assignedTo?: any;

    /**
     * Assign
     */
    @Property({ nullable: true })
    assignedToGroup?: string;

    /**
     * Document hedera status
     */
    @Property({ nullable: true, type: 'unknown' })
    hederaStatus?: any;

    /**
     * Document processing status
     */
    @Property({ nullable: true, type: 'unknown' })
    processingStatus?: any;

    /**
     * Document schema
     */
    @Property({ nullable: true, type: 'unknown' })
    schema?: any;

    /**
     * Hedera Accounts
     */
    @Property({ nullable: true, type: 'unknown' })
    accounts?: any

    /**
     * Tokens
     */
    @Property({ nullable: true, type: 'unknown' })
    tokens?: any

    /**
     * Topic name
     */
    @Property({ nullable: true, type: 'unknown' })
    name?: any;

    /**
     * Topic description
     */
    @Property({ nullable: true, type: 'unknown' })
    description?: any;

    /**
     * Parent
     */
    @Property({ nullable: true, type: 'unknown' })
    parent?: any;

    /**
     * Policy UUID
     */
    @Property({ nullable: true, type: 'unknown' })
    policyUUID?: any;

    /**
     * Token id
     */
    @Property({ nullable: true, type: 'unknown' })
    tokenId?: any;

    /**
     * Token name
     */
    @Property({ nullable: true, type: 'unknown' })
    tokenName?: any;

    /**
     * Token symbol
     */
    @Property({ nullable: true, type: 'unknown' })
    tokenSymbol?: any;

    /**
     * Token type
     */
    @Property({ nullable: true, type: 'unknown' })
    tokenType?: any;

    /**
     * Token decimals
     */
    @Property({ nullable: true, type: 'unknown' })
    decimals?: any;

    /**
     * Initial supply
     */
    @Property({ nullable: true, type: 'unknown' })
    initialSupply?: any;

    /**
     * Admin id
     */
    @Property({ nullable: true, type: 'unknown' })
    adminId?: any;

    /**
     * Change supply
     */
    @Property({ nullable: true })
    changeSupply?: boolean;

    /**
     * Enable admin
     */
    @Property({ nullable: true })
    enableAdmin?: boolean;

    /**
     * Enable KYC
     */
    @Property({ nullable: true })
    enableKYC?: boolean;

    /**
     * Enable freeze
     */
    @Property({ nullable: true })
    enableFreeze?: boolean;

    /**
     * Enable wipe
     */
    @Property({ nullable: true })
    enableWipe?: boolean;

    /**
     * Setting value
     */
    @Property({ nullable: true, type: 'unknown' })
    value?: any;

    /**
     * Schema uuid
     */
    @Property({ nullable: true, type: 'unknown' })
    uuid?: any;

    /**
     * Schema entity
     */
    @Property({ nullable: true, type: 'unknown' })
    entity?: any;

    /**
     * Context
     */
    @Property({ persist: false, type: 'unknown' })
    context?: any;

    /**
     * Context file id
     */
    @Property({ nullable: true })
    contextFileId?: ObjectId;

    /**
     * Version
     */
    @Property({ nullable: true, type: 'unknown' })
    version?: any;

    /**
     * Creator
     */
    @Property({ nullable: true, type: 'unknown' })
    creator?: any;

    /**
     * Document URL
     */
    @Property({ nullable: true, type: 'unknown' })
    documentURL?: any;

    /**
     * Context URL
     */
    @Property({ nullable: true, type: 'unknown' })
    contextURL?: any;

    /**
     * IRI
     */
    @Property({ nullable: true, type: 'unknown'})
    iri?: any;

    /**
     * Readonly flag
     */
    @Property({ nullable: true, type: 'unknown' })
    readonly?: any;

    /**
     * Is system schema
     */
    @Property({ nullable: true, type: 'unknown' })
    system?: any;

    /**
     * Is active
     */
    @Property({ nullable: true, type: 'unknown' })
    active?: any;

    /**
     * Category.
     */
    @Property({ nullable: true, type: 'unknown' })
    category?: any;

    /**
     * Policy previous version
     */
    @Property({ nullable: true, type: 'unknown' })
    previousVersion?: any;

    /**
     * Policy topic description
     */
    @Property({ nullable: true, type: 'unknown' })
    topicDescription?: any;

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
     * Policy roles
     */
    @Property({ nullable: true, type: 'unknown' })
    policyRoles?: any;

    /**
     * Policy groups
     */
    @Property({ nullable: true, type: 'unknown' })
    policyGroups?: any;

    /**
     * Policy topics
     */
    @Property({ nullable: true, type: 'unknown' })
    policyTopics?: any;

    /**
     * Policy tokens
     */
    @Property({ nullable: true, type: 'unknown' })
    policyTokens?: any[];

    /**
     * Policy instance topic id
     */
    @Property({ nullable: true, type: 'unknown' })
    instanceTopicId?: any;

    /**
     * Policy tag
     */
    @Property({ nullable: true, type: 'unknown' })
    policyTag?: any;

    /**
     * Policy code version
     */
    @Property({ nullable: true, type: 'unknown' })
    codeVersion?: any;

    /**
     * Document id
     */
    @Property({ nullable: true, type: 'unknown' })
    documentId?: any;

    /**
     * State reason
     */
    @Property({ nullable: true, type: 'unknown' })
    reason?: any;

    /**
     * DID
     */
    @Property({ nullable: true, type: 'unknown' })
    did?: any;

    /**
     * Block id
     */
    @Property({ nullable: true, type: 'unknown' })
    blockId?: any;

    /**
     * block state
     */
    @Property({ nullable: true, type: 'unknown' })
    blockState?: any;

    /**
     * Document approver
     */
    @Property({ nullable: true, type: 'unknown' })
    approver?: any;

    /**
     * User Role
     */
    @Property({ nullable: true })
    role?: string;

    /**
     * User username
     */
    @Property({ nullable: true })
    username?: string;

    /**
     * User Id
     */
    @Property({ nullable: true })
    userId?: string;

    /**
     * hederaAccountId
     */
    @Property({ nullable: true })
    hederaAccountId?: string;

    /**
     * hederaAccountKey
     */
    @Property({ nullable: true })
    hederaAccountKey?: string;

    /**
     * Group Type
     */
    @Property({ nullable: true })
    groupRelationshipType?: GroupRelationshipType;

    /**
     * Group Type
     */
    @Property({ nullable: true })
    groupAccessType?: GroupAccessType;

    /**
     * Group Type
     */
    @Property({ nullable: true })
    groupName?: string;

    /**
     * User group
     */
    @Property({ nullable: true, type: 'unknown' })
    group?: any;

    /**
     * Group Label
     */
    @Property({ nullable: true })
    groupLabel?: string;

    /**
     * Token Map
     */
    @Property({ nullable: true, type: 'unknown' })
    tokenMap?: any

    /**
     * Hedera Hash
     */
    @Property({ nullable: true })
    messageHash?: string;

    /**
     * Message History
     */
    @Property({ nullable: true })
    messageIds?: string[];

    /**
     * Target ID
     */
    @Property({ nullable: true })
    target?: string;

    /**
     * Target ID (Local)
     */
    @Property({ nullable: true })
    localTarget?: string;

    /**
     * Operation
     */
    @Property({ nullable: true })
    operation?: string;

    /**
     * Date
     */
    @Property({ nullable: true })
    date?: string;

    /**
     * Document uri
     */
    @Property({ nullable: true })
    uri?: string;

    /**
     * Default document values
     */
    @BeforeCreate()
    setDefaults() {
        this.option = this.option || {};
        this.option.status = this.option.status || ApproveStatus.NEW;
        this.status = this.status || DocumentStatus.NEW;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';
        this.entity = this.entity || SchemaEntity.NONE;
        this.readonly = !!this.readonly;
        this.iri = this.iri || `${this.uuid}`;
        this.system = this.system || false;
        this.active = this.active || false;
        this.hederaStatus = this.hederaStatus || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
    }

    /**
     * Create document
     */
    @BeforeCreate()
    async createDocument() {
        await new Promise<void>((resolve, reject) => {
            try {
                if (this.document) {
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(
                        GenerateUUIDv4()
                    );
                    this.documentFileId = fileStream.id;
                    fileStream.write(JSON.stringify(this.document));
                    if (this.documentFields) {
                        const newDocument: any = {};
                        for (const field of this.documentFields) {
                            const fieldValue = ObjGet(this.document, field)
                            if (
                                (typeof fieldValue === 'string' &&
                                    fieldValue.length <
                                        (+process.env
                                            .DOCUMENT_CACHE_FIELD_LIMIT ||
                                            100)) ||
                                typeof fieldValue === 'number'
                            ) {
                                ObjSet(newDocument, field, fieldValue);
                            }
                        }
                        this.document = newDocument;
                    } else {
                        delete this.document;
                    }
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
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.document) {
            if (this.documentFileId) {
                DataBaseHelper.gridFS
                    .delete(this.documentFileId)
                    .catch(console.error);
            }
            await this.createDocument();
        }
    }

    /**
     * Load document
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadDocument() {
        if (this.documentFileId) {
            const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                this.documentFileId
            );
            const bufferArray = [];
            for await (const data of fileStream) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.document = JSON.parse(buffer.toString());
        }
    }

    /**
     * Delete document
     */
    @AfterDelete()
    deleteDocument() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch(console.error);
        }
    }

    /**
     * Create context
     */
    @BeforeCreate()
    async createContext() {
        await new Promise<void>((resolve, reject) => {
            try {
                if (this.context) {
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(
                        GenerateUUIDv4()
                    );
                    this.contextFileId = fileStream.id;
                    fileStream.write(JSON.stringify(this.context));
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
     * Update context
     */
    @BeforeUpdate()
    async updateContext() {
        if (this.context) {
            if (this.contextFileId) {
                DataBaseHelper.gridFS
                    .delete(this.contextFileId)
                    .catch(console.error);
            }
            await this.createContext();
        }
    }

    /**
     * Load context
     */
    @OnLoad()
    async loadContext() {
        if (this.contextFileId && !this.context) {
            const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                this.contextFileId
            );
            const bufferArray = [];
            for await (const data of fileStream) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.context = JSON.parse(buffer.toString());
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteContext() {
        if (this.contextFileId) {
            DataBaseHelper.gridFS
                .delete(this.contextFileId)
                .catch(console.error);
        }
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
