/**
 * Schema Loader
 * Used for VC validation.
 */
export abstract class SchemaLoader {
    public abstract get(iri: string): Promise<any>;
}