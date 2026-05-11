import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    Unique,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('business_view')
@Unique(['sourceTimestamp', 'viewType'])
@Index(['viewType', 'registryDid'])
// Partial unique index for the eager project mapper's ON CONFLICT clause.
// Declared on the entity so TypeORM's `synchronize: true` creates it and
// stops dropping it on every restart.
@Index('idx_business_view_project_key', ['projectKey'], {
    unique: true,
    where: `"viewType" = 'PROJECT' AND "projectKey" IS NOT NULL`,
})
export class BusinessView {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Index()
    @Column({ type: 'varchar', length: 30 })
    viewType: string;

    @Index()
    @Column({ type: 'varchar', length: 30 })
    sourceTimestamp: string;

    @Index()
    @Column({ type: 'varchar', length: 200, nullable: true })
    registryDid: string | null;

    @Index()
    @Column({ type: 'varchar', length: 30, nullable: true })
    relatedTopicId: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    displayName: string | null;

    @Column({ type: 'jsonb', nullable: true })
    businessData: Record<string, unknown> | null;

    @Column({ type: 'text', nullable: true })
    searchText: string | null;

    /**
     * Stable dedup key for PROJECT rows (typically credentialSubject.id). Used
     * by the eager project mapper's ON CONFLICT clause via the partial unique
     * index created in schema-bootstrap.ts. Null for non-PROJECT view types.
     */
    @Column({ type: 'varchar', length: 120, nullable: true })
    projectKey: string | null;

    @Column({ type: 'bigint' })
    lastUpdate: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
