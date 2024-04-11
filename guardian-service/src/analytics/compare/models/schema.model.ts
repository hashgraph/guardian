import { CompareOptions, IIdLvl } from '../interfaces/compare-options.interface.js';
import { FieldModel } from './field.model.js';
import { SchemaDocumentModel } from './schema-document.model.js';
import { Policy, PolicyTool, Schema as SchemaCollection } from '@guardian/common';
import { HashUtils } from '../utils/hash-utils.js';

/**
 * Schema Model
 */
export class SchemaModel {
    /**
     * Schema id
     * @public
     */
    public readonly id: string;

    /**
     * Schema description
     * @public
     */
    public readonly description: string;

    /**
     * Schema name
     * @public
     */
    public readonly name: string;

    /**
     * Schema uuid
     * @public
     */
    public readonly uuid: string;

    /**
     * Topic id
     * @public
     */
    public readonly topicId: string;

    /**
     * Schema version
     * @public
     */
    public readonly version: string;

    /**
     * Schema URL
     * @public
     */
    public readonly iri: string;

    /**
     * Compare Options
     * @private
     */
    private readonly options: CompareOptions;

    /**
     * Schema Model
     * @private
     */
    private readonly document: SchemaDocumentModel;

    /**
     * Fields
     * @public
     */
    public get fields(): FieldModel[] {
        if (this.document) {
            return this.document.fields;
        }
        return [];
    }

    /**
     * Weights
     * @private
     */
    private _weight: string;

    /**
     * Weights
     * @private
     */
    private _weightDocument: string;

    /**
     * Policy name
     * @private
     */
    private _policyName: string;

    /**
     * Tool name
     * @private
     */
    private _toolName: string;

    /**
     * Compare Map
     * @private
     */
    private readonly _compareMap: Map<string, number> = new Map();

    constructor(
        schema: SchemaCollection,
        options: CompareOptions
    ) {
        this.options = options;

        this._weight = this._weightDocument = '';

        if (!schema) {
            this.id = this.name = this.uuid = this.description = this.topicId = this.version = this.iri = '';
            return;
        }

        const {
            id = '',
            name = '',
            uuid = '',
            description = '',
            topicId = '',
            version = '',
            sourceVersion = '',
            iri = '',
            document = null
        } = schema;

        this.id = id;
        this.name = name;
        this.uuid = uuid;
        this.description = description;
        this.topicId = topicId;
        this.version = version || sourceVersion;
        this.iri = iri;
        if (document) {
            const parsedDocument = typeof document === 'string' ? JSON.parse(document) : document;
            this.document = SchemaDocumentModel.from(parsedDocument);
            this.document.update(this.options);
        }
    }

    public static from(data: any, options: CompareOptions): SchemaModel {
        return new SchemaModel({
            id: data.$id,
            name: data.title,
            description: data.description,
            iri: data.$id,
            document: data
        } as any, options);
    }

    /**
     * Convert class to object
     * @public
     */
    public info(): any {
        return {
            id: this.id,
            description: this.description,
            name: this.name,
            uuid: this.uuid,
            topicId: this.topicId,
            version: this.version,
            iri: this.iri,
            policy: this._policyName,
            tool: this._toolName
        };
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: CompareOptions): void {
        const hashUtils: HashUtils = new HashUtils();

        hashUtils.reset();
        hashUtils.add(this.name || '');
        hashUtils.add(this.description || '');
        if (options.idLvl === IIdLvl.All) {
            hashUtils.add(this.version || '');
            hashUtils.add(this.uuid || '');
            hashUtils.add(this.iri || '');
        }
        if (this.document) {
            hashUtils.add(this.document.hash(options));
        }
        this._weight = hashUtils.result();

        hashUtils.reset();
        if (this.document) {
            hashUtils.add(this.document.hash(options));
        }
        this._weightDocument = hashUtils.result();
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options?: CompareOptions): string {
        return this._weight;
    }

    /**
     * Set policy
     * @param policy
     * @public
     */
    public setPolicy(policy: Policy): SchemaModel {
        this._policyName = policy?.name;
        return this;
    }

    /**
     * Set tool
     * @param tool
     * @public
     */
    public setTool(tool: PolicyTool): SchemaModel {
        this._toolName = tool?.name;
        return this;
    }

    /**
     * Get field
     * @param path
     * @public
     */
    public getField(path: string): FieldModel {
        if (this.document && path) {
            return this.document.getField(path);
        }
        return null;
    }

    /**
     * Compare
     * @param schema
     * @public
     */
    public compare(schema: SchemaModel): number {
        if (this._compareMap.has(schema.iri)) {
            return this._compareMap.get(schema.iri);
        }

        if (this._weight === schema._weight) {
            this._compareMap.set(schema.iri, -1);
            return -1;
        }
        if (this._weightDocument === schema._weightDocument) {
            this._compareMap.set(schema.iri, -2);
            return -2;
        }
        if (this.document) {
            const result = this.document.compare(schema.document);
            if (result < 0) {
                this._compareMap.set(schema.iri, -3);
                return -3;
            } else {
                this._compareMap.set(schema.iri, result);
                return result;
            }
        }
        this._compareMap.set(schema.iri, 0);
        return 0;
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any {
        return {
            id: this.id,
            name: this.name,
            uuid: this.uuid,
            description: this.description,
            topicId: this.topicId,
            version: this.version,
            iri: this.iri
        };
    }
}
