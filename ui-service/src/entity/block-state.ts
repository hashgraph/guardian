import {Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn} from 'typeorm';

@Entity()
export class BlockState {
    @ObjectIdColumn()
    id: string;

    @CreateDateColumn()
    created: Date;

    @UpdateDateColumn()
    updated: Date;

    @Column()
    policyId: string;

    @Column()
    blockId: string;

    @Column()
    blockState: string;
}
