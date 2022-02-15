export type SchemaLoaderFunction = (context: string, iri: string, type: string) => Promise<any>;

/**
 * Schema Loader
 * Used for VC validation.
 */
export abstract class SchemaLoader {
    public abstract has(context: string | string[], iri: string, type: string): Promise<boolean>;

    public abstract get(context: string | string[], iri: string, type: string): Promise<any>;

    public static build(documentLoaders: SchemaLoader[]): SchemaLoaderFunction {
        const _documentLoaders = documentLoaders || [];
        return async function (context: string, iri: string, type: string): Promise<any> {
            for (let i = 0; i < _documentLoaders.length; i++) {
                const documentLoader = _documentLoaders[i];
                if (await documentLoader.has(context, iri, type)) {
                    return await documentLoader.get(context, iri, type);
                }
            }
            throw new Error('IRI not found: ' + iri);
        };
    }
}