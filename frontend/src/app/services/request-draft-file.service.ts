import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';
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
    replacesData: boolean;
    mismatch: boolean;
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
        private toastService: ToastService,
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
            this.toastService.error('Could not parse the selected JSON file.', 'Import failed');
            return null;
        }
        const document = parsed?.document ?? (parsed as IRequestDraftDocument);
        if (!document || typeof document !== 'object') {
            this.toastService.error('The selected file does not contain draft data.', 'Import failed');
            return null;
        }
        return {
            document,
            replacesData: formHasData,
            mismatch: this.hasDraftMismatch(parsed, context)
        };
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

    private hasDraftMismatch(parsed: IRequestVcDraftEnvelope, context: IDraftFileContext): boolean {
        if (parsed?.type && parsed.type !== RequestDraftFileService.DRAFT_TYPE) {
            return true;
        }
        if (parsed?.schema && context.schema?.iri && parsed.schema !== context.schema.iri) {
            return true;
        }
        if (parsed?.policyId && context.policyId && parsed.policyId !== context.policyId) {
            return true;
        }
        if (parsed?.blockId && context.blockId && parsed.blockId !== context.blockId) {
            return true;
        }
        return false;
    }

    public confirmDraftImport(result: IDraftImportResult, onContinue: () => void): void {
        let header: string;
        let text: string;
        let confirm: string;
        if (result.mismatch) {
            header = 'Draft may not match this form';
            text = 'This draft was not created for this form. Proceeding may leave fields empty or incorrect and will replace any data already entered.';
            confirm = 'Proceed anyway';
        } else if (result.replacesData) {
            header = 'Replace form data with draft?';
            text = 'Loading this draft will replace everything currently entered in the form';
            confirm = 'Replace';
        } else {
            onContinue();
            return;
        }
        const dialogOptionRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog without-saving-dialog',
            data: {
                header,
                text,
                buttons: [
                    { name: 'Cancel', class: 'secondary' },
                    { name: confirm, class: 'primary' }
                ]
            },
        });
        dialogOptionRef?.onClose.subscribe((closedWith: string) => {
            if (closedWith === confirm) {
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
            this.toastService.success('Draft loaded from file.', 'Import complete');
        } catch (e) {
            console.error(e);
            this.toastService.warn('Draft loaded, but some table data could not be restored.', 'Import incomplete');
        }
    }
}
