import { ChangeDetectorRef, Component, ElementRef, NgZone, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Tooltip } from 'primeng/tooltip';
import { LAST_USER_STORAGE_KEY } from '../../services/app-theme.service';
import { SchemaListResizeDirective, SchemaNameTooltipDirective, SchemaRowInnerTooltipDirective, SchemaRowTooltipDirective } from './schema-list-layout.directive';

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
                    <div class="name-row" [attr.data-row-tooltip]="nameTooltip.rowTooltip(message, 'styled')" [attr.data-name-shown]="nameTooltip.truncated">
                        <span class="name"
                              [appSchemaNameTooltip]="name"
                              #nameTooltip="schemaNameTooltip">{{ name }}</span>
                    </div>
                }
            </aside>
            <div class="handle sc-sidebar-resizer" tabindex="0" (keydown)="panel.key($event)" (pointerdown)="panel.start($event)"></div>
        </div>
    `,
    styleUrls: ['./schemas-configuration.component.scss'],
    styles: [`.editor { width: 600px; max-width: 100%; } .name { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }`]
})
class HostComponent {
    public name = 'A long schema name '.repeat(30);
    public copies = [0];
    public message = '';
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

    function keyEvent(name: string): KeyboardEvent {
        return new KeyboardEvent('keydown', { key: name, cancelable: true });
    }

    it('resizes with the arrow keys in whole percent steps and saves at once', () => {
        localStorage.setItem(key, '27.4');
        const panel = open();
        const right = keyEvent('ArrowRight');
        panel.key(right);
        expect(right.defaultPrevented).toBeTrue();
        expect(panel.widthPercent).toBe(28);
        expect(localStorage.getItem(key)).toBe('28');
        panel.key(keyEvent('ArrowLeft'));
        panel.key(keyEvent('ArrowLeft'));
        expect(panel.widthPercent).toBe(26);
        expect(localStorage.getItem(key)).toBe('26');
    });

    it('moves a fractional width to the next whole percent with the left arrow', () => {
        localStorage.setItem(key, '27.4');
        const left = open();
        left.key(keyEvent('ArrowLeft'));
        expect(left.widthPercent).toBe(27);
    });

    it('jumps to the limits with Home and End and stays inside them', () => {
        const panel = open();
        panel.key(keyEvent('End'));
        expect(panel.widthPercent).toBe(30);
        panel.key(keyEvent('ArrowRight'));
        expect(panel.widthPercent).toBe(30);
        panel.key(keyEvent('Home'));
        expect(panel.widthPercent).toBe(20);
        panel.key(keyEvent('ArrowLeft'));
        expect(panel.widthPercent).toBe(20);
        expect(localStorage.getItem(key)).toBe('20');
    });

    it('ignores other keys', () => {
        const panel = open();
        const enter = keyEvent('Enter');
        panel.key(enter);
        expect(enter.defaultPrevented).toBeFalse();
        expect(panel.widthPercent).toBe(25);
        expect(localStorage.getItem(key)).toBeNull();
    });

    it('reports a whole-number width to assistive technology', () => {
        localStorage.setItem(key, '27.4');
        expect(open().roundedWidth).toBe(27);
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
        const changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('changeDetector', ['markForCheck', 'detach', 'detectChanges', 'checkNoChanges', 'reattach']);
        tooltip = new SchemaNameTooltipDirective(new ElementRef(element), TestBed.inject(NgZone), changeDetector);
        tooltip.name = 'The full schema name';
    });

    async function measure(): Promise<void> {
        tooltip.update();
        await Promise.resolve();
    }

    it('offers the complete name when the rendered content is clipped', async () => {
        dimensions(300, 100);
        await measure();
        expect(tooltip.truncated).toBeTrue();
        expect(tooltip.rowTooltip('', 'styled')).toBe('styled');
        expect(tooltip.rowTooltipClass('')).toBe('sc-row-tooltip');
    });

    it('offers nothing when the content fits, even with literal dots', async () => {
        dimensions(100, 100);
        tooltip.name = 'A...';
        await measure();
        expect(tooltip.rowTooltip('', 'styled')).toBe('');
        expect(tooltip.rowTooltipClass('')).toBe('');
    });

    it('follows clipping as it changes', async () => {
        dimensions(300, 100);
        await measure();
        expect(tooltip.truncated).toBeTrue();
        dimensions(300, 500);
        await measure();
        expect(tooltip.truncated).toBeFalse();
        dimensions(300, 100);
        await measure();
        expect(tooltip.truncated).toBeTrue();
    });

    it('treats an empty name as not clipped', async () => {
        dimensions(300, 100);
        tooltip.name = '';
        tooltip.ngOnChanges();
        await Promise.resolve();
        expect(tooltip.truncated).toBeFalse();
    });

    it('puts the name in front of the row message when the name is clipped', async () => {
        dimensions(300, 100);
        await measure();
        expect(tooltip.rowTooltip('Would create a circular dependency', 'styled')).toBe('styled');
    });

    it('uses the same styled tooltip for the row message when the name fits', async () => {
        dimensions(100, 100);
        await measure();
        expect(tooltip.truncated).toBeFalse();
        expect(tooltip.rowTooltip('Would create a circular dependency', 'styled')).toBe('styled');
        expect(tooltip.rowTooltipClass('Would create a circular dependency')).toBe('sc-row-tooltip');
    });

    it('does not use a native browser tooltip', async () => {
        dimensions(300, 100);
        await measure();
        expect(element.hasAttribute('title')).toBeFalse();
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
    function rowTooltip(): string | null { return fixture.nativeElement.querySelector('.name-row').getAttribute('data-row-tooltip'); }
    function nameShown(): string | null { return fixture.nativeElement.querySelector('.name-row').getAttribute('data-name-shown'); }
    function setRow(nameText: string, message: string): void {
        fixture.componentInstance.name = nameText;
        fixture.componentInstance.message = message;
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
    }
    async function settle(): Promise<void> {
        await observeResize();
        await fixture.whenStable();
        fixture.detectChanges();
    }
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
            await settle();
            expect(rowTooltip()).toBe('styled');
            fixture.componentInstance.copies = [0];
            fixture.changeDetectorRef.markForCheck();
            fixture.detectChanges();
            expect(active).toBe(1);
            name().style.width = '10000px';
            await settle();
            expect(rowTooltip()).toBe('');
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

    it('resizes from the keyboard on the focusable boundary', () => {
        open();
        expect(handle().tabIndex).toBe(0);
        handle().focus();
        handle().dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
        fixture.detectChanges();
        expect(width()).toBeCloseTo(30, 1);
        expect(Number(localStorage.getItem(userKey))).toBe(30);
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

    it('offers the full name on hover only when the rendered name is truncated', async () => {
        open();
        name().dispatchEvent(new MouseEvent('mouseenter'));
        await settle();
        expect(rowTooltip()).toBe('styled');
        setRow('Appendix X', '');
        name().dispatchEvent(new MouseEvent('mouseenter'));
        await settle();
        expect(rowTooltip()).toBe('');
    });

    it('does not treat literal dots in a fully visible name as truncation', async () => {
        open();
        setRow('A...', '');
        name().dispatchEvent(new MouseEvent('mouseenter'));
        await settle();
        expect(rowTooltip()).toBe('');
    });

    it('updates tooltip eligibility after the rendered width changes', async () => {
        open();
        setRow('Appendix X', '');
        name().style.width = '10px';
        await settle();
        expect(rowTooltip()).toBe('styled');
        name().style.width = '500px';
        await settle();
        expect(rowTooltip()).toBe('');
    });

    it('shows one combined tooltip for a clipped name in a row with its own message', async () => {
        open();
        setRow(fixture.componentInstance.name, 'Cannot use the current schema as a sub-schema');
        await settle();
        expect(rowTooltip()).toBe('styled');
        expect(name().hasAttribute('title')).toBeFalse();
    });

    it('shows the row message without the name when the name fits', async () => {
        open();
        setRow('Appendix X', 'Cannot use the current schema as a sub-schema');
        await settle();
        expect(rowTooltip()).toBe('styled');
        expect(nameShown()).toBe('false');
    });

    it('adds and removes the name in the row tooltip as the rendered width changes', async () => {
        open();
        setRow('Appendix X', 'Would create a circular dependency');
        await settle();
        expect(nameShown()).toBe('false');
        name().style.width = '10px';
        await settle();
        expect(nameShown()).toBe('true');
        expect(rowTooltip()).toBe('styled');
        name().style.width = '500px';
        await settle();
        expect(nameShown()).toBe('false');
        expect(rowTooltip()).toBe('styled');
    });
});

@Component({
    imports: [Tooltip, SchemaRowInnerTooltipDirective, SchemaRowTooltipDirective],
    template: `
        <div class="row" pTooltip="Cannot use the current schema as a sub-schema" appSchemaRowTooltip>
            <span class="plain">Name</span>
            <span class="lock" pTooltip="Schema settings are locked" appSchemaRowInnerTooltip>L</span>
            <span class="bare" appSchemaRowInnerTooltip>B</span>
        </div>
    `
})
class RowTooltipHostComponent {}

describe('Schema row inner tooltips', () => {
    let fixture: ComponentFixture<RowTooltipHostComponent>;
    let row: Tooltip;
    let activate: jasmine.Spy;

    function element(selector: string): HTMLElement { return fixture.nativeElement.querySelector(selector); }
    function hover(target: HTMLElement, type: 'mouseenter' | 'mouseleave', relatedTarget: EventTarget | null = null): void {
        target.dispatchEvent(new MouseEvent(type, { relatedTarget }));
    }

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [RowTooltipHostComponent], providers: [provideZoneChangeDetection()] });
        fixture = TestBed.createComponent(RowTooltipHostComponent);
        fixture.detectChanges();
        row = fixture.debugElement.query(By.css('.row')).injector.get(Tooltip);
        activate = spyOn(row, 'activate');
        spyOn(row, 'deactivate');
    });

    afterEach(() => {
        fixture?.destroy();
    });

    it('hides the row tooltip while an element with its own tooltip is hovered', () => {
        hover(element('.lock'), 'mouseenter');
        expect(row.deactivate).toHaveBeenCalledTimes(1);
        expect(row.activate).not.toHaveBeenCalled();
    });

    it('shows the row tooltip again when the pointer moves back onto the row', () => {
        hover(element('.lock'), 'mouseenter');
        hover(element('.lock'), 'mouseleave', element('.plain'));
        expect(row.activate).toHaveBeenCalledTimes(1);
    });

    it('does not show the row tooltip when the pointer leaves the row', () => {
        hover(element('.lock'), 'mouseenter');
        hover(element('.lock'), 'mouseleave', document.body);
        expect(row.activate).not.toHaveBeenCalled();
    });

    it('does not enter Angular while inner elements are hovered', () => {
        const zone = TestBed.inject(NgZone);
        let entries = 0;
        const subscription = zone.onUnstable.subscribe(() => { entries++; });
        zone.runOutsideAngular(() => {
            hover(element('.bare'), 'mouseenter');
            hover(element('.bare'), 'mouseleave', element('.plain'));
        });
        subscription.unsubscribe();
        expect(entries).toBe(0);
        expect(row.deactivate).toHaveBeenCalledTimes(1);
        expect(row.activate).toHaveBeenCalledTimes(1);
    });

    it('stops listening when the row is destroyed', () => {
        const lock = element('.lock');
        fixture.destroy();
        hover(lock, 'mouseenter');
        hover(lock, 'mouseleave', document.body);
        expect(row.deactivate).not.toHaveBeenCalled();
        expect(row.activate).not.toHaveBeenCalled();
    });

    async function afterClick(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve));
    }

    function enterRow(): void {
        hover(element('.row'), 'mouseenter');
        activate.calls.reset();
    }

    it('shows the row tooltip again right after the row is clicked', async () => {
        enterRow();
        element('.plain').click();
        await afterClick();
        expect(row.activate).toHaveBeenCalledTimes(1);
    });

    it('keeps the row tooltip hidden after a click on an element with its own tooltip', async () => {
        enterRow();
        element('.lock').click();
        await afterClick();
        expect(row.activate).not.toHaveBeenCalled();
    });

    it('does not show the row tooltip after a click when the pointer has already left', async () => {
        enterRow();
        element('.plain').click();
        hover(element('.row'), 'mouseleave', document.body);
        await afterClick();
        expect(row.activate).not.toHaveBeenCalled();
    });

    it('does not enter Angular for row hovering and clicks', async () => {
        const zone = TestBed.inject(NgZone);
        let entries = 0;
        const subscription = zone.onUnstable.subscribe(() => { entries++; });
        enterRow();
        zone.runOutsideAngular(() => {
            element('.plain').click();
        });
        await afterClick();
        subscription.unsubscribe();
        expect(entries).toBe(0);
        expect(row.activate).toHaveBeenCalledTimes(1);
    });

    it('does not show the row tooltip after a click once the row is destroyed', async () => {
        enterRow();
        element('.plain').click();
        fixture.destroy();
        await afterClick();
        expect(row.activate).not.toHaveBeenCalled();
    });
});

@Component({
    imports: [Tooltip, SchemaNameTooltipDirective, SchemaRowInnerTooltipDirective, SchemaRowTooltipDirective],
    template: `
        <div class="row" [pTooltip]="message ? warning : ''" tooltipStyleClass="sc-row-tooltip" tooltipPosition="top" appSchemaRowTooltip>
            <ng-template #warning><span class="sc-row-tooltip-message"><i class="pi pi-exclamation-triangle"></i><span>{{ message }}</span></span></ng-template>
            <ng-template #content>
                <span class="sc-row-tooltip-name">{{ name }}</span>
                @if (message) {<span class="sc-row-tooltip-message sc-row-tooltip-message--separated"><i class="pi pi-exclamation-triangle"></i><span>{{ message }}</span></span>}
            </ng-template>
            <span class="name"
                  [appSchemaNameTooltip]="name"
                  #nameTooltip="schemaNameTooltip"
                  [pTooltip]="nameTooltip.rowTooltip('', content)"
                  tooltipStyleClass="sc-row-tooltip" tooltipPosition="top"
                  [appSchemaRowInnerTooltip]="nameTooltip.truncated">{{ name }}<i class="star" pTooltip="Featured" appSchemaRowInnerTooltip></i></span>
            <span class="metadata">Draft</span>
        </div>
    `,
    styleUrls: ['./schemas-configuration.component.scss'],
    styles: [`.row { position: fixed; width: 120px; top: 240px; left: 260px; } .name { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }`]
})
class RowTooltipContentHostComponent {
    public name = '<b>Monitored Parameters by Project Instance</b>';
    public message = 'Cannot use the current schema as a sub-schema';
}

describe('Schema row tooltip content', () => {
    let fixture: ComponentFixture<RowTooltipContentHostComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [RowTooltipContentHostComponent], providers: [provideZoneChangeDetection()] });
        fixture = TestBed.createComponent(RowTooltipContentHostComponent);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture?.destroy();
    });

    async function showRowTooltip(): Promise<Element | null> {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await fixture.whenStable();
        fixture.detectChanges();
        const name = fixture.debugElement.query(By.css('.name'));
        const target = name.injector.get(SchemaNameTooltipDirective).truncated ? name : fixture.debugElement.query(By.css('.row'));
        target.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
        await new Promise(resolve => setTimeout(resolve));
        return document.querySelector('.p-tooltip .p-tooltip-text');
    }

    it('separates the full name from the warning below it, with the name as plain text', async () => {
        const text = await showRowTooltip();
        const name = text?.querySelector('.sc-row-tooltip-name');
        const message = text?.querySelector('.sc-row-tooltip-message');
        expect(name?.textContent).toBe('<b>Monitored Parameters by Project Instance</b>');
        expect(text?.querySelector('.sc-row-tooltip-name b')).toBeNull();
        expect(message?.textContent).toBe('Cannot use the current schema as a sub-schema');
        expect(document.querySelector('.p-tooltip')?.classList.contains('sc-row-tooltip')).toBeTrue();
        expect(message?.classList.contains('sc-row-tooltip-message--separated')).toBeTrue();
        expect(message?.getBoundingClientRect().top).toBeGreaterThan(name?.getBoundingClientRect().bottom ?? Infinity);
        expect(message?.querySelector('i.pi-exclamation-triangle')).not.toBeNull();
    });

    it('shows the clipped name alone, in the same tooltip style, when the row has no message', async () => {
        fixture.componentInstance.message = '';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        const text = await showRowTooltip();
        expect(text?.querySelector('.sc-row-tooltip-name')?.textContent).toBe('<b>Monitored Parameters by Project Instance</b>');
        expect(text?.querySelector('.sc-row-tooltip-separator')).toBeNull();
        expect(text?.querySelector('.sc-row-tooltip-message')).toBeNull();
        expect(document.querySelector('.p-tooltip')?.classList.contains('sc-row-tooltip')).toBeTrue();
    });

    it('shows the message alone, in the same tooltip style, when the name fits', async () => {
        fixture.componentInstance.name = 'X';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        const text = await showRowTooltip();
        expect(text?.querySelector('.sc-row-tooltip-name')).toBeNull();
        expect(text?.querySelector('.sc-row-tooltip-separator')).toBeNull();
        expect(text?.querySelector('.sc-row-tooltip-message')?.textContent).toBe('Cannot use the current schema as a sub-schema');
        expect(document.querySelector('.p-tooltip')?.classList.contains('sc-row-tooltip')).toBeTrue();
    });

    function expectEndingVisible(element: Element, clippingArea: HTMLElement): void {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let lastText: Node | null = null;
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (text.textContent?.length) { lastText = text; }
        }
        if (!lastText) { fail('Expected tooltip text'); return; }
        const range = document.createRange();
        const length = lastText.textContent?.length ?? 0;
        range.setStart(lastText, length - 1);
        range.setEnd(lastText, length);
        const ending = range.getBoundingClientRect();
        const bounds = clippingArea.getBoundingClientRect();
        expect(ending.left).toBeGreaterThanOrEqual(bounds.left - 1);
        expect(ending.right).toBeLessThanOrEqual(bounds.right + 1);
        expect(ending.top).toBeGreaterThanOrEqual(bounds.top - 1);
        expect(ending.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
    }

    it('keeps an oversized full name and its warning visible inside the viewport', async () => {
        fixture.componentInstance.name = 'Monitoring parameters '.repeat(20) + 'END-OF-NAME';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        const text = await showRowTooltip();
        if (!(text instanceof HTMLElement)) { fail('Expected a full-name tooltip'); return; }
        expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth + 1);
        expect(text.scrollHeight).toBeLessThanOrEqual(text.clientHeight + 1);
        expect(text.querySelector('.sc-row-tooltip-name')?.textContent).toContain('END-OF-NAME');
        expect(text.querySelector('.sc-row-tooltip-message')?.textContent).toBe(fixture.componentInstance.message);
        const name = text.querySelector('.sc-row-tooltip-name');
        const warning = text.querySelector('.sc-row-tooltip-message');
        if (!name || !warning) { fail('Expected both full name and warning'); return; }
        expectEndingVisible(name, text);
        expectEndingVisible(warning, text);
        const overlay = document.querySelector('.p-tooltip')?.getBoundingClientRect();
        expect(overlay?.left).toBeGreaterThanOrEqual(0);
        expect(overlay?.right).toBeLessThanOrEqual(window.innerWidth);
    });

    it('wraps an unbroken title without clipping its ending', async () => {
        fixture.componentInstance.name = 'X'.repeat(300);
        fixture.componentInstance.message = '';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        const text = await showRowTooltip();
        if (!(text instanceof HTMLElement)) { fail('Expected a full-name tooltip'); return; }
        expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth + 1);
        expect(text.querySelector('.sc-row-tooltip-name')?.textContent).toBe('X'.repeat(300));
        const name = text.querySelector('.sc-row-tooltip-name');
        if (!name) { fail('Expected the unbroken name'); return; }
        expectEndingVisible(name, text);
        expect(text.querySelector('.sc-row-tooltip-message')).toBeNull();
    });

    it('anchors the full-name tooltip above the name', async () => {
        await showRowTooltip();
        const overlay = document.querySelector('.p-tooltip');
        const name = fixture.nativeElement.querySelector('.name').getBoundingClientRect();
        expect(overlay?.classList.contains('p-tooltip-top')).toBeTrue();
        expect(overlay?.getBoundingClientRect().bottom).toBeLessThanOrEqual(name.top + 1);
    });

    it('keeps a long tooltip above an edge name when there is room above', async () => {
        fixture.nativeElement.querySelector('.row').style.left = '0';
        fixture.componentInstance.name = 'Monitoring parameters '.repeat(20) + 'END-OF-NAME';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        await showRowTooltip();
        const overlay = document.querySelector('.p-tooltip');
        expect(overlay?.classList.contains('p-tooltip-top')).toBeTrue();
        expect(overlay?.getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
        expect(overlay?.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    });

    it('keeps the tooltip visible when the name is against the viewport edge', async () => {
        fixture.nativeElement.querySelector('.row').style.left = '0';
        await showRowTooltip();
        const overlay = document.querySelector('.p-tooltip')?.getBoundingClientRect();
        expect(overlay?.left).toBeGreaterThanOrEqual(0);
        expect(overlay?.right).toBeLessThanOrEqual(window.innerWidth);
        expect(overlay?.top).toBeGreaterThanOrEqual(0);
        expect(overlay?.bottom).toBeLessThanOrEqual(window.innerHeight);
    });

    it('shows only the warning over the card even when its name is truncated', async () => {
        await fixture.whenStable();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.row').dispatchEvent(new MouseEvent('mouseenter'));
        const text = document.querySelector('.p-tooltip-text');
        expect(text?.querySelector('.sc-row-tooltip-name')).toBeNull();
        expect(text?.querySelector('.sc-row-tooltip-message')?.textContent).toBe(fixture.componentInstance.message);
    });

    it('keeps only one overlay while moving from the card to the name and back', async () => {
        await showRowTooltip();
        const row: HTMLElement = fixture.nativeElement.querySelector('.row');
        const name: HTMLElement = fixture.nativeElement.querySelector('.name');
        expect(document.querySelectorAll('.p-tooltip').length).toBe(1);
        name.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: row }));
        expect(document.querySelectorAll('.p-tooltip').length).toBe(1);
        expect(document.querySelector('.p-tooltip .sc-row-tooltip-name')).toBeNull();
        name.dispatchEvent(new MouseEvent('mouseenter'));
        expect(document.querySelectorAll('.p-tooltip').length).toBe(1);
        expect(document.querySelector('.p-tooltip .sc-row-tooltip-name')).not.toBeNull();
    });

    it('shows only Featured when the star inside the name is hovered', async () => {
        await showRowTooltip();
        fixture.nativeElement.querySelector('.star').dispatchEvent(new MouseEvent('mouseenter'));
        expect(document.querySelectorAll('.p-tooltip').length).toBe(1);
        expect(document.querySelector('.p-tooltip-text')?.textContent).toBe('Featured');
    });

    it('shows no tooltip when the name fits and the row has no message', async () => {
        fixture.componentInstance.name = 'X';
        fixture.componentInstance.message = '';
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        const text = await showRowTooltip();
        expect(text).toBeNull();
    });
});

@Component({
    imports: [Tooltip, SchemaNameTooltipDirective, SchemaRowTooltipDirective, SchemaRowInnerTooltipDirective],
    template: `
        @for (copy of [0]; track copy) {
            @let rowMessage = message;
            <div class="row" [style.width.px]="rowWidth" style="display: flex"
                 [pTooltip]="rowMessage"
                 tooltipStyleClass="sc-row-tooltip"
                 appSchemaRowTooltip
                 tooltipPosition="top"
                 (mouseenter)="hovered = true"
                 (mouseleave)="hovered = false">
                <ng-template #content>@if (nameTooltip.truncated) {<span class="sc-row-tooltip-name">{{ name }}</span>}@if (rowMessage) {<span class="sc-row-tooltip-message">{{ rowMessage }}</span>}</ng-template>
                <span class="name"
                      [appSchemaNameTooltip]="name"
                      #nameTooltip="schemaNameTooltip"
                      [pTooltip]="nameTooltip.rowTooltip('', content)"
                      tooltipStyleClass="sc-row-tooltip" tooltipPosition="top"
                      [appSchemaRowInnerTooltip]="nameTooltip.truncated">{{ name }}</span>
                @if (hovered) {
                    <button class="delete" pTooltip="Delete" tooltipPosition="right" appSchemaRowInnerTooltip>Delete</button>
                }
            </div>
        }
    `,
    styles: [`.name { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .delete { width: 60px; flex-shrink: 0; }`]
})
class HoverButtonHostComponent {
    public name = 'Value applied for CODinflow,i,y';
    public message = '';
    public hovered = false;
    public rowWidth = 1000;
}

describe('Schema row tooltip when hovering makes the name clipped', () => {
    let fixture: ComponentFixture<HoverButtonHostComponent>;

    beforeEach(async () => {
        TestBed.configureTestingModule({ imports: [HoverButtonHostComponent], providers: [provideZoneChangeDetection()] });
        fixture = TestBed.createComponent(HoverButtonHostComponent);
        fixture.autoDetectChanges();
        await fixture.whenStable();
        const text = document.createRange();
        text.selectNodeContents(fixture.nativeElement.querySelector('.name'));
        fixture.componentInstance.rowWidth = Math.ceil(text.getBoundingClientRect().width) + 10;
        fixture.changeDetectorRef.markForCheck();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await fixture.whenStable();
    });

    afterEach(() => {
        fixture?.destroy();
    });

    it('shows the tooltip on name hover after the delete button clips the name', async () => {
        const row: HTMLElement = fixture.nativeElement.querySelector('.row');
        const name: HTMLElement = fixture.nativeElement.querySelector('.name');
        expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
        expect(document.querySelector('.p-tooltip')).toBeNull();
        row.dispatchEvent(new MouseEvent('mouseenter'));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await fixture.whenStable();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        expect(fixture.nativeElement.querySelector('.delete')).not.toBeNull();
        expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
        expect(document.querySelector('.p-tooltip')).toBeNull();
        name.dispatchEvent(new MouseEvent('mouseenter'));
        await fixture.whenStable();
        expect(document.querySelector('.p-tooltip .sc-row-tooltip-name')?.textContent).toBe('Value applied for CODinflow,i,y');
    });
});

describe('Schema nested tooltip ownership', () => {
    const directives: SchemaRowInnerTooltipDirective[] = [];
    const zone = { runOutsideAngular: (action: () => void) => action() };

    function tooltip(element: HTMLElement, content = 'Warning') {
        return {
            el: new ElementRef(element), content, active: true,
            activate() { this.active = !!this.content; },
            deactivate() { this.active = false; }
        };
    }

    function attach(element: HTMLElement, parent: ReturnType<typeof tooltip>, own: ReturnType<typeof tooltip>, ancestor: SchemaRowInnerTooltipDirective | null = null) {
        const directive: SchemaRowInnerTooltipDirective = Reflect.construct(SchemaRowInnerTooltipDirective, [new ElementRef(element), zone, parent, own, ancestor]);
        element.setAttribute('appSchemaRowInnerTooltip', '');
        Object.assign(directive, { enabled: !!own.content });
        directives.push(directive);
        directive.ngOnInit();
        return directive;
    }

    afterEach(() => {
        directives.splice(0).forEach(directive => directive.ngOnDestroy());
    });

    it('restores the full name when leaving a nested icon for the name', () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        const star = document.createElement('i');
        row.appendChild(name);
        name.appendChild(star);
        const warning = tooltip(row);
        const fullName = tooltip(name, 'Full name');
        const parent = attach(name, warning, fullName);
        attach(star, fullName, tooltip(star, 'Featured'), parent);
        star.dispatchEvent(new MouseEvent('mouseenter'));
        star.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: name }));
        expect(fullName.active).toBeTrue();
        expect(warning.active).toBeFalse();
    });

    it('restores only the warning when leaving an icon for a fitting name', () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        const star = document.createElement('i');
        row.appendChild(name);
        name.appendChild(star);
        const warning = tooltip(row);
        const fullName = tooltip(name, '');
        const parent = attach(name, warning, fullName);
        attach(star, fullName, tooltip(star, 'Featured'), parent);
        star.dispatchEvent(new MouseEvent('mouseenter'));
        star.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: name }));
        expect(warning.active).toBeTrue();
        expect(fullName.active).toBeFalse();
    });

    it('keeps ancestors hidden when leaving a nested icon for outside the card', () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        const star = document.createElement('i');
        row.appendChild(name);
        name.appendChild(star);
        const warning = tooltip(row);
        const fullName = tooltip(name, 'Full name');
        const parent = attach(name, warning, fullName);
        attach(star, fullName, tooltip(star, 'Featured'), parent);
        star.dispatchEvent(new MouseEvent('mouseenter'));
        star.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.createElement('div') }));
        expect(fullName.active).toBeFalse();
        expect(warning.active).toBeFalse();
    });

    it('switches to the warning when the hovered name stops being truncated', () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        row.appendChild(name);
        const warning = tooltip(row);
        const fullName = tooltip(name, 'Full name');
        const directive = attach(name, warning, fullName);
        name.dispatchEvent(new MouseEvent('mouseenter'));
        fullName.content = '';
        directive.enabled = false;
        directive.ngOnChanges();
        expect(fullName.active).toBeFalse();
        expect(warning.active).toBeTrue();
    });

    it('switches to the full name when the hovered name becomes truncated', async () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        row.appendChild(name);
        const warning = tooltip(row);
        const fullName = tooltip(name, '');
        const directive = attach(name, warning, fullName);
        name.dispatchEvent(new MouseEvent('mouseenter'));
        fullName.content = 'Full name';
        directive.enabled = true;
        directive.ngOnChanges();
        await new Promise(resolve => setTimeout(resolve));
        expect(fullName.active).toBeTrue();
        expect(warning.active).toBeFalse();
    });

    it('does not reveal ancestors while truncation changes under a hovered icon', () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        const star = document.createElement('i');
        row.appendChild(name);
        name.appendChild(star);
        const warning = tooltip(row);
        const fullName = tooltip(name, 'Full name');
        const parent = attach(name, warning, fullName);
        attach(star, fullName, tooltip(star, 'Featured'), parent);
        name.dispatchEvent(new MouseEvent('mouseenter'));
        star.dispatchEvent(new MouseEvent('mouseenter'));
        fullName.content = '';
        parent.enabled = false;
        parent.ngOnChanges();
        expect(fullName.active).toBeFalse();
        expect(warning.active).toBeFalse();
    });

    it('restores the warning after clicking a fitting name', async () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        row.appendChild(name);
        const warning = tooltip(row);
        attach(name, warning, tooltip(name, ''));
        name.dispatchEvent(new MouseEvent('mouseenter'));
        warning.active = false;
        name.dispatchEvent(new MouseEvent('click'));
        await new Promise(resolve => setTimeout(resolve));
        expect(warning.active).toBeTrue();
    });

    it('does not restore a clicked name after it is destroyed', async () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        row.appendChild(name);
        const fullName = tooltip(name, 'Full name');
        const directive = attach(name, tooltip(row), fullName);
        name.dispatchEvent(new MouseEvent('mouseenter'));
        fullName.active = false;
        name.dispatchEvent(new MouseEvent('click'));
        directive.ngOnDestroy();
        await new Promise(resolve => setTimeout(resolve));
        expect(fullName.active).toBeFalse();
    });

    it('does not restore a clicked name after the pointer leaves', async () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        row.appendChild(name);
        const fullName = tooltip(name, 'Full name');
        attach(name, tooltip(row), fullName);
        name.dispatchEvent(new MouseEvent('mouseenter'));
        fullName.active = false;
        name.dispatchEvent(new MouseEvent('click'));
        name.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: row }));
        await new Promise(resolve => setTimeout(resolve));
        expect(fullName.active).toBeFalse();
    });

    it('keeps the card warning visible when a fitting name has no tooltip', () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        row.appendChild(name);
        const warning = tooltip(row);
        attach(name, warning, tooltip(name, ''));
        name.dispatchEvent(new MouseEvent('mouseenter'));
        expect(warning.active).toBeTrue();
    });

    it('hides both ancestor tooltips when a featured icon inside the name is hovered', () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        const star = document.createElement('i');
        row.appendChild(name);
        name.appendChild(star);
        const warning = tooltip(row);
        const fullName = tooltip(name, 'Full name');
        const parent = attach(name, warning, fullName);
        attach(star, fullName, tooltip(star, 'Featured'), parent);
        star.dispatchEvent(new MouseEvent('mouseenter'));
        expect(fullName.active).toBeFalse();
        expect(warning.active).toBeFalse();
    });

    it('restores only the card warning when leaving a nested icon directly for the card', () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        const star = document.createElement('i');
        const metadata = document.createElement('span');
        row.appendChild(name);
        row.appendChild(metadata);
        name.appendChild(star);
        const warning = tooltip(row);
        const fullName = tooltip(name, 'Full name');
        const parent = attach(name, warning, fullName);
        attach(star, fullName, tooltip(star, 'Featured'), parent);
        warning.active = false;
        star.dispatchEvent(new MouseEvent('mouseenter'));
        star.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: metadata }));
        expect(warning.active).toBeTrue();
        expect(fullName.active).toBeFalse();
    });

    it('restores the full-name tooltip after clicking the name without restoring the card warning', async () => {
        const row = document.createElement('div');
        const name = document.createElement('span');
        row.appendChild(name);
        const warning = tooltip(row);
        const fullName = tooltip(name, 'Full name');
        attach(name, warning, fullName);
        name.dispatchEvent(new MouseEvent('mouseenter'));
        fullName.active = false;
        name.dispatchEvent(new MouseEvent('click'));
        await new Promise(resolve => setTimeout(resolve));
        expect(fullName.active).toBeTrue();
        expect(warning.active).toBeFalse();
    });
});
