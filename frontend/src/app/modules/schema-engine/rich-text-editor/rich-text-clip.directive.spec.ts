import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RichTextClipDirective } from './rich-text-clip.directive';

@Component({
    standalone: false,
    template: `<div class="host" appRichTextClip [innerHTML]="value"></div>`,
    styles: [`.host { max-height: 54px; width: 200px; overflow: hidden; font-size: 12px; line-height: 1.45; }`]
})
class HostComponent {
    public value = '';
}

describe('RichTextClipDirective', () => {
    let fixture: ComponentFixture<HostComponent>;

    const longValue = '<p>one</p><p>two</p><p>three</p><p>four</p><p>five</p><p>six</p>';
    const wideValue = `<p>${'nowrap'.repeat(40)}</p>`;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [HostComponent, RichTextClipDirective]
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
    });

    function element(): HTMLElement {
        return fixture.debugElement.query(By.css('.host')).nativeElement;
    }

    function directive(): RichTextClipDirective {
        return fixture.debugElement.query(By.directive(RichTextClipDirective))
            .injector.get(RichTextClipDirective);
    }

    it('should not mark a value that fits', () => {
        fixture.componentInstance.value = '<p>one</p>';
        fixture.detectChanges();
        directive().update();
        expect(element().hasAttribute('data-clipped')).toBeFalse();
        expect(element().hasAttribute('data-clipped-x')).toBeFalse();
    });

    it('should mark a value wider than the box', () => {
        fixture.componentInstance.value = wideValue;
        fixture.detectChanges();
        directive().update();
        expect(element().hasAttribute('data-clipped-x')).toBeTrue();
    });

    it('should clear the width mark when the value becomes narrow again', () => {
        fixture.componentInstance.value = wideValue;
        fixture.detectChanges();
        directive().update();
        expect(element().hasAttribute('data-clipped-x')).toBeTrue();

        fixture.componentInstance.value = '<p>one</p>';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        directive().update();
        expect(element().hasAttribute('data-clipped-x')).toBeFalse();
    });

    it('should mark a value taller than the box', () => {
        fixture.componentInstance.value = longValue;
        fixture.detectChanges();
        directive().update();
        expect(element().hasAttribute('data-clipped')).toBeTrue();
        expect(element().hasAttribute('data-clipped-x')).toBeFalse();
    });

    it('should clear the mark when the value becomes short again', () => {
        fixture.componentInstance.value = longValue;
        fixture.detectChanges();
        directive().update();
        expect(element().hasAttribute('data-clipped')).toBeTrue();

        fixture.componentInstance.value = '<p>one</p>';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        directive().update();
        expect(element().hasAttribute('data-clipped')).toBeFalse();
    });

    it('should mark a changed value without an explicit update call', async () => {
        fixture.detectChanges();
        fixture.componentInstance.value = longValue;
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        await new Promise(resolve => setTimeout(resolve));
        expect(element().hasAttribute('data-clipped')).toBeTrue();
    });

    it('should stop observing when the directive is destroyed', () => {
        fixture.detectChanges();
        const instance = directive();
        expect(() => fixture.destroy()).not.toThrow();
        expect(() => instance.ngOnDestroy()).not.toThrow();
    });
});
