import { ISchemaDocument, SchemaField, SchemaCondition } from '../interfaces/index.js';
import { SchemaHelper } from '../helpers/index.js';

/**
 * Schema class
 */
export class Schema {
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
}
