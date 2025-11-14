import { FieldModel } from './field.model.js';
import { SchemaDocumentModel } from './schema-document.model.js';
import { CompareOptions, IIdLvl, IPolicyRawData, ISchemaRawData, IToolRawData } from '../interfaces/index.js';
import { Hash3 } from '../hash/utils.js';

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
     * Is empty schema
     * @public
     */
    public readonly empty: boolean;

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
     * IRI
     * @public
     */
    public get iri(): string {
        return this._iri;
    }

    /**
     * IRI
     * @private
     */
    private _iri: string;

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
        schema: ISchemaRawData,
        options: CompareOptions
    ) {
        this.options = options;

        this._weight = this._weightDocument = '';

        if (!schema) {
            this.id = this.name = this.uuid = this.description = this.topicId = this.version = '';
            this._iri = '';
            this.empty = true;
            return;
        }

        this.empty = false;

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
        this._iri = iri;
        if (document) {
            const parsedDocument = typeof document === 'string' ? JSON.parse(document) : document;
            this.document = SchemaDocumentModel.from(parsedDocument);
            this.document.update(this.options);
        }
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
        const hashUtils = new Hash3();

        hashUtils.clear();
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

        hashUtils.clear();
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
    public setPolicy(policy: IPolicyRawData): SchemaModel {
        this._policyName = policy?.name;
        return this;
    }

    /**
     * Set tool
     * @param tool
     * @public
     */
    public setTool(tool: IToolRawData): SchemaModel {
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
     * Create model
     * @param policy
     * @param options
     * @public
     * @static
     */
    public static fromEntity(
        schema: ISchemaRawData,
        policy: IPolicyRawData,
        options: CompareOptions
    ): SchemaModel {
        if (!schema) {
            throw new Error('Unknown schema');
        }
        const schemaModel = new SchemaModel(schema, options);
        schemaModel.setPolicy(policy);
        schemaModel.update(options);
        return schemaModel;
    }

    /**
     * Create empty model
     * @param policy
     * @param options
     * @public
     * @static
     */
    public static empty(iri: string, options: CompareOptions) {
        const model = new SchemaModel(null, options);
        model._iri = iri;
        model.update(options);
        return model;
    }
}