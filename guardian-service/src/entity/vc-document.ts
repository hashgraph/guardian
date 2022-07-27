import { DocumentSignature, DocumentStatus, IVCDocument } from '@guardian/interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

/**
 * VC documents collection
 */
@Entity()
export class VcDocument implements IVCDocument {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Document owner
     */
    @Column()
    owner: string;

    /**
     * Assign
     */
    @Column()
    assign: string;

    /**
     * Document hash
     */
    @Column({
        unique: true
    })
    hash: string;

    /**
     * Document instance
     */
    @Column()
    document: any;

    /**
     * Created at
     */
    @CreateDateColumn()
    createDate: Date;

    /**
     * Updated at
     */
    @UpdateDateColumn()
    updateDate: Date;

    /**
     * Document hedera status
     */
    @Column()
    hederaStatus: DocumentStatus;

    /**
     * Document signature
     */
    @Column()
    signature: DocumentSignature;

    /**
     * Document processing status
     */
    @Column()
    processingStatus: string;

    /**
     * Type
     */
    @Column()
    type: string;

    /**
     * Policy id
     */
    @Column()
    policyId: string;

    /**
     * Tag
     */
    @Column()
    tag: string;

    /**
     * Document option
     */
    @Column()
    option: any;

    /**
     * Document schema
     */
    @Column()
    schema: string;

    /**
     * Message id
     */
    @Column()
    messageId: string;

    /**
     * Topic id
     */
    @Column()
    topicId: string;

    /**
     * Relationships
     */
    @Column()
    relationships: string[];

    /**
     * Comment
     */
    @Column()
    comment?: string;

    /**
     * Hedera Accounts
     */
    @Column()
    accounts?: any

    /**
     * Document defaults
     */
    @BeforeInsert()
    setDefaults() {
        this.hederaStatus = this.hederaStatus || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
        this.option = this.option || {};
    }
}
