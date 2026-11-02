import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getTableTooLargeMessage, IBlockErrorData, TABLE_MAX_BYTES } from '@guardian/interfaces';
import { PolicyEngineService } from './policy-engine.service';
import { TablePersistenceService } from './table-persistence.service';
import { ToastService } from './toast.service';
import { prepareVcData } from '../modules/common/models/prepare-vc-data';
import { BooleanProperty } from '../modules/policy-engine/structures/storage/boolean-prop';

export interface ICalculationPreviewValue {
    name: string;
    path: string;
    value: unknown;
}

export interface ICalculationPreviewFormulaValue {
    name: string;
    description: string;
    formula: string;
    value: unknown;
}

export interface ICalculationPreviewCalculation {
    source: string | null;
    blockType: string;
    inputs: ICalculationPreviewValue[];
    values: ICalculationPreviewFormulaValue[];
    outputs: ICalculationPreviewValue[];
}

export interface ICalculationPreviewDocument {
    source: string | null;
    target: string | null;
    blockType: string | null;
    document: unknown;
}

export interface ICalculationPreviewResult {
    trackingId: string;
    input: unknown;
    documents: ICalculationPreviewDocument[];
    calculations: ICalculationPreviewCalculation[];
    fields: string[];
    missingFields: string[];
    errors: ICalculationPreviewError[];
    incomplete: ICalculationPreviewIncomplete[];
}

export interface ICalculationPreviewIncomplete {
    blockType: string | null;
    reason: string;
}

export interface ICalculationPreviewError {
    message: string;
    blockType: string | null;
    errorData: IBlockErrorData | null;
}

export interface ICalculationPreviewViewerDocument {
    label: string;
    document: unknown;
}

export function normalizePreviewResult(raw: any): ICalculationPreviewResult {
    return {
        trackingId: typeof raw?.trackingId === 'string' ? raw.trackingId : '',
        input: raw?.input ?? null,
        documents: Array.isArray(raw?.documents) ? raw.documents : [],
        calculations: Array.isArray(raw?.calculations) ? raw.calculations : [],
        fields: Array.isArray(raw?.fields) ? raw.fields : [],
        missingFields: Array.isArray(raw?.missingFields) ? raw.missingFields : [],
        errors: Array.isArray(raw?.errors) ? raw.errors : [],
        incomplete: Array.isArray(raw?.incomplete) ? raw.incomplete : []
    };
}

@Injectable({ providedIn: 'root' })
export class CalculationPreviewService {
    constructor(
        private policyEngineService: PolicyEngineService,
        private tablePersist: TablePersistenceService,
        private toastService: ToastService
    ) {}

    public async run(
        policyId: string,
        blockId: string,
        formValue: unknown,
        ref: unknown,
        previewFields: boolean,
        metadata?: { relayerAccount?: unknown; evidence?: { dataType: string; data: string }[] }
    ): Promise<ICalculationPreviewResult> {
        const document = structuredClone(formValue);
        await this.tablePersist.inlineTablesForPreview(document);
        const tableBytes = this.getPreviewTableBytes(document);
        if (tableBytes > TABLE_MAX_BYTES) {
            const message = getTableTooLargeMessage(tableBytes);
            this.toastService.error(message, 'Calculation preview');
            throw new Error(message);
        }
        prepareVcData(document);
        const response = await firstValueFrom(this.policyEngineService.setBlockDataWithResult(blockId, policyId, {
            document,
            ref,
            ...metadata,
            preview: true,
            previewFields
        }));
        return normalizePreviewResult(response);
    }

    public getInputValidation(error: unknown): Pick<ICalculationPreviewResult, 'fields' | 'missingFields'> | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 422) {
            return null;
        }
        const data = error.error?.data;
        if (data?.preview !== true || !Array.isArray(data.fields) || !Array.isArray(data.missingFields)
            || !data.fields.every((path: unknown) => typeof path === 'string')
            || !data.missingFields.every((path: unknown) => typeof path === 'string')) {
            return null;
        }
        return { fields: data.fields, missingFields: data.missingFields };
    }

    public loadMode(userId: string | undefined, policyId: string, blockId: string): boolean {
        const key = this.modeKey(userId, policyId, blockId);
        return key ? new BooleanProperty(key, false).load() : false;
    }

    public saveMode(userId: string | undefined, policyId: string, blockId: string, enabled: boolean): void {
        const key = this.modeKey(userId, policyId, blockId);
        if (key) {
            const property = new BooleanProperty(key, false);
            property.value = enabled;
            property.save();
        }
    }

    private modeKey(userId: string | undefined, policyId: string, blockId: string): string | null {
        return userId && policyId && blockId
            ? `CALCULATION_PREVIEW:${JSON.stringify([userId, policyId, blockId])}`
            : null;
    }

    public updateRequiredFields(_current: string[] | null, result: Pick<ICalculationPreviewResult, 'fields' | 'missingFields'>): string[] {
        return [...new Set([...result.fields, ...result.missingFields])].sort();
    }

    public getViewerDocuments(result: ICalculationPreviewResult): ICalculationPreviewViewerDocument[] {
        const documents: ICalculationPreviewViewerDocument[] = [];
        if (result.incomplete.length) {
            return documents;
        }
        for (const item of result.documents) {
            const name = item.target || item.source || 'Document';
            const states = Array.isArray(item.document) ? item.document : [item.document];
            for (const state of states) {
                const document = state && typeof state === 'object' ? Reflect.get(state, 'document') : null;
                if (document) {
                    documents.push({
                        label: `${documents.length + 1}. ${name}`,
                        document: this.restorePreviewTables(structuredClone(document))
                    });
                }
            }
        }
        return documents;
    }

    private restorePreviewTables(node: unknown): unknown {
        if (typeof node === 'string') {
            return this.restorePreviewTable(node);
        }
        if (Array.isArray(node)) {
            return node.map((item) => this.restorePreviewTables(item));
        }
        if (node && typeof node === 'object') {
            for (const key of Object.keys(node)) {
                Reflect.set(node, key, this.restorePreviewTables(Reflect.get(node, key)));
            }
        }
        return node;
    }

    private restorePreviewTable(value: string): string {
        if (!value.startsWith('{')) {
            return value;
        }
        let table: unknown;
        try {
            table = JSON.parse(value);
        } catch {
            return value;
        }
        if (!table || typeof table !== 'object') {
            return value;
        }
        const fileId = Reflect.get(table, 'fileId');
        const csv = Reflect.get(table, 'csv');
        if (Reflect.get(table, 'type') !== 'table' || typeof fileId !== 'string' || !fileId.startsWith('preview-') || typeof csv !== 'string') {
            return value;
        }
        Reflect.deleteProperty(table, 'fileId');
        return JSON.stringify(table);
    }

    private getPreviewTableBytes(node: unknown): number {
        if (typeof node === 'string') {
            return this.getPreviewTableSize(node);
        }
        if (Array.isArray(node)) {
            return node.reduce((sum: number, item: unknown) => sum + this.getPreviewTableBytes(item), 0);
        }
        if (node && typeof node === 'object') {
            return Object.keys(node).reduce((sum: number, key: string) => sum + this.getPreviewTableBytes(Reflect.get(node, key)), 0);
        }
        return 0;
    }

    private getPreviewTableSize(value: string): number {
        if (!value.startsWith('{')) {
            return 0;
        }
        let table: unknown;
        try {
            table = JSON.parse(value);
        } catch {
            return 0;
        }
        if (!table || typeof table !== 'object' || Reflect.get(table, 'type') !== 'table') {
            return 0;
        }
        const csv = Reflect.get(table, 'csv');
        return typeof csv === 'string' ? new TextEncoder().encode(csv).length : 0;
    }

    public showDiscoveryWarning(result: ICalculationPreviewResult): void {
        if (result.errors.length || result.incomplete.length) {
            this.toastService.warn(
                'Could not determine every field the calculation needs. Fill in the marked fields and run Preview again.',
                'Calculation preview'
            );
        }
    }

    public showErrors(result: ICalculationPreviewResult): void {
        for (const error of result.errors) {
            this.toastService.error(error.message, error.blockType || '', { blockErrorData: error.errorData || undefined });
        }
        for (const item of result.incomplete) {
            if (!result.errors.some((error) => error.message.endsWith(item.reason))) {
                this.toastService.error(`Calculation preview result is incomplete: ${item.reason}`, item.blockType || 'Calculation preview');
            }
        }
    }
}
