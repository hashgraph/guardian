import { DidURL } from '@guardian/common/document-loader/did-url';
import { DocumentLoader } from '@guardian/common/document-loader/base/document-loader';
import { IDocumentFormat } from '@guardian/common/document-loader/base/document-format';
import { IPFS } from '@guardian/common/helpers/ipfs';
import { Workers } from '@guardian/common/helpers/workers';
import { HederaDid } from './vcjs/did/hedera-did.js';
import { WorkerTaskType } from '@guardian/interfaces';

/**
 * Remote DID Document loader
 */
export class RemoteDidLoader extends DocumentLoader {
    /**
     * Get formatted document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        const did = DidURL.getController(iri);
        const topicId = HederaDid.getTopicId(iri);
        const messages = await new Workers().addRetryableTask(
            {
                type: WorkerTaskType.GET_TOPIC_MESSAGES,
                data: {
                    dryRun: false,
                    topic: topicId,
                    payload: { userId: null }
                },
            },
            {
                priority: 10,
                dryRun: null,
                mockId: null
            }
        );
        const didMessage = messages
            .map(m => {
                try {
                    return JSON.parse(m.message);
                } catch (e) {
                    return undefined;
                }
            })
            .find(m => {
                return (m.type === 'DID-Document') && (m.did === did)
            });
        if (!didMessage) {
            return null
        }
        const didDocument = await IPFS.getFile(didMessage.cid, 'json', IPFS.DEFAULT_OPTIONS)

        return {
            documentUrl: iri,
            document: didDocument
        };
    }
}