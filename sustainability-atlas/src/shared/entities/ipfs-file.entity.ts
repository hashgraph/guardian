import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('ipfs_files')
export class IpfsFile {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    cid: string;

    @Column({ type: 'bytea' })
    content: Buffer;

    @Column({ type: 'int', nullable: true })
    size: number | null;

    @CreateDateColumn()
    createdAt: Date;
}
