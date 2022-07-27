import { DidDocumentStatus, IDidObject } from '@guardian/interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

/**
 * DID document
 */
@Entity()
export class DidDocument implements IDidObject {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * DID
     */
    @Column({
        unique: true
    })
    did: string;

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
    status: DidDocumentStatus;

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
     * Default document values
     */
    @BeforeInsert()
    setDefaults() {
        this.status = this.status || DidDocumentStatus.NEW;
    }
}
