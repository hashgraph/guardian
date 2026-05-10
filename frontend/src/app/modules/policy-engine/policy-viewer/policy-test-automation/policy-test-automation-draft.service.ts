import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IRecordPolicyTestMetadata } from '@guardian/interfaces';

export interface PolicyTestInputAnchor {
    policyId: string;
    blockId: string;
    blockType?: string;
    title?: string;
    ref?: unknown;
    document: unknown;
    draft?: boolean;
    draftId?: string | null;
    relayerAccount?: unknown;
    evidence?: { dataType: 'message' | 'file'; data: string }[];
    result?: any;
    capturedAt: string;
}

export interface PolicyTestOutputAnchor {
    type: 'vc' | 'vp' | 'schema' | string;
    id: string;
    title?: string;
    document?: unknown;
    source?: {
        policyId?: string;
        documentId?: string;
        recordActionId?: string;
        schemaId?: string;
        messageId?: string;
        rowId?: string;
        blockId?: string;
        blockType?: string;
        inputCapturedAt?: string;
    };
    capturedAt: string;
}

export interface PolicyTestAutomationDraft {
    captureNextFormSubmit: boolean;
    input: PolicyTestInputAnchor | null;
    outputs: PolicyTestOutputAnchor[];
    name: string;
    description: string;
    readyToSave: boolean;
}

const createInitialDraft = (): PolicyTestAutomationDraft => ({
    captureNextFormSubmit: false,
    input: null,
    outputs: [],
    name: '',
    description: '',
    readyToSave: false
});

@Injectable({ providedIn: 'root' })
export class PolicyTestAutomationDraftService {
    private readonly draftSubject = new BehaviorSubject<PolicyTestAutomationDraft>(createInitialDraft());
    public readonly draft$ = this.draftSubject.asObservable();

    public get draft(): PolicyTestAutomationDraft {
        return this.draftSubject.value;
    }

    public setCaptureNextFormSubmit(value: boolean): void {
        const draft = this.draft;
        if (value && draft.input) {
            return;
        }
        this.update({ captureNextFormSubmit: value });
    }

    public captureInput(input: Omit<PolicyTestInputAnchor, 'capturedAt'>): void {
        if (this.draft.input) {
            return;
        }
        this.update({
            captureNextFormSubmit: false,
            input: {
                ...this.clone(input),
                capturedAt: new Date().toISOString()
            }
        });
    }

    public discardInput(): void {
        this.update({ input: null, captureNextFormSubmit: false });
    }

    public addOutput(output: Omit<PolicyTestOutputAnchor, 'capturedAt'>): void {
        const exists = this.draft.outputs.some((item) => {
            return item.type === output.type && item.id === output.id;
        });
        if (exists) {
            return;
        }
        this.update({
            outputs: [
                ...this.draft.outputs,
                { ...this.clone(output), capturedAt: new Date().toISOString() }
            ],
            readyToSave: false
        });
    }

    public discardOutput(type: string, id: string): void {
        this.update({
            outputs: this.draft.outputs.filter((item) => item.type !== type || item.id !== id),
            readyToSave: false
        });
    }

    public confirmOutputFromInput(): void {
        const input = this.draft.input;
        if (!input) {
            return;
        }
        const item = input.result?.data || input.result;
        const document = item?.document;
        if (document?.id) {
            const type = item?.type === 'vp' || document?.type?.includes?.('VerifiablePresentation') ? 'vp' : 'vc';
            this.addOutput({
                type,
                id: document.id,
                title: input.title || item?.tag || type.toUpperCase(),
                document,
                source: {
                    policyId: input.policyId,
                    blockId: input.blockId,
                    blockType: input.blockType,
                    documentId: document.id,
                    recordActionId: item?.recordActionId,
                    schemaId: item?.schema,
                    messageId: item?.messageId,
                    rowId: item?.id,
                    inputCapturedAt: input.capturedAt
                }
            });
        }
        this.update({
            input: null,
            captureNextFormSubmit: false,
            readyToSave: false
        });
    }

    public setMetadata(name: string, description: string): void {
        this.update({ name, description });
    }

    public markReadyToSave(): boolean {
        const readyToSave = !!this.draft.input && this.draft.outputs.length > 0;
        this.update({ readyToSave });
        return readyToSave;
    }

    public hasInput(): boolean {
        return !!this.draft.input;
    }

    public hasOutputs(): boolean {
        return this.draft.outputs.length > 0;
    }

    public shouldWarnBeforeStop(): boolean {
        return this.hasInput() && !this.hasOutputs();
    }

    public getRecordMetadata(): IRecordPolicyTestMetadata | null {
        const outputs = this.draft.outputs.filter((output) => {
            return output.type === 'vc' || output.type === 'vp' || output.type === 'schema';
        });
        if (!outputs.length) {
            return null;
        }
        const outputLinks = outputs.map((output) => {
            return `results/${btoa(`${output.type}|${output.id}`)}`;
        });
        const outputActions = outputs.reduce<Record<string, string>>((acc, output, index) => {
            if (output.source?.recordActionId) {
                acc[outputLinks[index]] = output.source.recordActionId;
            }
            return acc;
        }, {});

        return {
            outputs: outputLinks,
            outputActions: Object.keys(outputActions).length ? outputActions : null
        };
    }

    public reset(): void {
        this.draftSubject.next(createInitialDraft());
    }

    private update(patch: Partial<PolicyTestAutomationDraft>): void {
        this.draftSubject.next({
            ...this.draft,
            ...patch
        });
    }

    private clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }
}
