import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SchemaField } from '@guardian/interfaces';
import { PolicyEngineService } from './policy-engine.service';
import { TablePersistenceService } from './table-persistence.service';
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
    errors: string[];
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
        private tablePersist: TablePersistenceService
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

    public getFieldLabels(fields: SchemaField[] | undefined, prefix: string = ''): Record<string, string> {
        const labels: Record<string, string> = {};
        for (const field of fields || []) {
            const path = `${prefix}${field.name}`;
            labels[path] = field.description || field.name;
            if (field.isRef) {
                Object.assign(labels, this.getFieldLabels(field.fields, `${path}.`));
            }
        }
        return labels;
    }
}
