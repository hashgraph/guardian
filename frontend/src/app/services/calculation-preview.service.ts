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
    final?: boolean;
    sameSchema?: boolean;
}

export interface ICalculationPreviewResult {
    sameSchema: boolean;
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

export interface ICalculationPreviewTimelineItem {
    final?: boolean;
    sameSchema?: boolean;
    role: 'input' | 'result';
    label: string;
    blockType: string | null;
    source: string | null;
    target: string | null;
    document: unknown;
}

export interface ICalculationPreviewProblem {
    blockType: string | null;
    message: string;
    errorData: IBlockErrorData | null;
}

export function normalizePreviewResult(raw: any): ICalculationPreviewResult {
    return {
        sameSchema: raw?.sameSchema === true,
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

    /**
     * The chain as the form shows it: the input first, then one item per returned document.
     */
    public getTimeline(result: ICalculationPreviewResult): ICalculationPreviewTimelineItem[] {
        const items: ICalculationPreviewTimelineItem[] = [];
        const input = this.getInputDocument(result.input);
        if (input) {
            items.push({
                role: 'input',
                label: 'Form values',
                blockType: null,
                source: null,
                target: null,
                document: this.restorePreviewTables(structuredClone(input))
            });
        }
        for (const item of result.documents) {
            const name = item.target || item.source || 'Document';
            const states = Array.isArray(item.document) ? item.document : [item.document];
            for (const state of states) {
                const document = this.unwrapDocument(state);
                if (document) {
                    items.push({
                        role: 'result',
                        ...(typeof item.final === 'boolean' ? { final: item.final } : {}),
                        ...(typeof item.sameSchema === 'boolean' ? { sameSchema: item.sameSchema } : {}),
                        label: name,
                        blockType: item.blockType ?? null,
                        source: item.source ?? null,
                        target: item.target ?? null,
                        document: this.restorePreviewTables(structuredClone(document))
                    });
                }
            }
        }
        return items;
    }

    public getSchemaType(document: unknown): string | null {
        const subjects = document && typeof document === 'object' ? Reflect.get(document, 'credentialSubject') : null;
        const subject = Array.isArray(subjects) ? subjects[0] : subjects;
        const type = subject && typeof subject === 'object' ? Reflect.get(subject, 'type') : null;
        return typeof type === 'string' && type ? type : null;
    }

    /** The document of a state wrapper (`{ document }`), or null when there is none. */
    private unwrapDocument(state: unknown): object | null {
        const document = state && typeof state === 'object' ? Reflect.get(state, 'document') : null;
        return document && typeof document === 'object' ? document : null;
    }

    private getInputDocument(input: unknown): unknown {
        return this.unwrapDocument(input) ?? (input && typeof input === 'object' ? input : null);
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

    /** True when the field discovery stopped on an error or an incomplete block. */
    public needsDiscoveryWarning(result: ICalculationPreviewResult): boolean {
        return result.errors.length > 0 || result.incomplete.length > 0;
    }

    /** Errors and incomplete blocks of a result, one line each. */
    public getProblems(result: ICalculationPreviewResult): ICalculationPreviewProblem[] {
        const problems: ICalculationPreviewProblem[] = result.errors.map((error) => ({
            blockType: error.blockType,
            message: error.message,
            errorData: error.errorData ?? null
        }));
        for (const item of result.incomplete) {
            if (!result.errors.some((error) => error.message.endsWith(item.reason))) {
                problems.push({
                    blockType: item.blockType ?? null,
                    message: `Calculation preview result is incomplete: ${item.reason}`,
                    errorData: null
                });
            }
        }
        return problems;
    }
}
