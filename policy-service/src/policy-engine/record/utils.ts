import { RecordItem } from './record-item';

export interface IGenerateValue<T> {
    readonly oldValue: T;
    readonly newValue: T;
    replace<U>(value: U): U;
}

export class GenerateUUID implements IGenerateValue<string> {
    public readonly oldValue: string;
    public readonly newValue: string;

    private readonly _map: Map<string, string>;

    constructor(oldValue: string, newValue: string) {
        this.oldValue = oldValue;
        this.newValue = newValue;
        this._map = new Map<string, string>();
        this._map.set(this.oldValue, this.newValue);
        this._map.set(`urn:uuid:${this.oldValue}`, `urn:uuid:${this.newValue}`);
    }

    public replace<U>(value: U): U {
        if (typeof value === 'string' && this._map.has(value)) {
            return this._map.get(value) as U;
        }
        return value;
    }
}

export class GenerateDID implements IGenerateValue<string> {
    public readonly oldValue: string;
    public readonly newValue: string;

    constructor(oldValue: string, newValue: string) {
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    public replace<U>(value: U): U {
        if (typeof value === 'string' && value === this.oldValue) {
            return this.newValue as U;
        }
        return value;
    }
}

export class RowDocument {
    public readonly parent: any;
    public readonly key: any;
    public readonly type: 'vc' | 'vp' | 'did';
    public readonly filters: any;

    constructor(document: any, parent: any, key: any) {
        this.parent = parent;
        this.key = key;
        this.type = this.getRowType(document);
        this.filters = { 'document.id': document.document.id };
    }

    private getRowType(obj: any): 'vc' | 'vp' | 'did' {
        if (obj.dryRunClass === 'VcDocumentCollection') {
            return 'vc';
        }
        if (obj.dryRunClass === 'VpDocumentCollection') {
            return 'vp';
        }
        if (obj.dryRunClass === 'DidDocumentCollection') {
            return 'did';
        }
        if (obj.did) {
            return 'did';
        }
        if (obj.schema) {
            return 'vc';
        }
        return 'vp';
    }

    public replace(root: any, row: any): any {
        if (row) {
            if (this.parent && this.key) {
                this.parent[this.key] = row;
                return root;
            } else {
                return row;
            }
        } else {
            return root;
        }
    }

    public static check(obj: any): boolean {
        return obj && obj.id && obj._id && obj.document && obj.document.id;
    }
}

export class Utils {
    /**
     * Replace all values
     * @param obj
     * @param value
     */
    public static replaceAllValues(obj: any, value: IGenerateValue<any>): any {
        if (!obj) {
            return obj;
        }
        if (typeof obj === 'object') {
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    obj[i] = Utils.replaceAllValues(obj[i], value);
                }
            } else {
                const keys = Object.keys(obj);
                for (const key of keys) {
                    obj[key] = Utils.replaceAllValues(obj[key], value);
                }
            }
        }
        return value.replace(obj);
    }

    /**
     * Find all documents
     * @param obj
     * @param results
     */
    public static _findAllDocuments(obj: any, results: RowDocument[], parent: any, parentKey: any): void {
        if (obj && typeof obj === 'object') {
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    Utils._findAllDocuments(obj[i], results, obj, i);
                }
            } else {
                if (RowDocument.check(obj)) {
                    results.push(new RowDocument(obj, parent, parentKey));
                } else {
                    const keys = Object.keys(obj);
                    for (const key of keys) {
                        Utils._findAllDocuments(obj[key], results, obj, key);
                    }
                }
            }
        }
    }

    /**
     * Find all documents
     * @param obj
     * @param results
     */
    public static findAllDocuments(obj: any): RowDocument[] {
        const results: RowDocument[] = [];
        if (obj && typeof obj === 'object') {
            Utils._findAllDocuments(obj, results, null, null);
        }
        return results;
    }
}

export class RecordItemStack {
    private _items: RecordItem[];
    private _index: number;

    constructor() {
        this._items = [];
        this._index = 0;
    }

    public setItems(items: RecordItem[]): void {
        if (Array.isArray(items)) {
            this._items = items;
        } else {
            this._items = [];
        }
        this._index = 0;
    }

    public clearIndex(): void {
        this._index = 0;
    }

    public nextIndex(): void {
        this._index++;
    }

    public next(): RecordItem | undefined {
        this._index++;
        return this._items[this._index];
    }

    public prev(): RecordItem | undefined {
        this._index--;
        return this._items[this._index];
    }

    public get current(): RecordItem | undefined {
        return this._items[this._index];
    }

    public get index(): number {
        return this._index;
    }

    public get items(): RecordItem[] {
        return this._items;
    }

    public get count(): number {
        return this._items.length;
    }
}
