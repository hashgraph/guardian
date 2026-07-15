import { describe, expect, it } from '@jest/globals';
import {
    buildVerificationUrl,
    sourceSystemLabel,
    DEFAULT_SOURCE_SYSTEM_LABEL,
} from '@shared/utils/hashscan-url';

describe('buildVerificationUrl (precedence: token > transaction > topic)', () => {
    it('prefers the token page when a token id is present (reliable HashScan target)', () => {
        const url = buildVerificationUrl('mainnet', {
            consensusTimestamp: '1700000000.000000001',
            tokenId: '0.0.111',
            topicId: '0.0.222',
        });
        expect(url).toBe('https://hashscan.io/mainnet/token/0.0.111');
    });

    it('falls back to the mint transaction when no token id', () => {
        expect(buildVerificationUrl('testnet', { consensusTimestamp: '1700000000.000000001', topicId: '0.0.222' })).toBe(
            'https://hashscan.io/testnet/transaction/1700000000.000000001',
        );
    });

    it('falls back to topic when only a topic id is known', () => {
        expect(buildVerificationUrl('mainnet', { topicId: '0.0.222' })).toBe(
            'https://hashscan.io/mainnet/topic/0.0.222',
        );
    });

    it('returns empty string when no identifier is available (never fabricate a URL)', () => {
        expect(buildVerificationUrl('mainnet', {})).toBe('');
        expect(buildVerificationUrl('mainnet', { tokenId: null, topicId: undefined })).toBe('');
    });

    it('returns empty string when the network is missing', () => {
        expect(buildVerificationUrl('', { consensusTimestamp: '1.2' })).toBe('');
    });

    it('is network-scoped (path segment reflects the requested network)', () => {
        expect(buildVerificationUrl('previewnet', { tokenId: '0.0.9' })).toContain('/previewnet/');
    });
});

describe('sourceSystemLabel (message.dataSource → display label)', () => {
    it('maps the three known data sources', () => {
        expect(sourceSystemLabel('mirror_node')).toBe('Hedera Mirror Node');
        expect(sourceSystemLabel('guardian_api')).toBe('Guardian API');
        expect(sourceSystemLabel('both')).toBe('Hedera Mirror Node + Guardian API');
    });

    it('falls back to the documented default for null/undefined/unknown', () => {
        expect(sourceSystemLabel(null)).toBe(DEFAULT_SOURCE_SYSTEM_LABEL);
        expect(sourceSystemLabel(undefined)).toBe(DEFAULT_SOURCE_SYSTEM_LABEL);
        expect(sourceSystemLabel('')).toBe(DEFAULT_SOURCE_SYSTEM_LABEL);
        expect(sourceSystemLabel('some_future_source')).toBe(DEFAULT_SOURCE_SYSTEM_LABEL);
    });
});
