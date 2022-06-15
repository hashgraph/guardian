import {Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn} from 'typeorm';

@Entity()
export class DocumentState {
    @ObjectIdColumn()
    id: string;

    @CreateDateColumn()
    created: Date;

    @Column()
    documentId: string;

    @Column()
    status: string;

    @Column()
    reason: string;
}