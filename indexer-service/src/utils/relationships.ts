import { DataBaseHelper, Message } from '@indexer/common';
import { MongoDriver, MongoEntityManager } from '@mikro-orm/mongodb';
import { MessageType, Relationship, RELATIONSHIP_CATEGORIES, TagType } from '@indexer/interfaces';

const categories = [
    MessageType.STANDARD_REGISTRY,
    MessageType.INSTANCE_POLICY,
    MessageType.SCHEMA,
    MessageType.ROLE_DOCUMENT,
    MessageType.VC_DOCUMENT,
    MessageType.VP_DOCUMENT,
    MessageType.TOKEN,
];

class RelationshipItem {
    public readonly id: string;
    public readonly uuid: string;
    public readonly item: Message;
    public readonly type: MessageType;
    public readonly topicId: string;
    public readonly ids: Set<string>;

    private _id: string;
    private _category: number;
    private _name: string;
    private _tagsCount: number;

    public get groupId(): string {
        return this._id;
    }

    constructor(id: string, item: Message, tagsCount?: number) {
        this.id = id;
        if (item) {
            this.item = item;
            this.topicId = item.topicId;
            this.uuid = item.uuid;
            this.type = item.type as MessageType;
        }

        this.ids = new Set<string>();
        this.ids.add(this.id);
        this._id = this.id;
        this._setCategory();
        this._setName(item);
        this._setTagsCount(tagsCount);
    }

    private _setName(item: Message) {
        switch (item.type) {
            case MessageType.INSTANCE_POLICY:
            case MessageType.SCHEMA:
                this._name = item.options?.name;
                break;
            case MessageType.VC_DOCUMENT:
                if (item.analytics?.schemaName) {
                    this._name = item.analytics?.schemaName + ' Document';
                }
                break;
            case MessageType.ROLE_DOCUMENT:
                this._name = item.options?.role;
                break;
            case MessageType.TOKEN:
                this._name = item.options?.tokenName;
                break;
            default:
                break;
        }
    }

    private _setCategory() {
        this._category = categories.findIndex(
            (item) => this.item.type === item
        );
    }

    private _setTagsCount(tagsCount: number) {
        this._tagsCount = tagsCount || 0;
    }

    public setHistory(items: Message[]) {
        if (items.length) {
            this._id = items[0].consensusTimestamp;
            for (const item of items) {
                this.ids.add(item.consensusTimestamp);
            }
        }
    }

    public has(messageId: string): boolean {
        return this.ids.has(messageId);
    }

    public toObject(): Relationship {
        return {
            id: this.groupId,
            uuid: this.uuid,
            type: this.type,
            category: this._category,
            name: this._name,
            tagsCount: this._tagsCount,
        };
    }
}

export class Relationships {
    private readonly em: MongoEntityManager<MongoDriver>;
    private readonly messages: Map<string, RelationshipItem>;
    private readonly links: any[] = [];
    private readonly target: Message;

    constructor(target: Message) {
        this.em = DataBaseHelper.getEntityManager();
        this.messages = new Map();
        this.target = target;
    }

    public async load() {
        await this.findRelationships(this.target.consensusTimestamp);
        return {
            target: new RelationshipItem(
                this.target.consensusTimestamp,
                this.target
            ).toObject(),
            relationships: [...this.messages.values()].map((message) =>
                message.toObject()
            ),
            links: this.links,
            categories: RELATIONSHIP_CATEGORIES,
        };
    }

    private async loadHistory(
        item: Message | RelationshipItem
    ): Promise<Message[]> {
        return await this.em.find(
            Message,
            {
                uuid: item.uuid,
                type: item.type,
            },
            {
                orderBy: {
                    consensusTimestamp: 'ASC',
                },
            }
        );
    }

    private async findRelationships(
        messageId: string,
        parentId?: string
    ): Promise<void> {
        if (this.messages.has(messageId)) {
            if (parentId) {
                this.links.push({
                    source: messageId,
                    target: parentId,
                    type: 'relationships',
                });
            }
            return;
        }
        for (const message of this.messages.values()) {
            if (message.has(messageId)) {
                return;
            }
        }
        const item = await this.em.findOne(Message, {
            consensusTimestamp: messageId,
        });
        if (!item) {
            return;
        }
        let historyItem = false;
        for (const message of this.messages.values()) {
            historyItem ||= message.has(messageId);
        }

        let tagsCount = 0;

        switch (item.type) {
            case MessageType.INSTANCE_POLICY: {
                tagsCount = await this.em.count(Message, {
                    type: MessageType.TAG,
                    'options.entity': TagType.Policy,
                    topicId: item.topicId,
                } as any);
                await this.findRelationships(
                    item.analytics?.registryId,
                    historyItem ? parentId : item.consensusTimestamp
                );
                break;
            }
            case MessageType.SCHEMA: {
                tagsCount = await this.em.count(Message, {
                    type: MessageType.TAG,
                    'options.entity': TagType.Schema,
                    topicId: item.topicId,
                } as any);
                if (item.analytics?.policyIds) {
                    for (const policyId of item.analytics.policyIds) {
                        await this.findRelationships(
                            policyId,
                            historyItem ? parentId : item.consensusTimestamp
                        );
                    }
                }
                break;
            }
            case MessageType.TOKEN: {
                tagsCount = await this.em.count(Message, {
                    type: MessageType.TAG,
                    'options.entity': TagType.Token,
                    topicId: item.topicId,
                } as any);
                break;
            }
            case MessageType.MODULE: {
                tagsCount = await this.em.count(Message, {
                    type: MessageType.TAG,
                    'options.entity': TagType.Module,
                    topicId: item.topicId,
                } as any);
                break;
            }
            case MessageType.VC_DOCUMENT: {
                tagsCount = await this.em.count(Message, {
                    type: MessageType.TAG,
                    'options.entity': TagType.PolicyDocument,
                    topicId: item.topicId,
                } as any);
                if (item.options?.relationships) {
                    for (const id of item.options.relationships) {
                        await this.findRelationships(
                            id,
                            historyItem ? parentId : item.consensusTimestamp
                        );
                    }
                }
                await this.findRelationships(
                    item.analytics?.schemaId,
                    historyItem ? parentId : item.consensusTimestamp
                );
                await this.findRelationships(
                    item.analytics?.policyId,
                    historyItem ? parentId : item.consensusTimestamp
                );
                break;
            }
            case MessageType.ROLE_DOCUMENT: {
                await this.findRelationships(
                    item.analytics?.policyId,
                    historyItem ? parentId : item.consensusTimestamp
                );
                break;
            }
            case MessageType.VP_DOCUMENT: {
                tagsCount = await this.em.count(Message, {
                    type: MessageType.TAG,
                    'options.entity': TagType.PolicyDocument,
                    topicId: item.topicId,
                } as any);
                if (item.options?.relationships) {
                    for (const id of item.options.relationships) {
                        await this.findRelationships(
                            id,
                            historyItem ? parentId : item.consensusTimestamp
                        );
                    }
                }
                break;
            }
            case MessageType.STANDARD_REGISTRY: {
                const policyMessages = await this.em.find(Message, {
                    type: MessageType.INSTANCE_POLICY,
                    'options.owner': item.options.did
                } as any);

                for (const policy of policyMessages) {
                    const policyTagsCount = await this.em.count(Message, {
                        type: MessageType.TAG,
                        'options.entity': TagType.Policy,
                        topicId: policy.topicId,
                    } as any);
                    this.messages.set(policy.consensusTimestamp, new RelationshipItem(policy.consensusTimestamp, policy, policyTagsCount));
                    this.links.push({
                        source: messageId,
                        target: policy.consensusTimestamp,
                        type: 'relationships',
                    });
                }
            }
            case MessageType.CONTRACT: {
                tagsCount = await this.em.count(Message, {
                    type: MessageType.TAG,
                    'options.entity': TagType.Contract,
                    topicId: item.topicId,
                } as any);
                break;
            }
            case MessageType.TOOL: {
                tagsCount = await this.em.count(Message, {
                    type: MessageType.TAG,
                    'options.entity': TagType.Tool,
                    topicId: item.topicId,
                } as any);
                break;
            }
            default:
                break;
        }

        if (!historyItem) {
            const target = new RelationshipItem(messageId, item);
            const history = await this.loadHistory(item);
            target.setHistory(history);
            this.messages.set(messageId, new RelationshipItem(messageId, item, tagsCount));
            if (parentId) {
                this.links.push({
                    source: messageId,
                    target: parentId,
                    type: 'relationships',
                });
            }
        }

        if (item?.analytics?.tokens?.length > 0) {
            const tokenMessages = await this.em.find(Message, {
                topicId: item.topicId,
                type: MessageType.TOKEN,
            });
            tokenMessages.forEach(token => {
                this.messages.set(token.tokens[0], new RelationshipItem(token.tokens[0], token));
                this.links.push({
                    source: token.tokens[0],
                    target: messageId,
                    type: 'relationships',
                });
            });
        }
    }
}
