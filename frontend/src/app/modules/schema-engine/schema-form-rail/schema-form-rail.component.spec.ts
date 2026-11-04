import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IFormCompletion } from '../schema-form/schema-form-completion';
import { IFormSection } from '../schema-form-root/schema-form-sections';
import { SchemaFormRailComponent } from './schema-form-rail.component';

describe('SchemaFormRailComponent', () => {
    const sections = ['Alpha', 'Beta', 'Gamma'].map((title, index) => ({
        id: `s${index}`, title, owner: null as any, controls: []
    })) as IFormSection[];
    const completion: IFormCompletion = {
        answered: 3,
        total: 6,
        sections: [
            { id: 's0', title: 'Alpha', answered: 2, total: 2, hasErrors: false },
            { id: 's1', title: 'Beta', answered: 1, total: 4, hasErrors: true },
            { id: 's2', title: 'Gamma', answered: 0, total: 0, hasErrors: false },
        ]
    };
    let fixture: ComponentFixture<SchemaFormRailComponent>;
    const items = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('.sf-ri:not(.sf-ri-sub)'));

    const create = (inputs: Partial<SchemaFormRailComponent> = {}) => {
        fixture = TestBed.createComponent(SchemaFormRailComponent);
        fixture.componentRef.setInput('sections', sections);
        fixture.componentRef.setInput('completion', completion);
        for (const [key, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(key, value);
        }
        fixture.detectChanges();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SchemaFormRailComponent],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    it('lists the overview and a row per section with the summary', () => {
        create();
        expect(items().map(item => item.textContent!.trim())).toEqual(['Overview', 'Alpha', 'Beta', 'Gamma']);
        expect(fixture.nativeElement.querySelector('.sf-rail-sum').textContent).toContain('3 of 6 required answered');
    });

    it('draws a check for a complete section, a ring for one in progress and a dash for an optional one', () => {
        create();
        const [, alpha, beta, gamma] = items();
        expect(alpha.querySelector('.sf-ring-done')).not.toBeNull();
        expect(beta.querySelector('.sf-ring-bar')).not.toBeNull();
        expect(beta.querySelector('.sf-ring-done')).toBeNull();
        expect(gamma.querySelector('.sf-ring-dash')).not.toBeNull();
        expect(gamma.querySelector('.sf-ring-bar')).toBeNull();
    });

    it('shows the error dot only after errors were revealed', () => {
        create();
        expect(fixture.nativeElement.querySelector('.sf-ri-err')).toBeNull();
        fixture.componentRef.setInput('errorsRevealed', true);
        fixture.detectChanges();
        const dots = fixture.nativeElement.querySelectorAll('.sf-ri-err');
        expect(dots.length).toBe(1);
        expect(items()[2].querySelector('.sf-ri-err')).not.toBeNull();
    });

    it('marks the active row and selects with Enter and click', () => {
        create({ screen: 'section', activeIndex: 1 });
        const selected: (number | 'overview')[] = [];
        fixture.componentInstance.select.subscribe(value => selected.push(value));
        const rows = items();
        expect(rows[2].getAttribute('aria-current')).toBe('step');
        expect(rows[1].getAttribute('aria-current')).toBeNull();
        expect(rows.every(row => row.getAttribute('tabindex') === '0')).toBeTrue();

        rows[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        rows[0].click();
        expect(selected).toEqual([0, 'overview']);
    });

    it('describes each row in its tooltip', () => {
        create();
        const rail = fixture.componentInstance;
        expect(rail.tooltip(1)).toBe('Beta – 1 of 4 required answered');
        expect(rail.tooltip(2)).toBe('Gamma – optional');
    });

    it('lists the cards of the active section and reports the chosen one', () => {
        const cards = [{ id: 'c1', description: 'First' }, { id: 'c2', description: 'Second' }] as any[];
        create({ screen: 'section', activeIndex: 0, cards });
        const chosen: any[] = [];
        fixture.componentInstance.selectCard.subscribe(card => chosen.push(card));
        const subs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.sf-ri-sub'));
        expect(subs.map(item => item.textContent!.trim())).toEqual(['First', 'Second']);
        subs[1].click();
        expect(chosen).toEqual([cards[1]]);
    });

    it('offers Close in the drawer and Hide menu otherwise', () => {
        create();
        expect(fixture.nativeElement.querySelector('.sf-rail-hide').textContent.trim()).toBe('Hide menu');
        fixture.componentRef.setInput('inDrawer', true);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.sf-rail-hide').textContent.trim()).toBe('Close');
    });
});
