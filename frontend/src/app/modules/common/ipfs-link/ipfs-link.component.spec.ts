import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CopyButtonComponent } from '../copy-button/copy-button.component';
import { Subject } from 'rxjs';
import { IPFSService } from 'src/app/services/ipfs.service';
import { ToastService } from 'src/app/services/toast.service';
import { IPFSLinkComponent } from './ipfs-link.component';

describe('IPFSLinkComponent', () => {
    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    const build = (url: string | undefined, dryRun = false) => {
        const clipboard = { copy: vi.fn().mockReturnValue(true) };
        TestBed.configureTestingModule({
            declarations: [IPFSLinkComponent, CopyButtonComponent],
            imports: [CommonModule],
            providers: [
                { provide: Clipboard, useValue: clipboard },
                { provide: IPFSService, useValue: {} },
                { provide: ToastService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(IPFSLinkComponent);
        fixture.componentRef.setInput('url', url);
        fixture.componentRef.setInput('dryRun', dryRun);
        fixture.detectChanges();
        return { fixture, clipboard };
    };

    it('renders dry-run Open without a CID as a button with no gateway address', () => {
        const { fixture } = build('ipfs://6af6e8ec63af3cd1188591c0', true);
        const open: HTMLButtonElement = fixture.nativeElement.querySelector('button.sf-ro-open');
        expect(open.textContent).toContain('Open');
        expect(open.type).toBe('button');
        expect(fixture.nativeElement.querySelector('a')).toBeNull();
        expect(fixture.nativeElement.querySelector('[href]')).toBeNull();
    });

    it('renders a real CID as a backend Open button even in dry run', () => {
        const { fixture } = build(`ipfs://${cid}`, true);
        expect(fixture.nativeElement.querySelector('button.sf-ro-open').textContent).toContain('Open');
        expect(fixture.nativeElement.querySelector('[href]')).toBeNull();
    });

    it('renders Open without a gateway address for a value without a CID outside dry run', () => {
        const { fixture } = build('ipfs://6af6e8ec63af3cd1188591c0');
        expect(fixture.nativeElement.querySelector('button.sf-ro-open').textContent).toContain('Open');
        expect(fixture.nativeElement.querySelector('[href]')).toBeNull();
    });

    it('renders Open as a button without a gateway address', () => {
        const { fixture } = build(`ipfs://${cid}?fileName=test.pdf`);
        const open: HTMLButtonElement = fixture.nativeElement.querySelector('button.sf-ro-open');
        expect(open.textContent).toContain('Open');
        expect(open.type).toBe('button');
        expect(fixture.nativeElement.querySelector('[href]')).toBeNull();
    });

    it('copies the stored link and bare CID separately', fakeAsync(() => {
        const value = `ipfs://${cid}?fileName=test.pdf`;
        const { fixture, clipboard } = build(value);
        const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('sf-copy button');
        expect(buttons.length).toBe(2);
        buttons[0].click();
        buttons[1].click();
        expect(clipboard.copy.mock.calls).toEqual([[value], [cid]]);
        tick(1500);
    }));

    for (const value of ['ipfs://6af6e8ec63af3cd1188591c0', 'ipfs://56fbc24e8ec55d9ba2f9e21a735bebd2', 'https://example.com/doc.pdf']) {
        it(`disables CID but preserves copying the link for ${value}`, fakeAsync(() => {
            const { fixture, clipboard } = build(value);
            const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('sf-copy button');
            expect(buttons.length).toBe(2);
            expect(buttons[1].disabled).toBe(true);
            buttons[1].click();
            expect(clipboard.copy).not.toHaveBeenCalled();
            buttons[0].click();
            expect(clipboard.copy).toHaveBeenCalledExactlyOnceWith(value);
            tick(1500);
        }));
    }

    it('does not expose an unrelated typed URL as a navigation target', () => {
        const { fixture } = build('https://example.com/doc.pdf');
        expect(fixture.nativeElement.querySelector('[href]')).toBeNull();
        expect(fixture.nativeElement.querySelector('button.sf-ro-open')).not.toBeNull();
    });

    it('renders no actions without a value and updates when the value changes', () => {
        const { fixture } = build(undefined);
        expect(fixture.nativeElement.querySelector('a')).toBeNull();
        expect(fixture.nativeElement.querySelector('button')).toBeNull();
        fixture.componentRef.setInput('url', `ipfs://${cid}`);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('button.sf-ro-open')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('[href]')).toBeNull();
    });
});

describe('IPFSLinkComponent file opening', () => {
    const build = (url = 'ipfs://6af6e8ec63af3cd1188591c0', dryRun = true) => {
        const result = new Subject<Blob>();
        const ipfs = { getDryRunFile: vi.fn().mockReturnValue(result), getFileBlob: vi.fn().mockReturnValue(result) };
        const toast = { error: vi.fn(), warn: vi.fn() };
        const component: IPFSLinkComponent = Reflect.construct(IPFSLinkComponent, [ipfs, toast]);
        Object.assign(component, { url, dryRun });
        component.ngOnChanges();
        const tab = Object.assign(Object.create(null), { close: vi.fn(), opener: window, document: { body: { textContent: '' } }, location: { href: '' }, closed: false });
        const open = vi.spyOn(window, 'open').mockReturnValue(tab);
        return { component, result, ipfs, toast, tab, open };
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    for (const prefix of ['https://ipfs.io/ipfs/', 'ipfs://', 'https://other.gateway/ipfs/']) {
        for (const dryRun of [false, true]) {
            it(`reads the bare CID through the backend for ${prefix} with dryRun=${dryRun}`, () => {
                const { component, result, ipfs, tab } = build(`${prefix}${cid}?fileName=test.pdf`, dryRun);
                vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backend-file');
                vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
                component.openFile();
                expect(ipfs.getFileBlob).toHaveBeenCalledExactlyOnceWith(cid);
                expect(ipfs.getDryRunFile).not.toHaveBeenCalled();
                result.next(new Blob(['%PDF-test'], { type: 'application/pdf' }));
                result.complete();
                expect(tab.location.href).toBe('blob:backend-file');
                vi.advanceTimersByTime(60000);
            });
        }
    }

    it('does not send a dry-run database id to dry-run storage outside dry run', () => {
        const { component, ipfs } = build('ipfs://6af6e8ec63af3cd1188591c0', false);
        component.openFile();
        expect(ipfs.getFileBlob).toHaveBeenCalledExactlyOnceWith('');
        expect(ipfs.getDryRunFile).not.toHaveBeenCalled();
    });

    it('opens the tab before reading and navigates to the typed Blob', () => {
        const { component, result, ipfs, tab, open, toast } = build();
        const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:document');
        const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
        ipfs.getDryRunFile.mockImplementation(() => {
            expect(open).toHaveBeenCalledExactlyOnceWith('', '_blank');
            return result;
        });
        component.openFile();
        expect(tab.opener).toBeNull();
        expect(tab.document.body.textContent).toBe('Loading file…');
        const blob = new Blob(['%PDF-test'], { type: 'application/pdf' });
        result.next(blob);
        result.complete();
        expect(create).toHaveBeenCalledExactlyOnceWith(blob);
        expect(tab.location.href).toBe('blob:document');
        expect(toast.error).not.toHaveBeenCalled();
        expect(revoke).not.toHaveBeenCalled();
        vi.advanceTimersByTime(60000);
        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:document');
    });

    it('closes the pending tab and reports File not found on a miss', () => {
        const { component, result, tab, toast } = build();
        component.openFile();
        result.error(new Error('404'));
        expect(tab.close).toHaveBeenCalledExactlyOnceWith();
        expect(toast.error).toHaveBeenCalledExactlyOnceWith('File not found');
    });

    it('asks to allow pop-ups and reads nothing when the tab was blocked', () => {
        const { component, open, ipfs, toast } = build();
        open.mockReturnValue(null);
        component.openFile();
        expect(toast.warn).toHaveBeenCalledExactlyOnceWith('Allow pop-ups for this site to open the file.');
        expect(toast.error).not.toHaveBeenCalled();
        expect(ipfs.getDryRunFile).not.toHaveBeenCalled();
        expect(ipfs.getFileBlob).not.toHaveBeenCalled();
        expect(open).toHaveBeenCalledTimes(1);
    });

    it('does not reopen a tab that the user closed while waiting', () => {
        const { component, result, tab, open } = build();
        const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:unused');
        component.openFile();
        Object.assign(tab, { closed: true });
        result.next(new Blob(['data']));
        result.complete();
        expect(create).not.toHaveBeenCalled();
        expect(open).toHaveBeenCalledTimes(1);
    });
});
