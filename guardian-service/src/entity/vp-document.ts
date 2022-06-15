import { DocumentSignature, DocumentStatus, IVPDocument, SchemaEntity } from '@guardian/interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class VpDocument implements IVPDocument {
    @ObjectIdColumn()
    id: string;

    @Column()
    owner: string;

    @Column({
        unique: true
    })
    hash: string;

    @Column()
    document: any;

    @CreateDateColumn()
    createDate: Date;

    @UpdateDateColumn()
    updateDate: Date;

    @Column()
    status: DocumentStatus;

    @Column()
    signature: DocumentSignature;

    @Column()
    type: SchemaEntity;

    @Column()
    policyId: string;

    @Column()
    tag: string;

    @Column()
    messageId: string;

    @Column()
    topicId: string;

    @Column()
    relationships: string[];

    @Column()
    option?: any;

    @Column()
    comment?: string;

    @BeforeInsert()
    setDefaults() {
        this.status = this.status || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
    }
}
