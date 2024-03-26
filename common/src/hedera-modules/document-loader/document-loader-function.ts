import { IDocumentFormat } from './document-format.js';

/**
 * Document loader function interface
 */
export type DocumentLoaderFunction = (iri: string) => Promise<IDocumentFormat>;
