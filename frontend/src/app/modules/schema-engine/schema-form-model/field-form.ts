import { UntypedFormGroup, UntypedFormControl, UntypedFormArray, ValidatorFn, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Schema, SchemaField, SchemaRuleValidateResult, GenerateUUIDv4, SchemaCondition } from '@guardian/interfaces';
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
    conditionInvert: boolean;
    dependsOn: string[];
}
type IfOp = 'SINGLE' | 'AND' | 'OR';
interface IConditionPair {
    name: string;
    value: any;
}
interface IConditionExpr {
    op: IfOp;
    pairs: IConditionPair[];
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

    private readonly conditionFields: Set<string>;
    private readonly destroy$: Subject<boolean>;

    private readonly validateLikeDryRun?: boolean;

    constructor(form: UntypedFormGroup, lvl: number = 0, validateLikeDryRun = false) {
        this.form = form;
        this.lvl = lvl;
        this.validateLikeDryRun = validateLikeDryRun;
        this.privateFields = {};
        this.conditionFields = new Set<string>();
        this.destroy$ = new Subject<boolean>();
        this.fieldControls = null;
        this.conditionControls = null;
        this.controls = null;
    }

    public destroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    private normalizeIfCondition(raw: any): IConditionExpr {
        if (raw?.OR) {
            return {
                op: 'OR',
                pairs: (raw.OR || []).map((r: any) => ({
                    name: r?.field?.name || r?.field?.key || r?.field,
                    value: r?.fieldValue
                }))
            };
        }
        if (raw?.AND) {
            return {
                op: 'AND',
                pairs: (raw.AND || []).map((r: any) => ({
                    name: r?.field?.name || r?.field?.key || r?.field,
                    value: r?.fieldValue
                }))
            };
        }
        return {
            op: 'SINGLE',
            pairs: [{
                name: raw?.field?.name || raw?.field?.key || raw?.field,
                value: raw?.fieldValue
            }]
        };
    }

    public setData(data: {
        schema?: Schema;
        fields?: SchemaField[];
        conditions?: any;
        preset?: any;
        privateFields?: { [x: string]: boolean; };
        readonlyFields?: any;
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
    }

    public build() {
        const { fields, conditions } = this.updateData();
        this.fieldControls = this.buildFields(fields);
        this.conditionControls = this.buildConditions(conditions);
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
        if (conditions) {
            for (const condition of conditions) {
                for (const field of (condition.thenFields || [])) {
                    this.conditionFields.add(field.name);
                }
                for (const field of (condition.elseFields || [])) {
                    this.conditionFields.add(field.name);
                }
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

    private evaluateIf(expr: IConditionExpr): boolean {
        if (!expr || !expr.pairs?.length) return false;

        const test = (p: IConditionPair) => {
            const c = this.form.controls[p.name];
            if (!c) return false;
            return this.equalsLoosely(c.value, p.value);
        };

        if (expr.op === 'SINGLE') return test(expr.pairs[0]);
        if (expr.op === 'AND') return expr.pairs.every(test);
        return expr.pairs.some(test);
    }

    private buildFields(fields: SchemaField[] | undefined): IFieldControl<any>[] | null {
        if (!fields) {
            return null;
        }

        const controls: IFieldControl<any>[] = [];
        for (const field of fields) {
            if (this.privateFields[field.name] || this.conditionFields.has(field.name)) {
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
            const deps = Array.from(new Set(expr.pairs.map(p => p.name).filter(Boolean)));
            for (const thenField of condition.thenFields) {
                const fieldControl = this.createFieldControl(thenField, this.preset);
                const item: IConditionControl<any> = {
                    ...fieldControl,
                    conditionExpr: expr,
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
                    conditionInvert: true,
                    dependsOn: deps,
                    visibility: false
                };
                controls.push(item);
            }
        }

        for (const item of controls) {
            item.visibility = this.checkConditionValue(item);
            if (item.control && item.visibility) {
                this.form.addControl(item.name, item.control, { emitEvent: false });
            }
        }

        return controls;
    }

    private subscribeConditions() {
        this.form.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.rebuildConditions(false);
            })
    }

    private getLastVisibleIndexByNames(arr: IFieldControl<any>[], names: string[]): number {
        if (!names?.length) {
            return -1;
        }
        const nameSet = new Set(names);
        let idx = -1;
        for (let i = 0; i < arr.length; i++) {
            const it = arr[i];
            if (it.visibility && nameSet.has(it.name)) {
                idx = i;
            }
        }
        return idx;
    }

    private rebuildControls(): IFieldControl<any>[] {
        const result: IFieldControl<any>[] = [];

        if (this.fieldControls) {
            for (const base of this.fieldControls) {
                base.visibility = this.ifFieldVisible(base);
                result.push(base);
            }
        }

        if (this.conditionControls?.length) {
            for (const cc of this.conditionControls) {
                cc.visibility = this.checkConditionValue(cc);
            }

            const unplaced = new Set(this.conditionControls.map(c => c.id));
            const byId = new Map(this.conditionControls.map(c => [c.id, c]));

            const max = this.conditionControls.length || 1;
            for (let pass = 0; pass < max && unplaced.size; pass++) {
                let placedThisPass = 0;

                for (const id of Array.from(unplaced)) {
                    const cc = byId.get(id)!;

                    const anchorIdx = this.getLastVisibleIndexByNames(result, cc.dependsOn);

                    if (anchorIdx >= 0) {
                        result.splice(anchorIdx + 1, 0, cc);
                        unplaced.delete(id);
                        placedThisPass++;
                    }
                }

                if (!placedThisPass) {
                    break;
                }
            }

            for (const id of unplaced) {
                const cc = byId.get(id)!;
                result.push(cc);
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
                        control.conditions
                    )
                }
                if (this.ifSubSchemaArray(control) && control.list) {
                    for (const listItem of control.list) {
                        listItem.model = this.createSubForm(
                            control.customType,
                            listItem.control,
                            listItem.preset,
                            control.fields,
                            control.conditions
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
            const form = new FieldForm(control, this.lvl + 1, this.validateLikeDryRun);
            form.setData({
                fields,
                conditions,
                preset,
                privateFields: this.privateFields,
            });
            form.build();
            return form;
        }
    }

    private checkConditionValue(item: IConditionControl<any>): boolean {
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
        const value = (preset === null || preset === undefined) ? undefined : preset;
        return new UntypedFormControl(value, validators);
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
                    item.conditions
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
                item.conditions
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
            item.conditions
        )
        this.form.addControl(item.name, item.control);
    }

    public addItem(item: IFieldControl<UntypedFormArray>) {
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

    public removeGroup(item: IFieldControl<any>) {
        item.control = null;
        item.model?.destroy();
        this.form.removeControl(item.name);
    }

    public removeItem(item: IFieldControl<any>, listItem: IFieldIndexControl<any>) {
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
