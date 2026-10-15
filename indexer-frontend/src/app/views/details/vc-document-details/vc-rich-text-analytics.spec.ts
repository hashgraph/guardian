import { CommonModule } from '@angular/common';
import { Component, Input, NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import { EntitiesService } from '@services/entities.service';
import { VcDocumentDetailsComponent } from './vc-document-details.component';
import { VCFullscreenDialog } from '../../../dialogs/vc-fullscreen-dialog/vc-fullscreen-dialog.component';

@Component({ selector: 'app-schema-form-view', standalone: true, template: '' })
class FieldViewStub {
    @Input() schema: unknown;
    @Input() values: unknown;
    @Input('private-fields') privateFields: unknown;
    @Input() formulas: unknown;
    @Input() analytics: unknown;
}

@Pipe({ name: 'transloco', standalone: true })
class TranslationStub implements PipeTransform {
    transform(value: string): string { return value; }
}

describe('Indexer rich-text analytics at document entry points', () => {
    it('passes the opened document map to the comments dialog', () => {
        const component: any = Object.create(VcDocumentDetailsComponent.prototype);
        component.schema = { name: 'Site' };
        component.first = { _ipfs: [{ credentialSubject: { note: 'photo' } }] };
        component.analytics = { richTextImages: { image: 'grid-image' } };
        component.discussionsKey = new Map();
        component.dialogService = {
            open: jasmine.createSpy('open').and.returnValue({ onClose: of(null) }),
        };
        component.onOpenComments({ consensusTimestamp: 'discussion-1' });
        const data = component.dialogService.open.calls.mostRecent().args[1].data;
        expect(data.analytics).toBe(component.analytics);
        expect(data.credentialSubject).toBe(component.first._ipfs[0].credentialSubject);
    });

    it('binds the selected version map in the real details template', async () => {
        await TestBed.configureTestingModule({
            imports: [VcDocumentDetailsComponent],
            providers: [
                { provide: EntitiesService, useValue: {} },
                { provide: ActivatedRoute, useValue: { queryParams: of({}), params: of({ id: '' }) } },
                { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
            ],
        }).overrideComponent(VcDocumentDetailsComponent, {
            set: {
                imports: [CommonModule, TranslationStub, FieldViewStub],
                providers: [{ provide: DialogService, useValue: {} }],
                schemas: [NO_ERRORS_SCHEMA],
            },
        }).compileComponents();
        const fixture = TestBed.createComponent(VcDocumentDetailsComponent);
        const component = fixture.componentInstance;
        const maps = [
            { richTextImages: { first: 'grid-first' } },
            { richTextImages: { second: 'grid-second' } },
        ];
        component.row = {};
        component.target = {};
        component.schema = {};
        component.analytics = maps[0];
        component.showDocumentVersionsTab = true;
        component.versions = maps.map(analytics => ({
            analytics, _ipfsStatus: true,
            _ipfs: [{ credentialSubject: { note: 'photo' }, cid: 'cid', json: '{}' }],
        }));
        component.versionsIndex = 1;
        fixture.detectChanges();
        let view = fixture.debugElement.query(By.directive(FieldViewStub)).componentInstance;
        expect(view.analytics).toBe(maps[1]);
        expect(view.values).toBe(component.versions[1]._ipfs[0].credentialSubject);
        component.versionsIndex = 0;
        fixture.detectChanges();
        view = fixture.debugElement.query(By.directive(FieldViewStub)).componentInstance;
        expect(view.analytics).toBe(maps[0]);
        fixture.destroy();
    });

    it('reads dialog analytics from config and binds them through its real template', async () => {
        const analytics = { richTextImages: { image: 'grid-image' } };
        const subject = { note: 'photo' };
        await TestBed.configureTestingModule({
            imports: [VCFullscreenDialog],
            providers: [
                { provide: DynamicDialogConfig, useValue: { data: { analytics, schema: {}, credentialSubject: subject } } },
                { provide: DynamicDialogRef, useValue: { close: jasmine.createSpy('close') } },
                { provide: DialogService, useValue: {} },
            ],
        }).overrideComponent(VCFullscreenDialog, {
            set: { imports: [CommonModule, FieldViewStub], schemas: [NO_ERRORS_SCHEMA] },
        }).compileComponents();
        const fixture = TestBed.createComponent(VCFullscreenDialog);
        fixture.detectChanges();
        const view = fixture.debugElement.query(By.directive(FieldViewStub)).componentInstance;
        expect(view.analytics).toBe(analytics);
        expect(view.values).toBe(subject);
        fixture.destroy();
    });
});
