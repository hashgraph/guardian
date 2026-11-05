import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FormulasService } from 'src/app/services/formulas.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { SchemaService } from 'src/app/services/schema.service';
import { SchemaDataTypes } from '@guardian/interfaces';
import { DocumentViewComponent } from './document-view.component';

describe('DocumentViewComponent Preview rendering', () => {
    const render = (preview: boolean, fail = false, presentation = false, loading?: (value: boolean) => void) => {
        TestBed.configureTestingModule({
            declarations: [DocumentViewComponent],
            imports: [CommonModule],
            providers: [
                { provide: SchemaService, useValue: { getSchemasByType: () => fail ? throwError(() => new Error('Unavailable')) : of(null) } },
                { provide: SchemaRulesService, useValue: { getSchemaRuleData: () => of(null) } },
                { provide: FormulasService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(DocumentViewComponent);
        const credential = { issuer: 'did:example:issuer', credentialSubject: [{ type: 'report', amount: 3 }] };
        fixture.componentRef.setInput('document', presentation ? { verifiableCredential: [credential] } : credential);
        fixture.componentRef.setInput('type', presentation ? 'VP' : 'VC');
        fixture.componentRef.setInput('preview', preview);
        if (loading) fixture.componentInstance.previewLoadingChange.subscribe(loading);
        fixture.detectChanges();
        return fixture;
    };

    it('reports initial Preview loading while metadata stays visible before credential rendering', fakeAsync(() => {
        const events: boolean[] = [];
        const fixture = render(true, false, false, value => events.push(value));
        const view = fixture.componentInstance;
        tick(0);
        expect(events).toEqual([true]);
        expect(fixture.nativeElement.querySelector('.guardian-loading')).toBeNull();
        expect(fixture.nativeElement.querySelector('.form-body')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('app-schema-form-view')).toBeNull();
        expect(fixture.nativeElement.querySelector('app-schema-form-nav')).toBeNull();
        tick(500);
        fixture.detectChanges();
        expect(view.loading).toBeFalse();
        expect(view.previewRendering).toBeTrue();
        expect(view.previewReady).toBeFalse();
        tick(16);
        expect(view.previewReady).toBeFalse();
        tick(16);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.form-body')).not.toBeNull();
        expect(events).toEqual([true]);
        tick(16);
        fixture.detectChanges();
        expect(view.previewRendering).toBeFalse();
        expect(events).toEqual([true, false]);
        expect(fixture.nativeElement.querySelector('.guardian-loading')).toBeNull();
        expect(fixture.nativeElement.querySelector('.preview-loading')).toBeNull();
    }));

    it('keeps the ordinary body and loading path without scheduling render frames', fakeAsync(() => {
        const fixture = render(false);
        expect(fixture.nativeElement.querySelector('.form-body')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.preview-loading')).toBeNull();
        tick(600);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.guardian-loading')).toBeNull();
        expect(fixture.componentInstance.previewRendering).toBeFalse();
        expect(fixture.componentInstance.previewReady).toBeFalse();
        expect(Reflect.get(fixture.componentInstance, 'previewFrame')).toBeNull();
        expect(Reflect.get(fixture.componentInstance, 'previewRenderTimer')).toBeNull();
    }));

    for (const elapsed of [100, 500, 516, 532]) {
        it(`cancels unfinished Preview rendering when closed after ${elapsed} milliseconds`, fakeAsync(() => {
            const fixture = render(true);
            const view = fixture.componentInstance;
            tick(elapsed);
            const ready = view.previewReady;
            fixture.destroy();
            tick(1000);
            expect(view.previewReady).toBe(ready);
            expect(view.previewRendering).toBeTrue();
        }));
    }

    it('finishes the Preview loading indicator when schema loading fails', fakeAsync(() => {
        const fixture = render(true, true);
        tick(64);
        fixture.detectChanges();
        expect(fixture.componentInstance.previewReady).toBeTrue();
        expect(fixture.componentInstance.previewRendering).toBeFalse();
        expect(fixture.nativeElement.querySelector('.guardian-loading')).toBeNull();
        expect(fixture.nativeElement.querySelector('.form-body')).not.toBeNull();
    }));

    it('forwards section loading to the Preview modal only', fakeAsync(() => {
        const fixture = render(true);
        tick(548);
        fixture.detectChanges();
        const changes = spyOn(fixture.componentInstance.previewLoadingChange, 'emit');
        const child = fixture.debugElement.query(By.css('app-schema-form-view'));
        child.triggerEventHandler('previewLoadingChange', true);
        child.triggerEventHandler('previewLoadingChange', false);
        expect(changes.calls.allArgs()).toEqual([[true], [false]]);
        fixture.componentRef.setInput('preview', false);
        fixture.detectChanges();
        child.triggerEventHandler('previewLoadingChange', true);
        expect(changes.calls.allArgs()).toEqual([[true], [false]]);
    }));

    it('renders a Preview presentation with no root requests and forwards nested loading', fakeAsync(() => {
        const fixture = render(true, false, true);
        tick(600);
        fixture.detectChanges();
        expect(fixture.componentInstance.previewReady).toBeTrue();
        expect(fixture.componentInstance.previewRendering).toBeFalse();
        fixture.componentInstance.openCredential(1);
        fixture.detectChanges();
        tick(600);
        fixture.detectChanges();
        const changes = spyOn(fixture.componentInstance.previewLoadingChange, 'emit');
        const child = fixture.debugElement.query(By.directive(DocumentViewComponent));
        expect(child).not.toBeNull();
        child.componentInstance.previewLoadingChange.emit(true);
        child.componentInstance.previewLoadingChange.emit(false);
        tick(0);
        expect(changes.calls.allArgs()).toEqual([[true], [false]]);
    }));
});

describe('DocumentViewComponent Document details', () => {
    const render = (document: any, inputs: { [name: string]: any } = {}) => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            declarations: [DocumentViewComponent],
            imports: [CommonModule],
            providers: [
                { provide: SchemaService, useValue: { getSchemasByType: () => of(null) } },
                { provide: SchemaRulesService, useValue: { getSchemaRuleData: () => of(null) } },
                { provide: FormulasService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(DocumentViewComponent);
        fixture.componentRef.setInput('document', document);
        fixture.componentRef.setInput('type', 'VC');
        for (const [name, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(name, value);
        }
        fixture.detectChanges();
        return fixture;
    };

    const credential = () => ({
        id: 'urn:uuid:1234',
        issuer: { id: 'did:example:issuer', name: 'Acme', country: 'DE' },
        issuanceDate: '2024-03-05T10:20:00Z',
        evidence: [{ dataType: 'message', data: 'Checked on site' }, { dataType: 'file', data: 'https://example.com/a.pdf' }],
        proof: { type: 'BbsBlsSignature2020', jws: 'abc' },
        credentialSubject: [{ type: 'report' }],
    });

    const cells = (fixture: any): { [label: string]: string } => {
        const result: { [label: string]: string } = {};
        for (const cell of Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.sf-ro-cell'))) {
            result[cell.querySelector('.sf-ro-label')!.textContent!.trim()] = cell.querySelector('.sf-ro-value')!.textContent!.replace(/\s+/g, ' ').trim();
        }
        return result;
    };

    it('shows the id, the issuer with its other keys, the issue date and the evidence', () => {
        const fixture = render(credential());
        const values = cells(fixture);
        expect(values['Document ID']).toContain('urn:uuid:1234');
        expect(values['Issuer']).toContain('did:example:issuer');
        expect(values['Issuer']).toContain('name: Acme · country: DE');
        expect(values['Issued']).toContain('Mar 5, 2024');
        expect(values['Evidence']).toContain('Checked on site');
        expect(fixture.nativeElement.querySelector('.evidence-entry-file a').getAttribute('href')).toBe('https://example.com/a.pdf');
        expect(Object.keys(values)).not.toContain('Relayer account');
    });

    it('shows a string issuer as its id and the relayer account when it is set', () => {
        const fixture = render({ ...credential(), issuer: 'did:example:plain' }, { 'relayer-account': '0.0.1234' });
        const values = cells(fixture);
        expect(values['Issuer']).toBe('did:example:plain');
        expect(values['Relayer account']).toContain('0.0.1234');
    });

    it('shows the raw JSON when the evidence is not a list of entries', () => {
        const fixture = render({ ...credential(), evidence: { note: 'free form' } });
        expect(fixture.nativeElement.querySelector('.sf-dd-json').textContent).toContain('free form');
    });

    it('keeps the proof collapsed until it is asked for', () => {
        const fixture = render(credential());
        expect(fixture.nativeElement.querySelector('.sf-dd-json')).toBeNull();
        const toggle = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.sf-ro-cell button'))
            .find((button) => button.textContent!.includes('Show proof'))!;
        expect(toggle.textContent!.trim()).toBe('Show proof · BbsBlsSignature2020');
        toggle.click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.sf-dd-json').textContent).toContain('"jws": "abc"');
        expect(toggle.textContent!.trim()).toBe('Hide proof');
    });

    it('shows the disconnected notice above the card', () => {
        const fixture = render(credential(), { disconnected: true });
        const notice = fixture.nativeElement.querySelector('.disconnected-message');
        expect(notice.textContent).toContain('User that created this document was disconnected.');
        expect(notice.nextElementSibling.classList).toContain('sf-dd-card');
    });
});

describe('DocumentViewComponent pages', () => {
    const text = (title: string) => ({ type: SchemaDataTypes.string, title, description: title });
    const part = (id: string, title: string, properties: any) => ({
        $id: id, title, description: title, type: SchemaDataTypes.object, properties, required: []
    });
    const schemaJson = (properties: any, defs: any = {}) => ({
        iri: '#report',
        document: {
            $id: '#report',
            $comment: JSON.stringify({ '@id': 'ctx:#report', term: 'report' }),
            type: SchemaDataTypes.object,
            properties,
            required: [],
            $defs: defs
        }
    });
    const sectioned = () => schemaJson({
        title: text('Project title'),
        a: { $ref: '#a', title: 'Alpha', description: 'Alpha' },
        b: { $ref: '#b', title: 'Beta', description: 'Beta' },
    }, {
        '#a': part('#a', 'Alpha', { one: text('One'), geo: { $ref: '#GeoJSON', title: 'Area', description: 'Area', $comment: JSON.stringify({ term: 'geo', '@id': 'ctx:#a&geo', customType: 'geo' }) } }),
        '#b': part('#b', 'Beta', { two: text('Two') }),
    });
    const flat = () => schemaJson({ title: text('Project title'), other: text('Other') });

    const render = (schema: any, document: any, type: 'VC' | 'VP' = 'VC', inputs: { [name: string]: any } = {}) => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            declarations: [DocumentViewComponent],
            imports: [CommonModule],
            providers: [
                { provide: SchemaService, useValue: { getSchemasByType: () => of(schema) } },
                { provide: SchemaRulesService, useValue: { getSchemaRuleData: () => of(null) } },
                { provide: FormulasService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(DocumentViewComponent);
        fixture.componentRef.setInput('document', document);
        fixture.componentRef.setInput('type', type);
        for (const [name, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(name, value);
        }
        fixture.detectChanges();
        tick(600);
        fixture.detectChanges();
        return fixture;
    };
    const credential = (...subjects: any[]) => ({ id: 'urn:1', issuer: 'did:x', credentialSubject: subjects });
    const subject = (extra: any = {}) => ({ type: 'report', title: 'Kasigau', a: { one: 'x' }, b: {}, ...extra });
    const q = (fixture: any, selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);

    it('opens on the Overview with the title, tiles and a card per page', fakeAsync(() => {
        const fixture = render(sectioned(), credential(subject()));
        const view = fixture.componentInstance;
        expect(view.screen).toBe('overview');
        expect(view.hasSections).toBeTrue();
        expect(view.overviewTitle).toBe('Kasigau');
        expect(view.overviewEyebrow).toContain('Overview');
        expect(view.overviewTiles.map(item => item.label)).toEqual(['Sections', 'Fields provided']);
        expect(view.overviewTiles[0].value).toBe('2');
        expect(view.overviewCards.map(item => item.title)).toEqual(['Document details', 'Alpha', 'Beta']);
        expect(view.railSections.map(item => item.title)).toEqual(['Document details', 'Alpha', 'Beta']);
        expect(q(fixture, 'app-schema-form-overview')).not.toBeNull();
        expect(q(fixture, '.sf-dd-card')).toBeNull();
    }));

    it('falls back to the schema name when the first string field has no value', fakeAsync(() => {
        const fixture = render(sectioned(), credential(subject({ title: '' })));
        const schema = fixture.componentInstance.schemaMap['report']!;
        expect(fixture.componentInstance.overviewTitle).toBe(schema.name || schema.description || '');
    }));

    it('shows Document details on its own page and a section on the next', fakeAsync(() => {
        const fixture = render(sectioned(), credential(subject()));
        const view = fixture.componentInstance;
        view.openPage(0);
        fixture.detectChanges();
        expect(q(fixture, '.sf-dd-card')).not.toBeNull();
        expect(q(fixture, 'app-schema-form-view')).toBeNull();
        view.openPage(1);
        fixture.detectChanges();
        expect(view.section?.title).toBe('Alpha');
        expect(q(fixture, 'app-schema-form-view')).not.toBeNull();
        expect(q(fixture, '.sf-dd-card.sf-dd-fields')).not.toBeNull();
        expect(q(fixture, '.sf-section-title')!.textContent).toBe('Alpha');
    }));

    it('has one page, with the details on top, and no navigation for a flat document', fakeAsync(() => {
        const fixture = render(flat(), credential(subject({ other: 'y' })));
        const view = fixture.componentInstance;
        expect(view.hasSections).toBeFalse();
        expect(view.railSections).toEqual([]);
        expect(q(fixture, 'app-schema-form-overview')).toBeNull();
        expect(q(fixture, '.sf-dd-card')).not.toBeNull();
        expect(q(fixture, 'app-schema-form-view')).not.toBeNull();
        expect(q(fixture, '.sf-section-links')).toBeNull();
    }));

    it('counts the fields of a section and flags the ones not provided', fakeAsync(() => {
        const fixture = render(sectioned(), credential(subject()));
        const cards = fixture.componentInstance.overviewCards;
        expect(cards[1].meta).toBe('3 fields · 1 not provided');
        expect(cards[1].fill).toBeCloseTo(66.7, 0);
        expect(cards[2].meta).toBe('1 field · 1 not provided');
    }));

    it('adds the Comments tile only when discussions are on', fakeAsync(() => {
        const without = render(sectioned(), credential(subject()));
        expect(without.componentInstance.overviewTiles.map(item => item.label)).not.toContain('Comments');
        const withComments = render(sectioned(), credential(subject()), 'VC', { 'discussion-view': true });
        const view = withComments.componentInstance;
        const path = (view.view.sections[0].fields.find(item => item.name === 'a') as any).fields.find((item: any) => item.name === 'one').fullPath;
        withComments.componentRef.setInput('discussion', { [path]: 2 });
        withComments.detectChanges();
        expect(view.overviewTiles.find(item => item.label === 'Comments')!.value).toBe('2');
        expect(view.overviewCards[1].badges).toEqual([{ kind: 'comment', count: 2, tooltip: '2 comments' }]);
    }));

    it('shows the Location panel only for a filled GeoJSON field', fakeAsync(() => {
        const empty = render(sectioned(), credential(subject()));
        expect(empty.componentInstance.locations).toEqual([]);
        expect(q(empty, '.sf-location')).toBeNull();
        const geo = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
        const filled = render(sectioned(), credential(subject({ a: { one: 'x', geo } })));
        expect(filled.componentInstance.locations.length).toBe(1);
        expect(filled.componentInstance.locations[0].sectionTitle).toBe('Alpha');
        expect(q(filled, '.sf-location')).not.toBeNull();
    }));

    it('switches to the page of a field on a link, and the empty link keeps the page', fakeAsync(() => {
        const fixture = render(sectioned(), credential(subject()));
        const view = fixture.componentInstance;
        view.openField('doc/b.two');
        expect(view.screen).toBe('section');
        expect(view.activeIndex).toBe(2);
        expect(view.link).toBe('b.two');
        view.openField();
        expect(view.link).toBeUndefined();
        expect(view.activeIndex).toBe(2);
    }));

    it('opens the Overview of a subject when it is selected', fakeAsync(() => {
        const fixture = render(sectioned(), credential(subject(), subject({ title: 'Second' })));
        const view = fixture.componentInstance;
        view.openPage(1);
        view.selectSubject(1);
        expect(view.screen).toBe('overview');
        expect(view.activeIndex).toBe(0);
        expect(view.overviewTitle).toBe('Second');
        expect(fixture.nativeElement.querySelectorAll('.sf-subject').length).toBe(2);
    }));

    it('walks the pages with Previous and Next', fakeAsync(() => {
        const fixture = render(sectioned(), credential(subject()));
        fixture.componentInstance.openPage(1);
        fixture.detectChanges();
        const links = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.sf-section-link')).map(item => item.textContent!.trim());
        expect(links).toEqual(['Document details', 'Beta']);
    }));

    it('lists the credentials of a presentation and reports the pages of the open one', fakeAsync(() => {
        const fixture = render(sectioned(), { id: 'urn:vp', verifiableCredential: [credential(subject())] }, 'VP');
        const view = fixture.componentInstance;
        expect(view.vpSections.map(item => item.title)).toEqual(['Presentation details', 'report']);
        view.openCredential(1);
        fixture.detectChanges();
        tick(600);
        fixture.detectChanges();
        expect(view.vpCards.slice(0, 2).map(item => item.id)).toEqual(['overview', 'details']);
        expect(view.vpCards.map(item => item.title)).toEqual(['Overview', 'Document details', 'Alpha', 'Beta']);
        view.onVpCard({ id: 'details' });
        fixture.detectChanges();
        const nested = fixture.debugElement.query(By.directive(DocumentViewComponent)).componentInstance as DocumentViewComponent;
        expect(nested.navHidden).toBeTrue();
        expect(nested.screen).toBe('section');
        expect(nested.activeIndex).toBe(0);
    }));
});
