import { IMathDocument } from './math.interface.js';

export class DocumentMap {
    private _current: any;
    private _map: Map<string, any>;

    constructor() {
        this._map = new Map<string, any>();
    }

    public addDocument(document: IMathDocument) {
        this._current = document.document;
        this._map.set(document.schema, document.document);
    }

    public addRelationships(documents: IMathDocument[]) {
        if (Array.isArray(documents)) {
            for (const document of documents) {
                this._map.set(document.schema, document.document);
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

    public getRelationships() {
        const documents: any[] = [];
        for (const [schema, document] of this._map.entries()) {
            if (this._current !== document) {
                documents.push({
                    schema,
                    document
                })
            }
        }
        return documents;
    }

    public toJson() {
        const relationships: any = {};
        for (const [schema, document] of this._map.entries()) {
            relationships[schema] = document;
        }
        return {
            target: this._current,
            relationships
        }
    }

    public static from(json: any): DocumentMap {
        const result = new DocumentMap();
        result._current = json.target;
        if (json.relationships) {
            const schemas = Object.keys(json.relationships);
            for (const schema of schemas) {
                result._map.set(schema, json.relationships[schema]);
            }
        }
        return result;
    }
}