import { RecordItem } from './record-item.js';

/**
 * Generate item
 */
export interface IGenerateValue<T> {
    /**
     * Old value
     * @public
     * @readonly
     */
    readonly oldValue: T;
    /**
     * New value
     * @public
     * @readonly
     */
    readonly newValue: T;
    /**
     * Replace value
     * @param value
     * @public
     */
    replace<U>(value: U): U;
}

/**
 * Generate UUID
 */
export class GenerateUUID implements IGenerateValue<string> {
    /**
     * Old value
     * @public
     * @readonly
     */
    public readonly oldValue: string;
    /**
     * New value
     * @public
     * @readonly
     */
    public readonly newValue: string;
    /**
     * Value map
     * @private
     * @readonly
     */
    private readonly _map: Map<string, string>;

    constructor(oldValue: string, newValue: string) {
        this.oldValue = oldValue;
        this.newValue = newValue;
        this._map = new Map<string, string>();
        this._map.set(this.oldValue, this.newValue);
        this._map.set(`urn:uuid:${this.oldValue}`, `urn:uuid:${this.newValue}`);
    }

    /**
     * Replace value
     * @param value
     * @public
     */
    public replace<U>(value: U): U {
        if (typeof value === 'string' && this._map.has(value)) {
            return this._map.get(value) as U;
        }
        return value;
    }
}

/**
 * Generate DID
 */
export class GenerateDID implements IGenerateValue<string> {
    /**
     * Old value
     * @public
     * @readonly
     */
    public readonly oldValue: string;
    /**
     * New value
     * @public
     * @readonly
     */
    public readonly newValue: string;

    constructor(oldValue: string, newValue: string) {
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    /**
     * Replace value
     * @param value
     * @public
     */
    public replace<U>(value: U): U {
        if (typeof value === 'string' && value === this.oldValue) {
            return this.newValue as U;
        }
        return value;
    }
}

/**
 * Row document
 */
export class RowDocument {
    /**
     * Parent object
     * @public
     * @readonly
     */
    public readonly parent: any;
    /**
     * Path in parent object
     * @public
     * @readonly
     */
    public readonly key: any;
    /**
     * Document type
     * @public
     * @readonly
     */
    public readonly type: 'vc' | 'vp' | 'did';
    /**
     * Filters
     * @public
     * @readonly
     */
    public readonly filters: any;

    private readonly prop: any;

    constructor(document: any, parent: any, key: any) {
        this.parent = parent;
        this.key = key;
        this.type = this.getRowType(document);
        this.filters = { 'document.id': document.document.id };

        this.prop = {
            assignedToGroup: document.assignedToGroup,
            assignedTo: document.assignedTo,
            option: document.option
        }
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

    private replaceProp(row: any) {
        if (row) {
            if (this.prop.assignedToGroup) {
                row.assignedToGroup = this.prop.assignedToGroup;
            }
            if (this.prop.assignedTo) {
                row.assignedTo = this.prop.assignedTo;
            }
            if (this.prop.option) {
                row.option = this.prop.option;
            }
        }
        return row;
    }

    /**
     * Replace document in parent object
     * @param root - root object
     * @param row - new document
     * @public
     */
    public replace(root: any, row: any): any {
        if (row) {
            if (this.parent && this.key) {
                this.parent[this.key] = this.replaceProp(row);
                return root;
            } else {
                return this.replaceProp(row);
            }
        } else {
            return root;
        }
    }

    /**
     * Check document id (document has db id and document id)
     * @param obj - root object
     * @public
     */
    public static check(obj: any): boolean {
        return obj && obj.id && obj._id && obj.document && obj.document.id;
    }
}

/**
 * Utils
 */
export class Utils {
    /**
     * Replace all values
     * @param obj
     * @param value
     * @public
     * @static
     */
    public static replaceAllValues(
        obj: any,
        value: IGenerateValue<any>
    ): any {
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
     * @param parent
     * @param parentKey
     * @private
     * @static
     */
    private static _findAllDocuments(
        obj: any,
        results: RowDocument[],
        parent: any,
        parentKey: any
    ): void {
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
     * @public
     * @static
     */
    public static findAllDocuments(obj: any): RowDocument[] {
        const results: RowDocument[] = [];
        if (obj && typeof obj === 'object') {
            Utils._findAllDocuments(obj, results, null, null);
        }
        return results;
    }
}

/**
 * Record actions stack
 */
export class RecordItemStack {
    /**
     * List of actions
     */
    private _items: RecordItem[];
    /**
     * Current index
     */
    private _index: number;
    /**
     * List of actions
     */
    private _source: RecordItem[];

    constructor() {
        this._items = [];
        this._source = [];
        this._index = 0;
    }

    /**
     * Copy actions
     * @param items
     */
    private _copy(items: RecordItem[]): RecordItem[] {
        if (Array.isArray(items)) {
            const result = new Array(items.length);
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item && typeof item === 'object') {
                    result[i] = JSON.parse(JSON.stringify(item));
                } else {
                    result[i] = item;
                }
            }
            return result;
        } else {
            return [];
        }
    }

    /**
     * Set actions
     * @param items
     * @public
     */
    public setItems(items: RecordItem[]): void {
        if (Array.isArray(items)) {
            this._source = items;
        } else {
            this._source = [];
        }
        this._items = this._copy(this._source);;
        this._index = 0;
    }

    /**
     * Clear
     * @public
     */
    public clear(): void {
        this._items = this._copy(this._source);;
        this._index = 0;
    }

    /**
     * Clear index
     * @public
     */
    public clearIndex(): void {
        this._index = 0;
    }

    /**
     * Next index
     * @public
     */
    public nextIndex(): void {
        this._index++;
    }

    /**
     * Next actions
     * @public
     */
    public next(): RecordItem | undefined {
        this._index++;
        return this._items[this._index];
    }

    /**
     * Prev actions
     * @public
     */
    public prev(): RecordItem | undefined {
        this._index--;
        return this._items[this._index];
    }

    /**
     * Get current action
     * @public
     */
    public get current(): RecordItem | undefined {
        return this._items[this._index];
    }

    /**
     * Get current index
     * @public
     */
    public get index(): number {
        return this._index;
    }

    /**
     * Get all actions
     * @public
     */
    public get items(): RecordItem[] {
        return this._items;
    }

    /**
     * Get actions count
     * @public
     */
    public get count(): number {
        return this._items.length;
    }
}
