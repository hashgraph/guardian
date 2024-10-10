import { Entity, Property, PrimaryKey, SerializedPrimaryKey, Unique, Index } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
@Unique({ name: 'consensus_timestamp', properties: ['consensusTimestamp'] })
@Index({ name: 'status', properties: ['status'] })
export class ElasticCache {
    @PrimaryKey()
    _id: ObjectId;

    @SerializedPrimaryKey()
    id!: string;

    @Property()
    consensusTimestamp: string;

    @Property()
    status: number;

    @Property()
    error: any;
}