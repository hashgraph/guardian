import { DataBaseHelper, Message } from '@indexer/common';
import { MongoDriver, MongoEntityManager } from '@mikro-orm/mongodb';


class RelationshipItem {
    public readonly id: string;
    public readonly uuid: string;
    public readonly item: Message;
    public readonly type: string;
    public readonly topicId: string;
    public readonly ids: Set<string>;
    public readonly relationships: Set<string>;

    private _id: string;
    private _history: Message[];

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
        this.relationships = new Set<string>();
        this.setRelationships(this.item);

        this._id = this.id;
        this._history = null;
    }

    public setHistory(items: Message[]) {
        if (items.length) {
            this._history = items;
            this._id = items[0].consensusTimestamp;
            for (const item of items) {
                this.ids.add(item.consensusTimestamp);
                this.setRelationships(item);
            }
        }
    }

    public has(messageId: string): boolean {
        return this.ids.has(messageId);
    }

    private setRelationships(item: Message): void {
        if (Array.isArray(item?.options?.relationships)) {
            for (const id of item.options.relationships) {
                this.relationships.add(id)
            }
        }
    }

    public toObject() {
        return {
            id: this.groupId,
            uuid: this.uuid,
            type: this.type,
            topicId: this.topicId,
            versions: Array.from(this.ids),
        }
    }
}

export class RelationshipsUtils {
    private readonly em: MongoEntityManager<MongoDriver>;
    private readonly messages: RelationshipItem[];
    private readonly target: Message;

    constructor(target: Message) {
        this.em = DataBaseHelper.getEntityManager();
        this.messages = [];
        this.target = target;
    }

    public async load() {
        await this.findRelationships(this.target.consensusTimestamp);
        const relationships = this.messages.map((m) => m.toObject());
        const links = [];
        for (const message of this.messages) {
            for (const link of message.relationships) {
                const source = this.messages.find((m) => m.has(link));
                links.push({
                    source: source.groupId,
                    target: message.groupId,
                    type: 'relationships'
                })
            }
        }
        return {
            target: relationships[0],
            relationships,
            links
        };
    }

    private async loadHistory(item: Message | RelationshipItem): Promise<Message[]> {
        return await this.em.find(Message, {
            uuid: item.uuid,
            type: item.type
        }, {
            orderBy: {
                consensusTimestamp: 'ASC'
            }
        });
    }

    private async findRelationships(messageId: string): Promise<void> {
        for (const e of this.messages) {
            if (e.has(messageId)) {
                return;
            }
        }

        const item = await this.em.findOne(Message, { consensusTimestamp: messageId });
        const target = new RelationshipItem(messageId, item);
        const history = await this.loadHistory(target);
        target.setHistory(history);

        this.messages.push(target);

        for (const id of target.relationships) {
            await this.findRelationships(id);
        }

    }
}


