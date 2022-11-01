import { ApproveStatus, DocumentSignature, DocumentStatus, GenerateUUIDv4, GroupAccessType, GroupRelationshipType, SchemaEntity } from '@guardian/interfaces';
import { Entity, Property, BeforeCreate } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

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
    @Property({ nullable: true })
    owner?: any;

    /**
     * Document hash
     */
    @Property({ nullable: true })
    hash?: any;

    /**
     * Document instance
     */
    @Property({ nullable: true })
    document?: any;

    /**
     * Created at
     */
    @Property()
    createDate: any = new Date();

    /**
     * Updated at
     */
    @Property({ onUpdate: () => new Date() })
    updateDate: any = new Date();

    /**
     * Created at
     */
    @Property()
    created: any = new Date();

    /**
     * Updated at
     */
    @Property({ onUpdate: () => new Date() })
    updated: any = new Date();

    /**
     * Document status
     */
    @Property({ nullable: true })
    status?: any;

    /**
     * Document signature
     */
    @Property({ nullable: true })
    signature?: any;

    /**
     * Document type
     */
    @Property({ nullable: true })
    type?: any;

    /**
     * Policy id
     */
    @Property({ nullable: true })
    policyId?: any;

    /**
     * Tag
     */
    @Property({ nullable: true })
    tag?: any;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: any;

    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: any;

    /**
     * Relationships
     */
    @Property({ nullable: true })
    relationships?: any;

    /**
     * Option
     */
    @Property({ nullable: true })
    option?: any;

    /**
     * Comment
     */
    @Property({ nullable: true })
    comment?: any;

    /**
     * Assign
     */
    @Property({ nullable: true })
    assignedTo?: any;

    /**
     * Assign
     */
    @Property({ nullable: true })
    assignedToGroup?: string;

    /**
     * Document hedera status
     */
    @Property({ nullable: true })
    hederaStatus?: any;

    /**
     * Document processing status
     */
    @Property({ nullable: true })
    processingStatus?: any;

    /**
     * Document schema
     */
    @Property({ nullable: true })
    schema?: any;

    /**
     * Hedera Accounts
     */
    @Property({ nullable: true })
    accounts?: any

    /**
     * Tokens
     */
    @Property({ nullable: true })
    tokens?: any

    /**
     * Topic name
     */
    @Property({ nullable: true })
    name?: any;

    /**
     * Topic description
     */
    @Property({ nullable: true })
    description?: any;

    /**
     * Topic key
     */
    @Property({ nullable: true })
    key?: any;

    /**
     * Parent
     */
    @Property({ nullable: true })
    parent?: any;

    /**
     * Policy UUID
     */
    @Property({ nullable: true })
    policyUUID?: any;

    /**
     * Token id
     */
    @Property({ nullable: true })
    tokenId?: any;

    /**
     * Token name
     */
    @Property({ nullable: true })
    tokenName?: any;

    /**
     * Token symbol
     */
    @Property({ nullable: true })
    tokenSymbol?: any;

    /**
     * Token type
     */
    @Property({ nullable: true })
    tokenType?: any;

    /**
     * Token decimals
     */
    @Property({ nullable: true })
    decimals?: any;

    /**
     * Initial supply
     */
    @Property({ nullable: true })
    initialSupply?: any;

    /**
     * Admin id
     */
    @Property({ nullable: true })
    adminId?: any;

    /**
     * Admin key
     */
    @Property({ nullable: true })
    adminKey?: any;

    /**
     * KYC key
     */
    @Property({ nullable: true })
    kycKey?: any;

    /**
     * Freeze key
     */
    @Property({ nullable: true })
    freezeKey?: any;

    /**
     * Wipe key
     */
    @Property({ nullable: true })
    wipeKey?: any;

    /**
     * Supply key
     */
    @Property({ nullable: true })
    supplyKey?: any;

    /**
     * Setting value
     */
    @Property({ nullable: true })
    value?: any;

    /**
     * Schema uuid
     */
    @Property({ nullable: true })
    uuid?: any;

    /**
     * Schema entity
     */
    @Property({ nullable: true })
    entity?: any;

    /**
     * Context
     */
    @Property({ nullable: true })
    context?: any;

    /**
     * Version
     */
    @Property({ nullable: true })
    version?: any;

    /**
     * Creator
     */
    @Property({ nullable: true })
    creator?: any;

    /**
     * Document URL
     */
    @Property({ nullable: true })
    documentURL?: any;

    /**
     * Context URL
     */
    @Property({ nullable: true })
    contextURL?: any;

    /**
     * IRI
     */
    @Property({ nullable: true })
    iri?: any;

    /**
     * Readonly flag
     */
    @Property({ nullable: true })
    readonly?: any;

    /**
     * Is system schema
     */
    @Property({ nullable: true })
    system?: any;

    /**
     * Is active
     */
    @Property({ nullable: true })
    active?: any;

    /**
     * Virtual column.
     */
    category: any;

    /**
     * Policy previous version
     */
    @Property({ nullable: true })
    previousVersion?: any;

    /**
     * Policy topic description
     */
    @Property({ nullable: true })
    topicDescription?: any;

    /**
     * Policy config
     */
    @Property({ nullable: true })
    config?: any;

    /**
     * Policy roles
     */
    @Property({ nullable: true })
    policyRoles?: any;

    /**
     * Policy groups
     */
    @Property({ nullable: true })
    policyGroups?: any;

    /**
     * Policy topics
     */
    @Property({ nullable: true })
    policyTopics?: any;

    /**
     * Policy tokens
     */
    @Property({ nullable: true })
    policyTokens?: any[];

    /**
     * Policy instance topic id
     */
    @Property({ nullable: true })
    instanceTopicId?: any;

    /**
     * Policy tag
     */
    @Property({ nullable: true })
    policyTag?: any;

    /**
     * Policy code version
     */
    @Property({ nullable: true })
    codeVersion?: any;

    /**
     * Document id
     */
    @Property({ nullable: true })
    documentId?: any;

    /**
     * State reason
     */
    @Property({ nullable: true })
    reason?: any;

    /**
     * DID
     */
    @Property({ nullable: true })
    did?: any;

    /**
     * Block id
     */
    @Property({ nullable: true })
    blockId?: any;

    /**
     * block state
     */
    @Property({ nullable: true })
    blockState?: any;

    /**
     * Document approver
     */
    @Property({ nullable: true })
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
    @Property({ nullable: true })
    group?: any;

    /**
     * Group Label
     */
    @Property({ nullable: true })
    groupLabel?: string;

    /**
     * Token Map
     */
    @Property({ nullable: true })
    tokenMap?: any

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
}
