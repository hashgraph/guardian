export interface RegistryStreamMessage {
    type: 'RegisterStream' | 'UnregisterStream';
    streamId: string;
    documentTopicId: string;
    schemaId: string;
    providerDid: string;
    meta?: {
        name?: string;
        description?: string;
    };
}
