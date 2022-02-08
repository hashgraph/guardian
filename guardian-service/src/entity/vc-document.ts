import {DocumentSignature, DocumentStatus, IVCDocument, SchemaEntity} from 'interfaces';
import {BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn} from 'typeorm';

@Entity()
export class VcDocument implements IVCDocument {
    @ObjectIdColumn()
    id: string;

    @Column()
    owner: string;

    @Column()
    assign: string;

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
    tag: string;

    @Column()
    option: any;

    @Column()
    schema: string;

    @BeforeInsert()
    setDefaults() {
        this.hederaStatus = this.hederaStatus || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
        this.option = this.option || {};
    }
}
