import { ipfsCid, ipfsDryRunId, ipfsFileType, ipfsGatewayLink } from './ipfs-file';

describe('IPFS file links', () => {
    const v0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    const v1 = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';

    it('uses the gateway for IPFS values and preserves the query', () => {
        for (const suffix of ['', '?fileName=area.kml&extension=kml']) {
            expect(ipfsGatewayLink(`ipfs://${v0}${suffix}`)).toBe(`https://ipfs.io/ipfs/${v0}${suffix}`);
        }
    });

    it('keeps other values unchanged', () => {
        for (const value of ['', v0, 'https://example.com/doc.pdf', `https://ipfs.io/ipfs/${v1}`]) {
            expect(ipfsGatewayLink(value)).toBe(value);
        }
    });

    it('extracts the bare CID from both supported link shapes', () => {
        for (const cid of [v0, v1]) {
            for (const prefix of ['ipfs://', 'https://ipfs.io/ipfs/']) {
                expect(ipfsCid(`${prefix}${cid}?fileName=doc.pdf`)).toBe(cid);
            }
        }
    });

    it('does not treat database ids, generated ids, UUIDs or plain URLs as CIDs', () => {
        for (const value of [undefined, null, '', 'ipfs://6af6e8ec63af3cd1188591c0', 'ipfs://56fbc24e8ec55d9ba2f9e21a735bebd2', 'ipfs://3f2a9c1e-1234-4321-9876-123456789012', 'https://example.com/doc.pdf']) {
            expect(ipfsCid(value)).withContext(String(value)).toBe('');
        }
    });
});

describe('IPFS dry-run file values', () => {
    it('extracts an id from either paperclip link format without the query', () => {
        for (const prefix of ['ipfs://', 'https://ipfs.io/ipfs/']) {
            expect(ipfsDryRunId(`${prefix}6af6e8ec63af3cd1188591c0?fileName=test.pdf`)).toBe('6af6e8ec63af3cd1188591c0');
        }
    });

    it('does not extract ids from unrelated addresses or empty values', () => {
        for (const value of ['', '6af6e8ec63af3cd1188591c0', 'https://example.com/doc.pdf', 'https://ipfs.io.evil/ipfs/id', 'ipfs://']) {
            expect(ipfsDryRunId(value)).withContext(value).toBe('');
        }
    });
});

describe('IPFS file type detection', () => {
    for (const [type, signature] of [
        ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]],
        ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
        ['image/jpeg', [0xff, 0xd8, 0xff]],
        ['image/gif', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
        ['image/webp', [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
    ] as const) {
        it(`recognizes ${type} from the bytes`, () => {
            expect(ipfsFileType(new Uint8Array(signature).buffer)).toBe(type);
        });
    }

    it('opens empty, truncated, unknown and script-capable formats as text', () => {
        for (const bytes of [[], [0x25, 0x50], [0x89, 0x50, 0x4e], Array.from(new TextEncoder().encode('<svg onload="alert(1)"></svg>')), Array.from(new TextEncoder().encode('<kml>data</kml>')), [0x52, 0x49, 0x46, 0x46]]) {
            expect(ipfsFileType(new Uint8Array(bytes).buffer)).toBe('text/plain;charset=utf-8');
        }
    });
});
