import { GenerateUUIDv4 } from '@guardian/interfaces';
import {
    Entity,
    Property,
    BeforeCreate,
    BeforeUpdate,
    OnLoad,
    AfterDelete,
    AfterCreate,
    AfterUpdate,
} from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { BaseEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/index.js';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';

/**
 * Policy cache data
 */
@Entity()
export class PolicyCacheData extends BaseEntity {
    /**
     * Cache collection
     */
    @Property()
    cacheCollection: string;

    /**
     * Cache policy identifier
     */
    @Property()
    cachePolicyId: string;

    /**
     * Old document identifier
     */
    @Property()
    oldId: string;

    /**
     * New document identifier
     */
    @Property({ persist: false })
    newId: ObjectId;

    /**
     * Hedera Contract Id
     */
    @Property({ nullable: true, type: 'unknown' })
    contractId?: any;

    /**
     * Token identifiers
     */
    @Property({ nullable: true, type: 'unknown' })
    tokenIds?: any;

    /**
     * Immediately retire
     */
    @Property({ nullable: true, type: 'unknown' })
    immediately?: any;

    /**
     * Enabled
     */
    @Property({ nullable: true, type: 'unknown' })
    enabled?: any;

    /**
     * id
     */
    @Property({ nullable: true, type: 'unknown' })
    dryRunId?: string;

    /**
     * Class
     */
    @Property({ nullable: true, type: 'unknown' })
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
    @Property({ nullable: true, type: 'unknown' })
    documentFileId?: any;

    /**
     * Document fields
     */
    @Property({ nullable: true, type: 'unknown' })
    documentFields?: any[];

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
    @Property({ nullable: true, type: 'unknown' })
    assignedToGroup?: any;

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
    accounts?: any;

    /**
     * Tokens
     */
    @Property({ nullable: true, type: 'unknown' })
    tokens?: any;

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
    @Property({ nullable: true, type: 'unknown' })
    changeSupply?: any;

    /**
     * Enable admin
     */
    @Property({ nullable: true, type: 'unknown' })
    enableAdmin?: any;

    /**
     * Enable KYC
     */
    @Property({ nullable: true, type: 'unknown' })
    enableKYC?: any;

    /**
     * Enable freeze
     */
    @Property({ nullable: true, type: 'unknown' })
    enableFreeze?: any;

    /**
     * Enable wipe
     */
    @Property({ nullable: true, type: 'unknown' })
    enableWipe?: any;

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
    @Property({ nullable: true, type: 'unknown' })
    contextFileId?: any;

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
    @Property({ nullable: true, type: 'unknown' })
    config?: any;

    /**
     * Config file id
     */
    @Property({ nullable: true, type: 'unknown' })
    configFileId?: any;

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
    @Property({ nullable: true, type: 'unknown' })
    role?: any;

    /**
     * User username
     */
    @Property({ nullable: true, type: 'unknown' })
    username?: any;

    /**
     * User Id
     */
    @Property({ nullable: true, type: 'unknown' })
    userId?: any;

    /**
     * hederaAccountId
     */
    @Property({ nullable: true, type: 'unknown' })
    hederaAccountId?: any;

    /**
     * hederaAccountKey
     */
    @Property({ nullable: true, type: 'unknown' })
    hederaAccountKey?: any;

    /**
     * Group Type
     */
    @Property({ nullable: true, type: 'unknown' })
    groupRelationshipType?: any;

    /**
     * Group Type
     */
    @Property({ nullable: true, type: 'unknown' })
    groupAccessType?: any;

    /**
     * Group Type
     */
    @Property({ nullable: true, type: 'unknown' })
    groupName?: string;

    /**
     * User group
     */
    @Property({ nullable: true, type: 'unknown' })
    group?: any;

    /**
     * Group Label
     */
    @Property({ nullable: true, type: 'unknown' })
    groupLabel?: any;

    /**
     * Token Map
     */
    @Property({ nullable: true, type: 'unknown' })
    tokenMap?: any;

    /**
     * Hedera Hash
     */
    @Property({ nullable: true, type: 'unknown' })
    messageHash?: any;

    /**
     * Message History
     */
    @Property({ nullable: true, type: 'unknown' })
    messageIds?: any;

    /**
     * Target ID
     */
    @Property({ nullable: true, type: 'unknown' })
    target?: any;

    /**
     * Target ID (Local)
     */
    @Property({ nullable: true, type: 'unknown' })
    localTarget?: any;

    /**
     * Operation
     */
    @Property({ nullable: true, type: 'unknown' })
    operation?: any;

    /**
     * Date
     */
    @Property({ nullable: true, type: 'unknown' })
    date?: any;

    /**
     * Document uri
     */
    @Property({ nullable: true, type: 'unknown' })
    uri?: any;

    /**
     * Source document identifier
     */
    @Property({ nullable: true, type: 'unknown' })
    sourceDocumentId?: any;

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
    @Property({ nullable: true, type: 'unknown' })
    vpMessageId?: any;

    /**
     * Secondary vp identifiers
     */
    @Property({ nullable: true, type: 'unknown' })
    secondaryVpIds?: any;

    /**
     * Start serial
     */
    @Property({ nullable: true, type: 'unknown' })
    startSerial?: any;

    /**
     * Start transaction
     */
    @Property({ nullable: true, type: 'unknown' })
    startTransaction?: any;

    /**
     * Is mint needed
     */
    @Property({ nullable: true, type: 'unknown' })
    isMintNeeded: any;

    /**
     * Is transfer needed
     */
    @Property({ nullable: true, type: 'unknown' })
    isTransferNeeded: any;

    /**
     * Was transfer needed
     */
    @Property({ nullable: true, type: 'unknown' })
    wasTransferNeeded: any;

    /**
     * Memo
     */
    @Property({ nullable: true, type: 'unknown' })
    memo?: any;

    /**
     * Metadata
     */
    @Property({ nullable: true, type: 'unknown' })
    metadata?: any;

    /**
     * Mint request identifier
     */
    @Property({ nullable: true, type: 'unknown' })
    mintRequestId?: any;

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
    @Property({ nullable: true, type: 'unknown' })
    error?: any;

    /**
     * Mint date
     */
    @Property({ nullable: true, type: 'unknown' })
    processDate?: any;

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
                            const fieldValue = ObjGet(this.document, field);
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
                reject(error);
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
                reject(error);
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
                reject(error);
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

    @OnLoad()
    replaceIds() {
        if (this.oldId) {
            this.newId = this._id;
            this.id = this.oldId;
            this._id = ObjectId.createFromHexString(this.oldId);
        }
    }
}
