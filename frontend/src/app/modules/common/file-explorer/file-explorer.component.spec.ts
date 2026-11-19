import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { IPFSService } from 'src/app/services/ipfs.service';
import { SettingsService } from 'src/app/services/settings.service';
import { ToastService } from 'src/app/services/toast.service';
import { FileExplorer } from './file-explorer.component';

describe('FileExplorer IPFS links', () => {
    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    const build = (params: string | null, type = 'ipfs') => {
        const result = new Subject<Blob>();
        const ipfs = { getFileBlob: vi.fn().mockReturnValue(result) };
        const toast = { error: vi.fn(), warn: vi.fn() };
        TestBed.configureTestingModule({
            declarations: [FileExplorer],
            providers: [
                { provide: IPFSService, useValue: ipfs },
                { provide: SettingsService, useValue: {} },
                { provide: ToastService, useValue: toast },
            ],
        });
        const fixture = TestBed.createComponent(FileExplorer);
        fixture.componentRef.setInput('type', type);
        fixture.componentRef.setInput('params', params);
        fixture.detectChanges();
        const tab = Object.assign(Object.create(null), {
            opener: window, document: { body: { textContent: '' } },
            location: { href: '' }, closed: false, close: vi.fn(),
        });
        const open = vi.spyOn(window, 'open').mockReturnValue(tab);
        return { fixture, ipfs, result, tab, open, toast };
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    for (const value of [cid, `ipfs://${cid}`, `https://ipfs.io/ipfs/${cid}`, `https://other.gateway/ipfs/${cid}?name=test`]) {
        it(`opens ${value} through the backend`, () => {
            const { fixture, ipfs, result, tab } = build(value);
            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tag-file');
            const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
            const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
            expect(link.getAttribute('href')).toBe('');
            const click = new MouseEvent('click', { bubbles: true, cancelable: true });
            link.dispatchEvent(click);
            expect(click.defaultPrevented).toBe(true);
            expect(ipfs.getFileBlob).toHaveBeenCalledExactlyOnceWith(cid);
            expect(tab.opener).toBeNull();
            expect(tab.document.body.textContent).toBe('Loading file…');
            result.next(new Blob(['tag file']));
            result.complete();
            expect(tab.location.href).toBe('blob:tag-file');
            vi.advanceTimersByTime(60000);
            expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:tag-file');
        });
    }

    it('reports a backend miss and closes the pending tab', () => {
        const { fixture, result, tab, toast } = build(`ipfs://${cid}`);
        fixture.nativeElement.querySelector('a').click();
        result.error(new Error('missing'));
        expect(tab.close).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledExactlyOnceWith('File not found');
    });

    it('does not read the file when pop-ups are blocked', () => {
        const { fixture, open, ipfs, toast } = build(`ipfs://${cid}`);
        open.mockReturnValue(null);
        fixture.nativeElement.querySelector('a').click();
        expect(ipfs.getFileBlob).not.toHaveBeenCalled();
        expect(toast.warn).toHaveBeenCalledExactlyOnceWith('Allow pop-ups for this site to open the file.');
    });

    it('keeps non-IPFS types on their existing empty link', () => {
        const { fixture, ipfs, open } = build('https://example.com', 'other');
        const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
        const click = new MouseEvent('click', { cancelable: true });
        fixture.debugElement.children[0].triggerEventHandler('click', click);
        expect(link.getAttribute('href')).toBe('');
        expect(click.defaultPrevented).toBe(false);
        expect(open).not.toHaveBeenCalled();
        expect(ipfs.getFileBlob).not.toHaveBeenCalled();
    });
});
