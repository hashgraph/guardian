export class DocumentMap {
    private _current: any;
    private _map: Map<string, any>;

    constructor() {
        this._map = new Map<string, any>();
    }

    private getSchema(document: any): string {
        return '';
    }

    public addDocument(document: any) {
        this._current = document;
        this._map.set(this.getSchema(document), document);
    }

    public addRelationships(documents: any[]) {
        if (Array.isArray(documents)) {
            for (const document of documents) {
                this._map.set(this.getSchema(document), document);
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