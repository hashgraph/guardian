import { Message } from '@indexer/common';
import { MongoDriver, MongoEntityManager } from '@mikro-orm/mongodb';
import { MessageType } from '@indexer/interfaces';

export class SchemaTreeNode {
    public readonly id: string;
    public readonly label: string;
    public readonly color: string;
    public children: SchemaTreeNode[];
    private _expanded = false;

    constructor(
        id: string,
        name: string,
        private readonly _em: MongoEntityManager<MongoDriver>
    ) {
        this.id = id;
        this.label = name;
        this.color = this.generateColor(id);
    }

    async loadChildren(children: any[]) {
        this.children = await Promise.all(
            children.map(async (child) => {
                const childSchema = await this._em.findOne(Message, {
                    type: MessageType.SCHEMA,
                    consensusTimestamp: child.id,
                });
                return new SchemaTreeNode(
                    child.id,
                    child.name,
                    this._em
                ).loadChildren(childSchema.analytics.childSchemas);
            })
        );
        if (this.children.length > 0) {
            this._expanded = true;
        }
        return this;
    }

    private generateColor(str: string) {
        let hash = 0;
        str.split('').forEach((char) => {
            // tslint:disable-next-line:no-bitwise
            hash = char.charCodeAt(0) + ((hash << 5) - hash);
        });
        let colour = '#';
        for (let i = 0; i < 3; i++) {
            // tslint:disable-next-line:no-bitwise
            const value = (hash >> (i * 8)) & 0xff;
            colour += value.toString(16).padStart(2, '0');
        }
        return colour;
    }

    public toObject() {
        return {
            label: this.label,
            expanded: this._expanded,
            data: {
                id: this.id,
                color: this.color,
            },
            children: this.children.map((child) => child.toObject()),
        };
    }
}
