import { Directive, ElementRef, HostListener, Input } from '@angular/core';

/**
 * Sets the native `title` tooltip only when the host element's text is
 * actually truncated (its content is wider than the element). Avoids showing
 * a tooltip for values that already fit.
 */
@Directive({
    selector: '[appOverflowTitle]',
    standalone: true
})
export class OverflowTitleDirective {
    @Input('appOverflowTitle') text: string | null | undefined = null;

    constructor(private el: ElementRef<HTMLElement>) {}

    @HostListener('mouseenter')
    public onMouseEnter(): void {
        const element = this.el.nativeElement;
        const overflowsParent = this.overflowsAncestor(element);
        const overflowsSelf = element.scrollWidth > element.clientWidth;

        if (this.text && (overflowsSelf || overflowsParent)) {
            element.setAttribute('title', this.text);
        } else {
            element.removeAttribute('title');
        }
    }

    private overflowsAncestor(element: HTMLElement): boolean {
        const elementRect = element.getBoundingClientRect();
        let parent = element.parentElement;

        while (parent) {
            const parentRect = parent.getBoundingClientRect();
            if (parentRect.width > 0 &&
                (elementRect.right > parentRect.right + 1 || elementRect.left < parentRect.left - 1)) {
                return true;
            }
            parent = parent.parentElement;
        }

        return false;
    }
}
