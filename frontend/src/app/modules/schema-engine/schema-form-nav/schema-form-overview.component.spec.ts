import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IOverviewCard, SchemaFormOverviewComponent } from './schema-form-overview.component';

describe('SchemaFormOverviewComponent', () => {
    let fixture: ComponentFixture<SchemaFormOverviewComponent>;
    const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;
    const all = (selector: string) => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(selector));

    const create = (inputs: Partial<SchemaFormOverviewComponent>) => {
        fixture = TestBed.createComponent(SchemaFormOverviewComponent);
        for (const [key, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(key, value);
        }
        fixture.detectChanges();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SchemaFormOverviewComponent],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    it('draws the tiles with their tone', () => {
        create({ tiles: [{ value: '3', label: 'Sections' }, { value: '1 of 4', label: 'Rule checks failed', tone: 'warn' }] });
        const tiles = all('.sf-tile');
        expect(tiles.map(item => item.textContent!.trim())).toEqual(['3Sections', '1 of 4Rule checks failed']);
        expect(tiles[1].classList).toContain('sf-tile-warn');
    });

    it('draws no tiles and no footer link when there are none', () => {
        create({ cards: [] });
        expect(el('.sf-tiles')).toBeNull();
        expect(el('.sf-section-links')).toBeNull();
    });

    it('draws a card with its meta line, fill, badges and action', () => {
        const card: IOverviewCard = {
            id: 'a', title: 'Alpha', prefix: '1.1', meta: '4 fields · 1 not provided', fill: 75,
            badges: [{ kind: 'warn', count: 2, tooltip: '2 warnings' }], status: 'bad', action: 'Open'
        };
        create({ cards: [card] });
        expect(el('.sf-overview-card-name')!.textContent).toContain('Alpha');
        expect(el('.sf-overview-card-prefix')!.textContent).toBe('1.1');
        expect(el('.sf-overview-card-meta')!.textContent).toBe('4 fields · 1 not provided');
        expect(el('.sf-overview-card-fill i')!.style.width).toBe('75%');
        expect(el('.sf-badge-warn')!.textContent!.trim()).toBe('2');
        expect(el('.sf-status-bad')).not.toBeNull();
        expect(el('.sf-overview-card-go')!.textContent).toBe('Open →');
    });

    it('draws the ring of a card in its state', () => {
        create({ cards: [
                { id: 'a', title: 'A', action: 'Start', ring: { pct: 40, done: false, optional: false } },
                { id: 'b', title: 'B', action: 'Review', ring: { pct: 100, done: true, optional: false } },
            ] });
        const rings = all('app-schema-form-ring');
        expect(rings.length).toBe(2);
    });

    it('reports the opened card by index and the footer link', () => {
        create({ cards: [{ id: 'a', title: 'A', action: 'Open' }, { id: 'b', title: 'B', action: 'Open' }], footerLink: 'Document details' });
        const opened: number[] = [];
        let footer = 0;
        fixture.componentInstance.open.subscribe(value => opened.push(value));
        fixture.componentInstance.footer.subscribe(() => footer++);
        all('.sf-overview-card')[1].click();
        el('.sf-section-links button')!.click();
        expect(opened).toEqual([1]);
        expect(footer).toBe(1);
        expect(el('.sf-section-links button')!.textContent).toContain('Document details →');
    });

    it('hides the counters of the cards but keeps the cards while progress is pending', () => {
        const card: IOverviewCard = {
            id: 'a', title: 'Alpha', meta: '1 of 2 required answered', pill: { text: 'In progress' },
            ring: { pct: 50, done: false, optional: false }, action: 'Continue'
        };
        create({ cards: [card], progressPending: true });
        expect(all('.sf-overview-card').length).toBe(1);
        expect(el('.sf-overview-card-name')!.textContent).toContain('Alpha');
        expect(el('.sf-overview-card-go')!.textContent).toBe('Continue →');
        expect(el('.sf-overview-card-top')!.style.visibility).toBe('hidden');
        expect(el('.sf-overview-card-meta')!.style.visibility).toBe('hidden');
        fixture.componentRef.setInput('progressPending', false);
        fixture.detectChanges();
        expect(el('.sf-overview-card-top')!.style.visibility).toBe('');
        expect(el('.sf-overview-card-meta')!.style.visibility).toBe('');
    });

    it('is inert while locked', () => {
        create({ locked: true });
        expect(el('.sf-overview')!.hasAttribute('inert')).toBe(true);
    });
});
