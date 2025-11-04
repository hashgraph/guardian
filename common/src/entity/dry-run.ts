import { ApproveStatus, DocumentSignature, DocumentStatus, GenerateUUIDv4, GroupAccessType, GroupRelationshipType, SchemaEntity } from '@guardian/interfaces';
import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, Index, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper, extractTableFileIds } from '../helpers/index.js';
import { BaseEntity } from '../models/base-entity.js';

/**
 * DryRun document
 */
@Entity()
@Index({
    properties: ['dryRunClass'],
    name: 'class_index'
})
@Index({
    properties: ['dryRunId'],
    name: 'dry_run_index'
})
@Index({
    properties: ['dryRunId', 'dryRunClass'],
    name: 'full_index'
})
@Index({
    properties: ['dryRunId', 'systemMode'],
    name: 'system_index'
})
@Index({
    properties: ['dryRunId', 'dryRunClass', 'active'],
    name: 'user_index'
})
export class DryRun extends BaseEntity {
    /**
     * id
     */
    @Property({ nullable: true })
    dryRunId?: string;

    /**
     * SavepointId
     * @type {string}
     */
    @Property({ nullable: true })
    savepointId?: string | null;

    /**
     * Class
     */
    @Property({ nullable: true })
    dryRunClass?: string;

    /**
     * Class
     */
    @Property({ nullable: true })
    systemMode?: boolean;

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
     * Parent message id
     */
    @Property({ nullable: true, type: 'unknown' })
    startMessageId?: any;

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
    @Property({ nullable: true, type: 'unknown' })
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
     * Source document identifier
     */
    @Property({ nullable: true })
    sourceDocumentId?: ObjectId;

    /**
     * Document Topic Id
     */
    @Property({ nullable: true, type: 'unknown' })
    documentTopicId?: any;

    /**
     * Policy Topic Id
     */
    @Property({ nullable: true, type: 'unknown' })
    policyTopicId?: any;

    /**
     * Document Message
     */
    @Property({ nullable: true, type: 'unknown' })
    documentMessage?: any;

    /**
     * Policy Message
     */
    @Property({ nullable: true, type: 'unknown' })
    policyMessage?: any;

    /**
     * Policy Instance Message
     */
    @Property({ nullable: true, type: 'unknown' })
    policyInstanceMessage?: any;

    /**
     * Schemas
     */
    @Property({ nullable: true, type: 'unknown' })
    schemas?: any;

    /**
     * Schema Id
     */
    @Property({ nullable: true, type: 'unknown' })
    schemaId?: any;

    /**
     * Last Message
     */
    @Property({ nullable: true, type: 'unknown' })
    lastMessage?: any;

    /**
     * Last Update
     */
    @Property({ nullable: true, type: 'unknown' })
    lastUpdate?: any;

    /**
     * Token amount
     */
    @Property({ nullable: true, type: 'unknown' })
    amount?: any;

    /**
     * Token serials
     */
    @Property({ nullable: true, type: 'unknown' })
    serials?: any;

    /**
     * Verification methods
     */
    @Property({ nullable: true, type: 'unknown' })
    verificationMethods?: any;

    /**
     * Vp message identifier
     */
    @Property({ nullable: true })
    vpMessageId?: string;

    /**
     * Secondary vp identifiers
     */
    @Property({ nullable: true })
    secondaryVpIds?: string[]

    /**
     * Start serial
     */
    @Property({ nullable: true })
    startSerial?: number

    /**
     * Start transaction
     */
    @Property({ nullable: true })
    startTransaction?: string

    /**
     * Is mint needed
     */
    @Property({ default: true })
    isMintNeeded: boolean = true;

    /**
     * Is transfer needed
     */
    @Property({ default: false })
    isTransferNeeded: boolean = false;

    /**
     * Was transfer needed
     */
    @Property({ default: false })
    wasTransferNeeded: boolean = false;

    /**
     * Memo
     */
    @Property({ nullable: true })
    memo?: string;

    /**
     * Metadata
     */
    @Property({ nullable: true })
    metadata?: string;

    /**
     * Mint request identifier
     */
    @Property({ nullable: true })
    mintRequestId?: string;

    /**
     * Mint status
     */
    @Property({ nullable: true, type: 'unknown' })
    mintStatus?: any;

    /**
     * Transfer status
     */
    @Property({ nullable: true, type: 'unknown' })
    transferStatus?: any;

    /**
     * Error
     */
    @Property({ nullable: true })
    error?: string;

    /**
     * Mint date
     */
    @Property({ nullable: true })
    processDate?: Date;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _documentFileId?: ObjectId;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _contextFileId?: ObjectId;

    /**
     * Edited
     */
    @Property({ nullable: true })
    edited?: boolean;

    /**
     * is draft
     */
    @Property({ nullable: true })
    draft?: boolean;

    /**
     * draft id
     */
    @Property({ nullable: true })
    draftId?: string;

    /**
     * draft ref
     */
    @Property({ nullable: true })
    draftRef?: string;

    /**
     * Relayer Account
     */
    @Property({ nullable: true })
    relayerAccount?: string;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _configFileId?: ObjectId;

    /**
     * old file id
     */
    @Property({ nullable: true })
    tableFileIds?: ObjectId[];

    /**
     * Old Table File Ids
     */
    @Property({ persist: false, nullable: true })
    _oldTableFileIds?: ObjectId[];

    /**
     * Set defaults
     */
    @BeforeCreate()
    async setDefaults() {
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

        if (this.document) {
            this.tableFileIds = extractTableFileIds(this.document);

            const document = JSON.stringify(this.document);
            this.documentFileId = await this._createFile(document, 'DryRun');
            this.document = this._createFieldCache(this.document, this.documentFields);
            if (!this.document) {
                delete this.document;
            }
        } else {
            this.tableFileIds = undefined;
        }

        if (this.context) {
            const context = JSON.stringify(this.context);
            this.contextFileId = await this._createFile(context, 'DryRun');
            delete this.context;
        }
        if (this.config) {
            const config = JSON.stringify(this.config);
            this.configFileId = await this._createFile(config, 'DryRun');
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
        if (this.documentFileId) {
            const buffer = await this._loadFile(this.documentFileId);
            this.document = JSON.parse(buffer.toString());
        }
        if (this.contextFileId) {
            const buffer = await this._loadFile(this.contextFileId);
            this.context = JSON.parse(buffer.toString());
        }
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
        if (this.document) {
            const nextTableFileIds = extractTableFileIds(this.document) || [];
            const currentTableFileIds = this.tableFileIds || [];

            const removedTableFileIds = currentTableFileIds.filter((existingId) => {
                const existing = String(existingId);
                return !nextTableFileIds.some((nextId) => String(nextId) === existing);
            });

            this._oldTableFileIds = removedTableFileIds.length ? removedTableFileIds : undefined;
            this.tableFileIds = nextTableFileIds;

            const document = JSON.stringify(this.document);
            const documentFileId = await this._createFile(document, 'DryRun');
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }
            this.document = this._createFieldCache(this.document, this.documentFields);
            if (!this.document) {
                delete this.document;
            }
        } else if (this.tableFileIds && this.tableFileIds.length) {
            this._oldTableFileIds = this.tableFileIds;
            this.tableFileIds = undefined;
        }

        if (this.context) {
            const context = JSON.stringify(this.context);
            const contextFileId = await this._createFile(context, 'DryRun');
            if (contextFileId) {
                this._contextFileId = this.contextFileId;
                this.contextFileId = contextFileId;
            }
            delete this.context;
        }
        if (this.config) {
            const config = JSON.stringify(this.config);
            const configFileId = await this._createFile(config, 'DryRun');
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
        if (this._documentFileId) {
            DataBaseHelper.gridFS
                .delete(this._documentFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: DryRun, ${this._id}, _documentFileId`)
                    console.error(reason)
                });
            delete this._documentFileId;
        }
        if (this._contextFileId) {
            DataBaseHelper.gridFS
                .delete(this._contextFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: DryRun, ${this._id}, _contextFileId`)
                    console.error(reason)
                });
            delete this._contextFileId;
        }
        if (this._configFileId) {
            DataBaseHelper.gridFS
                .delete(this._configFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: DryRun, ${this._id}, _configFileId`)
                    console.error(reason)
                });
            delete this._configFileId;
        }

        if (this._oldTableFileIds && this._oldTableFileIds.length) {
            for (const fileId of this._oldTableFileIds) {
                DataBaseHelper.gridFS
                    .delete(fileId)
                    .catch((reason) => {
                        console.error(`AfterUpdate: DryRun, ${this._id}, _oldTableFileIds`);
                        console.error(reason);
                    });
            }
            delete this._oldTableFileIds;
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteFiles() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: DryRun, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
        if (this.contextFileId) {
            DataBaseHelper.gridFS
                .delete(this.contextFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: DryRun, ${this._id}, contextFileId`)
                    console.error(reason)
                });
        }
        if (this.configFileId) {
            DataBaseHelper.gridFS
                .delete(this.configFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: DryRun, ${this._id}, configFileId`)
                    console.error(reason)
                });
        }

        if (this.tableFileIds && this.tableFileIds.length) {
            for (const fileId of this.tableFileIds) {
                DataBaseHelper.gridFS
                    .delete(fileId)
                    .catch((reason) => {
                        console.error(`AfterDelete: DryRun, ${this._id}, tableFileIds`);
                        console.error(reason);
                    });
            }
        }
    }
}
