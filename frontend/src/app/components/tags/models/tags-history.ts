import { TagItem } from './tag-item';
import { TagMapItem } from './tag-map-item';
import { TagOperation } from './tag-operation';
import { TagStatus } from './tag-status';


export class TagsHistory {
    public readonly entity: string;
    public readonly target: string;
    public readonly owner: string;

    private _data: TagItem[] | undefined;
    private _items: TagMapItem[];
    private _history: TagMapItem[];
    private _top: TagMapItem | undefined;
    private _time: string | undefined;

    constructor(entity: string, target: string, owner: string) {
        this.entity = entity;
        this.target = target;
        this.owner = owner;
        this._items = [];
        this._history = [];
    }

    private mapping(tags: TagItem[]): TagMapItem[] {
        const idMap = new Map<string, TagItem>();
        for (const tag of tags) {
            idMap.set(tag.uuid, tag);
        }
        const tagMap = new Map<string, TagItem[]>();
        for (const tag of idMap.values()) {
            if (tag.operation !== TagOperation.Delete) {
                const m = tagMap.get(tag.name) || [];
                m.push(tag);
                tagMap.set(tag.name, m);
            }
        }
        const result: TagMapItem[] = [];
        for (const [key, value] of tagMap.entries()) {
            let owner = 'other';
            for (const t of value) {
                if (t.status === TagStatus.History) {
                    owner = 'history';
                    break;
                }
                if (t.owner === this.owner) {
                    owner = 'owner';
                    break;
                }
            }
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
        this._data = tags;
        if (this._data) {
            const items = this._data.filter(t => t.status !== TagStatus.History);
            const history = this._data.filter(t => t.status === TagStatus.History);
            this._items = this.mapping(items);
            this._history = this.mapping(history);
            this._top = this.getTop(this._items);
            if (!this._top) {
                this._top = this.getTop(this._history);
            }
        } else {
            this._items = [];
            this._top = undefined;
        }
    }

    public setDate(date: string): void {
        this._time = date;
    }

    public get time(): string | undefined {
        return this._time;
    }

    public get items(): TagMapItem[] {
        return this._items;
    }

    public get history(): TagMapItem[] {
        return this._history;
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
        if (!this._data) {
            this._data = [];
        }
        this._data.push(data);
        this._items = this.mapping(this._data);
        this._top = this.getTop(this._items);
    }

    public delete(data: TagItem): void {
        if (!this._data) {
            this._data = [];
        }
        this._data.push({ ...data, operation: TagOperation.Delete });
        this._items = this.mapping(this._data);
        this._top = this.getTop(this._items);
    }

    public getItem(item?: TagMapItem): TagMapItem | undefined {
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

    public getHistory(item?: TagMapItem): TagMapItem | undefined {
        if (item) {
            const result = this._history.find(t => t.name === item.name);
            if (result) {
                return result;
            } else {
                return this._history[0];
            }
        } else {
            return this._history[0];
        }
    }
}
