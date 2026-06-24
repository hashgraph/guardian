import { Directive, ElementRef, HostListener, Input } from '@angular/core';

/**
 * Sets the native `title` tooltip only when the host element's text is
 * actually truncated (its content is wider than the element). Avoids showing
 * a tooltip for values that already fit.
 */
@Directive({
    selector: '[appOverflowTitle]',
    standalone: false
})
export class OverflowTitleDirective {
    @Input('appOverflowTitle') text: string | null | undefined = null;

    constructor(private el: ElementRef<HTMLElement>) {}

    @HostListener('mouseenter')
    public onMouseEnter(): void {
        const element = this.el.nativeElement;
        if (this.text && element.scrollWidth > element.clientWidth) {
            element.setAttribute('title', this.text);
        } else {
            element.removeAttribute('title');
        }
    }
}
