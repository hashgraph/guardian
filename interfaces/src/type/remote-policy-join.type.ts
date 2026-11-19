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

/**
 * Secret sealed to the Ed25519 DID key of the recipient
 */
export interface ISealedBox {
    alg: string;
    /**
     * Ephemeral X25519 public key, base64
     */
    epk: string;
    /**
     * AES-GCM nonce, base64
     */
    iv: string;
    /**
     * Cipher text followed by the 16-byte tag, base64
     */
    data: string;
}
