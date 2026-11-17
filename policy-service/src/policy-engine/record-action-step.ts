import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyLink } from './interfaces/index.js';
import { PreviewBranches } from './helpers/preview-branches.js';

type Callback = (id: string, timestamp: number, errors: { message: string; stack?: string }[]) => void;

export interface IActionError {
    message: string;
    stack?: string;
    blockType?: string | null;
    errorData?: unknown;
}

export interface IPreviewDocument {
    source: string | null;
    target: string | null;
    blockType: string | null;
    document: unknown;
}

export interface IPreviewValue {
    name: string;
    path: string;
    value: unknown;
}

export interface IPreviewFormulaValue {
    name: string;
    description: string;
    formula: string;
    value: unknown;
}

export interface IPreviewCalculation {
    source: string | null;
    blockType: string;
    inputs: IPreviewValue[];
    values: IPreviewFormulaValue[];
    outputs: IPreviewValue[];
}

export interface IPreviewRead {
    schema: string | null;
    path: string;
}

export interface IPreviewSource {
    schema: string;
    document: unknown;
    paths: string[];
    dependencies: Record<string, string[]>;
    hidden?: string[];
    nulls?: string[];
    unavailable?: string[];
    discovery?: boolean;
}

export class RecordActionStep {
    public readonly id: string;
    public readonly timestemp: number;
    public readonly syncActions: boolean;
    public readonly withHistory: boolean;
    public readonly preview: boolean;
    public readonly previewBranches: PreviewBranches | null;
    private readonly results: any[] = [];
    private readonly errors: IActionError[] = [];
    private readonly actionsMap: Set<string> = new Set();
    private readonly previewDocuments: IPreviewDocument[] = [];
    private readonly previewCalculations: IPreviewCalculation[] = [];
    private readonly previewReads: Map<string, IPreviewRead> = new Map();
    private previewSource: IPreviewSource | null = null;
    public counter: number;
    private callbackFired = false;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private readonly callback: Callback;

    constructor(callback: Callback, initialCounter = 0, syncActions = false, withHistory = false, existingId?: string, preview = false) {
        this.id = existingId ?? GenerateUUIDv4();
        this.timestemp = Date.now();
        this.callback = callback;
        this.counter = initialCounter;
        this.callbackFired = false;
        this.syncActions = syncActions;
        this.withHistory = withHistory;
        this.preview = preview;
        this.previewBranches = preview ? new PreviewBranches() : null;
    }

    public checkCycle(link: PolicyLink<any>) {
        RecordActionStep.useLink(this.actionsMap, link);
    }

    /**
     * Opens a cycle scope for one branch of a fan-out, for example one chunk of a split.
     * The scope starts from what has already run, so a loop back to it is still rejected, but what
     * a sibling branch runs is not seen as a loop. Everything else (the counter, the results, the
     * errors, the completion callback) is the one of this step.
     */
    public scoped(): RecordActionStep {
        return this.createScope(new Set(this.actionsMap));
    }

    private createScope(usedNodes: Set<string>): RecordActionStep {
        return new Proxy(this, {
            get: (target, property) => {
                if (property === 'checkCycle') {
                    return (link: PolicyLink<any>) => RecordActionStep.useLink(usedNodes, link);
                }
                if (property === 'scoped') {
                    return () => target.createScope(new Set(usedNodes));
                }
                const value = Reflect.get(target, property, target);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set: (target, property, value) => Reflect.set(target, property, value, target)
        });
    }

    private static useLink(usedNodes: Set<string>, link: PolicyLink<any>): void {
        const targetIdWithType = `${link.target.uuid}-${link.type}`;
        const sourceIdWithType = `${link.source.uuid}-${link.type}`;

        if (usedNodes.has(targetIdWithType)) {
            throw new Error(
                `Cycle detected: target "${link.target.tag}" was already used, circular reference is not allowed.`
            );
        }

        usedNodes.add(sourceIdWithType);
        usedNodes.add(targetIdWithType);
    }

    public saveResult(res: any) {
        if (this.withHistory && this.syncActions) {
            this.results.push(structuredClone(res));
        }
    }

    public getResults() {
        return this.results;
    }

    public addPreviewDocument(
        source: string | null,
        target: { tag?: string | null; blockType?: string | null } | null,
        state: unknown
    ): void {
        if (!this.preview) {
            return;
        }
        const data = state && typeof state === 'object' ? Reflect.get(state, 'data') : undefined;
        this.previewBranches.finish();
        this.previewDocuments.push({
            source,
            target: target?.tag ?? null,
            blockType: target?.blockType ?? null,
            document: structuredClone(data ?? null)
        });
    }

    public getPreviewDocuments(): IPreviewDocument[] {
        return this.previewDocuments;
    }

    public addPreviewCalculation(calculation: IPreviewCalculation): void {
        if (!this.preview) {
            return;
        }
        this.previewCalculations.push(structuredClone(calculation));
    }

    public getPreviewCalculations(): IPreviewCalculation[] {
        return this.previewCalculations;
    }

    public addPreviewRead(schema: string | null, path: string): void {
        if (!this.preview || !path) {
            return;
        }
        const key = `${schema ?? ''}\u0000${path}`;
        if (!this.previewReads.has(key)) {
            this.previewReads.set(key, { schema, path });
        }
    }

    public getPreviewReads(): IPreviewRead[] {
        return [...this.previewReads.values()];
    }

    public setPreviewSource(source: IPreviewSource): void {
        if (!this.preview) {
            return;
        }
        this.previewSource = structuredClone(source);
    }

    public getPreviewSource(): IPreviewSource | null {
        return this.previewSource;
    }

    public addError(err: unknown, blockType: string | null = null): void {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        const errorData = err && typeof err === 'object' ? Reflect.get(err, 'data') : undefined;
        this.errors.push({ message, stack, blockType, errorData });
        this.previewBranches?.fail();
    }

    public getErrors(): IActionError[] {
        return [...this.errors];
    }

    public cancel(): void {
        this.clearTimer();
        this.callbackFired = true;
    }

    public inc(): void {
        this.counter += 1;
        this.clearTimer();
    }

    public dec(): void {
        this.counter = Math.max(0, this.counter - 1);

        this.finish();
    }

    private clearTimer(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    public finish(): void {
        this.clearTimer();
        if (this.callbackFired) {
            return;
        }
        if (this.counter === 0) {
            this.timer = setTimeout(() => {
                this.timer = null;
                if (!this.callbackFired && this.counter === 0) {
                    this.callbackFired = true;
                    this.callback(this.id, this.timestemp, this.errors.map(({ message, stack }) => ({ message, stack })));
                }
            }, 1000);
        }
    }
}
