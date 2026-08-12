import { UntypedFormGroup, UntypedFormControl, UntypedFormArray, ValidatorFn, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Schema, SchemaCondition, SchemaConditionTarget, SchemaField, SchemaHelper, SchemaRuleValidateResult, GenerateUUIDv4, isGeoCustomType } from '@guardian/interfaces';
import { fullFormats } from 'ajv-formats/dist/formats';
import moment from 'moment';
import { Subject, takeUntil } from 'rxjs';
import { uriValidator } from 'src/app/validators/uri.validator';
import { GeoForm } from './geo-form';
import { SentinelHubForm } from './sentinel-hub-form';

export interface IFieldControl<T extends UntypedFormControl | UntypedFormGroup | UntypedFormArray> extends SchemaField {
    id: string;
    hide: boolean;
    field: SchemaField;
    path: string;
    fullPath: string;
    control: T;
    preset?: any;
    isPreset?: boolean;
    fileUploading?: boolean;
    enumValues?: any;
    displayRequired?: boolean;
    readonly?: boolean;
    list?: IFieldIndexControl<any>[];
    open: boolean;
    autocalculate: boolean;
    model: any;
    subject: Subject<void>;
    visibility: boolean;
}

export interface IArrayGroupEntry {
    owner: FieldForm;
    control: IFieldControl<any>;
}

export interface IFieldIndexControl<T extends UntypedFormControl | UntypedFormGroup> {
    id: string;
    name: string;
    preset: any,
    index: string;
    index2: string;
    control: T;
    fileUploading?: boolean;
    model: any;
    open: boolean
}

export interface IConditionControl<T extends UntypedFormControl | UntypedFormGroup | UntypedFormArray> extends IFieldControl<T> {
    conditionExpr: IConditionExpr;
    sourceCondition: SchemaCondition;
    conditionInvert: boolean;
    dependsOn: string[];
}
type IfOp = 'SINGLE' | 'AND' | 'OR';
interface IConditionPair {
    name: string;
    value: any;
    path?: string;
}
interface IConditionExpr {
    op: IfOp;
    pairs: IConditionPair[];
}

interface ICrossSchemaConditionItem {
    expr: IConditionExpr;
    sourceCondition: SchemaCondition;
    conditionInvert: boolean;
    field: SchemaField;
    fieldPath: string[];
    visibilityByEntry: Map<number | null, boolean>;
}

export class FieldForm {
    public readonly form: UntypedFormGroup;
    public readonly lvl: number;

    private schema: Schema | null;
    private fields: SchemaField[] | null;
    private conditions: SchemaCondition[] | null;

    private privateFields: { [x: string]: boolean; };
    private readonlyFields: { name: string }[];
    private preset: any = null;

    public controls: IFieldControl<any>[] | null;
    private fieldControls: IFieldControl<any>[] | null;
    private conditionControls: IConditionControl<any>[] | null;
    private crossSchemaItems: ICrossSchemaConditionItem[];
    private conditionExprBySource: Map<SchemaCondition, IConditionExpr>;
    private conditionRevealMap: Map<string, { condition: SchemaCondition, branch: 'then' | 'else' }[]>;

    private readonly conditionFields: Set<string>;
    private ownParentControlledFields: Set<string>;
    private readonly childControlledFields: Map<string, Set<string>>;
    private readonly ancestorChildPaths: Map<string, Set<string>>;
    public rootForm: FieldForm;
    private arrayGroupCache: Map<IFieldControl<any>, IArrayGroupEntry[]> | null = null;
    private fieldOrder: Map<string, number> | null = null;

    private readonly destroy$: Subject<boolean>;

    private readonly validateLikeDryRun?: boolean;

    constructor(form: UntypedFormGroup, lvl: number = 0, validateLikeDryRun = false) {
        this.form = form;
        this.lvl = lvl;
        this.validateLikeDryRun = validateLikeDryRun;
        this.privateFields = {};
        this.conditionFields = new Set<string>();
        this.ownParentControlledFields = new Set<string>();
        this.childControlledFields = new Map<string, Set<string>>();
        this.ancestorChildPaths = new Map<string, Set<string>>();
        this.destroy$ = new Subject<boolean>();
        this.fieldControls = null;
        this.conditionControls = null;
        this.crossSchemaItems = [];
        this.conditionExprBySource = new Map<SchemaCondition, IConditionExpr>();
        this.conditionRevealMap = new Map<string, { condition: SchemaCondition, branch: 'then' | 'else' }[]>();
        this.controls = null;
        this.rootForm = this;
    }

    public destroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    private normalizeIfCondition(raw: any): IConditionExpr {
        const toPair = (r: any): IConditionPair => ({
            name: r?.field?.name || r?.field?.key || r?.field,
            value: r?.fieldValue,
            path: r?.fieldPath?.length > 1 ? (r.fieldPath as string[]).join('.') : undefined,
        });
        if (raw?.OR) {
            return { op: 'OR', pairs: (raw.OR || []).map(toPair) };
        }
        if (raw?.AND) {
            return { op: 'AND', pairs: (raw.AND || []).map(toPair) };
        }
        return { op: 'SINGLE', pairs: [toPair(raw)] };
    }

    public setData(data: {
        schema?: Schema;
        fields?: SchemaField[];
        conditions?: any;
        preset?: any;
        privateFields?: { [x: string]: boolean; };
        readonlyFields?: any;
        ownParentControlledFields?: Set<string>;
    }) {
        if (data.privateFields) {
            this.privateFields = data.privateFields;
        }
        if (data.readonlyFields) {
            this.readonlyFields = data.readonlyFields;
        }
        if (data.schema) {
            this.schema = data.schema;
        }
        if (data.fields) {
            this.fields = data.fields;
        }
        if (data.conditions) {
            this.conditions = data.conditions;
        }
        if (data.preset) {
            this.preset = data.preset;
        }
        if (data.ownParentControlledFields) {
            this.ownParentControlledFields = new Set<string>();
            this.ancestorChildPaths.clear();
            for (const path of data.ownParentControlledFields) {
                const dotIdx = path.indexOf('.');
                if (dotIdx < 0) {
                    this.ownParentControlledFields.add(path);
                } else {
                    const containerName = path.substring(0, dotIdx);
                    const remaining = path.substring(dotIdx + 1);
                    if (!this.ancestorChildPaths.has(containerName)) {
                        this.ancestorChildPaths.set(containerName, new Set<string>());
                    }
                    this.ancestorChildPaths.get(containerName)!.add(remaining);
                }
            }
        }
    }

    public build() {
        const { fields, conditions } = this.updateData();
        this.arrayGroupCache = null;
        this.crossSchemaItems = [];
        this.conditionExprBySource = new Map<SchemaCondition, IConditionExpr>();
        this.conditionRevealMap = SchemaHelper.buildRevealMap(conditions || []);
        this.fieldOrder = fields ? new Map(fields.map((f, index) => [f.name, index])) : null;
        this.fieldControls = this.buildFields(fields);
        this.conditionControls = this.buildConditions(conditions);
        if (this.schema?.arrayDependencies?.length) {
            this.alignArrayGroups();
            this.syncArrayDependencyValues();
            this.subscribeArrayDependencyValues();
        }
        this.controls = this.rebuildControls();
        this.subscribeConditions();
    }

    private updateData(): {
        fields: SchemaField[] | undefined,
        conditions: SchemaCondition[] | undefined
    } {
        let fields: SchemaField[] | undefined = undefined;
        let conditions: SchemaCondition[] | undefined = undefined;

        if (this.schema) {
            fields = this.schema.fields;
            conditions = this.schema.conditions;
        }
        if (this.fields) {
            fields = this.fields;
        }
        if (this.conditions) {
            conditions = this.conditions;
        }

        this.conditionFields.clear();
        this.childControlledFields.clear();
        if (conditions) {
            for (const condition of conditions) {
                for (const field of (condition.thenFields || [])) {
                    this.conditionFields.add(field.name);
                }
                for (const field of (condition.elseFields || [])) {
                    this.conditionFields.add(field.name);
                }
                const allTargets: SchemaConditionTarget[] = [
                    ...(condition.thenTargets || []),
                    ...(condition.elseTargets || []),
                ];
                for (const target of allTargets) {
                    if (!target.fieldPath || target.fieldPath.length < 2) { continue; }
                    const containerName = target.fieldPath[0];
                    const remainingPath = target.fieldPath.slice(1).join('.');
                    if (!this.childControlledFields.has(containerName)) {
                        this.childControlledFields.set(containerName, new Set<string>());
                    }
                    this.childControlledFields.get(containerName)!.add(remainingPath);
                }
            }
        }
        for (const [containerName, paths] of this.ancestorChildPaths) {
            if (!this.childControlledFields.has(containerName)) {
                this.childControlledFields.set(containerName, new Set<string>());
            }
            for (const path of paths) {
                this.childControlledFields.get(containerName)!.add(path);
            }
        }

        return { fields, conditions }
    }

    private equalsLoosely(a: any, b: any): boolean {
        const an = (typeof a === 'number') ? a : (typeof a === 'string' && a.trim() !== '' && !isNaN(+a) ? +a : NaN);
        const bn = (typeof b === 'number') ? b : (typeof b === 'string' && b.trim() !== '' && !isNaN(+b) ? +b : NaN);
        if (!Number.isNaN(an) && !Number.isNaN(bn)) return an === bn;

        const ad = moment(a); const bd = moment(b);
        if (ad.isValid() && bd.isValid()) return ad.toISOString() === bd.toISOString();

        const as = (a ?? '').toString().trim();
        const bs = (b ?? '').toString().trim();
        return as === bs;
    }

    private findControl(name: string): IFieldControl<any> | undefined {
        const base = this.fieldControls?.find(control => control.name === name);
        if (base) { return base; }
        // A container may itself be condition-controlled, in which case it lives in
        // conditionControls rather than fieldControls. Cross-schema conditions that target a
        // path inside such a container must still be able to resolve it.
        return this.conditionControls?.find(control => control.name === name);
    }

    private evaluateIf(expr: IConditionExpr, entryIndex: number | null = null): boolean {
        if (!expr || !expr.pairs?.length) return false;

        const test = (p: IConditionPair) => {
            const path = p.path && entryIndex !== null
                ? this.injectEntryIndex(p.path, entryIndex)
                : p.path;
            const c = path ? this.form.get(path) : this.form.controls[p.name];
            if (!c) return false;
            return this.equalsLoosely(c.value, p.value);
        };

        if (expr.op === 'SINGLE') return test(expr.pairs[0]);
        if (expr.op === 'AND') return expr.pairs.every(test);
        return expr.pairs.some(test);
    }

    /**
     * A condition is unreachable when the fields its `if` reads are not being asked: the
     * condition branch that reveals them is not the active one, so neither its `then` nor
     * its `else` fields belong in the form.
     *
     * Reachability is a property of the condition graph, not of the form: a control may be
     * missing for reasons the schema knows nothing about — a private field, a field supplied
     * by the parent, an optional sub-schema that was never instantiated — and hiding a
     * branch for those would produce a form that cannot satisfy its own schema. The
     * traversal is shared with `SchemaHelper.validateConditionFields` so the form and
     * document validation cannot disagree.
     */
    private isConditionReachable(condition: SchemaCondition, entryIndex: number | null = null): boolean {
        if (!condition) {
            return false;
        }
        return SchemaHelper.isConditionReachable(
            condition,
            this.conditionRevealMap,
            (owner: SchemaCondition) => {
                const expr = this.conditionExprBySource.get(owner);
                return expr ? this.evaluateIf(expr, entryIndex) : false;
            }
        );
    }

    private injectEntryIndex(path: string, entryIndex: number): string {
        const segments = path.split('.');
        const result: string[] = [];
        let model: FieldForm | null = this;
        for (const segment of segments) {
            result.push(segment);
            const ctrl: IFieldControl<any> | undefined = model?.findControl(segment);
            if (ctrl?.isArray && ctrl.isRef) {
                result.push(String(entryIndex));
                model = (ctrl.list?.[entryIndex]?.model as FieldForm) || null;
            } else {
                model = (ctrl?.model as FieldForm) || null;
            }
        }
        return result.join('.');
    }

    private getGroupSize(fieldPath: string[]): number | null {
        if (!fieldPath?.length) { return null; }
        let model: FieldForm = this;
        for (let i = 0; i < fieldPath.length - 1; i++) {
            const ctrl = model.findControl(fieldPath[i]);
            if (!ctrl) { return null; }
            if (ctrl.isArray && ctrl.isRef) {
                return ctrl.list?.length || 0;
            }
            const next = ctrl.model as FieldForm | null;
            if (!next) { return null; }
            model = next;
        }
        return null;
    }

    private getEntryIndexes(item: ICrossSchemaConditionItem): (number | null)[] {
        const targetSize = this.getGroupSize(item.fieldPath);
        const ifSizes = item.expr.pairs
            .map(p => this.getGroupSize(p.path ? p.path.split('.') : []))
            .filter((size): size is number => size !== null);
        if (targetSize === null && !ifSizes.length) {
            return [null];
        }
        if (targetSize === null || !ifSizes.length) {
            return [];
        }
        const size = Math.min(targetSize, ...ifSizes);
        return Array.from({ length: size }, (_, index) => index);
    }

    private buildFields(fields: SchemaField[] | undefined): IFieldControl<any>[] | null {
        if (!fields) {
            return null;
        }

        const controls: IFieldControl<any>[] = [];
        for (const field of fields) {
            if (this.privateFields[field.name] || this.conditionFields.has(field.name) || this.ownParentControlledFields.has(field.name)) {
                continue;
            }
            const item = this.createFieldControl(field, this.preset);
            controls.push(item);
        }

        for (const item of controls) {
            if (item.control) {
                // this.form.removeControl(item.name);
                this.form.addControl(item.name, item.control, { emitEvent: false });
            }
        }

        // this.form.updateValueAndValidity();
        return controls;
    }

    private buildConditions(conditions: SchemaCondition[] | undefined): IConditionControl<any>[] | null {
        if (!conditions) return null;

        const controls: IConditionControl<any>[] = [];

        for (const condition of conditions) {
            const expr = this.normalizeIfCondition((condition as any).ifCondition);
            this.conditionExprBySource.set(condition, expr);
            const deps = Array.from(new Set(expr.pairs.map(p => p.path ? p.path.split('.')[0] : p.name).filter(Boolean)));
            for (const thenField of condition.thenFields) {
                const fieldControl = this.createFieldControl(thenField, this.preset);
                const item: IConditionControl<any> = {
                    ...fieldControl,
                    conditionExpr: expr,
                    sourceCondition: condition,
                    conditionInvert: false,
                    dependsOn: deps,
                    visibility: false
                };
                controls.push(item);
            }

            for (const elseField of (condition.elseFields || [])) {
                const fieldControl = this.createFieldControl(elseField, this.preset);
                const item: IConditionControl<any> = {
                    ...fieldControl,
                    conditionExpr: expr,
                    sourceCondition: condition,
                    conditionInvert: true,
                    dependsOn: deps,
                    visibility: false
                };
                controls.push(item);
            }

            const buildCrossItems = (targets: SchemaConditionTarget[] | undefined, invert: boolean) => {
                for (const target of (targets || [])) {
                    if (!target.fieldPath || target.fieldPath.length < 2) { continue; }
                    this.crossSchemaItems.push({
                        expr,
                        sourceCondition: condition,
                        conditionInvert: invert,
                        field: target.field,
                        fieldPath: target.fieldPath,
                        visibilityByEntry: new Map<number | null, boolean>(),
                    });
                }
            };
            buildCrossItems(condition.thenTargets, false);
            buildCrossItems(condition.elseTargets, true);
        }

        for (const item of controls) {
            item.visibility = this.checkConditionValue(item);
            if (item.control && item.visibility) {
                this.form.addControl(item.name, item.control, { emitEvent: false });
            }
        }

        // Must be set before this loop: findControl (used by resolveChildModels below) falls back to it.
        this.conditionControls = controls;

        for (const item of this.crossSchemaItems) {
            for (const entryIndex of this.getEntryIndexes(item)) {
                const childModels = this.resolveChildModels(item.fieldPath, entryIndex);
                if (!childModels.length) { continue; }
                const visible = this.checkCrossConditionValue(item, entryIndex);
                item.visibilityByEntry.set(entryIndex, visible);
                if (visible) {
                    for (const childModel of childModels) {
                        childModel.addParentControlledField(item.field, this.getPresetForPath(item.fieldPath));
                    }
                }
            }
        }

        return controls;
    }

    private checkCrossConditionValue(
        item: ICrossSchemaConditionItem,
        entryIndex: number | null = null
    ): boolean {
        if (!this.isConditionReachable(item.sourceCondition, entryIndex)) {
            return false;
        }
        const ok = this.evaluateIf(item.expr, entryIndex);
        return item.conditionInvert ? !ok : ok;
    }

    public addParentControlledField(field: SchemaField, containerPreset?: any): void {
        if (!this.fieldControls) { this.fieldControls = []; }
        if (this.fieldControls.find(c => c.name === field.name)) { return; }
        const item = this.createFieldControl(field, containerPreset);
        this.insertFieldControlInOrder(item);
        if (item.control) {
            this.form.addControl(item.name, item.control, { emitEvent: false });
        }
        this.controls = this.rebuildControls();
    }

    private insertFieldControlInOrder(item: IFieldControl<any>): void {
        this.fieldControls = this.fieldControls || [];
        const targetIdx = this.fieldOrder?.get(item.name);
        if (targetIdx === undefined) {
            this.fieldControls.push(item);
            return;
        }
        const insertBefore = this.fieldControls.findIndex(c => {
            const idx = this.fieldOrder!.get(c.name);
            return idx !== undefined && idx > targetIdx;
        });
        if (insertBefore < 0) {
            this.fieldControls.push(item);
        } else {
            this.fieldControls.splice(insertBefore, 0, item);
        }
    }

    public removeParentControlledField(fieldName: string): void {
        if (!this.fieldControls) { return; }
        const idx = this.fieldControls.findIndex(c => c.name === fieldName);
        if (idx < 0) { return; }
        const item = this.fieldControls[idx];
        this.fieldControls.splice(idx, 1);
        this.form.removeControl(item.name, { emitEvent: false });
        this.controls = this.rebuildControls();
    }

    private rebuildCrossSchemaConditions(force: boolean = true): void {
        if (!this.crossSchemaItems.length) { return; }
        for (const item of this.crossSchemaItems) {
            for (const entryIndex of this.getEntryIndexes(item)) {
                const childModels = this.resolveChildModels(item.fieldPath, entryIndex);
                if (!childModels.length) { continue; }
                const visible = this.checkCrossConditionValue(item, entryIndex);
                const wasVisible = item.visibilityByEntry.get(entryIndex);
                if (force || visible !== wasVisible) {
                    item.visibilityByEntry.set(entryIndex, visible);
                    for (const childModel of childModels) {
                        if (visible) {
                            childModel.addParentControlledField(item.field, this.getPresetForPath(item.fieldPath));
                        } else {
                            childModel.removeParentControlledField(item.field.name);
                        }
                    }
                }
            }
        }
        if (this.rootForm.schema?.arrayDependencies?.length) {
            this.rootForm.syncArrayDependencyValues();
        }
    }

    private resolveArrayEntry(fieldPath: string[]): IArrayGroupEntry | null {
        if (!fieldPath?.length) { return null; }
        let model: FieldForm = this;
        for (let i = 0; i < fieldPath.length - 1; i++) {
            const ctrl = model.findControl(fieldPath[i]);
            const next = ctrl?.model as FieldForm | null;
            if (!next) { return null; }
            model = next;
        }
        const name = fieldPath[fieldPath.length - 1];
        const control = model.findControl(name);
        return control?.isArray ? { owner: model, control } : null;
    }

    private buildArrayGroups(): Map<IFieldControl<any>, IArrayGroupEntry[]> {
        const map = new Map<IFieldControl<any>, IArrayGroupEntry[]>();
        for (const dependency of (this.schema?.arrayDependencies || [])) {
            const source = this.resolveArrayEntry(dependency.on);
            const target = this.resolveArrayEntry(dependency.field);
            if (!source || !target || source.control === target.control) { continue; }
            const list = map.get(source.control) || [];
            if (!list.some(entry => entry.control === target.control)) { list.push(target); }
            map.set(source.control, list);
        }
        return map;
    }

    public getArrayGroups(): Map<IFieldControl<any>, IArrayGroupEntry[]> {
        if (!this.arrayGroupCache) {
            this.arrayGroupCache = this.buildArrayGroups();
        }
        return this.arrayGroupCache;
    }

    public getDependentArrays(item: IFieldControl<any>): IArrayGroupEntry[] {
        return this.getArrayGroups().get(item) || [];
    }

    public isManagedArray(item: IFieldControl<any>): boolean {
        for (const dependents of this.getArrayGroups().values()) {
            if (dependents.some(entry => entry.control === item)) { return true; }
        }
        return false;
    }

    private alignArrayGroups(): void {
        const groups = this.getArrayGroups();
        if (!groups.size) { return; }
        const visited = new Set<IFieldControl<any>>();
        for (const source of groups.keys()) {
            this.alignFromSource(source, visited);
        }
    }

    private alignFromSource(source: IFieldControl<any>, visited: Set<IFieldControl<any>>): void {
        if (visited.has(source)) { return; }
        visited.add(source);
        const expected = source.list?.length || 0;
        for (const entry of this.getDependentArrays(source)) {
            while ((entry.control.list?.length || 0) < expected) {
                entry.owner.appendListItem(entry.control);
            }
            this.alignFromSource(entry.control, visited);
        }
    }

    private syncArrayDependencyValues(): void {
        for (const dependency of (this.schema?.arrayDependencies || [])) {
            if (!dependency.valueMappings?.length) { continue; }
            const source = this.resolveArrayEntry(dependency.on);
            const target = this.resolveArrayEntry(dependency.field);
            if (!source || !target) { continue; }
            const count = Math.min(source.control.list?.length || 0, target.control.list?.length || 0);
            for (let index = 0; index < count; index++) {
                for (const mapping of dependency.valueMappings) {
                    const sourceControl = source.control.list?.[index]?.control?.get(mapping.source.join('.'));
                    const targetControl = target.control.list?.[index]?.control?.get(mapping.target.join('.'));
                    if (!sourceControl || !targetControl) { continue; }
                    targetControl.setValue(sourceControl.value ?? null, { emitEvent: false });
                    targetControl.disable({ emitEvent: false });
                }
            }
        }
    }

    private subscribeArrayDependencyValues(): void {
        for (const dependency of (this.schema?.arrayDependencies || [])) {
            if (!dependency.valueMappings?.length) { continue; }
            this.resolveArrayEntry(dependency.on)?.control.control.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => this.syncArrayDependencyValues());
        }
    }

    private readSourceEntryValue(sourcePath: string[], titlePath: string, index: number): string | null {
        const source = this.resolveArrayEntry(sourcePath);
        const value = source?.control.list?.[index]?.control?.get(titlePath)?.value;
        return value ? String(value) : null;
    }

    public getEntryTitle(item: IFieldControl<any>, listItem: IFieldIndexControl<any>): string {
        const fallback = `${item.description} #${listItem.index2}`;
        const index = Number(listItem.index);
        for (const dependency of (this.rootForm.schema?.arrayDependencies || [])) {
            if (!dependency.title?.length) { continue; }
            const titlePath = dependency.title.join('.');
            const source = this.rootForm.resolveArrayEntry(dependency.on);
            const dependent = this.rootForm.resolveArrayEntry(dependency.field);
            if (source?.control === item) {
                const value = listItem.control?.get(titlePath)?.value;
                if (value) { return String(value); }
            }
            if (dependent?.control === item) {
                const value = this.rootForm.readSourceEntryValue(dependency.on, titlePath, index);
                if (value) { return value; }
            }
        }
        return fallback;
    }

    public getEntryTitleLabel(item: IFieldControl<any>): string | null {
        for (const dependency of (this.rootForm.schema?.arrayDependencies || [])) {
            if (!dependency.title?.length) { continue; }
            const source = this.rootForm.resolveArrayEntry(dependency.on);
            const dependent = this.rootForm.resolveArrayEntry(dependency.field);
            if (source?.control !== item && dependent?.control !== item) { continue; }
            const titlePath = dependency.title.join('.');
            const field = source?.control.fields?.find(entry => entry.name === titlePath);
            if (field?.description) { return field.description; }
        }
        return null;
    }

    public getTitleMappedNames(item: IFieldControl<any>): Set<string> {
        const names = new Set<string>();
        for (const dependency of (this.rootForm.schema?.arrayDependencies || [])) {
            if (!dependency.title?.length || !dependency.valueMappings?.length) { continue; }
            const dependent = this.rootForm.resolveArrayEntry(dependency.field);
            if (dependent?.control !== item) { continue; }
            const titlePath = dependency.title.join('.');
            for (const mapping of dependency.valueMappings) {
                if (mapping.source.join('.') === titlePath) {
                    names.add(mapping.target.join('.'));
                }
            }
        }
        return names;
    }

    private isGroupArray(item: IFieldControl<any>): boolean {
        const groups = this.rootForm.getArrayGroups();
        if (groups.has(item)) { return true; }
        for (const dependents of groups.values()) {
            if (dependents.some(entry => entry.control === item)) { return true; }
        }
        return false;
    }

    private resolveChildModels(fieldPath: string[], entryIndex: number | null = null): FieldForm[] {
        if (!fieldPath || fieldPath.length < 2) { return []; }
        let models: FieldForm[] = [this];
        for (let i = 0; i < fieldPath.length - 1; i++) {
            const name = fieldPath[i];
            const next: FieldForm[] = [];
            for (const model of models) {
                const ctrl = model.findControl(name);
                if (ctrl?.isArray && ctrl.isRef) {
                    if (entryIndex === null) { continue; }
                    if (model.isGroupArray(ctrl)) {
                        const entry = ctrl.list?.[entryIndex]?.model as FieldForm | undefined;
                        if (entry) { next.push(entry); }
                    } else {
                        for (const listItem of (ctrl.list || [])) {
                            const entry = listItem.model as FieldForm | undefined;
                            if (entry) { next.push(entry); }
                        }
                    }
                } else {
                    const entry = ctrl?.model as FieldForm | undefined;
                    if (entry) { next.push(entry); }
                }
            }
            if (!next.length) { return []; }
            models = next;
        }
        return models;
    }

    private getPresetForPath(fieldPath: string[]): any {
        let val = this.preset;
        for (let i = 0; i < fieldPath.length - 1; i++) {
            if (val == null) { return undefined; }
            val = val[fieldPath[i]];
        }
        return val;
    }

    private getMergedChildPaths(fieldName: string): Set<string> | undefined {
        const own = this.childControlledFields.get(fieldName);
        if (!own?.size) { return undefined; }
        return own;
    }

    private subscribeConditions() {
        this.form.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.rebuildConditions(false);
            })
    }

    /**
     * The field a condition control is anchored to: its last-declared dependency, so a
     * condition reading several fields renders after all of them. Anchors on declaration
     * order rather than visibility — the template already filters on `visibility`, and an
     * `else` field is visible precisely when the field its condition reads is hidden.
     */
    private getAnchorName(cc: IConditionControl<any>, declOrder: Map<string, number>): string | null {
        if (!cc.dependsOn?.length) {
            return null;
        }
        let anchor: string | null = null;
        let anchorIdx = -1;
        for (const name of cc.dependsOn) {
            const idx = declOrder.get(name);
            if (idx !== undefined && idx > anchorIdx) {
                anchorIdx = idx;
                anchor = name;
            }
        }
        return anchor;
    }

    private rebuildControls(): IFieldControl<any>[] {
        const baseControls: IFieldControl<any>[] = [];

        if (this.fieldControls) {
            for (const base of this.fieldControls) {
                base.visibility = this.ifFieldVisible(base);
                if (!baseControls.includes(base)) {
                    baseControls.push(base);
                }
            }
        }

        if (!this.conditionControls?.length) {
            return baseControls;
        }

        for (const cc of this.conditionControls) {
            cc.visibility = this.checkConditionValue(cc);
        }

        const declOrder = new Map<string, number>();
        const declared: IFieldControl<any>[] = [...baseControls, ...this.conditionControls];
        for (let i = 0; i < declared.length; i++) {
            declOrder.set(declared[i].name, i);
        }

        // Group the revealed fields under the field their condition reads, keeping
        // the order in which the conditions (and the fields inside them) were declared.
        const childrenByAnchor = new Map<string, IConditionControl<any>[]>();
        for (const cc of this.conditionControls) {
            const anchor = this.getAnchorName(cc, declOrder);
            if (anchor === null) {
                continue;
            }
            const siblings = childrenByAnchor.get(anchor);
            if (siblings) {
                siblings.push(cc);
            } else {
                childrenByAnchor.set(anchor, [cc]);
            }
        }

        // Emit every field followed immediately by the fields its conditions reveal,
        // depth first, so a condition on a revealed field stays attached to that field.
        const result: IFieldControl<any>[] = [];
        const emitted = new Set<IConditionControl<any>>();
        const emit = (ctrl: IFieldControl<any>) => {
            result.push(ctrl);
            const children = childrenByAnchor.get(ctrl.name);
            if (!children) {
                return;
            }
            for (const child of children) {
                if (emitted.has(child)) {
                    continue;
                }
                emitted.add(child);
                emit(child);
            }
        };

        for (const base of baseControls) {
            emit(base);
        }

        // Anything still unplaced reads a field that is not part of this form (or forms
        // a cycle); keep it at the end rather than dropping it from the form.
        for (const cc of this.conditionControls) {
            if (!emitted.has(cc)) {
                emitted.add(cc);
                emit(cc);
            }
        }

        return result;
    }

    private rebuildConditions(force: boolean = true) {
        if (!this.conditionControls) return;

        let anyChanged = false;
        const MAX = this.conditionControls.length || 1;

        for (let pass = 0; pass < MAX; pass++) {
            let passChanged = false;

            for (const item of this.conditionControls) {
                const visibility = this.checkConditionValue(item);
                const wasVisible = !!item.visibility;

                if (force || visibility !== wasVisible) {
                    item.visibility = visibility;
                    this.form.removeControl(item.name, { emitEvent: false });
                    if (item.control && item.visibility) {
                        this.form.addControl(item.name, item.control, { emitEvent: false });
                    }
                    passChanged = true;
                }
            }

            anyChanged = anyChanged || passChanged;
            if (!passChanged) break;
        }

        this.rebuildCrossSchemaConditions(force);

        if (anyChanged) {
            this.controls = this.rebuildControls();
            this.form.updateValueAndValidity({ emitEvent: false });
        }
    }

    private buildSubSchemas1() {
        if (this.controls) {
            for (const control of this.controls) {
                if (this.ifSubSchema(control) && control.control) {
                    control.model = this.createSubForm(
                        control.customType,
                        control.control,
                        control.preset,
                        control.fields,
                        control.conditions,
                        control.name,
                    )
                }
                if (this.ifSubSchemaArray(control) && control.list) {
                    for (const listItem of control.list) {
                        listItem.model = this.createSubForm(
                            control.customType,
                            listItem.control,
                            listItem.preset,
                            control.fields,
                            control.conditions,
                            control.name,
                        )
                    }
                }
            }
        }
    }

    private createSubForm(
        type: string,
        control: any,
        preset: any,
        fields: any,
        conditions: any,
        fieldName?: string,
    ) {
        if (type === 'geo') {
            const form = new GeoForm(control);
            form.setData({
                preset,
            });
            form.build();
            return form;
        } else if (type === 'sentinel') {
            const form = new SentinelHubForm(control);
            form.setData({
                preset,
            });
            form.build();
            return form;
        } else {
            const ownParentControlledFields = fieldName
                ? this.getMergedChildPaths(fieldName)
                : undefined;
            const form = new FieldForm(control, this.lvl + 1, this.validateLikeDryRun);
            form.rootForm = this.rootForm;
            form.setData({
                fields,
                conditions,
                preset,
                privateFields: this.privateFields,
                ownParentControlledFields,
            });
            form.build();
            return form;
        }
    }

    private checkConditionValue(item: IConditionControl<any>): boolean {
        if (!this.isConditionReachable(item.sourceCondition)) {
            return false;
        }
        const ok = this.evaluateIf(item.conditionExpr);
        return item.conditionInvert ? !ok : ok;
    }

    private ifSubSchema(item: IFieldControl<any>): boolean {
        return !item.isArray && item.isRef;
    }

    private ifSubSchemaArray(item: IFieldControl<any>): boolean {
        return item.isArray && item.isRef;
    }

    private ifFieldVisible(item: IFieldControl<any>): boolean {
        return !item.hide && !item.hidden && !item.autocalculate;
    }

    private getComment(field: SchemaField) {
        try {
            if (typeof field.comment === 'string') {
                const comment = JSON.parse(field.comment);
                return comment;
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    private createControl(item: IFieldControl<any>, preset: any): UntypedFormControl | UntypedFormGroup | UntypedFormArray {
        const validators = this.getValidators(item);
        const value = (preset === null || preset === undefined)
            ? (isGeoCustomType(item.customType || '') ? null : undefined)
            : preset;
        const control = new UntypedFormControl(value, validators);
        if (value !== undefined && value !== null) {
            control.markAsDirty();
        }
        return control;
    }

    private getValidators(item: any): ValidatorFn[] {
        const validators = [];

        if (item.required) {
            validators.push(Validators.required);
        }

        // dryRun
        validators.push(({ value }: any) => {
            const errors = this.validateMaybeIpfs(`${value}`, this.isIPFS(item.pattern));

            if (errors) {
                return {
                    [item.id]: errors,
                }
            }

            return null;
        })

        if (item.pattern) {
            validators.push(Validators.pattern(new RegExp(item.pattern)));
            return validators;
        }

        if (item.format === 'email') {
            validators.push(Validators.pattern(fullFormats.email as RegExp));
        }

        if (item.type === 'number') {
            validators.push(this.isNumberOrEmptyValidator());
        }

        if (item.format === 'duration') {
            validators.push(Validators.pattern(fullFormats.duration as RegExp));
        }

        if (item.type === 'integer') {
            validators.push(this.isNumberOrEmptyValidator());
        }

        if (item.format === 'url') {
            validators.push(Validators.pattern(fullFormats.url as RegExp));
        }

        if (item.format === 'uri') {
            validators.push(uriValidator());
        }

        return validators;
    }

    private isIPFS(pattern: string): boolean {
        return pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+'
            || pattern === '^ipfs:\/\/.+';
    }

    private validateMaybeIpfs(
        input: string,
        forceIpfs: boolean = false
    ): string | null {
        const value = (input ?? '').trim();
        if (!value) {
            return null;
        }

        const ipfsLike = forceIpfs || this.looksLikeIpfs(value);
        if (!ipfsLike) {
            return null;
        }

        const cid = this.extractCid(value);
        if (!cid) {
            return 'Invalid IPFS link: CID not found';
        }

        if (!this.validateLikeDryRun && !this.isLikelyCid(cid)) {
            return 'Invalid IPFS CID/URL';
        }

        return null;
    }

    private looksLikeIpfs(s: string): boolean {
        if (s.startsWith('ipfs://')) return true;
        if (/\/ipfs\/[^/?#]+/i.test(s)) return true;
        return this.isLikelyCid(s);
    }

    private extractCid(s: string): string | null {
        if (s.startsWith('ipfs://')) {
            const after = s.slice('ipfs://'.length);
            const cid = after.split(/[/?#]/, 1)[0];
            return cid || null;
        }
        const m = /\/ipfs\/([^/?#]+)/i.exec(s);
        if (m?.[1]) return m[1];

        return s;
    }

    private isLikelyCid(s: string): boolean {
        return this.isCidV0(s) || this.isCidV1Base32Lower(s) || this.isCidV1Base32Upper(s) || this.isCidV1Base36Lower(s);
    }

    /** CIDv0 */
    private isCidV0(s: string): boolean {
        const base58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
        return s.length === 46 && s.startsWith('Qm') && base58.test(s);
    }

    /** CIDv1 (base32 lower) */
    private isCidV1Base32Lower(s: string): boolean {
        return /^b[a-z2-7]{30,}$/.test(s);
    }

    /** CIDv1 (base32 upper) */
    private isCidV1Base32Upper(s: string): boolean {
        return /^B[A-Z2-7]{30,}$/.test(s);
    }

    /** CIDv1 (base36 lower) */
    private isCidV1Base36Lower(s: string): boolean {
        return /^k[0-9a-z]{30,}$/.test(s);
    }

    private isNumberOrEmptyValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            if (!value || typeof (value) === 'number') {
                return null;
            }
            return {
                isNotNumber: {
                    valid: false
                }
            };
        };
    }

    private createFieldControl(field: SchemaField, preset?: any): IFieldControl<any> {
        const comment = this.getComment(field);
        const item: IFieldControl<any> = {
            ...field,
            hide: false,
            autocalculate: !!comment?.autocalculate,
            id: GenerateUUIDv4(),
            field,
            path: field.path || '',
            fullPath: field.fullPath || '',
            control: null,
            open: this.lvl === 0,
            subject: new Subject(),
            visibility: true,
            model: null
        };
        item.visibility = !item.hide && !item.hidden && !item.autocalculate;
        item.preset = field.default;
        if (preset) {
            item.isPreset = true;
            item.preset = preset[field.name];
        }

        // ifSimpleField
        if (!field.isArray && !field.isRef) {
            item.fileUploading = false;
            item.control = this.createControl(item, item.preset);
            if (field.remoteLink) {
                item.fileUploading = true;
            }
            if (field.enum) {
                item.enumValues = field.enum;
            }
            this.postFormat(item, item.control);
            item.model = null;
        }

        // ifSubSchema
        if (!field.isArray && field.isRef) {
            item.fields = field.fields;
            item.displayRequired = item.fields?.some((refField: any) => refField.required);
            if (field.required || item.preset) {
                item.control = this.createSubSchemaControl(item);
                item.model = this.createSubForm(
                    item.customType,
                    item.control,
                    item.preset,
                    item.fields,
                    item.conditions,
                    field.name,
                )
            }
        }

        // ifSimpleArray
        if (field.isArray && !field.isRef) {
            item.control = this.createArrayControl();
            item.list = [];
            if (field.remoteLink) {
                item.fileUploading = true;
            }
            if (field.enum) {
                item.enumValues = field.enum;
            }
            if (item.preset && item.preset.length) {
                for (let index = 0; index < item.preset.length; index++) {
                    const preset = item.preset[index];
                    const listItem = this.createListControl(item, preset);
                    item.list.push(listItem);
                    item.control.push(listItem.control, { emitEvent: false, onlySelf: true });
                }
                // this.form.updateValueAndValidity();
            } else if (field.required) {
                const listItem = this.createListControl(item);
                item.list.push(listItem);
                item.control.push(listItem.control, { emitEvent: false, onlySelf: true });

                // this.form.updateValueAndValidity();
            }
            item.model = null;
        }

        // ifSubSchemaArray
        if (field.isArray && field.isRef) {
            item.control = this.createArrayControl();
            item.list = [];
            item.fields = field.fields;
            if (item.preset && item.preset.length) {
                for (let index = 0; index < item.preset.length; index++) {
                    const preset = item.preset[index];
                    const listItem = this.createListControl(item, preset); //todo
                    item.list.push(listItem);
                    item.control.push(listItem.control, { emitEvent: false, onlySelf: true });
                }
                // this.form.updateValueAndValidity();
            } else if (field.required) {
                const listItem = this.createListControl(item); //todo
                item.list.push(listItem);
                item.control.push(listItem.control, { emitEvent: false, onlySelf: true });

                // this.form.updateValueAndValidity();
            }
            item.model = null;
        }

        if (this.readonlyFields?.find((readonlyItem) => readonlyItem.name === field.name)) {
            item.readonly = true;
            setTimeout(() => {
                item.control?.disable();
                item.control?.disable();
            });
        }
        return item;
    }

    private createListControl(item: IFieldControl<any>, preset?: any): IFieldIndexControl<any> {
        const count = item.list?.length || 0;
        const listItem: IFieldIndexControl<any> = {
            id: GenerateUUIDv4(),
            name: item.name,
            preset: preset,
            index: String(count),
            index2: String(count + 1),
            control: null,
            open: this.lvl === 0,
            model: null,
        };
        if (item.isRef) {
            // ifSubSchemaArray
            listItem.control = this.createSubSchemaControl(item);
            listItem.model = this.createSubForm(
                item.customType,
                listItem.control,
                listItem.preset,
                item.fields,
                item.conditions,
                item.name,
            )
        } else {
            // ifSimpleArray
            listItem.fileUploading = false;
            listItem.control = this.createControl(item, preset);
            listItem.model = null;
            this.postFormat(item, listItem.control);
        }

        return listItem;
    }

    private postFormat(item: any, control: UntypedFormControl): any {
        const format = item.format;
        const type = item.type;
        const pattern = item.pattern;
        const customType = item.customType;
        const patternByNumberType: any = {
            number: /^-?\d*(\.\d+)?$/,
            integer: /^-?\d*$/
        };

        control.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((val: any) => {
                let valueToSet: any = val;
                if (format === 'date') {
                    const momentDate = moment(val);
                    if (momentDate.isValid()) {
                        valueToSet = momentDate.format("YYYY-MM-DD");
                    } else {
                        valueToSet = "";
                    }
                } else if (format === 'date-time') {
                    const momentDate = moment(val);
                    if (momentDate.isValid()) {
                        momentDate.seconds(0);
                        momentDate.milliseconds(0);
                        valueToSet = momentDate.toISOString();
                    } else {
                        valueToSet = "";
                    }
                } else if (format === 'time') {
                    const momentDate = moment(val, 'hh:mm:ss');
                    if (momentDate.isValid()) {
                        momentDate.milliseconds(0);
                        valueToSet = momentDate.format('HH:mm:ss');
                    } else {
                        valueToSet = "";
                    }
                } else if (type === 'number' || type === 'integer') {
                    if (typeof (val) === 'string') {
                        if ((!pattern && !patternByNumberType[type].test(val)) ||
                            (pattern && !val?.match(pattern))) {
                            valueToSet = null;
                        } else if (type == 'integer') {
                            valueToSet = parseInt(val);
                        } else if (type == 'number') {
                            valueToSet = parseFloat(val);
                        }
                    }
                    if (!Number.isFinite(valueToSet)) {
                        valueToSet = val;
                    }
                } else if (customType === 'geo' || customType === 'sentinel') {
                    try {
                        valueToSet = JSON.parse(val);
                    } catch {
                        valueToSet = val;
                    }
                } else {
                    return;
                }
                control.setValue(valueToSet, {
                    emitEvent: false,
                    emitModelToViewChange: false
                });
            });
    }

    private createArrayControl(): UntypedFormArray {
        return new UntypedFormArray([]);
    }

    private createSubSchemaControl(item: IFieldControl<any>): UntypedFormControl | UntypedFormGroup | UntypedFormArray {
        if (item.customType === 'geo') {
            return new UntypedFormControl({});
        } else {
            return new UntypedFormGroup({});
        }
    }

    public updateValueAndValidity() {
        this.form.updateValueAndValidity();
    }

    public addGroup(item: IFieldControl<any>) {
        item.control = this.createSubSchemaControl(item);
        item.model = this.createSubForm(
            item.customType,
            item.control,
            item.preset,
            item.fields,
            item.conditions,
            item.name,
        )
        this.form.addControl(item.name, item.control);
        if (this.rootForm.schema?.arrayDependencies?.length) {
            this.rootForm.arrayGroupCache = null;
            this.rootForm.alignArrayGroups();
        }
        this.rebuildCrossSchemaConditions(true);
        if (this.rootForm !== this) {
            this.rootForm.rebuildCrossSchemaConditions(true);
        }
        if (this.rootForm.schema?.arrayDependencies?.length) {
            this.rootForm.syncArrayDependencyValues();
        }
    }

    private appendListItem(item: IFieldControl<any>): void {
        const listItem = this.createListControl(item);
        if (item.list) {
            item.list.push(listItem);
            for (let index = 0; index < item.list.length; index++) {
                const element = item.list[index];
                element.index = String(index);
                element.index2 = String(index + 1);
            }
        }
        if (item.control) {
            item.control.push(listItem.control);
        }
    }

    public addItem(item: IFieldControl<UntypedFormArray>, visited?: Set<IFieldControl<any>>) {
        this.appendListItem(item);
        const seen = visited || new Set<IFieldControl<any>>();
        seen.add(item);
        for (const entry of this.rootForm.getDependentArrays(item)) {
            if (seen.has(entry.control)) { continue; }
            entry.owner.addItem(entry.control, seen);
        }
        if (!visited) {
            this.rootForm.rebuildCrossSchemaConditions(true);
        }
    }

    public removeGroup(item: IFieldControl<any>) {
        item.control = null;
        item.model?.destroy();
        this.form.removeControl(item.name);
    }

    public removeItem(
        item: IFieldControl<any>,
        listItem: IFieldIndexControl<any>,
        visited?: Set<IFieldControl<any>>
    ) {
        if (item.list) {
            listItem.model?.destroy?.();
            const index = item.list.indexOf(listItem);
            item.control.removeAt(index);
            item.list.splice(index, 1);
            for (let index = 0; index < item.list.length; index++) {
                const element = item.list[index];
                element.index = String(index);
                element.index2 = String(index + 1);
            }
            const seen = visited || new Set<IFieldControl<any>>();
            seen.add(item);
            for (const entry of this.rootForm.getDependentArrays(item)) {
                if (seen.has(entry.control)) { continue; }
                const linked = entry.control.list?.[index];
                if (linked) {
                    entry.owner.removeItem(entry.control, linked, seen);
                }
            }
            if (!visited) {
                this.rootForm.rebuildCrossSchemaConditions(true);
            }
        }
    }

    public patchSuggestValue(item: IFieldControl<any>) {
        const suggest = item.suggest;
        if (item.isRef) {
            const newItem = this.createFieldControl(item.field, {
                [item.field.name]: suggest,
            });
            this.form.removeControl(item.field.name);
            this.form.addControl(item.field.name, newItem.control);
            if (this.fieldControls) {
                this.fieldControls = this.fieldControls.map(field => field === item ? newItem : field);
            }

            this.controls = this.rebuildControls();
            this.form.updateValueAndValidity({ emitEvent: true });

            newItem.control?.markAsDirty();
            return;
        }
        if (item.isArray) {
            (item.control as UntypedFormArray)?.clear();
            item.list = [];
            let count = suggest.length;
            while (count-- > 0) {
                const control = this.createListControl(item, Array.isArray(suggest) ? suggest[count] : undefined);
                item.list.push(control);
                (item.control as UntypedFormArray).push(control.control);
            }
        }
        item.control?.patchValue(suggest);
        item.control?.markAsDirty();
        item.subject.next();
    }
}
