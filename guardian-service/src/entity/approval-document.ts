import { ApproveStatus, IApprovalDocument, SchemaEntity } from 'interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ApprovalDocument implements IApprovalDocument {
    @ObjectIdColumn()
    id: string;

    @Column()
    owner: string;

    @Column()
    approver: string;

    @Column()
    document: any;

    @Column()
    policyId: string;

    @Column()
    type: SchemaEntity;

    @CreateDateColumn()
    createDate: Date;

    @UpdateDateColumn()
    updateDate: Date;

    @Column()
    tag: string;

    @Column()
    option: any;

    @Column()
    schema: string;
    
    @BeforeInsert()
    setDefaults() {
        this.option = this.option || {};
        this.option.status = this.option.status || ApproveStatus.NEW;
    }
}