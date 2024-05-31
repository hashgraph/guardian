import { DataBaseHelper, Message } from '@indexer/common';
import { safetyRunning } from '../../utils/safety-running.js';
import {
    MessageType,
    MessageAction,
    IPFS_CID_PATTERN,
} from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';

function parseDocumentFields(
    document: any,
    fieldValues: Set<string> = new Set()
): Set<string> {
    const stack = [document];
    while (stack.length > 0) {
        const doc = stack.pop();
        for (const field in doc) {
            if (Object.prototype.toString.call(field) === '[object Object]') {
                stack.push(doc[field]);
            } else {
                fieldValues.add(doc[field].toString());
            }
        }
    }
    return fieldValues;
}

function filter() {
    return {
        $or: [
            {
                'analytics.schemaName': null,
            },
            {
                'analytics.schemaId': null,
            },
            {
                'analytics.policyId': null,
            },
        ],
    };
}

export async function sychronizeVCs() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const documents = await collection.find({
        type: { $in: [MessageType.VC_DOCUMENT] },
        ...filter(),
    });
    let index = 0;
    const count = await documents.count();
    while (await documents.hasNext()) {
        index++;
        console.log(`Sync vcs ${index}/${count}`);
        const document = await documents.next();
        const documentAnalytics: any = {
            textSearch: textSearch(document),
        };
        let policyMessage = await em.findOne(Message, {
            type: MessageType.INSTANCE_POLICY,
            'options.instanceTopicId': document.topicId,
        } as any);
        if (!policyMessage) {
            const projectTopic = await em.findOne(Message, {
                type: MessageType.TOPIC,
                action: MessageAction.CreateTopic,
                topicId: document.topicId,
                'options.childId': null,
            } as any);
            if (projectTopic) {
                policyMessage = await em.findOne(Message, {
                    type: MessageType.INSTANCE_POLICY,
                    'options.instanceTopicId': projectTopic.options.parentId,
                } as any);
            }
        }
        if (policyMessage) {
            documentAnalytics.policyId = policyMessage.consensusTimestamp;
            documentAnalytics.textSearch += `|${policyMessage.consensusTimestamp}`;
        }
        if (Array.isArray(document.files) && document.files.length > 0) {
            await safetyRunning(async () => {
                const documentFileId = document.files[0];
                const documentFileString = await DataBaseHelper.loadFile(
                    documentFileId
                );
                const documentFile = JSON.parse(documentFileString);
                if (
                    !documentFile.credentialSubject ||
                    !documentFile.credentialSubject[0]
                ) {
                    return;
                }
                const documentFields = parseDocumentFields(
                    documentFile.credentialSubject[0] ||
                        documentFile.credentialSubject
                );
                if (documentFields.size > 0) {
                    documentAnalytics.textSearch += `|${[
                        ...documentFields,
                    ].join('|')}`;
                }
                await safetyRunning(async () => {
                    let contexts = documentFile['@context'];
                    contexts = Array.isArray(contexts) ? contexts : [contexts];
                    let schemaContextCID = null;
                    for (const context of contexts) {
                        if (typeof context === 'string') {
                            const matches = context?.match(IPFS_CID_PATTERN);
                            const contextCID = matches && matches[0];
                            if (!contextCID) {
                                continue;
                            }
                            schemaContextCID = contextCID;
                            break;
                        }
                    }
                    if (schemaContextCID) {
                        const schemaMessage = await em.findOne(Message, {
                            files: schemaContextCID,
                        });
                        documentAnalytics.schemaId =
                            schemaMessage.consensusTimestamp;
                        const schemaDocumentFileString =
                            await DataBaseHelper.loadFile(
                                schemaMessage.files[0]
                            );
                        const schemaDocumentFile = JSON.parse(
                            schemaDocumentFileString
                        );
                        if (schemaDocumentFile.title) {
                            documentAnalytics.schemaName =
                                schemaDocumentFile.title;
                            documentAnalytics.textSearch += `|${schemaDocumentFile.title}`;
                        }
                    }
                });
            });
        }
        await collection.updateOne(
            {
                _id: document._id,
            },
            {
                $set: {
                    analytics: documentAnalytics,
                },
            },
            {
                upsert: false,
            }
        );
    }
}
