import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, filter, take } from 'rxjs';
import { openDB, IDBPDatabase } from 'idb';
import { IRecordPolicyTestMetadata } from '@guardian/interfaces';
import { STORES_NAME } from 'src/app/constants';
import { RecordService } from 'src/app/services/record.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

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

export interface PolicyTestCaseInput {
    type: 'vc' | 'vp' | 'schema';
    documentId: string;
    tag?: string;
    schemaId?: string;
    policyId: string;
    blockId: string;
    selected: boolean;
    document?: any;
}

export interface PolicyTestCaseOutput {
    tag: string;
    schemaId?: string;
    type: 'vc' | 'vp' | 'schema';
    documentId: string;
    recordActionId: string;
    selected: boolean;
    document?: any;
}

export interface PolicyTestCase {
    id: string;
    name: string;
    recordActionId: string;
    input: PolicyTestCaseInput;
    outputs: PolicyTestCaseOutput[];
}

export interface PolicyTestAutomationState {
    captureNextFormSubmit: boolean;
    testCases: PolicyTestCase[];
    name: string;
    description: string;
}

const createInitialState = (): PolicyTestAutomationState => ({
    captureNextFormSubmit: false,
    testCases: [],
    name: '',
    description: '',
});

@Injectable({ providedIn: 'root' })
export class PolicyTestAutomationService {
    private readonly stateSubject = new BehaviorSubject<PolicyTestAutomationState>(createInitialState());
    public readonly state$ = this.stateSubject.asObservable();
    private currentPolicyId: string | null = null;
    private dbPromise: Promise<IDBPDatabase> | null = null;
    private readonly _captureSubject$ = new Subject<{ caseId: string; policyId: string; recordActionId: string }>();
    private _captureSub: Subscription | null = null;
    private readonly _wsSignal$ = new Subject<string>();
    private _recordSub: Subscription | null = null;
    private readonly _activePolls = new Map<string, Subscription>();

    private static readonly POLL_INTERVAL_MS = 5000;
    private static readonly POLL_MAX_DURATION_MS = 600000;

    constructor(
        private readonly zone: NgZone,
        private readonly recordService: RecordService,
        private readonly wsService: WebSocketService
    ) {
        this._recordSub = this.wsService.recordSubscribe((message) => {
            if (message?.policyId) {
                this._wsSignal$.next(message.policyId);
            }
        });
        this._captureSub = this._captureSubject$.subscribe((capture) => {
            this._pollOutputs(capture.caseId, capture.policyId, capture.recordActionId);
        });
    }

    private _stopPoll(caseId: string): void {
        const sub = this._activePolls.get(caseId);
        if (sub) {
            sub.unsubscribe();
            this._activePolls.delete(caseId);
        }
    }

    private _stopAllPolls(): void {
        for (const sub of this._activePolls.values()) {
            sub.unsubscribe();
        }
        this._activePolls.clear();
    }

    public get state(): PolicyTestAutomationState {
        return this.stateSubject.value;
    }

    public loadForPolicy(policyId: string): void {
        this.currentPolicyId = policyId;
        this.stateSubject.next(createInitialState());
        void this.loadFromIdb(policyId);
    }

    public setCaptureNextFormSubmit(value: boolean): void {
        this.update({ captureNextFormSubmit: value });
        this.persistToIdb();
    }

    public captureTestCase(input: Omit<PolicyTestInputAnchor, 'capturedAt'>): void {
        const raw = input.result?.data || input.result;
        const recordActionId: string = raw?.recordActionId;
        if (!recordActionId) { return; }
        const documentId: string = raw?.document?.id || raw?.id;
        const inputType: 'vc' | 'vp' = raw?.type === 'vp' ? 'vp' : 'vc';
        const caseId = this._uuid();
        const testCase: PolicyTestCase = {
            id: caseId,
            name: input.title || input.blockType || 'Test Data',
            recordActionId,
            input: {
                type: inputType,
                documentId,
                tag: raw?.tag || input.blockType,
                schemaId: raw?.schema,
                policyId: input.policyId,
                blockId: input.blockId,
                selected: false,
                document: input.document || raw?.document
            },
            outputs: []
        };
        this.update({
            captureNextFormSubmit: false,
            testCases: [...this.state.testCases, testCase]
        });
        this.persistToIdb();
        this._fetchOutputs(caseId, input.policyId, recordActionId);
        this._captureSubject$.next({ caseId, policyId: input.policyId, recordActionId });
    }

    public discardTestCase(id: string): void {
        this._stopPoll(id);
        this.update({ testCases: this.state.testCases.filter((tc) => tc.id !== id) });
        this.persistToIdb();
    }

    public toggleInputSelected(caseId: string): void {
        const testCases = this.state.testCases.map((tc) => {
            if (tc.id !== caseId) { return tc; }
            return { ...tc, input: { ...tc.input, selected: !tc.input.selected } };
        });
        this.update({ testCases });
        this.persistToIdb();
    }

    public toggleOutputSelected(caseId: string, documentId: string): void {
        const testCases = this.state.testCases.map((tc) => {
            if (tc.id !== caseId) { return tc; }
            return {
                ...tc,
                outputs: tc.outputs.map((out) => {
                    if (out.documentId !== documentId) { return out; }
                    return { ...out, selected: !out.selected };
                })
            };
        });
        this.update({ testCases });
        this.persistToIdb();
    }

    public setMetadata(name: string, description: string): void {
        this.update({ name, description });
    }

    public markReadyToSave(): boolean {
        return this.state.testCases.length > 0;
    }

    public shouldWarnBeforeStop(): boolean {
        if (this.state.testCases.length === 0) { return false; }
        const anySelected = this.state.testCases.some((tc) =>
            tc.input.selected || tc.outputs.some((out) => out.selected)
        );
        return !anySelected;
    }

    public getRecordMetadata(): IRecordPolicyTestMetadata | null {
        const outputLinks: string[] = [];
        const outputActions: Record<string, string> = {};
        for (const tc of this.state.testCases) {
            if (tc.input.selected && tc.input.documentId) {
                const link = `results/${btoa(`${tc.input.type}|${tc.input.documentId}`)}`;
                outputLinks.push(link);
                outputActions[link] = tc.recordActionId;
            }
            for (const out of tc.outputs) {
                if (out.selected && out.documentId) {
                    const link = `results/${btoa(`${out.type}|${out.documentId}`)}`;
                    outputLinks.push(link);
                    outputActions[link] = out.recordActionId;
                }
            }
        }
        if (!outputLinks.length) { return null; }
        return {
            outputs: outputLinks,
            outputActions: Object.keys(outputActions).length ? outputActions : null
        };
    }

    public reset(): void {
        this._stopAllPolls();
        this.clearIdb();
        this.currentPolicyId = null;
        this.stateSubject.next(createInitialState());
    }

    private _fetchOutputs(caseId: string, policyId: string, recordActionId: string): void {
        this.recordService.getRecordActionDocuments(policyId, recordActionId).subscribe({
            next: (docs) => {
                const outputs = this._mapDocsToOutputs(docs);
                this._mergeOutputsIntoState(caseId, outputs);
            },
            error: () => {}
        });
    }

    private _pollOutputs(caseId: string, policyId: string, recordActionId: string): void {
        let cancelled = false;
        const startedAt = Date.now();

        const sub = new Subscription();
        sub.add(() => { cancelled = true; });

        const wsSub = this._wsSignal$.pipe(
            filter((pid) => pid === policyId),
            take(1)
        ).subscribe(() => {
            if (!cancelled) {
                this._fetchOutputs(caseId, policyId, recordActionId);
            }
        });
        sub.add(wsSub);

        const tick = (): void => {
            if (cancelled) { return; }
            if (Date.now() - startedAt > PolicyTestAutomationService.POLL_MAX_DURATION_MS) {
                this._activePolls.delete(caseId);
                return;
            }
            this.recordService.getRecordActionDocuments(policyId, recordActionId).subscribe({
                next: (docs) => {
                    if (cancelled) { return; }
                    const outputs = this._mapDocsToOutputs(docs);
                    this._mergeOutputsIntoState(caseId, outputs);
                    setTimeout(tick, PolicyTestAutomationService.POLL_INTERVAL_MS);
                },
                error: () => {
                    if (!cancelled) {
                        setTimeout(tick, PolicyTestAutomationService.POLL_INTERVAL_MS);
                    }
                }
            });
        };

        this._activePolls.set(caseId, sub);
        tick();
    }

    private _mapDocsToOutputs(docs: any[]): PolicyTestCaseOutput[] {
        return (docs || []).map((doc) => ({
            tag: doc.tag || doc.type,
            schemaId: doc.schema || undefined,
            type: (doc.type === 'vp' ? 'vp' : 'vc') as 'vc' | 'vp',
            documentId: doc.document?.id || doc.id,
            recordActionId: doc.recordActionId,
            selected: false,
            document: doc.document
        }));
    }

    private _mergeOutputsIntoState(caseId: string, outputs: PolicyTestCaseOutput[]): number {
        if (!outputs.length) { return 0; }
        let added = 0;
        this.zone.run(() => {
            const testCases = this.state.testCases.map((tc) => {
                if (tc.id !== caseId) { return tc; }
                const existingIds = new Set(tc.outputs.map((o) => o.documentId));
                const newOnes = outputs.filter((o) => !existingIds.has(o.documentId));
                added = newOnes.length;
                return { ...tc, outputs: [...tc.outputs, ...newOnes] };
            });
            if (added > 0) {
                this.update({ testCases });
                this.persistToIdb();
            }
        });
        return added;
    }

    private _uuid(): string {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
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
                        testCases: stored.testCases || []
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

    private persistToIdb(): void {
        if (!this.currentPolicyId) { return; }
        const policyId = this.currentPolicyId;
        const { captureNextFormSubmit, testCases } = this.state;
        const lightweight = testCases.map((tc) => ({
            ...tc,
            input: { ...tc.input, document: undefined },
            outputs: tc.outputs.map((out) => ({ ...out, document: undefined }))
        }));
        void this.getDb().then((db) => {
            if (this.currentPolicyId !== policyId) { return; }
            return db.put(STORES_NAME.POLICY_TEST_STORE, { policyId, captureNextFormSubmit, testCases: lightweight });
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
