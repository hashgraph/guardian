import { CommonDidDocument } from './vcjs/did/common-did-document.js';
import { HederaBBSMethod } from './vcjs/did/components/hedera-bbs-method.js';
import { HederaEd25519Method } from './vcjs/did/components/hedera-ed25519-method.js';
import { DIDMessage } from './message/did-message.js';
import { MessageServer } from './message/message-server.js';
import { MessageType } from './message/message-type.js';

/**
 * Check that a DID document has the verification methods Guardian needs, without private keys
 * @param json
 */
export async function validateDidWithoutKeys(json: string | any): Promise<CommonDidDocument> {
    if (!json) {
        throw new Error(`Invalid did document.`);
    }
    const document = CommonDidDocument.from(json);
    for (const type of [HederaBBSMethod.TYPE, HederaEd25519Method.TYPE]) {
        const verificationMethod = document.getMethodByType(type);
        if (!verificationMethod) {
            throw new Error(`Invalid did document.`);
        }
    }
    return document;
}

/**
 * Load the DID document the given Hedera account published to the given topic.
 * A remote user profile is only as trustworthy as its DID document, so the
 * supplied copy is used to identify the DID and the published one is stored.
 * @param did
 * @param topicId
 * @param hederaAccountId
 * @param userId
 */
export async function resolvePublishedDidDocument(
    did: string,
    topicId: string,
    hederaAccountId: string,
    userId: string | null
): Promise<CommonDidDocument> {
    if (!topicId) {
        throw new Error(`Invalid topic.`);
    }
    let messages: DIDMessage[];
    try {
        messages = await MessageServer.getMessages<DIDMessage>({
            topicId,
            userId,
            type: MessageType.DIDDocument
        });
    } catch (error) {
        throw new Error(`Invalid topic.`);
    }
    const published = messages
        .filter((message) => message.did === did && message.payer === hederaAccountId)
        .pop();
    if (!published) {
        throw new Error(`DID document is not published by the Hedera account.`);
    }
    await MessageServer.loadDocument(published, null, { userId });
    return await validateDidWithoutKeys(published.getDocument());
}
