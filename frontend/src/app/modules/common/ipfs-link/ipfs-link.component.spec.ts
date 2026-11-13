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
    const build = (url: string | undefined) => {
        const clipboard = { copy: jasmine.createSpy('copy').and.returnValue(true) };
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
        fixture.detectChanges();
        return { fixture, clipboard };
    };

    it('opens a CID through the gateway in a separate tab', () => {
        const { fixture } = build(`ipfs://${cid}?fileName=test.pdf`);
        const open: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
        expect(open.textContent).toContain('Open');
        expect(open.getAttribute('href')).toBe(`https://ipfs.io/ipfs/${cid}?fileName=test.pdf`);
        expect(open.target).toBe('_blank');
        expect(open.rel).toBe('noopener noreferrer');
    });

    it('copies the stored link and bare CID separately', fakeAsync(() => {
        const value = `ipfs://${cid}?fileName=test.pdf`;
        const { fixture, clipboard } = build(value);
        const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        buttons[0].click();
        buttons[1].click();
        expect(clipboard.copy.calls.allArgs()).toEqual([[value], [cid]]);
        tick(1500);
    }));

    for (const value of ['ipfs://6af6e8ec63af3cd1188591c0', 'ipfs://56fbc24e8ec55d9ba2f9e21a735bebd2', 'https://example.com/doc.pdf']) {
        it(`disables CID but preserves copying the link for ${value}`, fakeAsync(() => {
            const { fixture, clipboard } = build(value);
            const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
            expect(buttons.length).toBe(2);
            expect(buttons[1].disabled).toBeTrue();
            buttons[1].click();
            expect(clipboard.copy).not.toHaveBeenCalled();
            buttons[0].click();
            expect(clipboard.copy).toHaveBeenCalledOnceWith(value);
            tick(1500);
        }));
    }

    it('leaves a typed URL unchanged', () => {
        const { fixture } = build('https://example.com/doc.pdf');
        expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('https://example.com/doc.pdf');
    });

    it('renders no actions without a value and updates when the value changes', () => {
        const { fixture } = build(undefined);
        expect(fixture.nativeElement.querySelector('a')).toBeNull();
        expect(fixture.nativeElement.querySelector('button')).toBeNull();
        fixture.componentRef.setInput('url', `ipfs://${cid}`);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe(`https://ipfs.io/ipfs/${cid}`);
    });
});

describe('IPFSLinkComponent dry-run opening', () => {
    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    const build = (url = 'ipfs://6af6e8ec63af3cd1188591c0', dryRun = true) => {
        const result = new Subject<Blob>();
        const ipfs = jasmine.createSpyObj<IPFSService>('IPFSService', ['getDryRunFile']);
        ipfs.getDryRunFile.and.returnValue(result);
        const toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
        const component: IPFSLinkComponent = Reflect.construct(IPFSLinkComponent, [ipfs, toast]);
        Object.assign(component, { url, dryRun });
        component.ngOnChanges();
        const tab = jasmine.createSpyObj<Window>('Window', ['close']);
        Object.assign(tab, { opener: window, document: { body: { textContent: '' } }, location: { href: '' }, closed: false });
        const open = spyOn(window, 'open').and.returnValue(tab);
        const event = jasmine.createSpyObj<MouseEvent>('MouseEvent', ['preventDefault']);
        return { component, result, ipfs, toast, tab, open, event };
    };

    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('opens the tab before reading and navigates to the typed Blob', () => {
        const { component, result, ipfs, tab, open, event, toast } = build();
        const create = spyOn(URL, 'createObjectURL').and.returnValue('blob:document');
        const revoke = spyOn(URL, 'revokeObjectURL');
        ipfs.getDryRunFile.and.callFake(() => {
            expect(open).toHaveBeenCalledOnceWith('', '_blank');
            return result;
        });
        component.openFile(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(tab.opener).toBeNull();
        expect(tab.document.body.textContent).toBe('Loading file…');
        const blob = new Blob(['%PDF-test'], { type: 'application/pdf' });
        result.next(blob);
        result.complete();
        expect(create).toHaveBeenCalledOnceWith(blob);
        expect(tab.location.href).toBe('blob:document');
        expect(toast.error).not.toHaveBeenCalled();
        expect(revoke).not.toHaveBeenCalled();
        jasmine.clock().tick(60000);
        expect(revoke).toHaveBeenCalledOnceWith('blob:document');
    });

    it('closes the pending tab and reports File not found on a miss', () => {
        const { component, result, tab, event, toast } = build();
        component.openFile(event);
        result.error(new Error('404'));
        expect(tab.close).toHaveBeenCalledOnceWith();
        expect(toast.error).toHaveBeenCalledOnceWith('File not found');
    });

    it('keeps a real CID on the plain gateway path even in dry run', () => {
        const { component, event, ipfs, open } = build(`ipfs://${cid}`);
        component.openFile(event);
        expect(component.link).toBe(`https://ipfs.io/ipfs/${cid}`);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(ipfs.getDryRunFile).not.toHaveBeenCalled();
        expect(open).not.toHaveBeenCalled();
    });

    it('keeps the existing plain-link path outside dry run', () => {
        const { component, event, ipfs, open } = build('https://example.com/doc.pdf', false);
        component.openFile(event);
        expect(component.link).toBe('https://example.com/doc.pdf');
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(ipfs.getDryRunFile).not.toHaveBeenCalled();
        expect(open).not.toHaveBeenCalled();
    });

    it('tries the object URL when the initial popup was blocked', () => {
        const { component, result, event, open } = build();
        open.and.returnValue(null);
        spyOn(URL, 'createObjectURL').and.returnValue('blob:document');
        const revoke = spyOn(URL, 'revokeObjectURL');
        component.openFile(event);
        result.next(new Blob(['data']));
        result.complete();
        expect(open).toHaveBeenCalledWith('blob:document', '_blank', 'noopener,noreferrer');
        jasmine.clock().tick(60000);
        expect(revoke).toHaveBeenCalledWith('blob:document');
    });

    it('does not reopen a tab that the user closed while waiting', () => {
        const { component, result, event, tab, open } = build();
        const create = spyOn(URL, 'createObjectURL');
        component.openFile(event);
        Object.assign(tab, { closed: true });
        result.next(new Blob(['data']));
        result.complete();
        expect(create).not.toHaveBeenCalled();
        expect(open).toHaveBeenCalledTimes(1);
    });
});
