import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CopyButtonComponent } from '../copy-button/copy-button.component';
import { IPFSLinkComponent } from './ipfs-link.component';

describe('IPFSLinkComponent', () => {
    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    const build = (url: string | undefined) => {
        const clipboard = { copy: jasmine.createSpy('copy').and.returnValue(true) };
        TestBed.configureTestingModule({
            declarations: [IPFSLinkComponent, CopyButtonComponent],
            imports: [CommonModule],
            providers: [{ provide: Clipboard, useValue: clipboard }],
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
