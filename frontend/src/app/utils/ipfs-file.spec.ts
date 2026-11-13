import { ipfsCid, ipfsGatewayLink } from './ipfs-file';

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
