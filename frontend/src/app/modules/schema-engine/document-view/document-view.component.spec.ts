import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FormulasService } from 'src/app/services/formulas.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { SchemaService } from 'src/app/services/schema.service';
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
        expect(fixture.nativeElement.querySelector('app-schema-form-view-navigation').preview).toBeTrue();
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
        expect(fixture.nativeElement.querySelector('app-schema-form-view-navigation').preview).toBeFalse();
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
        const changes = spyOn(fixture.componentInstance.previewLoadingChange, 'emit');
        expect(fixture.componentInstance.previewReady).toBeTrue();
        expect(fixture.componentInstance.previewRendering).toBeFalse();
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
