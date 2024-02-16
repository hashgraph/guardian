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
    Step = 'Step',
    Chunk = 'Chunk'
}

/**
 * External Event
 */
export interface ExternalEvent<T> {
    /**
     * Event type
     */
    readonly type: ExternalEventType;
    /**
     * Block UUID
     */
    readonly blockUUID: string;
    /**
     * Block Type
     */
    readonly blockType: string;
    /**
     * Block Tag
     */
    readonly blockTag: string;
    /**
     * User Id
     */
    readonly userId: string;
    /**
     * Data
     */
    readonly data: T;
}