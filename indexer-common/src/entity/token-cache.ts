import { Entity, Property, PrimaryKey, SerializedPrimaryKey, Unique, Index } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
@Unique({ name: 'token_id', properties: ['tokenId'] })
@Index({ name: 'status', properties: ['status'] })
@Index({ name: 'last_update', properties: ['lastUpdate'] })
@Index({ name: 'has_next', properties: ['hasNext'] })
export class TokenCache {
    @PrimaryKey()
    _id: ObjectId;

    @SerializedPrimaryKey()
    id!: string;

    @Property()
    tokenId: string;

    @Property()
    status: string;

    @Property()
    lastUpdate: number;

    @Property()
    serialNumber: number;

    @Property()
    hasNext: boolean;

    @Property()
    name: string;

    @Property()
    symbol: string;

    @Property()
    type: string;

    @Property()
    treasury: string;

    @Property()
    memo: string;

    @Property()
    totalSupply: any;

    @Property({ nullable: true })
    decimals?: string;
}
