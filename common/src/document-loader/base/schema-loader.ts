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
     * Schema type
     */
    protected type: string;

    /**
     * Filters
     */
    protected filters: string[];

    constructor(
        type?: string,
        filters?: string | string[]
    ) {
        this.filters = [];
        if (Array.isArray(filters)) {
            for (const filter of filters) {
                if (typeof filter === 'string') {
                    this.filters.push(filter);
                }
            }
        } else if (typeof filters === 'string') {
            this.filters.push(filters);
        }
        this.type = type;
    }

    /**
     * Has iri
     * @param context
     */
    private _has(context: string): boolean {
        if (context) {
            if (this.filters.length) {
                for (const filter of this.filters) {
                    if (context.startsWith(filter)) {
                        return true;
                    }
                }
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * Has context
     * @param context
     * @param iri
     * @param type
     */
    public async has(contexts: string | string[], iri: string, type: string): Promise<boolean> {
        if (this.type && type !== this.type) {
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
