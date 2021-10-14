import { DidDocumentStatus, IDidDocument } from 'interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class DidDocument implements IDidDocument {
    @ObjectIdColumn()
    id: string;

    @Column({
        unique: true
    })
    did: string;

    @Column()
    document: any;

    @CreateDateColumn()
    createDate: Date;

    @UpdateDateColumn()
    updateDate: Date;

    @Column()
    status: DidDocumentStatus;

    @BeforeInsert()
    setDefaults() {
        this.status = DidDocumentStatus.NEW;
    }
}
