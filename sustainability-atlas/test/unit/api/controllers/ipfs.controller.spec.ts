import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException, ServiceUnavailableException, StreamableFile } from '@nestjs/common';
import { IpfsController } from '@api/controllers/ipfs.controller';
import { IpfsService } from '@worker/services/ipfs.service';

// A real (1x1 transparent pixel) PNG — file-type reads past the raw signature
// into the IHDR chunk, so a truncated/fake signature isn't enough.
const PNG_BUFFER = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
);

function makeService(overrides: Partial<IpfsService> = {}): IpfsService {
    return {
        parseCID: jest.fn((v: string) => (v === 'bad-cid' ? null : v)),
        fetchContent: jest.fn(async () => PNG_BUFFER),
        ...overrides,
    } as unknown as IpfsService;
}

describe('IpfsController#fetch', () => {
    it('rejects a malformed CID with 400', async () => {
        const controller = new IpfsController(makeService());
        await expect(controller.fetch('bad-cid')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('maps a permanent gateway failure to 404', async () => {
        const service = makeService({
            fetchContent: jest.fn(async () => { throw new Error('All IPFS gateways failed: 404 not found'); }),
        });
        const controller = new IpfsController(service);
        await expect(controller.fetch('bafyValidCid')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('maps a transient gateway failure to 503', async () => {
        const service = makeService({
            fetchContent: jest.fn(async () => { throw new Error('timeout of 5000ms exceeded'); }),
        });
        const controller = new IpfsController(service);
        await expect(controller.fetch('bafyValidCid')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('streams the content back with the CID as the filename and a sniffed content type', async () => {
        const controller = new IpfsController(makeService());
        const result = await controller.fetch('bafyValidCid');
        expect(result).toBeInstanceOf(StreamableFile);
        expect(result.options.disposition).toContain('filename="bafyValidCid.png"');
        expect(result.options.type).toBe('image/png');
    });

    it('appends a .json extension for JSON content, which has no magic bytes', async () => {
        const service = makeService({
            fetchContent: jest.fn(async () => Buffer.from('{"type":["VerifiableCredential"]}')),
        });
        const controller = new IpfsController(service);
        const result = await controller.fetch('bafyJsonCid');
        expect(result.options.type).toBe('application/json');
        expect(result.options.disposition).toContain('filename="bafyJsonCid.json"');
    });

    it('leaves the filename extensionless when the type cannot be determined', async () => {
        const service = makeService({
            fetchContent: jest.fn(async () => Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x00])),
        });
        const controller = new IpfsController(service);
        const result = await controller.fetch('bafyOpaqueCid');
        expect(result.options.type).toBe('application/octet-stream');
        expect(result.options.disposition).toContain('filename="bafyOpaqueCid"');
    });
});
