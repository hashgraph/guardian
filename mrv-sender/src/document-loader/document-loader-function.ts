import { IDocumentFormat } from './document-format.js';


export type DocumentLoaderFunction = (iri: string) => Promise<IDocumentFormat>;
