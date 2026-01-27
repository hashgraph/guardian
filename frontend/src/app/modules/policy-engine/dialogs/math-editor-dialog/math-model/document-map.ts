import { IMathDocument } from "./math.interface";

export class DocumentMap {
    private _current: any;
    private _map: Map<string, any>;

    constructor() {
        this._map = new Map<string, any>();
    }

    public addDocument(document: IMathDocument) {
        this._current = document.value;
        this._map.set(document.schema, document.value);
    }

    public addRelationships(documents: IMathDocument[]) {
        if (Array.isArray(documents)) {
            for (const document of documents) {
                this._map.set(document.schema, document.value);
            }
        }
    }

    public getDocument(schema: string | null) {
        if (schema) {
            return this._map.get(schema);
        } else {
            return this._current;
        }
    }

    public getCurrent() {
        return this._current;
    }
}