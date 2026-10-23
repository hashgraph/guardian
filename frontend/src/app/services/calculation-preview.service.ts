import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IBlockErrorData } from '@guardian/interfaces';
import { PolicyEngineService } from './policy-engine.service';
import { TablePersistenceService } from './table-persistence.service';
import { ToastService } from './toast.service';
import { prepareVcData } from '../modules/common/models/prepare-vc-data';

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
        errors: Array.isArray(raw?.errors) ? raw.errors : []
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
        previewFields: boolean
    ): Promise<ICalculationPreviewResult> {
        const document = structuredClone(formValue);
        await this.tablePersist.inlineTablesForPreview(document);
        prepareVcData(document);
        const response = await firstValueFrom(this.policyEngineService.setBlockDataWithResult(blockId, policyId, {
            document,
            ref,
            preview: true,
            previewFields
        }));
        return normalizePreviewResult(response);
    }

    public updateRequiredFields(current: string[] | null, result: ICalculationPreviewResult): string[] {
        const merged = [...new Set([...(current || []), ...result.fields, ...result.missingFields])].sort();
        if (current && current.length === merged.length && current.every((path, index) => path === merged[index])) {
            return current;
        }
        return merged;
    }

    public getViewerDocuments(result: ICalculationPreviewResult): ICalculationPreviewViewerDocument[] {
        const documents: ICalculationPreviewViewerDocument[] = [];
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

    public showErrors(result: ICalculationPreviewResult): void {
        for (const error of result.errors) {
            this.toastService.error(error.message, error.blockType || '', { blockErrorData: error.errorData || undefined });
        }
    }
}
