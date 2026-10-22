import { WorkerTaskType } from '@guardian/interfaces';
import { Workers } from '@guardian/common/helpers/workers';
import { CommonDidDocument } from './vcjs/did/common-did-document.js';
import { HederaBBSMethod } from './vcjs/did/components/hedera-bbs-method.js';
import { HederaEd25519Method } from './vcjs/did/components/hedera-ed25519-method.js';
import { DIDMessage } from './message/did-message.js';
import { MessageServer } from './message/message-server.js';
import { MessageType } from './message/message-type.js';
import { getDidEd25519PublicKey } from './remote-user-proof.js';
import { Hashing } from '@guardian/common/helpers/hashing';

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
 * The DID topic could not be read (mirror node or IPFS unavailable): the same request can succeed later
 */
export class DidTopicReadError extends Error {
    public readonly transient = true;
}

/**
 * Identifier and topic of a Hedera DID, both the current (`...:ID_0.0.1`) and the old (`...:ID;hedera:net:tid=0.0.1`) form
 * @param did
 */
export function parseDid(did: string): { identifier: string, topicId: string | null } {
    const [main, ...parameters] = String(did).split(';');
    const parts = main.split(':');
    if (parts.length !== 4 || parts[0] !== 'did' || parts[1] !== 'hedera') {
        throw new Error('Invalid DID.');
    }
    const [identifier, topic] = parts[3].split('_');
    let topicId: string | null = topic || null;
    for (const parameter of parameters) {
        const match = /(?:^|:)tid=([^:;]+)$/.exec(parameter);
        if (match) {
            topicId = match[1];
        }
    }
    return { identifier, topicId };
}

/**
 * Check that a DID document belongs to its DID: the identifier of a Hedera DID is the hash of
 * its root key, and the DID names the topic its documents are posted to. The document is
 * read from a topic and an account the sender names, so without this anyone could publish
 * a document with their own key under another user's DID.
 * @param did
 * @param document
 * @param topicId - the topic the document was read from
 */
export function assertDidBoundToRootKey(did: string, document: CommonDidDocument, topicId: string): void {
    const { identifier, topicId: didTopicId } = parseDid(did);
    if (document.getDid() !== did || !didTopicId || didTopicId !== topicId) {
        throw new Error('DID document does not belong to the DID.');
    }
    const publicKey = getDidEd25519PublicKey(document);
    if (!publicKey || Hashing.base58.encode(Hashing.sha256.digest(publicKey)) !== identifier) {
        throw new Error('DID document key does not match the DID.');
    }
}

/**
 * Load the latest DID document of a DID published to a topic by a message the filter accepts
 * @param did
 * @param topicId
 * @param accept
 * @param userId
 */
async function loadPublishedDidDocument(
    did: string,
    topicId: string,
    accept: (message: DIDMessage) => boolean,
    userId: string | null,
    earliest: boolean = false
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
        throw new DidTopicReadError(`Unable to read the DID topic ${topicId}, try again later: ${error?.message || error}`);
    }
    const matching = messages.filter((message) => message.did === did && accept(message));
    const published = earliest ? matching[0] : matching.pop();
    if (!published) {
        throw new Error(`DID document is not published by the Hedera account.`);
    }
    try {
        await MessageServer.loadDocument(published, null, { userId });
    } catch (error) {
        throw new DidTopicReadError(`Unable to load the DID document, try again later: ${error?.message || error}`);
    }
    const document = await validateDidWithoutKeys(published.getDocument());
    assertDidBoundToRootKey(did, document, topicId);
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
    return await loadPublishedDidDocument(
        did,
        topicId,
        (message) => message.payer === hederaAccountId,
        userId
    );
}

/**
 * Load the DID document of a policy owner (a Standard Registry) from its DID topic.
 * A Standard Registry topic normally has a submit key: then only the key holder
 * could have posted to it, and the latest DID document of the DID on it is used,
 * whichever account paid for it. An open topic falls back to the payer rule.
 * @param did
 * @param topicId
 * @param hederaAccountId - account expected to have published the document of an open topic
 * @param userId
 */
export async function resolveOwnerDidDocument(
    did: string,
    topicId: string,
    hederaAccountId: string,
    userId: string | null
): Promise<CommonDidDocument> {
    if (!topicId) {
        throw new Error(`Invalid topic.`);
    }
    let submitKey: string | null = null;
    try {
        const info = await new Workers().addRetryableTask({
            type: WorkerTaskType.GET_TOPIC_INFO_REST,
            data: {
                topicId,
                payload: { userId }
            }
        }, {
            priority: 10,
            attempts: 0,
            userId,
            interception: null,
            registerCallback: true
        });
        submitKey = info?.submitKey || null;
    } catch (error) {
        throw new DidTopicReadError(`Unable to read the DID topic ${topicId}, try again later: ${error?.message || error}`);
    }
    if (submitKey) {
        // DID documents are never updated, and other users of the instance holding the
        // submit key also post to this topic, so only the first document for the DID is genuine
        return await loadPublishedDidDocument(did, topicId, () => true, userId, true);
    }
    return await resolvePublishedDidDocument(did, topicId, hederaAccountId, userId);
}
