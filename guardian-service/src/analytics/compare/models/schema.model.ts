import { ICompareOptions } from '../interfaces/compare-options.interface';
import { FieldModel } from './field.model';
import { SubSchemaModel } from './sub-schema-model';
import MurmurHash3 from 'imurmurhash';
import { Policy, Schema as SchemaCollection } from '@guardian/common';

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
    private readonly options: ICompareOptions;

    /**
     * Schema Model
     * @private
     */
    private readonly subSchema: SubSchemaModel;

    /**
     * Fields
     * @public
     */
    public get fields(): FieldModel[] {
        if (this.subSchema) {
            return this.subSchema.fields;
        }
        return [];
    }

    /**
     * Weights
     * @private
     */
    private _weight: string;

    /**
     * Policy name
     * @private
     */
    private _policyName: string;

    constructor(
        schema: SchemaCollection,
        options: ICompareOptions
    ) {
        this.options = options;
        this.id = '';
        this.name = '';
        this.uuid = '';
        this.description = '';
        this.topicId = '';
        this.version = '';
        this.iri = '';
        this._weight = '';
        if (schema) {
            this.id = schema.id;
            this.name = schema.name;
            this.uuid = schema.uuid
            this.description = schema.description;
            this.topicId = schema.topicId;
            this.version = schema.version;
            this.iri = schema.iri;
            if (schema.document) {
                const document = (typeof schema.document === 'string') ?
                    JSON.parse(schema.document) :
                    schema.document;
                this.subSchema = new SubSchemaModel(document, 0, document?.$defs);
                this.subSchema.update(this.options);
            }
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
            policy: this._policyName
        };
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: ICompareOptions): void {
        const hashState = MurmurHash3();
        hashState.hash(this.name || '');
        hashState.hash(this.description || '');
        if (options.idLvl > 0) {
            hashState.hash(this.version || '');
            hashState.hash(this.uuid || '');
            hashState.hash(this.iri || '');
        }
        if (this.subSchema) {
            hashState.hash(this.subSchema.hash(options));
        }
        this._weight = String(hashState.result());
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options?: ICompareOptions): string {
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
}
