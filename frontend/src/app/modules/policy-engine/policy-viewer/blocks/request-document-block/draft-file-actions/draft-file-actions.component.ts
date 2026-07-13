import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { IDraftFileContext, RequestDraftFileService } from 'src/app/services/request-draft-file.service';

/**
 * "Save draft to file" / "Restore from draft file" button pair, shared between
 * the request document page and dialog variants to avoid duplicating markup
 * and the export/import handling.
 */
@Component({
    selector: 'request-draft-file-actions',
    templateUrl: './draft-file-actions.component.html',
    styleUrls: ['./draft-file-actions.component.scss'],
})
export class DraftFileActionsComponent {
    @Input() schema: { iri?: string | null; name?: string | null } | null | undefined;
    @Input() policyId: string | null | undefined;
    @Input() blockId: string | null | undefined;
    @Input() dataForm!: UntypedFormGroup;
    @Output() draftImported = new EventEmitter<any>();

    @ViewChild('draftFileInput', { static: false }) draftFileInput!: ElementRef<HTMLInputElement>;

    constructor(private draftFileService: RequestDraftFileService) {}

    private get context(): IDraftFileContext {
        return { schema: this.schema, policyId: this.policyId, blockId: this.blockId };
    }

    public onExportDraft(): void {
        this.draftFileService.exportDraft(this.context, this.dataForm.getRawValue());
    }

    public triggerImportDraft(): void {
        this.draftFileInput?.nativeElement.click();
    }

    public onImportDraft(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) {
            return;
        }
        const formHasData = this.draftFileService.hasMeaningfulValue(this.dataForm.getRawValue());
        this.draftFileService.importDraftFromFile(file, this.context, formHasData).then((result) => {
            if (!result) {
                return;
            }
            this.draftFileService.confirmDraftImport(result.warnings, () => this.applyImportedDraft(result.document));
        });
    }

    private async applyImportedDraft(doc: any): Promise<void> {
        await this.draftFileService.applyImportedDraft(doc);
        this.dataForm.markAsDirty();
        this.draftImported.emit(doc);
    }
}
