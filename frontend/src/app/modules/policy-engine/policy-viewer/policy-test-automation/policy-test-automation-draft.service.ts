import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
        schemaId?: string;
        messageId?: string;
        rowId?: string;
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
        this.addOutput({
            type: input.blockType || 'input',
            id: [
                input.policyId,
                input.blockId,
                input.capturedAt
            ].join(':'),
            title: input.title || 'Confirmed output',
            source: {
                policyId: input.policyId,
                blockId: input.blockId,
                blockType: input.blockType,
                inputCapturedAt: input.capturedAt
            }
        });
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

    public getRecordMetadata(): { version: 1; name?: string; description?: string; input?: PolicyTestInputAnchor; outputs?: PolicyTestOutputAnchor[] } | null {
        if (!this.draft.input || !this.draft.outputs.length) {
            return null;
        }
        return {
            version: 1,
            name: this.draft.name || undefined,
            description: this.draft.description || undefined,
            input: this.draft.input,
            outputs: this.draft.outputs
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
