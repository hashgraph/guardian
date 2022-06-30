import { ApproveStatus, IApprovalDocument, SchemaEntity } from '@guardian/interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

/**
 * Document for approve
 */
@Entity()
export class ApprovalDocument implements IApprovalDocument {
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
     * Document approver
     */
    @Column()
    approver: string;

    /**
     * Document instance
     */
    @Column()
    document: any;

    /**
     * Document policy id
     */
    @Column()
    policyId: string;

    /**
     * Document type
     */
    @Column()
    type: SchemaEntity;

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
     * Default document values
     */
    @BeforeInsert()
    setDefaults() {
        this.option = this.option || {};
        this.option.status = this.option.status || ApproveStatus.NEW;
    }
}
