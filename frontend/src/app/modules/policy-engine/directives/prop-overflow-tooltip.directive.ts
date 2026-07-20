import { AfterViewInit, Directive, ElementRef, HostListener } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

@Directive({
    selector: 'input.prop-input:not(.code-preview), input.input-end, p-select, p-multiselect, .not-editable-text',
    standalone: false,
    hostDirectives: [Tooltip]
})
export class PropOverflowTooltipDirective implements AfterViewInit {
    constructor(
        private readonly elementRef: ElementRef<HTMLElement>,
        private readonly tooltip: Tooltip
    ) {}

    public ngAfterViewInit(): void {
        this.tooltip.setOption({ showDelay: 500 });
    }

    @HostListener('mouseenter')
    public onMouseEnter(): void {
        const overflowTarget = this.getOverflowTarget();
        const isOverflowing = !!overflowTarget && overflowTarget.scrollWidth > overflowTarget.clientWidth;
        this.tooltip.setOption({ tooltipLabel: isOverflowing ? this.getText() : '' });
    }

    @HostListener('mousedown', ['$event'])
    public onMouseDown(event: MouseEvent): void {
        const hostElement = this.elementRef.nativeElement;
        if (hostElement instanceof HTMLInputElement && hostElement.readOnly) {
            event.preventDefault();
        }
    }

    private getOverflowTarget(): HTMLElement | null {
        const hostElement = this.elementRef.nativeElement;
        if (hostElement instanceof HTMLInputElement) {
            return hostElement;
        }
        const selectLabel = hostElement.querySelector<HTMLElement>('.p-select-label, .p-multiselect-label');
        if (selectLabel) {
            return selectLabel;
        }
        return hostElement.parentElement;
    }

    private getText(): string {
        const hostElement = this.elementRef.nativeElement;
        if (hostElement instanceof HTMLInputElement) {
            return hostElement.value;
        }
        const selectLabel = hostElement.querySelector<HTMLElement>('.p-select-label, .p-multiselect-label');
        if (selectLabel) {
            return (selectLabel.textContent ?? '').trim();
        }
        return (hostElement.textContent ?? '').trim();
    }
}
