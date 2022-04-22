import { IDocumentFormat } from './document-format';

export type DocumentLoaderFunction = (iri: string) => Promise<IDocumentFormat>;
