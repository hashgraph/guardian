import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, HostBinding, HostListener, Input, NgZone, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { LAST_USER_STORAGE_KEY } from '../../services/app-theme.service';

@Directive({
    selector: '[appSchemaListResize]',
    exportAs: 'schemaListResize',
    standalone: true
})
export class SchemaListResizeDirective implements OnInit, OnDestroy {
    @Input({ alias: 'appSchemaListResize', required: true }) public container: HTMLElement;
    public readonly minWidthPercent = 20;
    public readonly maxWidthPercent = 30;
    private readonly defaultWidthPercent = 25;
    public widthPercent = this.defaultWidthPercent;
    private storageKey: string | null = null;
    private drag: { pointerId: number; x: number; width: number } | null = null;
    private dragEvents: AbortController | null = null;

    constructor(private readonly zone: NgZone, private readonly changeDetector: ChangeDetectorRef) {}

    @HostBinding('style.width')
    public get width(): string {
        return `${this.widthPercent}%`;
    }

    public ngOnInit(): void {
        try {
            const userId = localStorage.getItem(LAST_USER_STORAGE_KEY);
            this.storageKey = userId ? `SCHEMA_LIST_WIDTH:${userId}` : null;
            const stored = this.storageKey ? localStorage.getItem(this.storageKey) : null;
            const value = stored?.trim() ? Number(stored) : NaN;
            this.widthPercent = Number.isFinite(value) ? this.clamp(value) : this.defaultWidthPercent;
        } catch {
            this.widthPercent = this.defaultWidthPercent;
        }
    }

    public start(event: PointerEvent): void {
        if (event.button !== 0 || this.drag) { return; }
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        this.drag = { pointerId: event.pointerId, x: event.clientX, width: this.widthPercent };
        this.dragEvents = new AbortController();
        const { signal } = this.dragEvents;
        this.zone.runOutsideAngular(() => {
            const cancel = () => this.cancel();
            const cancelPointer = (pointer: PointerEvent) => this.cancelPointer(pointer);
            window.addEventListener('pointermove', pointer => this.move(pointer), { signal });
            window.addEventListener('pointerup', pointer => this.finish(pointer), { signal });
            window.addEventListener('pointercancel', cancelPointer, { signal });
            window.addEventListener('lostpointercapture', cancelPointer, { signal });
            window.addEventListener('blur', cancel, { signal });
            window.addEventListener('resize', cancel, { signal });
        });
    }

    public move(event: PointerEvent): void {
        if (!this.drag || event.pointerId !== this.drag.pointerId) { return; }
        event.preventDefault();
        const containerWidth = this.container.getBoundingClientRect().width;
        if (containerWidth <= 0) { return; }
        const width = this.clamp(this.drag.width + (event.clientX - this.drag.x) / containerWidth * 100);
        if (width === this.widthPercent) { return; }
        this.zone.run(() => {
            this.widthPercent = width;
            this.changeDetector.markForCheck();
        });
    }

    public finish(event: PointerEvent): void {
        if (!this.drag || event.pointerId !== this.drag.pointerId) { return; }
        this.move(event);
        this.cancel();
        try {
            if (this.storageKey) {
                localStorage.setItem(this.storageKey, String(this.widthPercent));
            }
        } catch {
        }
    }

    public cancel(): void {
        this.drag = null;
        this.dragEvents?.abort();
        this.dragEvents = null;
    }

    public cancelPointer(event: PointerEvent): void {
        if (event.pointerId === this.drag?.pointerId) { this.cancel(); }
    }

    public ngOnDestroy(): void {
        this.cancel();
    }

    private clamp(value: number): number {
        return Math.min(this.maxWidthPercent, Math.max(this.minWidthPercent, value));
    }
}

@Directive({
    selector: '[appSchemaNameTooltip]',
    standalone: true
})
export class SchemaNameTooltipDirective implements AfterViewInit, OnChanges, OnDestroy {
    @Input('appSchemaNameTooltip') public name = '';
    private static observer: ResizeObserver | null = null;
    private static readonly updates = new Map<Element, () => void>();

    constructor(private readonly element: ElementRef<HTMLElement>) {}

    public ngAfterViewInit(): void {
        if (!SchemaNameTooltipDirective.observer) {
            SchemaNameTooltipDirective.observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    SchemaNameTooltipDirective.updates.get(entry.target)?.();
                }
            });
        }
        const element = this.element.nativeElement;
        SchemaNameTooltipDirective.updates.set(element, () => this.update());
        SchemaNameTooltipDirective.observer.observe(element);
        this.update();
    }

    public ngOnChanges(): void {
        this.update();
    }

    @HostListener('mouseenter')
    public update(): void {
        const element = this.element.nativeElement;
        if (this.name && element.scrollWidth > element.clientWidth) {
            element.setAttribute('title', this.name);
        } else {
            element.removeAttribute('title');
        }
    }

    public ngOnDestroy(): void {
        const element = this.element.nativeElement;
        if (SchemaNameTooltipDirective.updates.delete(element)) {
            SchemaNameTooltipDirective.observer?.unobserve(element);
        }
        if (!SchemaNameTooltipDirective.updates.size) {
            SchemaNameTooltipDirective.observer?.disconnect();
            SchemaNameTooltipDirective.observer = null;
        }
    }
}
