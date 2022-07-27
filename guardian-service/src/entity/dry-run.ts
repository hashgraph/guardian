import { ApproveStatus, DocumentSignature, DocumentStatus, GenerateUUIDv4, SchemaEntity } from '@guardian/interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

/**
 * DryRun document
 */
@Entity()
export class DryRun {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * id
     */
    @Column()
    dryRunId: string;

    /**
     * Class
     */
    @Column()
    dryRunClass: string;








    /**
     * Document owner
     */
    @Column()
    owner: any;

    /**
     * Document hash
     */
    @Column()
    hash: any;

    /**
     * Document instance
     */
    @Column()
    document: any;

    /**
     * Created at
     */
    @CreateDateColumn()
    createDate: any;

    /**
     * Updated at
     */
    @UpdateDateColumn()
    updateDate: any;

    /**
     * Created at
     */
    @CreateDateColumn()
    created: any;

    /**
     * Updated at
     */
    @UpdateDateColumn()
    updated: any;

    /**
     * Document status
     */
    @Column()
    status: any;

    /**
     * Document signature
     */
    @Column()
    signature: any;

    /**
     * Document type
     */
    @Column()
    type: any;

    /**
     * Policy id
     */
    @Column()
    policyId: any;

    /**
     * Tag
     */
    @Column()
    tag: any;

    /**
     * Message id
     */
    @Column()
    messageId: any;

    /**
     * Topic id
     */
    @Column()
    topicId: any;

    /**
     * Relationships
     */
    @Column()
    relationships: any;

    /**
     * Option
     */
    @Column()
    option: any;

    /**
     * Comment
     */
    @Column()
    comment: any;

    /**
     * Assign
     */
    @Column()
    assign: any;

    /**
     * Document hedera status
     */
    @Column()
    hederaStatus: any;
    /**
     * Document processing status
     */
    @Column()
    processingStatus: any;

    /**
     * Document schema
     */
    @Column()
    schema: any;

    /**
     * Hedera Accounts
     */
    @Column()
    accounts: any

    /**
     * Topic name
     */
    @Column()
    name: any;

    /**
     * Topic description
     */
    @Column()
    description: any;

    /**
     * Topic key
     */
    @Column()
    key: any;

    /**
     * Parent
     */
    @Column()
    parent: any;

    /**
     * Policy UUID
     */
    @Column()
    policyUUID: any;

    /**
     * Token id
     */
    @Column()
    tokenId: any;

    /**
     * Token name
     */
    @Column()
    tokenName: any;

    /**
     * Token symbol
     */
    @Column()
    tokenSymbol: any;

    /**
     * Token type
     */
    @Column()
    tokenType: any;

    /**
     * Token decimals
     */
    @Column()
    decimals: any;

    /**
     * Initial supply
     */
    @Column()
    initialSupply: any;

    /**
     * Admin id
     */
    @Column()
    adminId: any;

    /**
     * Admin key
     */
    @Column()
    adminKey: any;

    /**
     * KYC key
     */
    @Column()
    kycKey: any;

    /**
     * Freeze key
     */
    @Column()
    freezeKey: any;

    /**
     * Wipe key
     */
    @Column()
    wipeKey: any;

    /**
     * Supply key
     */
    @Column()
    supplyKey: any;

    /**
     * Setting value
     */
    @Column()
    value: any;

    /**
     * Schema uuid
     */
    @Column()
    uuid: any;

    /**
     * Schema entity
     */
    @Column()
    entity: any;

    /**
     * Context
     */
    @Column()
    context: any;

    /**
     * Version
     */
    @Column()
    version: any;

    /**
     * Creator
     */
    @Column()
    creator: any;

    /**
     * Document URL
     */
    @Column()
    documentURL: any;

    /**
     * Context URL
     */
    @Column()
    contextURL: any;

    /**
     * IRI
     */
    @Column()
    iri: any;

    /**
     * Readonly flag
     */
    @Column()
    readonly: any;

    /**
     * Is system schema
     */
    @Column()
    system: any;

    /**
     * Is active
     */
    @Column()
    active: any;

    /**
     * Virtual column.
     */
    category: any;

    /**
     * Policy previous version
     */
    @Column()
    previousVersion: any;

    /**
     * Policy topic description
     */
    @Column()
    topicDescription: any;

    /**
     * Policy config
     */
    @Column()
    config: any;

    /**
     * Policy roles
     */
    @Column()
    policyRoles: any;

    /**
     * Policy topics
     */
    @Column()
    policyTopics: any;

    /**
     * Policy registered users
     */
    @Column()
    registeredUsers: any;

    /**
     * Policy instance topic id
     */
    @Column()
    instanceTopicId: any;

    /**
     * Policy tag
     */
    @Column()
    policyTag: any;

    /**
     * Policy code version
     */
    @Column()
    codeVersion: any;

    /**
     * Document id
     */
    @Column()
    documentId: any;

    /**
     * State reason
     */
    @Column()
    reason: any;

    /**
     * DID
     */
    @Column()
    did: any;

    /**
     * Block id
     */
    @Column()
    blockId: any;

    /**
     * block state
     */
    @Column()
    blockState: any;

    /**
     * Document approver
     */
    @Column()
    approver: any;

    /**
     * Default document values
     */
    @BeforeInsert()
    setDefaults() {
        this.option = this.option || {};
        this.option.status = this.option.status || ApproveStatus.NEW;
        this.status = this.status || DocumentStatus.NEW;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.registeredUsers = {};
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