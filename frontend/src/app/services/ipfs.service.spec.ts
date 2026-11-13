import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { IPFSService } from './ipfs.service';

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
        const json = spyOn(service, 'getJsonFile').and.returnValue(of({ ok: true }));
        const file = spyOn(service, 'getFile').and.returnValue(of(new ArrayBuffer(0)));
        expect(await service.getJsonFileByLink(`ipfs://${cid}?name=test`)).toEqual({ ok: true });
        service.loadJsonFileByLink(`https://ipfs.io/ipfs/${cid}`).subscribe();
        await service.getImageByLink(`ipfs://${cid}`);
        expect(json.calls.allArgs()).toEqual([[cid], [cid]]);
        expect(file).toHaveBeenCalledOnceWith(cid);
    });

    describe('getImageWithDryRunFallback' , () => {
        it('reads from IPFS only when the view is not a dry run', async () => {
            const byLink = spyOn(service, 'getImageByLink').and.resolveTo('data:ipfs');
            const dryRun = spyOn(service, 'getImageFromDryRunStorage').and.resolveTo('data:dry-run');

            const result = await service.getImageWithDryRunFallback(reference, false);

            expect(result).toBe('data:ipfs');
            expect(byLink).toHaveBeenCalledOnceWith(reference);
            expect(dryRun).not.toHaveBeenCalled();
        });

        it('reads from the dry-run storage first in a dry run', async () => {
            const byLink = spyOn(service, 'getImageByLink').and.resolveTo('data:ipfs');
            const dryRun = spyOn(service, 'getImageFromDryRunStorage').and.resolveTo('data:dry-run');

            const result = await service.getImageWithDryRunFallback(reference, true);

            expect(result).toBe('data:dry-run');
            expect(dryRun).toHaveBeenCalledOnceWith(reference);
            expect(byLink).not.toHaveBeenCalled();
        });

        it('falls back to IPFS when the dry-run storage fails', async () => {
            const byLink = spyOn(service, 'getImageByLink').and.resolveTo('data:ipfs');
            const dryRun = spyOn(service, 'getImageFromDryRunStorage').and.rejectWith(new Error('not found'));

            const result = await service.getImageWithDryRunFallback(reference, true);

            expect(result).toBe('data:ipfs');
            expect(dryRun).toHaveBeenCalledOnceWith(reference);
            expect(byLink).toHaveBeenCalledOnceWith(reference);
        });

        it('rejects with the IPFS error when both sources fail', async () => {
            const failure = new Error('ipfs unavailable');
            spyOn(service, 'getImageByLink').and.rejectWith(failure);
            spyOn(service, 'getImageFromDryRunStorage').and.rejectWith(new Error('not found'));

            await expectAsync(service.getImageWithDryRunFallback(reference, true)).toBeRejectedWith(failure);
        });
    });
});
