import {Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn} from 'typeorm';

/**
 * Block state
 */
@Entity()
export class BlockState {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Created at
     */
    @CreateDateColumn()
    created: Date;

    /**
     * Updated at
     */
    @UpdateDateColumn()
    updated: Date;

    /**
     * Policy id
     */
    @Column()
    policyId: string;

    /**
     * Block id
     */
    @Column()
    blockId: string;

    /**
     * block state
     */
    @Column()
    blockState: string;
}
