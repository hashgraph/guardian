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
