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
