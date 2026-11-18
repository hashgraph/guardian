export class DocumentMap {
    _current;
    _map;
    constructor() {
        this._map = new Map();
    }
    addDocument(document) {
        this._current = document.document;
        this._map.set(document.schema, document.document);
    }
    addRelationships(documents) {
        if (Array.isArray(documents)) {
            for (const document of documents) {
                this._map.set(document.schema, document.document);
            }
        }
    }
    getDocument(schema) {
        if (schema) {
            return this._map.get(schema);
        }
        else {
            return this._current;
        }
    }
    getCurrent() {
        return this._current;
    }
    getRelationships() {
        const documents = [];
        for (const [schema, document] of this._map.entries()) {
            if (this._current !== document) {
                documents.push({
                    schema,
                    document
                });
            }
        }
        return documents;
    }
    toJson() {
        const relationships = {};
        for (const [schema, document] of this._map.entries()) {
            relationships[schema] = document;
        }
        return {
            target: this._current,
            relationships
        };
    }
    static from(json) {
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
