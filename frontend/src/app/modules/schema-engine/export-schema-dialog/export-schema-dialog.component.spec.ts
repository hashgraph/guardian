import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SchemaService } from 'src/app/services/schema.service';
import { ExportSchemaDialog } from './export-schema-dialog.component';

describe('ExportSchemaDialog', () => {
    let ref: jasmine.SpyObj<DynamicDialogRef>;

    function render(schema: any): ComponentFixture<ExportSchemaDialog> {
        ref = jasmine.createSpyObj<DynamicDialogRef>('DynamicDialogRef', ['close']);
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            declarations: [ExportSchemaDialog],
            providers: [
                { provide: DynamicDialogRef, useValue: ref },
                { provide: DynamicDialogConfig, useValue: { data: { schema } } },
                { provide: SchemaService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(ExportSchemaDialog);
        fixture.detectChanges();
        return fixture;
    }

    function buttonByLabel(fixture: ComponentFixture<ExportSchemaDialog>, label: string): HTMLButtonElement | undefined {
        return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((button) => button.getAttribute('label') === label);
    }

    // A draft is not published and so has no Hedera message identifier: the button used
    // to render permanently greyed out with no explanation of why.
    it('hides Copy message identifier on a draft', () => {
        expect(buttonByLabel(render({ name: 'S' }), 'Copy message identifier')).toBeUndefined();
    });

    it('offers Copy message identifier once the schema is published', () => {
        expect(buttonByLabel(render({ name: 'S', messageId: '1.2.3' }), 'Copy message identifier')).toBeDefined();
    });

    // onClose() existed but was never wired to anything, so the dialog closed only
    // programmatically after a successful save.
    it('offers a Cancel control that closes the dialog', () => {
        const fixture = render({ name: 'S' });
        const cancel = buttonByLabel(fixture, 'Cancel');

        expect(cancel).toBeDefined();
        cancel!.click();

        expect(ref.close).toHaveBeenCalledWith(false);
    });

    it('still offers both save actions', () => {
        const fixture = render({ name: 'S' });
        expect(buttonByLabel(fixture, 'Save to file')).toBeDefined();
        expect(buttonByLabel(fixture, 'Save to Excel')).toBeDefined();
    });
});
