import { AfterViewInit, booleanAttribute, ChangeDetectorRef, Directive, ElementRef, HostBinding, HostListener, Input, NgZone, OnChanges, OnDestroy, OnInit, Optional, Self, SkipSelf } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';
import { LAST_USER_STORAGE_KEY } from '../../services/app-theme.service';

function positionSchemaTooltip(tooltip: Tooltip | null): void {
    const container: unknown = tooltip?.container;
    if (!tooltip || !(container instanceof HTMLElement) || !container.classList.contains('sc-row-tooltip')) { return; }
    tooltip.alignTop();
    if (container.getBoundingClientRect().top < 12) { tooltip.alignBottom(); }
    const bounds = container.getBoundingClientRect();
    const left = Math.max(12, Math.min(bounds.left, window.innerWidth - bounds.width - 12));
    const top = Math.max(12, Math.min(bounds.top, window.innerHeight - bounds.height - 12));
    container.style.left = `${left + window.scrollX}px`;
    container.style.top = `${top + window.scrollY}px`;
}

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
        this.save();
    }

    public get roundedWidth(): number {
        return Math.round(this.widthPercent);
    }

    public key(event: KeyboardEvent): void {
        const width = this.keyWidth(event.key);
        if (width === null) { return; }
        event.preventDefault();
        this.widthPercent = width;
        this.save();
    }

    private keyWidth(key: string): number | null {
        switch (key) {
            case 'Home': return this.minWidthPercent;
            case 'End': return this.maxWidthPercent;
            case 'ArrowLeft': return this.clamp(Math.ceil(this.widthPercent) - 1);
            case 'ArrowRight': return this.clamp(Math.floor(this.widthPercent) + 1);
            default: return null;
        }
    }

    private save(): void {
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
    exportAs: 'schemaNameTooltip',
    standalone: true
})
export class SchemaNameTooltipDirective implements AfterViewInit, OnChanges, OnDestroy {
    @Input('appSchemaNameTooltip') public name = '';
    public truncated = false;
    private static observer: ResizeObserver | null = null;
    private static readonly updates = new Map<Element, () => void>();

    constructor(
        private readonly element: ElementRef<HTMLElement>,
        private readonly zone: NgZone,
        private readonly changeDetector: ChangeDetectorRef
    ) {}

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

    public rowTooltip<T>(message: string, content: T): T | '' {
        return this.hasRowTooltip(message) ? content : '';
    }

    public rowTooltipClass(message: string): string {
        return this.hasRowTooltip(message) ? 'sc-row-tooltip' : '';
    }

    private hasRowTooltip(message: string): boolean {
        return this.truncated || !!message;
    }

    @HostListener('mouseenter')
    public update(): void {
        const element = this.element.nativeElement;
        const truncated = !!this.name && element.scrollWidth > element.clientWidth;
        if (truncated !== this.truncated) {
            this.zone.run(() => Promise.resolve().then(() => {
                this.truncated = truncated;
                this.changeDetector.markForCheck();
            }));
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

@Directive({
    selector: '[appSchemaRowInnerTooltip]',
    standalone: true
})
export class SchemaRowInnerTooltipDirective implements OnInit, OnChanges, OnDestroy {
    @Input({ alias: 'appSchemaRowInnerTooltip', transform: booleanAttribute }) public enabled = true;
    @HostBinding('attr.appSchemaRowInnerTooltip') public readonly marker = '';
    private readonly events = new AbortController();
    private pointerInside = false;
    private childInside = false;

    constructor(
        private readonly element: ElementRef<HTMLElement>,
        private readonly zone: NgZone,
        @Optional() @SkipSelf() private readonly rowTooltip: Tooltip | null,
        @Optional() @Self() private readonly ownTooltip: Tooltip | null,
        @Optional() @SkipSelf() private readonly parent: SchemaRowInnerTooltipDirective | null
    ) {}

    public ngOnInit(): void {
        const element = this.element.nativeElement;
        const { signal } = this.events;
        this.zone.runOutsideAngular(() => {
            element.addEventListener('mouseenter', () => {
                this.pointerInside = true;
                if (this.enabled) {
                    this.hideAncestors();
                    setTimeout(() => positionSchemaTooltip(this.ownTooltip));
                }
            }, { signal });
            element.addEventListener('mouseleave', (event: MouseEvent) => {
                this.pointerInside = false;
                if (this.enabled && event.relatedTarget instanceof Node) {
                    this.restoreAncestor(event.relatedTarget);
                }
            }, { signal });
            element.addEventListener('click', (event: MouseEvent) => {
                if (event.target instanceof Element && event.target.closest('[appSchemaRowInnerTooltip]') !== element) { return; }
                this.restoreAfterRender();
            }, { signal });
        });
    }

    public ngOnChanges(): void {
        if (!this.pointerInside || this.childInside) { return; }
        if (this.enabled) {
            this.hideAncestors();
            this.restoreAfterRender();
        } else {
            this.ownTooltip?.deactivate();
            this.restoreAncestor(this.element.nativeElement);
        }
    }

    private hideAncestors(): void {
        this.rowTooltip?.deactivate();
        if (this.parent) {
            this.parent.childInside = true;
            this.parent.hideAncestors();
        }
    }

    private restoreAncestor(target: Node): void {
        if (this.parent) { this.parent.childInside = false; }
        if (this.rowTooltip?.el.nativeElement.contains(target) && this.rowTooltip.content) {
            this.rowTooltip.activate();
            positionSchemaTooltip(this.rowTooltip);
        } else {
            this.parent?.restoreAncestor(target);
        }
    }

    private restoreAfterRender(): void {
        this.zone.runOutsideAngular(() => setTimeout(() => {
            if (this.pointerInside && !this.childInside && !this.events.signal.aborted) {
                if (this.enabled) {
                    this.ownTooltip?.activate();
                    positionSchemaTooltip(this.ownTooltip);
                }
                else { this.restoreAncestor(this.element.nativeElement); }
            }
        }));
    }

    public ngOnDestroy(): void {
        this.events.abort();
    }
}

@Directive({
    selector: '[appSchemaRowTooltip]',
    standalone: true
})
export class SchemaRowTooltipDirective implements OnInit, OnDestroy {
    private readonly events = new AbortController();
    private pointerInside = false;

    constructor(
        private readonly element: ElementRef<HTMLElement>,
        private readonly zone: NgZone,
        @Optional() @Self() private readonly tooltip: Tooltip | null
    ) {}

    public ngOnInit(): void {
        const tooltip = this.tooltip;
        if (!tooltip) { return; }
        const element = this.element.nativeElement;
        const { signal } = this.events;
        this.zone.runOutsideAngular(() => {
            element.addEventListener('mouseenter', () => {
                this.pointerInside = true;
                setTimeout(() => positionSchemaTooltip(tooltip));
            }, { signal });
            element.addEventListener('mouseleave', () => { this.pointerInside = false; }, { signal });
            element.addEventListener('click', (event: MouseEvent) => {
                if (event.target instanceof Element && event.target.closest('[appSchemaRowInnerTooltip]')) { return; }
                setTimeout(() => {
                    if (this.pointerInside && !signal.aborted) {
                        tooltip.activate();
                        positionSchemaTooltip(tooltip);
                    }
                });
            }, { signal });
        });
    }

    public ngOnDestroy(): void {
        this.events.abort();
    }
}
