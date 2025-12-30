export const GLOBAL_DOCUMENT_TYPE_LABELS = {
    vc: 'VC',
    json: 'JSON',
    csv: 'CSV',
    text: 'Text',
    any: 'Any',
};

export type GlobalDocumentType = keyof typeof GLOBAL_DOCUMENT_TYPE_LABELS;

export enum GlobalEventsStreamStatus {
    Free = 'FREE',
    Processing = 'PROCESSING',
    Error = 'ERROR'
}

export const GLOBAL_DOCUMENT_TYPE_ITEMS: Array<{ label: string; value: GlobalDocumentType }> =
    Object.entries(GLOBAL_DOCUMENT_TYPE_LABELS).map(([value, label]) => {
        return {
            label: String(label),
            value: value as GlobalDocumentType,
        };
    });

export const GLOBAL_DOCUMENT_TYPE_DEFAULT = "vc";

/**
 * Payload sent to global topics.
 */
export interface GlobalEvent {
    documentType: GlobalDocumentType;
    documentTopicId: string;
    documentMessageId: string;
    schemaIri: string;
    timestamp: string;
}

export interface GlobalEventsReaderStreamRow {
    globalTopicId: string;
    active: boolean;
    status: GlobalEventsStreamStatus;
    filterFieldsByBranch: Record<string, Record<string, string>>;
    branchDocumentTypeByBranch: Record<string, GlobalDocumentType>;
    lastMessageCursor: string;
    isDefault: boolean;
}

export interface SetDataPayloadReader {
    streams: Array<Partial<GlobalEventsReaderStreamRow>>;
}

export type Operation = 'AddTopic' | 'CreateTopic' | 'Delete' | 'Update' | 'Next';
