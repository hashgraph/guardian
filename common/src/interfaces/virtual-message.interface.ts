/**
 * The part of a Hedera message that DatabaseServer needs in order to persist a
 * dry-run record. Declared structurally so `common` stays free of
 * `@guardian/hedera` and, through it, of `@hiero-ledger/sdk`.
 */
export interface IVirtualMessage {
    /**
     * Serialized message document
     */
    toMessage(): string;

    /**
     * Message id
     */
    getId(): string;

    /**
     * Topic id the message belongs to
     */
    getTopicId(): string;
}
