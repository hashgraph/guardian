import { IDocumentFormat } from './document-format.js';
import { DocumentLoaderFunction } from './document-loader-function.js';

/**
 * Documents Loader
 * Used for VC validation.
 */
export abstract class DocumentLoader {
    /**
     * Filters
     */
    protected filters: string[];

    constructor(filters?: string | string[]) {
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
    }

    /**
     * Has context
     * @param iri
     */
    public async has(iri: string): Promise<boolean> {
        if (iri) {
            if (this.filters.length) {
                for (const filter of this.filters) {
                    if (iri.startsWith(filter)) {
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
     * Get document
     * @param iri
     */
    public abstract get(iri: string): Promise<IDocumentFormat>;

    /**
     * Build document loader
     * @param documentLoaders
     */
    public static build(documentLoaders: DocumentLoader[]): DocumentLoaderFunction {
        const _documentLoaders = documentLoaders || [];
        return async (iri: string): Promise<IDocumentFormat> => {
            for (const documentLoader of _documentLoaders) {
                if (await documentLoader.has(iri)) {
                    return await documentLoader.get(iri);
                }
            }
            throw new Error('(DocumentLoader) IRI not found: ' + iri);
        };
    }
}
