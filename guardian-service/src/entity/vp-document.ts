import { DocumentSignature, DocumentStatus, IVPDocument, SchemaEntity } from '@guardian/interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

/**
 * VP documents collection
 */
@Entity()
export class VpDocument implements IVPDocument {
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
     * Document status
     */
    @Column()
    status: DocumentStatus;

    /**
     * Document signature
     */
    @Column()
    signature: DocumentSignature;

    /**
     * Document type
     */
    @Column()
    type: SchemaEntity;

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
     * Option
     */
    @Column()
    option?: any;

    /**
     * Comment
     */
    @Column()
    comment?: string;

    /**
     * Document defaults
     */
    @BeforeInsert()
    setDefaults() {
        this.status = this.status || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
    }
}
