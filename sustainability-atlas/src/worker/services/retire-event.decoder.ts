/**
 * Decoder for Guardian's on-chain retirement event.
 *
 * Guardian's RETIRE contract emits, per executed retirement:
 *
 *   Retire(address account, RetireTokenRequest[] tokens)
 *   struct RetireTokenRequest { address token; int64 count; int64[] serials; }
 *
 * `count` carries the amount for fungible tokens; `serials` carries the exact
 * serial numbers for non-fungible ones. Some events populate both, so callers
 * must pick by the token's actual type rather than by which field is non-zero.
 *
 * Only RETIRE_EXECUTED_TOPIC is a retirement. The contract emits a
 * byte-identical payload for the *request* half of the approval flow, and those
 * requests are not always executed — verified against Mirror Node, where the
 * executed signature's serials matched nft_cache.deleted 1053/1053 while the
 * request signature named serials that were never actually deleted. Counting
 * both would over-report retirement.
 */

/** topic0 of the executed `Retire` event — the only signature that counts. */
export const RETIRE_EXECUTED_TOPIC =
    '0x760b5d447de9a6afab4457b996807616ccd3b048f15f77e82cc55fdb70962f4e';

/** Guards against a malformed or unrelated payload steering the decoder into a
 *  huge allocation; no real retirement comes close to these. */
const MAX_TOKENS_PER_EVENT = 64;
const MAX_SERIALS_PER_TOKEN = 100_000;

export interface RetiredToken {
    /** Hedera token ID, or null when the log names the token by an address that
     *  carries no entity number (see `toEntityId`). */
    tokenId: string | null;
    /** The token's EVM address exactly as the contract emitted it. */
    tokenAddress: string;
    /** Fungible amount, in the token's smallest units. Zero for non-fungible. */
    count: number;
    /** Non-fungible serials. Empty for fungible. */
    serials: number[];
}

export interface RetireEvent {
    /** Hedera account ID of the retiring party, or null when the account is
     *  identified by a key-derived address that has to be resolved against the
     *  ledger (see `toEntityId`). */
    accountId: string | null;
    /** The retiring party's EVM address exactly as the contract emitted it. */
    accountAddress: string;
    tokens: RetiredToken[];
}

/** An EVM address occupies the low 20 bytes of an ABI word. */
const EVM_ADDRESS_MASK = (1n << 160n) - 1n;

/** Hedera-native ("long-zero") addresses put the entity number in the low 8
 *  bytes and leave the upper 12 zero, so anything above this is key-derived. */
const LONG_ZERO_MAX = (1n << 64n) - 1n;

/** Renders an ABI word as the canonical 20-byte EVM address. */
function toEvmAddress(word: bigint): string {
    return `0x${(word & EVM_ADDRESS_MASK).toString(16).padStart(40, '0')}`;
}

/**
 * Converts an EVM address to a Hedera entity ID, or returns null when it cannot
 * be converted.
 *
 * Hedera renders entities it created itself as "long-zero" addresses, where the
 * address IS the entity number — those convert exactly. An ECDSA account, by
 * contrast, is addressed by a hash of its public key, which encodes no account
 * number at all; treating that address as a number yields a 49-digit "account"
 * that belongs to no one. Tokens are always long-zero; retiring accounts are
 * frequently not, so the caller must resolve those against the mirror node.
 */
function toEntityId(word: bigint): string | null {
    const address = word & EVM_ADDRESS_MASK;
    return address <= LONG_ZERO_MAX ? `0.0.${address}` : null;
}

/** Splits ABI-encoded hex into 32-byte words. */
function toWords(data: string): bigint[] {
    const hex = (data ?? '').replace(/^0x/, '');
    const out: bigint[] = [];
    for (let i = 0; i + 64 <= hex.length; i += 64) {
        out.push(BigInt(`0x${hex.slice(i, i + 64)}`));
    }
    return out;
}

/** Byte offsets in the ABI encoding are relative to a base and always a
 *  multiple of 32; anything else means this isn't the payload we expect. */
function wordOffset(value: bigint, base: number, limit: number): number | null {
    const bytes = Number(value);
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes % 32 !== 0) {
        return null;
    }
    const index = base + bytes / 32;
    return index < limit ? index : null;
}

/**
 * Decodes a `Retire` log's data field. Returns null when the payload isn't the
 * expected shape — the retire contracts also emit ownership and admin events
 * whose data is a bare word, and those must be ignored rather than guessed at.
 *
 * Fixed word offsets are deliberately NOT used: `RetireTokenRequest[]` is a
 * dynamic array of dynamic structs, so a multi-token retirement lays out
 * differently from a single-token one. Reading it positionally produced
 * nonsense token IDs and absurd counts on real multi-token events.
 */
export function decodeRetireEvent(data: string): RetireEvent | null {
    const w = toWords(data);
    if (w.length < 4) {
        return null;
    }

    const arrayAt = wordOffset(w[1], 0, w.length);
    if (arrayAt === null) {
        return null;
    }

    const tokenCount = Number(w[arrayAt]);
    if (!Number.isSafeInteger(tokenCount) || tokenCount < 1 || tokenCount > MAX_TOKENS_PER_EVENT) {
        return null;
    }
    // Element offsets are relative to the first word after the array length.
    const elementBase = arrayAt + 1;
    if (elementBase + tokenCount > w.length) {
        return null;
    }

    const tokens: RetiredToken[] = [];
    for (let i = 0; i < tokenCount; i++) {
        const elementAt = wordOffset(w[elementBase + i], elementBase, w.length);
        if (elementAt === null || elementAt + 2 >= w.length) {
            return null;
        }

        const serialsAt = wordOffset(w[elementAt + 2], elementAt, w.length);
        if (serialsAt === null) {
            return null;
        }

        const serialCount = Number(w[serialsAt]);
        if (!Number.isSafeInteger(serialCount) || serialCount < 0 || serialCount > MAX_SERIALS_PER_TOKEN) {
            return null;
        }
        if (serialsAt + serialCount >= w.length + 1 && serialCount > 0) {
            return null;
        }

        const serials: number[] = [];
        for (let s = 0; s < serialCount; s++) {
            serials.push(Number(w[serialsAt + 1 + s]));
        }

        tokens.push({
            tokenId: toEntityId(w[elementAt]),
            tokenAddress: toEvmAddress(w[elementAt]),
            count: Number(w[elementAt + 1]),
            serials,
        });
    }

    return { accountId: toEntityId(w[0]), accountAddress: toEvmAddress(w[0]), tokens };
}
