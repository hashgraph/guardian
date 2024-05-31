import { DataBaseHelper, Message } from '@indexer/common';
import { MongoDriver, MongoEntityManager } from '@mikro-orm/mongodb';
import { MessageType } from '@indexer/interfaces';

const categories = [
    MessageType.STANDARD_REGISTRY,
    MessageType.INSTANCE_POLICY,
    MessageType.SCHEMA,
    MessageType.ROLE_DOCUMENT,
    MessageType.VC_DOCUMENT,
    MessageType.VP_DOCUMENT,
];

class RelationshipItem {
    public readonly id: string;
    public readonly uuid: string;
    public readonly item: Message;
    public readonly type: string;
    public readonly topicId: string;
    public readonly ids: Set<string>;

    private _id: string;
    private _category: number;
    private _name: string;

    public get groupId(): string {
        return this._id;
    }

    constructor(id: string, item: Message) {
        this.id = id;
        if (item) {
            this.item = item;
            this.topicId = item.topicId;
            this.uuid = item.uuid;
            this.type = item.type;
        }

        this.ids = new Set<string>();
        this.ids.add(this.id);
        this._id = this.id;
        this._setCategory();
        this._setName(item);
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
            default:
                break;
        }
    }

    private _setCategory() {
        this._category = categories.findIndex(
            (item) => this.item.type === item
        );
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

    public toObject() {
        return {
            id: this.groupId,
            uuid: this.uuid,
            type: this.type,
            category: this._category,
            name: this._name,
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
            categories: [
                {
                    name: 'Registry',
                },
                {
                    name: 'Policy',
                },
                {
                    name: 'Schema',
                },
                {
                    name: 'Role',
                },
                {
                    name: 'VC',
                },
                {
                    name: 'VP',
                },
            ],
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

        switch (item.type) {
            case MessageType.INSTANCE_POLICY: {
                await this.findRelationships(
                    item.analytics?.registryId,
                    historyItem ? parentId : item.consensusTimestamp
                );
                break;
            }
            case MessageType.SCHEMA: {
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
            case MessageType.VC_DOCUMENT: {
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
            default:
                break;
        }

        if (!historyItem) {
            const target = new RelationshipItem(messageId, item);
            const history = await this.loadHistory(item);
            target.setHistory(history);
            this.messages.set(messageId, new RelationshipItem(messageId, item));
            if (parentId) {
                this.links.push({
                    source: messageId,
                    target: parentId,
                    type: 'relationships',
                });
            }
        }
    }
}
