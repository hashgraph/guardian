import { AnyBlockType, IPolicyDocument } from '@policy-engine/policy-engine.interface';
import { IPolicyUser } from '@policy-engine/policy-user';

/**
 * External Event Type
 */
export enum ExternalEventType {
    Run = 'Run',
    Set = 'Set',
    TickAggregate = 'TickAggregate',
    TickCron = 'TickCron',
    DeleteMember = 'DeleteMember',
    StartCron = 'StartCron',
    StopCron = 'StopCron',
    SignatureQuorumReachedEvent = 'SignatureQuorumReachedEvent',
    SignatureSetInsufficientEvent = 'SignatureSetInsufficientEvent',
    Step = 'Step'
}

/**
 * External Event
 */
export class ExternalEvent<T> {
    /**
     * Event type
     */
    public readonly type: ExternalEventType;
    /**
     * Block UUID
     */
    public readonly blockUUID: string;
    /**
     * Block Type
     */
    public readonly blockType: string;
    /**
     * Block Tag
     */
    public readonly blockTag: string;
    /**
     * User Id
     */
    public readonly userId: string;
    /**
     * Data
     */
    public readonly data: T;

    constructor(
        type: ExternalEventType,
        block: AnyBlockType,
        user: IPolicyUser,
        data: T
    ) {
        this.type = type;
        this.blockUUID = block?.uuid;
        this.blockType = block?.blockType;
        this.blockTag = block?.tag;
        this.userId = user?.id;
        this.data = data;
    }
}

/**
 * Convert Document
 */
const getDoc = (document: IPolicyDocument) => {
    const type = (document.document) ? (
        (document.document.credentialSubject) ? ('VC') : (
            (document.document.verifiableCredential) ? ('VP') : (
                (document.document.verificationMethod) ? ('DID') : (null)
            )
        )
    ) : (null);
    return {
        type,
        id: document.id,
        uuid: document.document?.id
    }
}

/**
 * External Documents
 */
export const ExternalDocuments = (document: IPolicyDocument | IPolicyDocument[]): any[] => {
    try {
        if (document) {
            if (Array.isArray(document)) {
                return document.map(doc => getDoc(doc));
            } else {
                return [getDoc(document)];
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}