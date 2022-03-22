import { IRootConfig, RootState } from 'interfaces';
import { Column, Entity, ObjectIdColumn } from 'typeorm';

@Entity()
export class RootConfig implements IRootConfig {
    @ObjectIdColumn()
    id: string;

    @Column()
    hederaAccountId: string;

    @Column()
    hederaAccountKey: string;
    
    @Column()
    did: string;
}
