import { Entity, Property, PrimaryKey, SerializedPrimaryKey, Unique, Index } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';


@Entity()
@Index({ name: 'token_id', properties: ['tokenId'] })
@Index({ name: 'serial_number', properties: ['serialNumber'] })
@Unique({ name: 'unique_id', properties: ['tokenId', 'serialNumber'] })
@Index({ name: 'last_update', properties: ['lastUpdate'] })
export class NftCache {
    @PrimaryKey()
    _id: ObjectId;

    @SerializedPrimaryKey()
    id!: string;

    @Property()
    tokenId: string;

    @Property()
    lastUpdate: number;

    @Property()
    serialNumber: number;

    @Property()
    metadata: string;
}
