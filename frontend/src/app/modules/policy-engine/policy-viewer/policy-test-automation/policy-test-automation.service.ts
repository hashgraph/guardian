import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { openDB, IDBPDatabase } from 'idb';
import { IRecordPolicyTestMetadata } from '@guardian/interfaces';
import { STORES_NAME } from 'src/app/constants';

const POLICY_TEST_DB = 'POLICY_TEST';
const POLICY_TEST_DB_VERSION = 1;

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

export interface PolicyTestAutomationState {
    captureNextFormSubmit: boolean;
    input: PolicyTestInputAnchor | null;
    outputs: PolicyTestOutputAnchor[];
    name: string;
    description: string;
    readyToSave: boolean;
}

const createInitialState = (): PolicyTestAutomationState => ({
    captureNextFormSubmit: false,
    input: null,
    outputs: [],
    name: '',
    description: '',
    readyToSave: false
});

@Injectable({ providedIn: 'root' })
export class PolicyTestAutomationService {
    private readonly stateSubject = new BehaviorSubject<PolicyTestAutomationState>(createInitialState());
    public readonly state$ = this.stateSubject.asObservable();
    private currentPolicyId: string | null = null;
    private dbPromise: Promise<IDBPDatabase> | null = null;

    constructor(private readonly zone: NgZone) { }

    public get state(): PolicyTestAutomationState {
        return this.stateSubject.value;
    }

    public loadForPolicy(policyId: string): void {
        this.currentPolicyId = policyId;
        this.stateSubject.next(createInitialState());
        void this.loadFromIdb(policyId);
    }

    public setCaptureNextFormSubmit(value: boolean): void {
        const state = this.state;
        if (value && state.input) {
            return;
        }
        this.update({ captureNextFormSubmit: value });
        this.persistToIdb();
    }

    public captureInput(input: Omit<PolicyTestInputAnchor, 'capturedAt'>): void {
        if (this.state.input) {
            return;
        }
        this.currentPolicyId = input.policyId;
        this.update({
            captureNextFormSubmit: false,
            input: {
                ...this.clone(input),
                capturedAt: new Date().toISOString()
            }
        });
        this.persistToIdb();
    }

    public discardInput(): void {
        this.update({ input: null, captureNextFormSubmit: false });
        this.persistToIdb();
    }

    public addOutput(output: Omit<PolicyTestOutputAnchor, 'capturedAt'>): void {
        const exists = this.state.outputs.some((item) => {
            return item.type === output.type && item.id === output.id;
        });
        if (exists) {
            return;
        }
        this.update({
            outputs: [
                ...this.state.outputs,
                { ...this.clone(output), capturedAt: new Date().toISOString() }
            ],
            readyToSave: false
        });
        this.persistToIdb();
    }

    public discardOutput(type: string, id: string): void {
        this.update({
            outputs: this.state.outputs.filter((item) => item.type !== type || item.id !== id),
            readyToSave: false
        });
        this.persistToIdb();
    }

    public confirmOutputFromInput(): void {
        const input = this.state.input;
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
        this.persistToIdb();
    }

    public setMetadata(name: string, description: string): void {
        this.update({ name, description });
    }

    public markReadyToSave(): boolean {
        const readyToSave = !!this.state.input && this.state.outputs.length > 0;
        this.update({ readyToSave });
        return readyToSave;
    }

    public hasInput(): boolean {
        return !!this.state.input;
    }

    public hasOutputs(): boolean {
        return this.state.outputs.length > 0;
    }

    public shouldWarnBeforeStop(): boolean {
        return this.hasInput() && !this.hasOutputs();
    }

    public getRecordMetadata(): IRecordPolicyTestMetadata | null {
        const outputs = this.state.outputs.filter((output) => {
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
        this.clearIdb();
        this.currentPolicyId = null;
        this.stateSubject.next(createInitialState());
    }

    private getDb(): Promise<IDBPDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = openDB(POLICY_TEST_DB, POLICY_TEST_DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORES_NAME.POLICY_TEST_STORE)) {
                        db.createObjectStore(STORES_NAME.POLICY_TEST_STORE, { keyPath: 'policyId' });
                    }
                }
            });
        }
        return this.dbPromise;
    }

    private async loadFromIdb(policyId: string): Promise<void> {
        try {
            const db = await this.getDb();
            if (this.currentPolicyId !== policyId) { return; }
            const stored = await db.get(STORES_NAME.POLICY_TEST_STORE, policyId);
            if (stored && this.currentPolicyId === policyId) {
                this.zone.run(() => {
                    this.stateSubject.next({
                        ...createInitialState(),
                        captureNextFormSubmit: stored.captureNextFormSubmit || false,
                        input: stored.input || null,
                        outputs: stored.outputs || []
                    });
                });
            }
        } catch { }
    }

    private update(patch: Partial<PolicyTestAutomationState>): void {
        this.stateSubject.next({
            ...this.state,
            ...patch
        });
    }

    private clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }

    private persistToIdb(): void {
        if (!this.currentPolicyId) { return; }
        const policyId = this.currentPolicyId;
        const { captureNextFormSubmit, input, outputs } = this.state;
        void this.getDb().then((db) => {
            if (this.currentPolicyId !== policyId) { return; }
            return db.put(STORES_NAME.POLICY_TEST_STORE, { policyId, captureNextFormSubmit, input, outputs });
        }).catch(() => { });
    }

    private async clearIdb(): Promise<void> {
        const policyId = this.currentPolicyId;
        if (!policyId) { return; }
        try {
            const db = await this.getDb();
            await db.delete(STORES_NAME.POLICY_TEST_STORE, policyId);
        } catch { }
    }
}
