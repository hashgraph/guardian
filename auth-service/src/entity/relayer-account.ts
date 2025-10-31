import { BeforeCreate, Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * RelayerAccount collection
 */
@Entity()
@Index({ name: 'account_idx', properties: ['account', 'owner'] })
@Index({ name: 'owner_idx', properties: ['owner'] })
export class RelayerAccount extends BaseEntity {
    /**
     * Name
     */
    @Property()
    name: string;

    /**
     * Owner
     */
    @Property()
    owner: string;

    /**
     * Account
     */
    @Property()
    account: string;

    /**
     * Parent
     */
    @Property({ nullable: true })
    parent?: string;

    /**
     * Username
     */
    @Property()
    username: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.name = this.name || '';
        this.owner = this.owner || '';
        this.account = this.account || '';
    }
}
