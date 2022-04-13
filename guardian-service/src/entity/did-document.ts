import { DidDocumentStatus, IDidObject } from 'interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class DidDocument implements IDidObject {
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

    @Column()
    messageId: string;

    @BeforeInsert()
    setDefaults() {
        this.status = this.status || DidDocumentStatus.NEW;
    }
}
