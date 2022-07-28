import { Column, Entity, ObjectIdColumn } from 'typeorm';

/**
 * PolicyRoles collection
 */
@Entity()
export class PolicyRoles {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Policy Id name
     */
    @Column()
    policyId: string;

    /**
     * User DID value
     */
    @Column()
    did: string;

    /**
     * User Role
     */
    @Column()
    role: string;
}
