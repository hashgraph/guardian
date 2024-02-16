import { IDocumentFormat } from './document-format';
import { DocumentLoaderFunction } from './document-loader-function';

/**
 * Documents Loader
 * Used for VC validation.
 */
export abstract class DocumentLoader {
    public abstract has(iri: string): Promise<boolean>;

    public abstract get(iri: string): Promise<IDocumentFormat>;

    public static build(documentLoaders: DocumentLoader[]): DocumentLoaderFunction {
        const _documentLoaders = documentLoaders || [];
        return async function (iri: string): Promise<IDocumentFormat> {
            for (let i = 0; i < _documentLoaders.length; i++) {
                const documentLoader = _documentLoaders[i];
                if (await documentLoader.has(iri)) {
                    return await documentLoader.get(iri);
                }
            }
            throw new Error('IRI not found: ' + iri);
        };
    }
}