import { DidURL, DocumentLoader, HederaDid, IDocumentFormat } from '../hedera-modules';
import { IPFS, Workers } from '../helpers';
import { WorkerTaskType } from '@guardian/interfaces';

/**
 * Remote DID Document loader
 */
export class RemoteDIDLoader extends DocumentLoader {
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
                    operatorId: null,
                    operatorKey: null,
                    dryRun: false,
                    topic: topicId,
                },
            },
            10
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
        const didDocument = await IPFS.getFile(didMessage.cid, 'json')

        return {
            documentUrl: iri,
            document: didDocument
        };
    }
}
