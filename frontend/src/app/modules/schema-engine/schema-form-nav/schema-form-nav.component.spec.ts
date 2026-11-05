import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchemaFormNavComponent, SCHEMA_FORM_RAIL_HIDDEN, getScrollParent } from './schema-form-nav.component';

describe('SchemaFormNavComponent', () => {
    const sections = ['Alpha', 'Beta'].map((title, index) => ({ id: `s${index}`, title }));
    let fixture: ComponentFixture<SchemaFormNavComponent>;

    const create = (inputs: Partial<SchemaFormNavComponent> = {}) => {
        fixture = TestBed.createComponent(SchemaFormNavComponent);
        fixture.componentRef.setInput('sections', sections);
        for (const [key, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(key, value);
        }
        fixture.detectChanges();
    };
    const el = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);

    beforeEach(async () => {
        localStorage.removeItem(SCHEMA_FORM_RAIL_HIDDEN);
        await TestBed.configureTestingModule({
            declarations: [SchemaFormNavComponent],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    afterEach(() => localStorage.removeItem(SCHEMA_FORM_RAIL_HIDDEN));

    it('draws the rail column and the section bar, and projects the page', () => {
        create({ screen: 'section', activeIndex: 1, barLabel: 'Section 2 of 2' });
        expect(el('.sf-rail-col app-schema-form-rail')).not.toBeNull();
        expect(el('.sf-section-bar small')!.textContent).toBe('Section 2 of 2');
        expect(el('.sf-section-bar b')!.textContent).toBe('Beta');
    });

    it('names the section bar after the overview when it is open', () => {
        create();
        expect(el('.sf-section-bar b')!.textContent).toBe('Overview');
        expect(el('.sf-section-bar small')).toBeNull();
    });

    it('draws no navigation without sections', () => {
        create({ sections: [] });
        expect(el('.sf-rail-col')).toBeNull();
        expect(el('.sf-section-bar')).toBeNull();
        expect(el('.sf-content-inner')).not.toBeNull();
    });

    it('opens the drawer from the bar and closes it after a selection', () => {
        create();
        const selected: any[] = [];
        fixture.componentInstance.select.subscribe(value => selected.push(value));
        el('.sf-section-bar')!.click();
        fixture.detectChanges();
        expect(el('.sf-drawer')).not.toBeNull();
        fixture.componentInstance.onSelect(1);
        fixture.detectChanges();
        expect(selected).toEqual([1]);
        expect(el('.sf-drawer')).toBeNull();
    });

    it('closes the drawer on request', () => {
        create();
        fixture.componentInstance.setDrawer(true);
        fixture.detectChanges();
        fixture.componentInstance.closeDrawer();
        fixture.detectChanges();
        expect(el('.sf-drawer')).toBeNull();
    });

    it('hides the rail, offers "Show menu" and remembers the choice', () => {
        create();
        fixture.componentInstance.toggleRail();
        expect(el('.sf-rail-col')).toBeNull();
        expect(el('.sf-show-menu')).not.toBeNull();
        expect(TestBed.createComponent(SchemaFormNavComponent).componentInstance.railHidden).toBeTrue();
        el('.sf-show-menu')!.click();
        expect(el('.sf-rail-col')).not.toBeNull();
    });

    it('is inert while the host is locked', () => {
        create({ locked: true });
        expect(el('.sf-rail-col')!.hasAttribute('inert')).toBeTrue();
        expect(el('.sf-section-bar')!.hasAttribute('inert')).toBeTrue();
    });

    it('fits the rail to the height of the scroll parent', () => {
        const host = document.createElement('div');
        host.style.cssText = 'overflow-y:auto;height:400px;padding:10px 0;';
        document.body.appendChild(host);
        try {
            fixture = TestBed.createComponent(SchemaFormNavComponent);
            host.appendChild(fixture.nativeElement);
            fixture.componentRef.setInput('sections', sections);
            fixture.detectChanges();
            const rail = el('.sf-rail-col')!;
            expect(getScrollParent(rail)).toBe(host);
            const style = getComputedStyle(host);
            const expected = host.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
            expect(expected).toBeGreaterThan(0);
            expect(rail.style.minHeight).toBe(`${expected}px`);
            expect(rail.style.maxHeight).toBe(`${expected}px`);
        } finally {
            fixture.destroy();
            host.remove();
        }
    });
});
