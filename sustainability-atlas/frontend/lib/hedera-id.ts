export const HEDERA_ID_RE = /^0\.0\.\d+$/;
export const HEDERA_SERIAL_RE = /^[1-9]\d*$/;
export const HEDERA_TX_ID_RE = /^0\.0\.\d+@\d+\.\d{1,9}$/;
/** A bare consensus timestamp (`seconds.nanoseconds`) — Hashscan and the Mirror
 *  Node both accept this as a transaction identifier on its own, without the
 *  paying-account prefix. */
export const HEDERA_CONSENSUS_TIMESTAMP_RE = /^\d+\.\d{1,9}$/;

/** Matches a Hedera entity id, e.g. topic/token/contract/account: `0.0.1234`. */
export function isValidHederaId(value: string): boolean {
    return HEDERA_ID_RE.test(value.trim());
}

/** Matches an NFT serial number: a positive integer. */
export function isValidHederaSerial(value: string): boolean {
    return HEDERA_SERIAL_RE.test(value.trim());
}

/** Matches a Hedera transaction id (`0.0.1234@1690000000.000000000`) or a bare consensus timestamp (`1690000000.000000000`). */
export function isValidHederaTxId(value: string): boolean {
    const v = value.trim();
    return HEDERA_TX_ID_RE.test(v) || HEDERA_CONSENSUS_TIMESTAMP_RE.test(v);
}
