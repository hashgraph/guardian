import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { DialogService } from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { TablePersistenceService } from './table-persistence.service';

export interface IDraftFileContext {
    schema?: { iri?: string | null; name?: string | null } | null;
    policyId?: string | null;
    blockId?: string | null;
}

export type IRequestDraftDocument = Record<string, unknown>;

export interface IDraftImportResult {
    document: IRequestDraftDocument;
    warnings: string[];
}

export interface IRequestVcDraftEnvelope {
    type?: string;
    version?: string;
    schema?: string | null;
    policyId?: string | null;
    blockId?: string | null;
    document?: IRequestDraftDocument;
}

/**
 * Shared logic for exporting a request document form as a draft JSON file
 * and restoring a draft from a previously exported file. Used by both the
 * page and dialog variants of the request document block.
 */
@Injectable({ providedIn: 'root' })
export class RequestDraftFileService {
    private static readonly DRAFT_TYPE = 'request-vc-draft';
    private static readonly DRAFT_VERSION = '1.0.0';

    constructor(
        private toastr: ToastrService,
        private dialogService: DialogService,
        private tablePersist: TablePersistenceService,
    ) {}

    public exportDraft(context: IDraftFileContext, formValue: IRequestDraftDocument): void {
        const envelope = {
            type: RequestDraftFileService.DRAFT_TYPE,
            version: RequestDraftFileService.DRAFT_VERSION,
            schema: context.schema?.iri || null,
            policyId: context.policyId,
            blockId: context.blockId,
            document: formValue,
        };
        const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `draft_${this.buildFileName(context.schema)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    private buildFileName(schema?: { iri?: string | null; name?: string | null } | null): string {
        const raw = schema?.iri || schema?.name || 'document';
        const sanitized = raw
            .trim()
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '');
        return sanitized || 'document';
    }

    public async importDraftFromFile(
        file: File,
        context: IDraftFileContext,
        formHasData: boolean
    ): Promise<IDraftImportResult | null> {
        let parsed: IRequestVcDraftEnvelope;
        try {
            parsed = await this.readFileAsJson(file);
        } catch {
            this.toastr.error('Could not parse the selected JSON file.', 'Import failed');
            return null;
        }
        const document = parsed?.document ?? (parsed as IRequestDraftDocument);
        if (!document || typeof document !== 'object') {
            this.toastr.error('The selected file does not contain draft data.', 'Import failed');
            return null;
        }
        const warnings: string[] = [];
        if (formHasData) {
            warnings.push('The current form already contains data that will be replaced.');
        }
        warnings.push(...this.getDraftMismatches(parsed, context));
        return { document, warnings };
    }

    private readFileAsJson(file: File): Promise<IRequestVcDraftEnvelope> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    resolve(JSON.parse(reader.result as string));
                } catch {
                    reject();
                }
            };
            reader.onerror = () => reject();
            reader.readAsText(file);
        });
    }

    private getDraftMismatches(parsed: IRequestVcDraftEnvelope, context: IDraftFileContext): string[] {
        const mismatches: string[] = [];
        if (parsed?.type && parsed.type !== RequestDraftFileService.DRAFT_TYPE) {
            mismatches.push('This file is not a request document draft.');
        }
        if (parsed?.schema && context.schema?.iri && parsed.schema !== context.schema.iri) {
            mismatches.push('The draft was created for a different schema.');
        }
        if (parsed?.policyId && context.policyId && parsed.policyId !== context.policyId) {
            mismatches.push('The draft was created for a different policy.');
        }
        if (parsed?.blockId && context.blockId && parsed.blockId !== context.blockId) {
            mismatches.push('The draft was created for a different form.');
        }
        return mismatches;
    }

    public confirmDraftImport(warnings: string[], onContinue: () => void): void {
        if (!warnings.length) {
            onContinue();
            return;
        }
        const text =
            'Please review before loading this draft:\n\n' +
            warnings.map((m) => `• ${m}`).join('\n') +
            '\n\nDo you want to continue?';
        const dialogOptionRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog without-saving-dialog',
            data: {
                header: 'Load draft from file?',
                text,
                buttons: [
                    { name: 'Cancel', class: 'secondary' },
                    { name: 'Continue', class: 'primary' }
                ]
            },
        });
        dialogOptionRef.onClose.subscribe((result: string) => {
            if (result === 'Continue') {
                onContinue();
            }
        });
    }

    public hasMeaningfulValue(value: unknown): boolean {
        if (value === null || value === undefined || value === '' || value === false) {
            return false;
        }
        if (Array.isArray(value)) {
            return value.some((v) => this.hasMeaningfulValue(v));
        }
        if (typeof value === 'object') {
            return Object.values(value).some((v) => this.hasMeaningfulValue(v));
        }
        return true;
    }

    /**
     * Restores persisted tables referenced by the draft. If that step fails, the
     * document itself is still usable, but the user must be told restoration was
     * incomplete rather than seeing an unqualified success message.
     */
    public async applyImportedDraft(doc: IRequestDraftDocument): Promise<void> {
        try {
            await this.tablePersist.restoreTablesFromDraft(doc);
            this.toastr.success('Draft loaded from file.', 'Import complete');
        } catch (e) {
            console.error(e);
            this.toastr.warning('Draft loaded, but some table data could not be restored.', 'Import incomplete');
        }
    }
}
