import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import { RequestDocumentFormComponent } from './request-document-form.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { TablePersistenceService } from 'src/app/services/table-persistence.service';
import { GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { IPFSService } from 'src/app/services/ipfs.service';
import { PolicyTestAutomationService } from '../../../policy-test-automation/policy-test-automation.service';
import { FormulasService } from 'src/app/services/formulas.service';
import { CalculationPreviewService } from 'src/app/services/calculation-preview.service';
import { ToastService } from 'src/app/services/toast.service';
import { PolicyProgressService } from '../../../../services/policy-progress.service';

describe('RequestDocumentFormComponent draft menu', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [RequestDocumentFormComponent],
            providers: [
                UntypedFormBuilder,
                { provide: DialogService, useValue: {} },
                { provide: PolicyEngineService, useValue: {} },
                { provide: SchemaRulesService, useValue: { getSchemaRuleData: () => of([]) } },
                { provide: RelayerAccountsService, useValue: {} },
                { provide: IndexedDbRegistryService, useValue: { registerStore: () => undefined } },
                { provide: TablePersistenceService, useValue: {} },
                { provide: GeoFilePersistenceService, useValue: {} },
                { provide: IPFSService, useValue: {} },
                { provide: PolicyTestAutomationService, useValue: {} },
                { provide: FormulasService, useValue: {} },
                { provide: CalculationPreviewService, useValue: {} },
                { provide: ToastService, useValue: {} },
                { provide: PolicyProgressService, useValue: { activeStep$: of(null) } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    it('keeps the default action of a click inside the Draft menu and closes the menu', () => {
        const fixture = TestBed.createComponent(RequestDocumentFormComponent);
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement;
        element.querySelector<HTMLButtonElement>('.form-draft-toggle')!.click();
        fixture.detectChanges();
        expect(fixture.componentInstance.draftMenuOpen).toBeTrue();

        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        element.querySelector('request-draft-file-actions')!.dispatchEvent(click);
        fixture.detectChanges();

        expect(click.defaultPrevented).toBeFalse();
        expect(fixture.componentInstance.draftMenuOpen).toBeFalse();
        expect(element.querySelector<HTMLElement>('.form-draft-menu')!.hidden).toBeTrue();
        fixture.destroy();
    });
});
