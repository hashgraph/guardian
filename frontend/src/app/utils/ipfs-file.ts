import { API_IPFS_GATEWAY_URL, IPFS_SCHEMA } from '../services/api';

const IPFS_CID_PATTERN = /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/;

export function ipfsGatewayLink(value: string): string {
    return typeof value === 'string' && value.startsWith(IPFS_SCHEMA)
        ? `${API_IPFS_GATEWAY_URL}${value.substring(IPFS_SCHEMA.length)}`
        : value;
}

export function ipfsCid(value: string | null | undefined): string {
    return value?.match(IPFS_CID_PATTERN)?.[0] || '';
}

export function ipfsDryRunId(value: string): string {
    const prefix = value.startsWith(IPFS_SCHEMA)
        ? IPFS_SCHEMA
        : value.startsWith(API_IPFS_GATEWAY_URL) ? API_IPFS_GATEWAY_URL : '';
    return prefix ? value.substring(prefix.length).split(/[/?#]/, 1)[0] : '';
}

export function ipfsFileType(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const matches = (signature: number[], offset = 0) =>
        signature.every((value, index) => bytes[offset + index] === value);
    if (matches([0x25, 0x50, 0x44, 0x46])) {
        return 'application/pdf';
    }
    if (matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        return 'image/png';
    }
    if (matches([0xff, 0xd8, 0xff])) {
        return 'image/jpeg';
    }
    if (matches([0x47, 0x49, 0x46, 0x38])) {
        return 'image/gif';
    }
    if (matches([0x52, 0x49, 0x46, 0x46]) && matches([0x57, 0x45, 0x42, 0x50], 8)) {
        return 'image/webp';
    }
    return 'text/plain;charset=utf-8';
}
