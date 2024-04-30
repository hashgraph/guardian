import { DocumentState } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * Document state loader
 */
export class DocumentStateLoader extends PolicyDataLoader<DocumentState> {
    async get(documentIds: string[]) {
        return (await this.db.getDocumentStates({
            documentId: { $in: documentIds },
        })) as DocumentState[];
    }
}
