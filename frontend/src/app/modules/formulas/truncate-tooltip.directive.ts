import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

/**
 * Shows the text as a tooltip only when the element is cut off with an ellipsis.
 * The overflow is measured on mouseenter: a template binding would read the layout
 * of every row on every change detection pass and freeze long lists.
 */
@Directive({
    selector: '[truncateTooltip]',
    standalone: false,
    hostDirectives: [{ directive: Tooltip, inputs: ['tooltipPosition'] }]
})
export class TruncateTooltipDirective {
    @Input('truncateTooltip') text: string | null | undefined = '';

    constructor(
        private readonly el: ElementRef<HTMLElement>,
        private readonly tooltip: Tooltip
    ) {
    }

    @HostListener('mouseenter')
    public onMouseEnter(): void {
        const element = this.el.nativeElement;
        const truncated = element.scrollWidth > element.clientWidth;
        this.tooltip.setOption({ tooltipLabel: truncated ? (this.text || '') : '' });
    }
}
