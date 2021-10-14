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
    addressBook: string;

    @Column()
    didTopic: string;

    @Column()
    vcTopic: string;

    @Column()
    appnetName: string;

    @Column()
    didServerUrl: string;

    @Column()
    didTopicMemo: string;

    @Column()
    vcTopicMemo: string;

    @Column()
    did: string;

    @Column()
    state: RootState;
}
