import { Component, ElementRef, NgZone, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LAST_USER_STORAGE_KEY } from '../../services/app-theme.service';
import { SchemaListResizeDirective, SchemaNameTooltipDirective } from './schema-list-layout.directive';

@Component({
    imports: [SchemaListResizeDirective, SchemaNameTooltipDirective],
    template: `
        <div class="editor sc-main" #editor>
            <aside class="sc-sidebar" [appSchemaListResize]="editor" #panel="schemaListResize">
                <div class="sc-schemas-toolbar">
                    <div class="sc-search-wrap"><input class="sc-search-input" /></div>
                    <button class="sc-btn-new-schema">+</button>
                </div>
                @for (copy of copies; track copy) {
                    <span class="name" [appSchemaNameTooltip]="name">{{ name }}</span>
                }
            </aside>
            <div class="handle sc-sidebar-resizer" (pointerdown)="panel.start($event)"></div>
        </div>
    `,
    styleUrls: ['./schemas-configuration.component.scss'],
    styles: [`.editor { width: 600px; max-width: 100%; } .name { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }`]
})
class HostComponent {
    public name = 'A long schema name '.repeat(30);
    public copies = [0];
}

describe('Schema list resize behavior', () => {
    const editorWidth = 1000;
    const key = 'SCHEMA_LIST_WIDTH:schema-resize-user';
    const otherKey = 'SCHEMA_LIST_WIDTH:schema-resize-other';
    let previous: Array<[string, string | null]>;
    const panels: SchemaListResizeDirective[] = [];

    beforeEach(() => {
        panels.length = 0;
        previous = [LAST_USER_STORAGE_KEY, key, otherKey].map(name => [name, localStorage.getItem(name)]);
        localStorage.setItem(LAST_USER_STORAGE_KEY, 'schema-resize-user');
        localStorage.removeItem(key);
        localStorage.removeItem(otherKey);
    });

    afterEach(() => {
        for (const panel of panels) {
            if ('ngOnDestroy' in panel && typeof panel.ngOnDestroy === 'function') { panel.ngOnDestroy(); }
        }
        for (const [name, value] of previous) {
            if (value === null) { localStorage.removeItem(name); }
            else { localStorage.setItem(name, value); }
        }
    });

    function open(): SchemaListResizeDirective {
        const container = document.createElement('div');
        Object.defineProperty(container, 'getBoundingClientRect', { value: () => ({ width: editorWidth }) });
        const run = (action: () => void) => action();
        const panel: SchemaListResizeDirective = Reflect.construct(SchemaListResizeDirective, [
            { run, runOutsideAngular: run },
            { markForCheck: () => {} }
        ]);
        Object.assign(panel, { container });
        panels.push(panel);
        panel.ngOnInit();
        return panel;
    }

    function event(x: number, pointerId = 1, button = 0): PointerEvent {
        return new PointerEvent('pointerdown', { clientX: x, pointerId, button, cancelable: true });
    }

    it('defaults to twenty-five editor-container percent', () => {
        expect(open().width).toBe('25%');
    });

    it('moves with the pointer, clamps both limits and saves only on release', () => {
        const panel = open();
        panel.start(event(100));
        panel.move(event(-10000));
        expect(panel.width).toBe('20%');
        panel.move(event(10000));
        expect(panel.width).toBe('30%');
        expect(localStorage.getItem(key)).toBeNull();
        panel.finish(event(100 + editorWidth / 40));
        expect(panel.widthPercent).toBeCloseTo(27.5, 1);
        expect(Number(localStorage.getItem(key))).toBeCloseTo(27.5, 1);
        expect(open().widthPercent).toBeCloseTo(27.5, 1);
    });

    it('restores a single preference for the user and isolates other users', () => {
        localStorage.setItem(key, '27');
        expect(open().width).toBe('27%');
        localStorage.setItem(LAST_USER_STORAGE_KEY, 'schema-resize-other');
        const other = open();
        expect(other.width).toBe('25%');
        other.start(event(100));
        other.finish(event(100 + editorWidth / 20));
        expect(Number(localStorage.getItem(otherKey))).toBeCloseTo(30, 0);
        localStorage.setItem(LAST_USER_STORAGE_KEY, 'schema-resize-user');
        expect(open().width).toBe('27%');
    });

    it('constrains saved widths below and above the supported limits', () => {
        localStorage.setItem(key, '12');
        expect(open().width).toBe('20%');
        localStorage.setItem(key, '32');
        expect(open().width).toBe('30%');
    });

    it('validates stored values and clamps finite values to the contract limits', () => {
        for (const invalid of ['', 'NaN', 'Infinity', 'not-a-number']) {
            localStorage.setItem(key, invalid);
            expect(open().width).withContext(invalid).toBe('25%');
        }
        localStorage.setItem(key, '5');
        expect(open().width).toBe('20%');
        localStorage.setItem(key, '90');
        expect(open().width).toBe('30%');
    });

    it('does not start resizing for a non-primary button or use a different pointer', () => {
        const panel = open();
        panel.start(event(100, 1, 2));
        panel.move(event(10000));
        expect(panel.width).toBe('25%');
        const start = event(100);
        panel.start(start);
        expect(start.defaultPrevented).toBeTrue();
        panel.move(event(10000, 2));
        panel.finish(event(10000, 2));
        expect(panel.width).toBe('25%');
        expect(localStorage.getItem(key)).toBeNull();
    });

    it('cancels an unfinished drag without storing it', () => {
        const panel = open();
        panel.start(event(100));
        panel.move(event(100 + editorWidth / 40));
        panel.cancelPointer(event(100, 2));
        panel.move(event(100 + editorWidth / 20));
        expect(panel.widthPercent).toBeCloseTo(30, 0);
        panel.cancelPointer(event(100));
        panel.finish(event(10000));
        expect(panel.widthPercent).toBeCloseTo(30, 0);
        expect(localStorage.getItem(key)).toBeNull();
    });

    it('retains its percentage and stops the current drag when the window changes', () => {
        localStorage.setItem(key, '28');
        const panel = open();
        panel.start(event(100));
        panel.cancel();
        panel.move(event(10000));
        panel.finish(event(10000));
        expect(panel.width).toBe('28%');
        expect(localStorage.getItem(key)).toBe('28');
    });

    it('does not create a shared anonymous width preference', () => {
        localStorage.removeItem(LAST_USER_STORAGE_KEY);
        const panel = open();
        panel.start(event(100));
        panel.finish(event(10000));
        expect(panel.width).toBe('30%');
        expect(localStorage.getItem(key)).toBeNull();
    });

    it('remains usable when reading localStorage is forbidden', () => {
        const getItem = spyOn(Storage.prototype, 'getItem').and.throwError('Storage unavailable');
        const panel = open();
        panel.start(event(100));
        expect(() => panel.finish(event(10000))).not.toThrow();
        expect(panel.width).toBe('30%');
        getItem.and.callThrough();
    });

    it('remains usable when writing localStorage is forbidden', () => {
        const panel = open();
        const setItem = spyOn(Storage.prototype, 'setItem').and.throwError('Storage unavailable');
        panel.start(event(100));
        expect(() => panel.finish(event(10000))).not.toThrow();
        expect(panel.width).toBe('30%');
        setItem.and.callThrough();
    });
});

describe('Schema name tooltip behavior', () => {
    let element: HTMLSpanElement;
    let tooltip: SchemaNameTooltipDirective;

    function dimensions(content: number, visible: number): void {
        Object.defineProperties(element, {
            scrollWidth: { configurable: true, value: content },
            clientWidth: { configurable: true, value: visible }
        });
    }

    beforeEach(() => {
        element = document.createElement('span');
        tooltip = new SchemaNameTooltipDirective(new ElementRef(element));
        tooltip.name = 'The full schema name';
    });

    it('exposes the complete name when the rendered content is clipped', () => {
        dimensions(300, 100);
        tooltip.update();
        expect(element.getAttribute('title')).toBe('The full schema name');
    });

    it('omits the tooltip when the content fits, even with literal dots', () => {
        dimensions(100, 100);
        tooltip.name = 'A...';
        tooltip.update();
        expect(element.hasAttribute('title')).toBeFalse();
    });

    it('removes and restores the full-name tooltip as clipping changes', () => {
        dimensions(300, 100);
        tooltip.update();
        expect(element.hasAttribute('title')).toBeTrue();
        dimensions(300, 500);
        tooltip.update();
        expect(element.hasAttribute('title')).toBeFalse();
        dimensions(300, 100);
        tooltip.update();
        expect(element.getAttribute('title')).toBe('The full schema name');
    });

    it('updates the full name when the schema name changes', () => {
        dimensions(300, 100);
        tooltip.update();
        tooltip.name = 'Another full schema name';
        tooltip.ngOnChanges();
        expect(element.getAttribute('title')).toBe('Another full schema name');
    });
});

describe('Schema list layout', () => {
    const userKey = 'SCHEMA_LIST_WIDTH:schema-layout-user';
    const otherKey = 'SCHEMA_LIST_WIDTH:schema-layout-other';
    let fixture: ComponentFixture<HostComponent>;
    let previousUser: string | null;
    let previousWidth: string | null;
    let previousOtherWidth: string | null;

    function open(copies = 1): void {
        fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.copies = Array.from({ length: copies }, (_, index) => index);
        fixture.detectChanges();
        spyOn(handle(), 'setPointerCapture').and.stub();
    }

    function panel(): HTMLElement { return fixture.nativeElement.querySelector('aside'); }
    function handle(): HTMLElement { return fixture.nativeElement.querySelector('.handle'); }
    function name(): HTMLElement { return fixture.nativeElement.querySelector('.name'); }
    function pointer(target: EventTarget, type: string, x: number, pointerId = 1, button = 0): void {
        target.dispatchEvent(new PointerEvent(type, { clientX: x, pointerId, button, bubbles: true, cancelable: true }));
        fixture.detectChanges();
    }
    function editor(): HTMLElement { return fixture.nativeElement.querySelector('.editor'); }
    function width(): number { return panel().getBoundingClientRect().width / editor().getBoundingClientRect().width * 100; }
    async function observeResize(): Promise<void> {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    beforeEach(() => {
        previousUser = localStorage.getItem(LAST_USER_STORAGE_KEY);
        previousWidth = localStorage.getItem(userKey);
        previousOtherWidth = localStorage.getItem(otherKey);
        localStorage.setItem(LAST_USER_STORAGE_KEY, 'schema-layout-user');
        localStorage.removeItem(userKey);
        localStorage.removeItem(otherKey);
        TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideZoneChangeDetection()] });
    });

    afterEach(() => {
        fixture?.destroy();
        const entries: Array<[string, string | null]> = [[LAST_USER_STORAGE_KEY, previousUser], [userKey, previousWidth], [otherKey, previousOtherWidth]];
        for (const [key, value] of entries) {
            if (value === null) { localStorage.removeItem(key); }
            else { localStorage.setItem(key, value); }
        }
    });

    function idlePointerZoneEntries(): number {
        const zone = TestBed.inject(NgZone);
        let entries = 0;
        const subscription = zone.onUnstable.subscribe(() => { entries++; });
        zone.runOutsideAngular(() => {
            window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 200 }));
        });
        subscription.unsubscribe();
        return entries;
    }

    it('does not enter Angular for pointer movement before a drag', async () => {
        open();
        await fixture.whenStable();
        expect(idlePointerZoneEntries()).toBe(0);
    });

    for (const end of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur', 'resize']) {
        it(`does not enter Angular for idle pointer movement after ${end}`, async () => {
            open();
            pointer(handle(), 'pointerdown', 100);
            window.dispatchEvent(new PointerEvent(end, { pointerId: 1, clientX: 100 }));
            await fixture.whenStable();
            expect(idlePointerZoneEntries()).toBe(0);
        });
    }

    it('updates rendered width during a drag without a manual detection call', async () => {
        open();
        fixture.autoDetectChanges();
        pointer(handle(), 'pointerdown', 100);
        await fixture.whenStable();
        TestBed.inject(NgZone).runOutsideAngular(() => {
            window.dispatchEvent(new PointerEvent('pointermove', {
                pointerId: 1, clientX: 100 + editor().getBoundingClientRect().width / 40
            }));
        });
        await fixture.whenStable();
        expect(width()).toBeCloseTo(27.5, 1);
    });

    it('releases an active drag when the editor is destroyed without saving it', async () => {
        open();
        pointer(handle(), 'pointerdown', 100);
        fixture.destroy();
        expect(idlePointerZoneEntries()).toBe(0);
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 10000 }));
        expect(localStorage.getItem(userKey)).toBeNull();
    });

    it('shares one resize observer across rows and releases it when no names remain', async () => {
        const OriginalObserver = window.ResizeObserver;
        let created = 0;
        let active = 0;
        class TrackedObserver extends OriginalObserver {
            constructor(callback: ResizeObserverCallback) {
                super(callback);
                created++;
                active++;
            }
            override disconnect(): void {
                active--;
                super.disconnect();
            }
        }
        window.ResizeObserver = TrackedObserver;
        try {
            open(100);
            expect(created).toBe(1);
            expect(active).toBe(1);
            name().style.width = '10px';
            await observeResize();
            expect(name().getAttribute('title')).toBe(fixture.componentInstance.name);
            fixture.componentInstance.copies = [0];
            fixture.changeDetectorRef.markForCheck();
            fixture.detectChanges();
            expect(active).toBe(1);
            name().style.width = '10000px';
            await observeResize();
            expect(name().hasAttribute('title')).toBeFalse();
            fixture.destroy();
            expect(active).toBe(0);
            open();
            expect(created).toBe(2);
        } finally {
            fixture?.destroy();
            window.ResizeObserver = OriginalObserver;
        }
    });

    it('starts at twenty-five percent of the editor container without a saved preference', () => {
        open();
        expect(width()).toBeCloseTo(25, 1);
    });

    it('resizes on boundary dragging and saves only after release', () => {
        open();
        pointer(handle(), 'pointerdown', 100);
        pointer(window, 'pointermove', 100 + editor().getBoundingClientRect().width / 40);
        expect(width()).toBeCloseTo(27.5, 1);
        expect(localStorage.getItem(userKey)).toBeNull();
        pointer(window, 'pointerup', 100 + editor().getBoundingClientRect().width / 40);
        expect(Number(localStorage.getItem(userKey))).toBeCloseTo(27.5, 1);
        fixture.destroy();
        open();
        expect(width()).toBeCloseTo(27.5, 1);
    });

    it('keeps the panel proportion when the editor container changes width', async () => {
        open();
        const before = panel().getBoundingClientRect().width;
        editor().style.width = '400px';
        await observeResize();
        expect(width()).toBeCloseTo(25, 1);
        expect(panel().getBoundingClientRect().width).toBeLessThan(before);
        pointer(handle(), 'pointerdown', 100);
        pointer(window, 'pointerup', 110);
        expect(width()).toBeCloseTo(27.5, 1);
    });

    it('keeps the add-schema control inside the panel at the minimum width', () => {
        open();
        pointer(handle(), 'pointerdown', 100);
        pointer(window, 'pointermove', -10000);
        const button = fixture.nativeElement.querySelector('.sc-btn-new-schema').getBoundingClientRect();
        const bounds = panel().getBoundingClientRect();
        expect(button.left).toBeGreaterThanOrEqual(bounds.left);
        expect(button.right).toBeLessThanOrEqual(bounds.right);
    });

    it('clamps dragging to twenty and thirty percent', () => {
        open();
        pointer(handle(), 'pointerdown', 100);
        pointer(window, 'pointermove', -10000);
        expect(width()).toBeCloseTo(20, 1);
        pointer(window, 'pointermove', 10000);
        expect(width()).toBeCloseTo(30, 1);
    });

    for (const stored of ['not-a-number', '', 'Infinity']) {
        it(`uses the default for an invalid saved width (${stored || 'empty'})`, () => {
            localStorage.setItem(userKey, stored);
            open();
            expect(width()).toBeCloseTo(25, 1);
        });
    }

    for (const [stored, expected] of [['5', 20], ['90', 30]] as const) {
        it(`constrains a saved width of ${stored} to the supported range`, () => {
            localStorage.setItem(userKey, stored);
            open();
            expect(width()).toBeCloseTo(expected, 1);
        });
    }

    it('keeps different users independent and restores their preference on return', () => {
        localStorage.setItem(userKey, '27');
        open();
        expect(width()).toBeCloseTo(27, 1);
        fixture.destroy();
        localStorage.setItem(LAST_USER_STORAGE_KEY, 'schema-layout-other');
        open();
        expect(width()).toBeCloseTo(25, 1);
        pointer(handle(), 'pointerdown', 100);
        pointer(window, 'pointerup', 100 + editor().getBoundingClientRect().width / 20);
        expect(Number(localStorage.getItem(otherKey))).toBeCloseTo(30, 0);
        expect(localStorage.getItem(userKey)).toBe('27');
        fixture.destroy();
        localStorage.setItem(LAST_USER_STORAGE_KEY, 'schema-layout-user');
        open();
        expect(width()).toBeCloseTo(27, 1);
    });

    it('prevents selection and bubbling when the resize boundary is pressed', () => {
        open();
        const bubbled = jasmine.createSpy('pointerdown');
        fixture.nativeElement.addEventListener('pointerdown', bubbled);
        const event = new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 100, bubbles: true, cancelable: true });
        handle().dispatchEvent(event);
        expect(event.defaultPrevented).toBeTrue();
        expect(bubbled).not.toHaveBeenCalled();
    });

    it('ignores another pointer and non-primary mouse buttons', () => {
        open();
        pointer(handle(), 'pointerdown', 100, 1, 2);
        pointer(window, 'pointermove', 10000);
        expect(width()).toBeCloseTo(25, 1);
        pointer(handle(), 'pointerdown', 100);
        pointer(window, 'pointermove', 10000, 2);
        pointer(window, 'pointerup', 10000, 2);
        expect(width()).toBeCloseTo(25, 1);
        expect(localStorage.getItem(userKey)).toBeNull();
    });

    for (const event of ['blur', 'resize', 'pointercancel']) {
        it(`stops a drag on ${event} without saving an unfinished preference`, () => {
            open();
            pointer(handle(), 'pointerdown', 100);
            pointer(window, 'pointermove', 100 + editor().getBoundingClientRect().width / 40);
            window.dispatchEvent(new PointerEvent(event, { pointerId: 1 }));
            pointer(window, 'pointermove', 10000);
            pointer(window, 'pointerup', 10000);
            expect(width()).toBeCloseTo(27.5, 1);
            expect(localStorage.getItem(userKey)).toBeNull();
        });
    }

    it('continues resizing when browser storage is unavailable', () => {
        const getItem = spyOn(Storage.prototype, 'getItem').and.throwError('Storage unavailable');
        open();
        expect(width()).toBeCloseTo(25, 1);
        pointer(handle(), 'pointerdown', 100);
        pointer(window, 'pointerup', 100 + editor().getBoundingClientRect().width / 40);
        expect(width()).toBeCloseTo(27.5, 1);
        getItem.and.callThrough();
    });

    it('shows the full name on hover only when the rendered name is truncated', () => {
        open();
        name().dispatchEvent(new MouseEvent('mouseenter'));
        expect(name().getAttribute('title')).toBe(fixture.componentInstance.name);
        fixture.componentInstance.name = 'Appendix X';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        name().dispatchEvent(new MouseEvent('mouseenter'));
        expect(name().hasAttribute('title')).toBeFalse();
    });

    it('does not treat literal dots in a fully visible name as truncation', () => {
        open();
        fixture.componentInstance.name = 'A...';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        name().dispatchEvent(new MouseEvent('mouseenter'));
        expect(name().hasAttribute('title')).toBeFalse();
    });

    it('updates tooltip eligibility after the rendered width changes', async () => {
        open();
        fixture.componentInstance.name = 'Appendix X';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        name().style.width = '10px';
        await observeResize();
        expect(name().getAttribute('title')).toBe('Appendix X');
        name().style.width = '500px';
        await observeResize();
        expect(name().hasAttribute('title')).toBeFalse();
    });
});
