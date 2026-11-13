import { firstValueFrom, of, throwError } from 'rxjs';
import { HttpClient, HttpContext } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { IPFSService } from './ipfs.service';
import { SILENT_HTTP_ERRORS } from '../constants/http-context-tokens';

describe('IPFSService', () => {
    let service: IPFSService;
    const reference = 'ipfs://6ab2f5c007a1f505a314e45c';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                IPFSService,
                { provide: HttpClient, useValue: {} },
            ],
        });
        service = TestBed.inject(IPFSService);
    });

    it('reads the CID from gateway and IPFS URLs in the JSON and image readers', async () => {
        const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
        const json = vi.spyOn(service, 'getJsonFile').mockReturnValue(of({ ok: true }));
        const file = vi.spyOn(service, 'getFile').mockReturnValue(of(new ArrayBuffer(0)));
        expect(await service.getJsonFileByLink(`ipfs://${cid}?name=test`)).toEqual({ ok: true });
        service.loadJsonFileByLink(`https://ipfs.io/ipfs/${cid}`).subscribe();
        await service.getImageByLink(`ipfs://${cid}`);
        expect(json.mock.calls).toEqual([[cid], [cid]]);
        expect(file).toHaveBeenCalledExactlyOnceWith(cid);
    });

    describe('getImageWithDryRunFallback', () => {
        it('reads from IPFS only when the view is not a dry run', async () => {
            const byLink = vi.spyOn(service, 'getImageByLink').mockResolvedValue('data:ipfs');
            const dryRun = vi.spyOn(service, 'getImageFromDryRunStorage').mockResolvedValue('data:dry-run');

            const result = await service.getImageWithDryRunFallback(reference, false);

            expect(result).toBe('data:ipfs');
            expect(byLink).toHaveBeenCalledTimes(1);
            expect(byLink).toHaveBeenCalledWith(reference);
            expect(dryRun).not.toHaveBeenCalled();
        });

        it('reads from the dry-run storage first in a dry run', async () => {
            const byLink = vi.spyOn(service, 'getImageByLink').mockResolvedValue('data:ipfs');
            const dryRun = vi.spyOn(service, 'getImageFromDryRunStorage').mockResolvedValue('data:dry-run');

            const result = await service.getImageWithDryRunFallback(reference, true);

            expect(result).toBe('data:dry-run');
            expect(dryRun).toHaveBeenCalledTimes(1);
            expect(dryRun).toHaveBeenCalledWith(reference);
            expect(byLink).not.toHaveBeenCalled();
        });

        it('falls back to IPFS when the dry-run storage fails', async () => {
            const byLink = vi.spyOn(service, 'getImageByLink').mockResolvedValue('data:ipfs');
            const dryRun = vi.spyOn(service, 'getImageFromDryRunStorage').mockRejectedValue(new Error('not found'));

            const result = await service.getImageWithDryRunFallback(reference, true);

            expect(result).toBe('data:ipfs');
            expect(dryRun).toHaveBeenCalledTimes(1);
            expect(dryRun).toHaveBeenCalledWith(reference);
            expect(byLink).toHaveBeenCalledTimes(1);
            expect(byLink).toHaveBeenCalledWith(reference);
        });

        it('rejects with the IPFS error when both sources fail', async () => {
            const failure = new Error('ipfs unavailable');
            vi.spyOn(service, 'getImageByLink').mockRejectedValue(failure);
            vi.spyOn(service, 'getImageFromDryRunStorage').mockRejectedValue(new Error('not found'));

            await expect(service.getImageWithDryRunFallback(reference, true)).rejects.toEqual(failure);
        });
    });
});

describe('IPFSService dry-run file reader', () => {
    const silentFlag = (options: unknown) => (options instanceof Object && 'context' in options && options.context instanceof HttpContext ? options.context.get(SILENT_HTTP_ERRORS) : undefined);
    const build = () => {
        const http = Object.create(HttpClient.prototype);
        const get = vi.spyOn(http, 'get');
        const service = new IPFSService(http);
        return { service, get };
    };

    it('requests only dry-run storage, suppresses duplicate errors and returns a typed Blob', async () => {
        const { service, get } = build();
        const bytes = new TextEncoder().encode('%PDF-test').buffer;
        get.mockReturnValue(of(bytes));
        for (const prefix of ['ipfs://', 'https://ipfs.io/ipfs/']) {
            const blob = await firstValueFrom(service.getDryRunFile(`${prefix}6af6e8ec63af3cd1188591c0?fileName=test.pdf`));
            expect(blob.type).toBe('application/pdf');
            expect(await blob.text()).toBe('%PDF-test');
        }
        expect(get).toHaveBeenCalledTimes(2);
        for (const [url, options] of get.mock.calls) {
            expect(url).toBe('/api/v1/ipfs/file/6af6e8ec63af3cd1188591c0/dry-run');
            expect(options).toEqual(expect.objectContaining({ responseType: 'arraybuffer' }));
            expect(silentFlag(options)).toBe(true);
        }
    });

    it('keeps the global error handling for existing dry-run storage callers', () => {
        const { service, get } = build();
        get.mockReturnValue(of(new ArrayBuffer(0)));
        service.getFileFromDryRunStorage('6af6e8ec63af3cd1188591c0');
        service.getFileFromDryRunStorage('6af6e8ec63af3cd1188591c0', true);
        const [[defaultUrl, defaultOptions], [silentUrl, silentOptions]] = get.mock.calls;
        expect(defaultUrl).toBe('/api/v1/ipfs/file/6af6e8ec63af3cd1188591c0/dry-run');
        expect(silentUrl).toBe(defaultUrl);
        expect(silentFlag(defaultOptions)).toBe(false);
        expect(silentFlag(silentOptions)).toBe(true);
    });

    it('reads the dry-run file through the existing dry-run storage request', async () => {
        const { service } = build();
        const storage = vi.spyOn(service, 'getFileFromDryRunStorage').mockReturnValue(of(new TextEncoder().encode('%PDF-test').buffer));
        const blob = await firstValueFrom(service.getDryRunFile('ipfs://6af6e8ec63af3cd1188591c0?fileName=test.pdf'));
        expect(storage).toHaveBeenCalledExactlyOnceWith('6af6e8ec63af3cd1188591c0', true);
        expect(blob.type).toBe('application/pdf');
    });

    it('does not request a URL that has no dry-run id', async () => {
        const { service, get } = build();
        await expect(firstValueFrom(service.getDryRunFile('https://example.com/doc.pdf'))).rejects.toThrowError('File not found');
        expect(get).not.toHaveBeenCalled();
    });

    it('propagates a storage miss without requesting the IPFS endpoint', async () => {
        const { service, get } = build();
        const failure = new Error('404');
        get.mockReturnValue(throwError(() => failure));
        await expect(firstValueFrom(service.getDryRunFile('ipfs://56fbc24e8ec55d9ba2f9e21a735bebd2'))).rejects.toBe(failure);
        expect(get).toHaveBeenCalledTimes(1);
        expect(get.mock.lastCall?.[0]).toContain('/dry-run');
    });
});
