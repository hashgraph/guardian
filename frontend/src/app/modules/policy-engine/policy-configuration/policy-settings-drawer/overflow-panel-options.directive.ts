import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
    selector: '[appOverflowPanelOptions]',
    standalone: true
})
export class OverflowPanelOptionsDirective {
    constructor(private host: ElementRef<HTMLElement>) {}

    @HostListener('document:mouseover', ['$event'])
    public onMouseOver(event: MouseEvent): void {
        if (!(event.target instanceof Element)) {
            return;
        }

        const option = event.target.closest<HTMLElement>(
            '.pc-select-panel .p-select-option, .pc-select-panel .p-multiselect-option'
        );

        if (!option) {
            return;
        }

        if (this.isTruncated(option)) {
            option.setAttribute('title', option.textContent?.trim() || '');
        } else {
            option.removeAttribute('title');
        }
    }

    private isTruncated(option: HTMLElement): boolean {
        const elements = [option, ...Array.from(option.querySelectorAll<HTMLElement>('*'))];
        return elements.some(element =>
            element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1
        );
    }
}
