/**
 * Schema Validator
 */
import { ISchema, SchemaCategory } from '@guardian/interfaces';
import { DatabaseServer, Schema } from '@guardian/common';
import { IBlockErrors } from './interfaces/block-errors.interface.js';

/**
 * Schema Validator
 */
export class SchemaValidator {
    /**
     * IRI
     * @private
     */
    public readonly iri: string;
    /**
     * Common errors
     * @private
     */
    private readonly errors: string[];
    /**
     * Template schema
     * @private
     */
    private readonly isTemplate: boolean;
    /**
     * Base schema iri
     * @private
     */
    private readonly baseSchema: string;
    /**
     * Document
     * @private
     */
    private _document: ISchema;
    /**
     * Sub schemas
     * @private
     */
    private _subSchemas: string[];
    /**
     * Status
     * @private
     */
    private _validating: boolean;
    /**
     * Status
     * @private
     */
    private _validated: boolean;
    /**
     * Is schema valid
     * @private
     */
    public get isValid(): boolean {
        return this.errors.length === 0;
    }

    constructor(
        iri: string,
        schema: Schema | string,
        template: boolean,
    ) {
        this.iri = iri;
        this.errors = [];

        this._subSchemas = [];
        this.isTemplate = template;
        if (typeof schema === 'string') {
            this.baseSchema = schema;
            this._document = null;
        } else if (typeof schema === 'object') {
            this._document = schema;
            this.baseSchema = null;
        }
        this._validating = false;
        this._validated = false;
    }

    public async load(): Promise<void> {
        if (this.baseSchema) {
            const db = new DatabaseServer(null);
            this._document = await db.getSchemaByIRI(this.baseSchema);
        }
        if (this._document) {
            const defs = this._document?.document?.$defs;
            if (defs && Object.prototype.toString.call(defs) === '[object Object]') {
                this._subSchemas = Object.keys(defs);
            }
        }
    }

    /**
     * Add Error
     * @param error
     */
    public addError(error: string): void {
        this.errors.push(error);
    }

    /**
     * Validate
     * @param schemas
     */
    private _validate(schemas: Map<string, SchemaValidator>): void {
        if (this._validating) {
            this.addError(`Circular dependency schemas '${this.iri}'`);
            this._validating = false;
            this._validated = true;
            return;
        }

        if (this.isTemplate && !this._document) {
            this._validating = false;
            this._validated = true;
            return;
        }

        if (!this._document) {
            this.addError(`Schema '${this.iri}' does not exist`);
            this._validating = false;
            this._validated = true;
            return;
        }

        this._validating = true;

        if (Array.isArray(this._subSchemas)) {
            for (const subSchemaIRI of this._subSchemas) {
                if (schemas.has(subSchemaIRI)) {
                    const subSchema = schemas.get(subSchemaIRI);
                    if (!subSchema._validated) {
                        subSchema._validate(schemas);
                    }
                    if (!subSchema.isValid) {
                        this.addError(`Schema with id '${this.iri}' refers to invalid schema '${subSchemaIRI}'`);
                        this._validating = false;
                        this._validated = true;
                        return;
                    }
                } else {
                    this.addError(`Schema with id '${this.iri}' refers to non-existing schema '${subSchemaIRI}'`);
                    this._validating = false;
                    this._validated = true;
                    return;
                }
            }
        }

        this._validating = false;
        this._validated = true;
    }

    /**
     * Validate
     * @param validator
     */
    public async validate(schemas: Map<string, SchemaValidator>): Promise<void> {
        if (!this._validated) {
            this._validate(schemas);
        }
    }

    /**
     * Get schema document
     */
    public getSchema(): ISchema {
        return this._document;
    }

    /**
     * Get serialized errors
     */
    public getSerializedErrors(): IBlockErrors {
        return {
            id: this.iri,
            name: 'schema',
            errors: this.errors.slice(),
            isValid: !this.errors.length
        };
    }

    public static fromSchema(schema: Schema): SchemaValidator {
        if (schema.system || schema.category === SchemaCategory.SYSTEM || schema.readonly) {
            return SchemaValidator.fromSystem(schema.iri);
        } else {
            return new SchemaValidator(schema.iri, schema, false);
        }
    }

    public static fromTemplate(variable: any): SchemaValidator {
        return new SchemaValidator(variable.name, variable.baseSchema, true);
    }

    public static fromSystem(name: string): SchemaValidator {
        return new SchemaValidator(name, null, true);
    }
}
