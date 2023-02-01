import { IDocumentFormat } from './document-format';

/**
 * Document loader function interface
 */
export type DocumentLoaderFunction = (iri: string) => Promise<IDocumentFormat>;
