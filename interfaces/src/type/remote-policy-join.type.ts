/**
 * Status of a remote participant on the Main instance
 */
export enum RemoteParticipantStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

/**
 * Status of the join request of a remote policy on the home instance
 */
export enum RemoteJoinStatus {
    SENT = 'SENT',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    FAILED = 'FAILED',
}
