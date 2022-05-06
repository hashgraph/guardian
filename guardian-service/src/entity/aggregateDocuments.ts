import { DocumentSignature, DocumentStatus } from 'interfaces';
import {Column, Entity, ObjectIdColumn} from 'typeorm';

/**
 * Documents for aggregate collection
 */
@Entity()
export class AggregateVC {
    @ObjectIdColumn()
    id: string;

    @Column()
    owner: string;

    @Column()
    assign: string;

    @Column()
    hash: string;

    @Column()
    document: any;

    @Column()
    hederaStatus: DocumentStatus;

    @Column()
    signature: DocumentSignature;

    @Column()
    processingStatus: string;

    @Column()
    type: string;

    @Column()
    policyId: string;

    @Column()
    blockId: string;

    @Column()
    tag: string;

    @Column()
    option: any;

    @Column()
    schema: string;
    
    @Column()
    messageId: string;
    
    @Column()
    topicId: string;
    
    @Column()
    relationships: string[];
}
