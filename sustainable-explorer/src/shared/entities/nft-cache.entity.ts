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
}
