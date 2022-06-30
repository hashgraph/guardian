import { DocumentSignature, DocumentStatus } from '@guardian/interfaces';
import {Column, Entity, ObjectIdColumn} from 'typeorm';

/**
 * Documents for aggregate collection
 */
@Entity()
export class AggregateVC {
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
     * Document assign
     */
    @Column()
    assign: string;

    /**
     * Document hash
     */
    @Column()
    hash: string;

    /**
     * Document instance
     */
    @Column()
    document: any;

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
     * Document type
     */
    @Column()
    type: string;

    /**
     * Document policy id
     */
    @Column()
    policyId: string;

    /**
     * Document block id
     */
    @Column()
    blockId: string;

    /**
     * Document tag
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
     * Document message id
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
}
