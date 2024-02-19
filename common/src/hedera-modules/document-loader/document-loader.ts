import { IDocumentFormat } from './document-format';
import { DocumentLoaderFunction } from './document-loader-function';

/**
 * Documents Loader
 * Used for VC validation.
 */
export abstract class DocumentLoader {
    constructor(protected _context: string = '') {}

    /**
     * Has context
     * @param iri
     */
    public async has(iri: string): Promise<boolean> {
        return !!iri?.startsWith(this._context)
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
