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
    status: ApproveStatus;

    @Column()
    tag: string;

    @BeforeInsert()
    setDefaults() {
        this.status = this.status || ApproveStatus.NEW;
    }
}
