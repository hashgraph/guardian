import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    Unique,
} from 'typeorm';

@Entity('nft_cache')
@Unique(['tokenId', 'serialNumber'])
export class NftCache {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Index()
    @Column({ type: 'varchar', length: 20 })
    tokenId: string;

    @Column({ type: 'int' })
    serialNumber: number;

    @Column({ type: 'bigint' })
    lastUpdate: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    metadata: string | null;

    // Base64-decoded Guardian mint-VP consensus timestamp from `metadata`;
    // null when metadata is absent or not in consensus-timestamp form.
    @Column({ type: 'varchar', length: 30, nullable: true })
    metadataTimestamp: string | null;

    // Current holder of this serial, straight from Mirror Node. A serial held by
    // anyone other than the token's treasury has been transferred out — the only
    // transfer signal available, since Guardian writes no transfer record.
    @Column({ type: 'varchar', length: 30, nullable: true })
    accountId: string | null;

    @Column({ type: 'boolean', default: false })
    deleted: boolean;
}
