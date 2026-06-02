import { Message as IMessage, MessageAction, MessageType } from '@indexer/interfaces';
import { Entity, Enum, Index, PrimaryKey, Property, SerializedPrimaryKey, Unique } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
@Unique({ name: 'consensus_timestamp', properties: ['consensusTimestamp'] })
@Index({ name: 'topicId', properties: ['topicId'] })
@Index({ name: 'status', properties: ['status'] })
@Index({ name: 'type', properties: ['type'] })
@Index({ name: 'files', properties: ['files'] })
@Index({ name: 'last_update', properties: ['lastUpdate'] })
@Index({ name: 'loaded', properties: ['loaded'] })
export class Message implements IMessage {
    @PrimaryKey()
    _id: ObjectId;

    @SerializedPrimaryKey()
    id!: string;

    @Property()
    lastUpdate: number;

    @Property()
    topicId: string;

    @Property()
    consensusTimestamp: string;

    @Property()
    owner: string;

    @Property({ nullable: true })
    uuid: string;

    @Property({ nullable: true })
    status: string;

    @Property({ nullable: true })
    statusReason: string;

    @Enum({ nullable: true, type: () => MessageType })
    type: MessageType;

    @Enum({ nullable: true, type: () => MessageAction })
    action: MessageAction;

    @Property({ nullable: true })
    lang: string;

    @Property({ nullable: true })
    responseType: string;

    @Property({ nullable: true })
    statusMessage: string;

    @Property({ nullable: true })
    statusOwner: string;

    @Property({ nullable: true })
    options: any;

    @Property({ nullable: true })
    virtual?: boolean;

    @Property({ nullable: true, type: 'unknown' })
    analytics?: {
        registryId?: string;
        schemaId?: string;
        schemaName?: string;
        policyId?: string;
        policyIds?: string[];
        textSearch?: string;
        childSchemas?: any[];
        owner?: string;
        issuer?: string;
        tools?: any[];
        tokens?: string[];
        vcCount?: number;
        vpCount?: number;
        tokensCount?: number;
        hash?: string;
        hashMap?: any;
        properties?: string[];
        tokenId?: string,
        labels?: string[];
        labelName?: string;
        dynamicTopics?: string[];
        unpacked?: boolean;
        tableFiles?: Record<string, string>;
    };

    @Property({ nullable: true })
    analyticsUpdate?: number;

    @Property({ nullable: true })
    coordUpdate?: number;

    @Property({ nullable: true })
    files: string[];

    @Property({ nullable: true })
    documents: any[];

    @Property({ nullable: true })
    topics: string[];

    @Property({ nullable: true })
    tokens: string[];

    @Property({ nullable: true })
    sequenceNumber?: number;

    @Property({ nullable: true })
    loaded: boolean;
}
