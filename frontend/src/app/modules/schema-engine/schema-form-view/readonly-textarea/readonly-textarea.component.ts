import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Textarea } from 'primeng/textarea';

@Component({
    selector: 'app-readonly-textarea',
    template: `<textarea pInputTextarea [class.textarea-resize-none]="resizeNone" [value]="value" [readonly]="true" type="text" [autoResize]="autoResize" rows="1"></textarea>`,
    styles: [`:host { display: flex; flex-direction: column; } textarea[readonly] { opacity: 0.6 !important; cursor: not-allowed !important; }`],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ReadonlyTextareaComponent implements AfterViewInit, OnDestroy {
    @Input() value: unknown;
    @Input() autoResize: boolean = false;
    @Input() resizeNone: boolean = false;
    @ViewChild(Textarea) textarea?: Textarea;

    private observer?: ResizeObserver;
    private width = -1;

    constructor(private readonly element: ElementRef<HTMLElement>, private readonly zone: NgZone) {
    }

    ngAfterViewInit(): void {
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        this.zone.runOutsideAngular(() => {
            this.observer = new ResizeObserver(([entry]) => {
                const previous = this.width;
                this.width = entry.contentRect.width;
                const collapsed = previous < 0 && this.element.nativeElement.querySelector('textarea')?.style.height === '0px';
                if ((collapsed || (previous >= 0 && this.width !== previous)) && this.width > 0 && this.autoResize) {
                    requestAnimationFrame(() => this.textarea?.resize());
                }
            });
            this.observer.observe(this.element.nativeElement);
        });
    }

    ngOnDestroy(): void {
        this.observer?.disconnect();
    }
}
