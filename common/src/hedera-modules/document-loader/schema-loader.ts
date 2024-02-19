/**
 * Schema loader function
 */
export type SchemaLoaderFunction = (context: string | string[], iri: string, type: string) => Promise<any>;

/**
 * Schema Loader
 * Used for VC validation.
 */
export abstract class SchemaLoader {
    constructor(private readonly _context: string = '') {}

    /**
     * Has iri
     * @param iri
     */
    private _has(iri: string): boolean {
        return !!iri?.startsWith(this._context);
    }

    /**
     * Has context
     * @param context
     * @param iri
     * @param type
     */
    public async has(contexts: string | string[], iri: string, type: string): Promise<boolean> {
        if (type !== 'subject') {
            return false;
        }
        return Array.isArray(contexts)
            ? contexts.some(this._has.bind(this))
            : this._has(contexts);
    }

    /**
     * Get document
     * @param context
     * @param iri
     * @param type
     */
    public abstract get(context: string | string[], iri: string, type: string): Promise<any>;

    /**
     * Build document loader
     * @param documentLoaders
     */
    public static build(documentLoaders: SchemaLoader[]): SchemaLoaderFunction {
        const _documentLoaders = documentLoaders || [];
        return async (context: string | string[], iri: string, type: string): Promise<any> => {
            for (const documentLoader of _documentLoaders) {
                if (await documentLoader.has(context, iri, type)) {
                    return await documentLoader.get(context, iri, type);
                }
            }
            throw new Error('(SchemaLoader) IRI not found: ' + iri);
        };
    }
}
