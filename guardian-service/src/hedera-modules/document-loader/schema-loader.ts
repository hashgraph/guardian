/**
 * Schema loader function
 */
export type SchemaLoaderFunction = (context: string | string[], iri: string, type: string) => Promise<any>;

/**
 * Schema Loader
 * Used for VC validation.
 */
export abstract class SchemaLoader {
    /**
     * Has context
     * @param context
     * @param iri
     * @param type
     */
    public abstract has(context: string | string[], iri: string, type: string): Promise<boolean>;

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
