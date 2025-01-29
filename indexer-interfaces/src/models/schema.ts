import { ISchemaDocument, SchemaField, SchemaCondition } from '../interfaces/index.js';
import { SchemaHelper } from '../helpers/index.js';

/**
 * Schema class
 */
export class Schema {
    /**
     * IRI
     */
    public iri?: string;
    /**
     * Name
     */
    public name?: string;
    /**
     * Document
     */
    public document?: ISchemaDocument;
    /**
     * Fields
     */
    public fields: SchemaField[];
    /**
     * Conditions
     */
    public conditions: SchemaCondition[];
    /**
     * Schema constructor
     * @param schema
     * @param includeSystemProperties
     * @constructor
     */
    constructor(document: any, public contextURL: string) {
        if (document) {
            if (typeof document === 'string') {
                this.document = JSON.parse(document);
            } else {
                this.document = document;
            }
        } else {
            this.document = null;
        }
        if (this.document) {
            this.iri = this.document.$id || '';
            this.name = this.document.title || '';
            this.parseDocument();
        }
    }

    /**
     * Parse document
     * @private
     */
    private parseDocument(): void {
        const schemaCache = new Map<string, any>();
        this.fields = SchemaHelper.parseFields(
            this.document,
            this.contextURL,
            schemaCache,
            null,
            true
        );
        this.conditions = SchemaHelper.parseConditions(
            this.document,
            this.contextURL,
            this.fields,
            schemaCache
        );
    }

    /**
     * Get all fields
     */
    public getFields(): SchemaField[] {
        return this._getFields([], this.fields);
    }

    /**
    * Get all fields
    */
    private _getFields(result: SchemaField[], fields?: SchemaField[]): SchemaField[] {
        if (Array.isArray(fields)) {
            for (const field of fields) {
                result.push(field);
                this._getFields(result, field.fields);
            }
        }
        return result;
    }

    /**
     * Get field
     */
    public getField(path: string): SchemaField | null {
        return this._getField(path, this.fields);
    }

    /**
     * Get field
     */
    private _getField(path: string, fields?: SchemaField[]): SchemaField | null {
        if (Array.isArray(fields)) {
            for (const field of fields) {
                if (field.path === path) {
                    return field;
                }
                const result = this._getField(path, field.fields);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }
}
