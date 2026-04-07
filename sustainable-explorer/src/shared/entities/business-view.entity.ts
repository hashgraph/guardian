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

    @Column({ type: 'bigint' })
    lastUpdate: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
