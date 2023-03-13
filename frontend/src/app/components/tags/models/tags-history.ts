import { TagItem } from './tag-item';
import { TagMapItem } from './tag-map-item';


export class TagsHistory {
    public readonly entity: string;
    public readonly target: string;
    public readonly owner: string;

    private _history: TagItem[] | undefined;
    private _items: TagMapItem[];
    private _top: TagMapItem | undefined;

    constructor(entity: string, target: string, owner: string) {
        this.entity = entity;
        this.target = target;
        this.owner = owner;
        this._items = [];
    }

    private mapping(tags: TagItem[]): TagMapItem[] {
        const idMap = new Map<string, TagItem>();
        for (const tag of tags) {
            idMap.set(tag.uuid, tag);
        }
        const tagMap = new Map<string, TagItem[]>();
        for (const tag of idMap.values()) {
            if (tag.operation !== 'DELETE') {
                const m = tagMap.get(tag.name) || [];
                m.push(tag);
                tagMap.set(tag.name, m);
            }
        }
        const result: TagMapItem[] = [];
        for (const [key, value] of tagMap.entries()) {
            const owner = !!value.find((e: any) => e.owner === this.owner);
            result.push({
                name: key,
                owner,
                count: value.length,
                items: value
            });
        }
        return result;
    }

    private getTop(tags: TagMapItem[]): TagMapItem | undefined {
        let main = tags[0];
        for (const tag of tags) {
            if (tag.count >= main.count) {
                main = tag;
            }
        }
        return main;
    }

    public setData(tags: TagItem[] | undefined): void {
        this._history = tags;
        if (this._history) {
            this._items = this.mapping(this._history);
            this._top = this.getTop(this._items);
        } else {
            this._items = [];
            this._top = undefined;
        }
    }

    public get items(): TagMapItem[] {
        return this._items;
    }

    public get top(): TagMapItem | undefined {
        return this._top;
    }

    public get count(): number {
        return this._items.length;
    }

    public create(tag: any): TagItem {
        tag.entity = this.entity;
        tag.target = this.target;
        return tag;
    }

    public add(data: TagItem): void {
        if (!this._history) {
            this._history = [];
        }
        this._history.push(data);
        this._items = this.mapping(this._history);
        this._top = this.getTop(this._items);
    }

    public delete(data: TagItem): void {
        if (!this._history) {
            this._history = [];
        }
        this._history.push({ ...data, operation: 'DELETE' });
        this._items = this.mapping(this._history);
        this._top = this.getTop(this._items);
    }

    public get(item?: TagMapItem): TagMapItem | undefined {
        if (item) {
            const result = this._items.find(t => t.name === item.name);
            if (result) {
                return result;
            } else {
                return this._items[0];
            }
        } else {
            return this._items[0];
        }
    }
}
