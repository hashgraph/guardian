import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

/**
 * Document state
 */
@Entity()
export class DocumentState {
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
     * Document id
     */
    @Column()
    documentId: string;

    /**
     * State status
     */
    @Column()
    status: string;

    /**
     * State reason
     */
    @Column()
    reason: string;
}
