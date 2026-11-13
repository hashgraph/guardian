import { Clipboard } from '@angular/cdk/clipboard';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { CopyButtonComponent } from './copy-button.component';

describe('CopyButtonComponent', () => {
    const build = (value: string, copyResult = true) => {
        const clipboard = { copy: vi.fn().mockReturnValue(copyResult) };
        TestBed.configureTestingModule({
            declarations: [CopyButtonComponent],
            imports: [CommonModule],
            providers: [{ provide: Clipboard, useValue: clipboard }],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(CopyButtonComponent);
        fixture.componentRef.setInput('value', value);
        fixture.componentRef.setInput('tip', 'Copy CID');
        fixture.detectChanges();
        return { fixture, clipboard };
    };
    const icon = (fixture: any): string => fixture.nativeElement.querySelector('i').className;

    it('copies the value and shows a check for a moment', fakeAsync(() => {
        const { fixture, clipboard } = build('abc');
        expect(icon(fixture)).toContain('pi-copy');
        fixture.nativeElement.querySelector('button').click();
        fixture.detectChanges();
        expect(clipboard.copy).toHaveBeenCalledWith('abc');
        expect(icon(fixture)).toContain('pi-check');
        tick(1500);
        fixture.detectChanges();
        expect(icon(fixture)).toContain('pi-copy');
    }));

    it('does nothing for an empty value or when the copy fails', () => {
        const empty = build('');
        empty.fixture.nativeElement.querySelector('button').click();
        expect(empty.clipboard.copy).not.toHaveBeenCalled();
        TestBed.resetTestingModule();
        const failed = build('abc', false);
        failed.fixture.nativeElement.querySelector('button').click();
        failed.fixture.detectChanges();
        expect(icon(failed.fixture)).toContain('pi-copy');
    });

    it('shows only the label, and a check once copied', () => {
        const { fixture } = build('abc');
        fixture.componentRef.setInput('label', 'CID');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('i')).toBeNull();
        expect(fixture.nativeElement.querySelector('span').textContent).toBe('CID');
        fixture.nativeElement.querySelector('button').click();
        fixture.detectChanges();
        expect(icon(fixture)).toContain('pi-check');
    });

    it('names the button by its tip', () => {
        const { fixture } = build('abc');
        expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toBe('Copy CID');
    });
});
