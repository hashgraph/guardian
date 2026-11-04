import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { UntypedFormArray } from '@angular/forms';
import {
    isGeoCustomType,
    Schema,
    SchemaField,
    SchemaRuleValidateResult,
    UnitSystem
} from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { Subject, Subscription, firstValueFrom, takeUntil } from 'rxjs';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { IPFSService } from 'src/app/services/ipfs.service';
import { API_IPFS_GATEWAY_URL, IPFS_SCHEMA } from '../../../services/api';
import { FormFormulas } from 'src/app/modules/formulas/models/form-formulas';
import { FormulaItem } from 'src/app/modules/formulas/models/formula-tree';
import { FieldForm, IFieldControl, IFieldIndexControl } from '../schema-form-model/field-form';
import { getErrorMessage, showError } from './schema-form-errors';
import { countRequired } from './schema-form-completion';
import { getMinutesAgoStream } from 'src/app/utils/autosave-utils';
import { withNewTabLinks } from '../rich-text-editor/rich-text-sanitizer';
import { markdownToHtml } from '../rich-text-editor/markdown';
import {
    GeoOption,
    GeoResolverField,
    GeoType,
    resolveGeoDependencies
} from './geo-dependency-resolver';

const EMPTY_FORMULAS: FormulaItem[] = [];
const PREVIEW_RENDER_CHUNK = 10;

enum PlaceholderByFieldType {
    Email = "example@email.com",
    Number = "123",
    URL = "https://example.com",
    URI = "example:uri",
    String = "Please enter text here",
    IPFS = 'ipfs.io/ipfs/example-hash',
    HederaAccount = '0.0.1',
    Duration = 'P1D'
}

enum PresetPrefixByFieldType {
    URL = "https://"
}

class IButton {
    id: string;
    visible: () => boolean;
    disabled: () => boolean;
    text: string;
    class: string;
    type: string;
    iconPath?: string;
    fn: () => void;
}

const FILE_EXTENSIONS = '.txt, .pdf, .doc, .docx, .xls, .csv, .kml, .geoJSON';
/**
 * Form built by schema
 */
@Component({
    selector: 'app-schema-form',
    templateUrl: './schema-form.component.html',
    styleUrls: ['./schema-form.component.scss'],
    standalone: false
})
export class SchemaFormComponent implements OnInit {
    // The PrimeNG auto-resize reads scrollHeight on every change detection, which forces a layout
    // for each textarea. Browsers with `field-sizing` grow the textarea in CSS instead.
    public readonly scriptAutoResize = !CSS.supports('field-sizing', 'content');
    @Input('form-model') formModel!: FieldForm;
    /** Renders only these controls of `formModel` (a section); `null` renders all of them. */
    @Input() renderControls: IFieldControl<any>[] | null = null;
    @Input('private-fields') hide!: { [x: string]: boolean };
    @Input('readonly-fields') readonly?: any;
    @Input('delimiter-hide') delimiterHide: boolean = false;
    @Input() example: boolean = false;
    @Input() cancelText: string = 'Cancel';
    @Input() saveText: string = 'Save';
    @Input() submitText: string = 'Submit';
    @Input() cancelHidden: boolean = false;
    @Input() submitHidden: boolean = false;
    @Input() saveShown: boolean = false;
    @Input() showButtons: boolean = true;
    @Input() isChildSchema: boolean = false;
    @Input() comesFromDialog: boolean = false;
    @Input() dryRun?: boolean = false;
    @Input() policyId?: string = '';
    @Input() blockId: string = '';
    @Input() rules?: SchemaRuleValidateResult;
    @Input() isFormForFinishSetup: boolean = false;
    @Input() isFormForRequestBlock: boolean = false;
    @Input() lastSavedAt?: Date;
    @Input() isEditMode: boolean = false;
    @Input() formulas?: FormFormulas | null;
    @Input() formulaEntries?: Record<string, number> | null;
    @Input() previewMissingFieldIds: string[] = [];
    @Input() previewValidation: boolean = false;
    @Input() previewBusy: boolean = false;

    @Output() change = new EventEmitter<Schema | null>();
    @Output() destroy = new EventEmitter<void>();
    @Output() cancelBtnEvent = new EventEmitter<boolean>();
    @Output() submitBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();
    @Output() saveBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();
    @Output() updatableBtnEvent = new EventEmitter();
    @Output() buttons = new EventEmitter<any>();
    @Output() previewLoadingChange = new EventEmitter<boolean>();

    public minutesAgo$ = getMinutesAgoStream(() => this.lastSavedAt);

    public destroy$: Subject<boolean> = new Subject<boolean>();
    public buttonsConfig: IButton[] = [];
    public editButtonConfig: IButton;
    private geoSubscriptions = new Subscription();
    private geoOptions = new Map<string, GeoOption[]>();

    private entryScopes = new WeakMap<object, Record<string, number>>();
    private previewSections = new WeakSet<object>();
    private previewFrames = new Map<IFieldControl<any> | IFieldIndexControl<any>, number>();
    public previewRenderLimit: number = Infinity;
    private previewRenderFrame: number | null = null;

    constructor(
        private ipfs: IPFSService,
        protected changeDetectorRef: ChangeDetectorRef,
        private readonly dialog: DialogService
    ) { }

    ngOnInit(): void {
    }

    /** The controls this form draws: the section it is limited to, or all of them. */
    public get renderedControls(): IFieldControl<any>[] {
        return this.renderControls ?? this.formModel?.controls ?? [];
    }

    public isPreviewSectionReady(item: IFieldControl<any> | IFieldIndexControl<any>): boolean {
        return !this.previewValidation || this.previewSections.has(item);
    }

    private cancelPreviewSections(): void {
        for (const frame of this.previewFrames.values()) {
            cancelAnimationFrame(frame);
            this.previewLoadingChange.emit(false);
        }
        this.previewFrames.clear();
        this.previewSections = new WeakSet<object>();
    }

    public preparePreviewSection(item: IFieldControl<any> | IFieldIndexControl<any>): void {
        if (!this.previewValidation) return;
        const pending = this.previewFrames.get(item);
        if (!item.open) {
            if (pending !== undefined) {
                cancelAnimationFrame(pending);
                this.previewFrames.delete(item);
                this.previewLoadingChange.emit(false);
            }
            this.previewSections.delete(item);
            return;
        }
        if (pending !== undefined || this.previewSections.has(item)) return;
        this.previewLoadingChange.emit(true);
        this.previewFrames.set(item, requestAnimationFrame(() => {
            this.previewFrames.set(item, requestAnimationFrame(() => {
                this.previewSections.add(item);
                this.changeDetectorRef.detectChanges();
                this.previewFrames.set(item, requestAnimationFrame(() => {
                    this.previewFrames.delete(item);
                    this.previewLoadingChange.emit(false);
                }));
            }));
        }));
    }

    private stopPreviewRendering(): void {
        if (this.previewRenderFrame !== null) {
            cancelAnimationFrame(this.previewRenderFrame);
            this.previewRenderFrame = null;
            this.previewLoadingChange.emit(false);
        }
        this.previewRenderLimit = Infinity;
    }

    private startPreviewRendering(): void {
        this.stopPreviewRendering();
        if (!this.previewValidation || this.renderedControls.length <= PREVIEW_RENDER_CHUNK) return;
        this.previewRenderLimit = PREVIEW_RENDER_CHUNK;
        this.previewLoadingChange.emit(true);
        const next = () => {
            this.previewRenderLimit += PREVIEW_RENDER_CHUNK;
            if (this.previewRenderLimit < this.renderedControls.length) {
                this.changeDetectorRef.detectChanges();
                this.previewRenderFrame = requestAnimationFrame(next);
                return;
            }
            this.previewRenderFrame = null;
            this.previewRenderLimit = Infinity;
            this.changeDetectorRef.detectChanges();
            this.previewLoadingChange.emit(false);
        };
        this.previewRenderFrame = requestAnimationFrame(next);
    }

    public prepareOpenPreviewSections(): void {
        if (!this.previewValidation) return;
        for (const item of this.formModel?.controls || []) {
            if (!item.isRef || !item.open) continue;
            this.preparePreviewSection(item);
            for (const row of item.list || []) {
                if (row.open) this.preparePreviewSection(row);
            }
        }
        this.childForms?.forEach((form) => form.prepareOpenPreviewSections());
    }

    public getFieldFormulas(item: IFieldControl<any>): FormulaItem[] {
        return this.formulas?.get(item.fullPath, this.formulaEntries) ?? EMPTY_FORMULAS;
    }

    /**
     * Entries scope for formulas of a repeated sub-schema entry: parent scope plus
     * this array's current entry index. The same object is returned (and refreshed in place)
     * so child components do not see a new input on every change detection pass.
     */
    public getEntryFormulaScope(item: IFieldControl<any>, listItem: any): Record<string, number> {
        let scope = this.entryScopes.get(listItem);
        if (!scope) {
            scope = {};
            this.entryScopes.set(listItem, scope);
        }
        for (const key of Object.keys(scope)) {
            delete scope[key];
        }
        Object.assign(scope, this.formulaEntries);
        scope[item.path] = Number(listItem.index);
        return scope;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.formModel || changes.previewValidation || changes.renderControls) {
            if (this.previewValidation || this.previewFrames.size) this.cancelPreviewSections();
            if (this.previewValidation) this.prepareOpenPreviewSections();
            if (this.previewValidation || this.previewRenderFrame !== null) this.startPreviewRendering();
        }
        if (this.formModel && this.formModel.controls) {
            for (const item of this.formModel.controls) {
                this.updateRemoteFiles(item);
            }
        }
        this.setupGeoDependencies();
        if (!this.isEditMode) {
            this.createButtons();
        } else {
            this.createEditModeButton()
        }
    }

    ngOnDestroy() {
        this.cancelPreviewSections();
        this.stopPreviewRendering();
        this.clearSuggestHideTimer();
        this.geoSubscriptions.unsubscribe();
        this.destroy.emit();
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    public createButtons() {
        this.buttonsConfig = [{
            id: 'cancel',
            visible: () => {
                if (!this.formModel?.controls || this.isChildSchema) {
                    return false;
                }
                return !this.cancelHidden;
            },
            disabled: () => {
                return false;
            },
            text: this.cancelText,
            class: 'p-button-outlined',
            type: 'secondary',
            fn: () => {
                this.onCancelBtnClick();
            },
        }, {
            id: 'submit',
            visible: () => {
                if (!this.formModel?.controls || this.isChildSchema) {
                    return false;
                }
                return !this.submitHidden;
            },
            disabled: () => {
                return false;
            },
            text: this.submitText,
            class: 'p-button',
            type: 'primary',
            fn: () => {
                this.onSubmitBtnClick(this.formModel?.controls);
            },
        }, {
            id: 'save',
            visible: () => {
                return this.saveShown;
            },
            disabled: () => {
                return false;
            },
            text: this.saveText,
            class: 'p-button-outlined',
            type: 'primary',
            iconPath: '/assets/images/icons/save.svg',
            fn: () => {
                this.onSaveBtnClick(this.formModel?.controls);
            },
        }]
        this.buttons.emit(this.buttonsConfig);
    }

    public createEditModeButton() {
        this.editButtonConfig = {
            id: 'submit',
            visible: () => {
                if (!this.formModel?.controls) {
                    return false;
                }
                return true;
            },
            disabled: () => {
                return false;
            },
            text: 'Save Changes',
            class: 'p-button',
            type: 'primary',
            fn: () => {
                this.onUpdatableBtnEvent();
            },
        };
        this.buttons.emit(this.editButtonConfig);
    }


    public addGroup(item: IFieldControl<any>) {
        this.formModel?.addGroup(item);
        this.change.emit();
        this.changeDetectorRef.detectChanges();
    }

    public addItem(item: IFieldControl<UntypedFormArray>) {
        this.formModel?.addItem(item);
        if (this.previewValidation) this.prepareOpenPreviewSections();
        setTimeout(() => {
            this.formModel?.updateValueAndValidity();
            this.change.emit();
        });
    }

    public removeGroup(item: IFieldControl<any>, event: any) {
        if (event?.stopPropagation) {
            event.stopPropagation();
        }
        this.formModel?.removeGroup(item);
        this.formModel?.updateValueAndValidity();
        this.changeDetectorRef.detectChanges();
        this.change.emit();
    }

    public removeItem(item: IFieldControl<any>, listItem: IFieldIndexControl<any>, event: any) {
        if (event?.stopPropagation) {
            event.stopPropagation();
        }
        const dependents = this.formModel?.rootForm?.getDependentArrays(item) || [];
        if (!dependents.length) {
            this.applyRemoveItem(item, listItem);
            return;
        }
        this.dialog.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete entry',
                text: 'Linked entries will be deleted together with this one.',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        })!.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.applyRemoveItem(item, listItem);
            }
        });
    }

    private applyRemoveItem(item: IFieldControl<any>, listItem: IFieldIndexControl<any>): void {
        this.formModel?.removeItem(item, listItem);
        this.formModel?.updateValueAndValidity();
        this.changeDetectorRef.detectChanges();
        this.change.emit();
    }

    public isManagedArray(item: IFieldControl<any>): boolean {
        return !!this.formModel?.rootForm?.isManagedArray(item);
    }

    public entryTitleLabel(item: IFieldControl<any>): string {
        return this.formModel?.getEntryTitleLabel(item) || 'Source entry';
    }

    public entryTitle(item: IFieldControl<any>, listItem: IFieldIndexControl<any>): string {
        return this.formModel?.getEntryTitle(item, listItem)
            || `${item.description} #${listItem.index2}`;
    }

    public entryTitleNumber(item: IFieldControl<any>, listItem: IFieldIndexControl<any>): string {
        const fallback = `${item.description} #${listItem.index2}`;
        return this.entryTitle(item, listItem) === fallback ? '' : `#${listItem.index2}`;
    }

    public patchSuggestValue(item: IFieldControl<any>) {
        this.formModel?.patchSuggestValue(item);
        item.control?.markAsTouched();
        this.changeDetectorRef.detectChanges();
        this.change.emit();
    }

    public ifSimpleField(item: IFieldControl<any>): boolean {
        return !item.isArray && !item.isRef;
    }

    public ifSubSchema(item: IFieldControl<any>): boolean {
        return !item.isArray && item.isRef;
    }

    public ifSimpleArray(item: IFieldControl<any>): boolean {
        return item.isArray && !item.isRef;
    }

    public ifSubSchemaArray(item: IFieldControl<any>): boolean {
        return item.isArray && item.isRef;
    }

    public isInvalidField(item: IFieldControl<any>): boolean {
        return this.previewValidation
            ? this.isPreviewMissingField(item)
            : this.showError(item);
    }

    public isPreviewMissingField(item: IFieldControl<any>): boolean {
        const value = item.control?.value;
        return this.previewMissingFieldIds.includes(item.id) && !item.control.disabled
            && (value === undefined || value === null || value === '');
    }

    public ifRequiredField(item: IFieldControl<any>): boolean {
        if (this.previewValidation && !item.control) {
            return item.required;
        }
        return item.required && !item.control.disabled;
    }

    public isRules(item: IFieldControl<any>) {
        return this.rules ? this.rules[item.fullPath] : undefined;
    }

    public ruleLine(item: IFieldControl<any>): { failed: boolean; text: string } | null {
        const rule = this.isRules(item);
        if (!rule) {
            return null;
        }
        const failed = rule.status === 'Failure' || rule.status === 'Error';
        if (!failed && rule.status !== 'Success') {
            return null;
        }
        const names = (rule.rules || [])
            .filter((r) => failed ? (r.status === 'Failure' || r.status === 'Error') : r.status === 'Success')
            .map((r) => r.name)
            .join(', ');
        return { failed, text: `${failed ? 'Rule check failed' : 'Rule check passed'}: ${names}` };
    }

    public isLoneField(index: number): boolean {
        const list = this.renderedControls;
        const item = list[index];
        if (!list || !item || this.isFullRow(item)) {
            return false;
        }
        return this.neighbourIsFullRow(list, index, -1) && this.neighbourIsFullRow(list, index, 1);
    }

    private neighbourIsFullRow(list: IFieldControl<any>[], from: number, step: number): boolean {
        for (let i = from + step; i >= 0 && i < list.length && i < this.previewRenderLimit; i += step) {
            if (list[i].visibility) {
                return this.isFullRow(list[i]);
            }
        }
        return true;
    }

    public isFullRow(item: IFieldControl<any>): boolean {
        if (item.isArray || item.isRef || this.isHelpText(item) || this.isRichText(item)) {
            return true;
        }
        const customType = item.customType || '';
        if (customType === 'table' || customType === 'geo' || customType === 'sentinel' || this.isIPFS(item)) {
            return true;
        }
        if (this.isEnum(item)) {
            return this.enumMode(item) === 'cards';
        }
        if (this.isGeoLocation(item) || this.isBoolean(item)) {
            return false;
        }
        return item.type === 'string' && !item.format;
    }

    public enumMode(item: IFieldControl<any>): 'seg' | 'cards' | 'select' {
        const values: any[] = Array.isArray(item.enumValues) ? item.enumValues : [];
        if (!values.length || values.length > 4) {
            return 'select';
        }
        const chars = values.reduce((sum, value) => sum + String(value ?? '').length, 0);
        return chars + 4 * values.length <= 30 ? 'seg' : 'cards';
    }

    public isSingleOption(item: IFieldControl<any>): boolean {
        return !!item.required && !!this.isEnum(item) && Array.isArray(item.enumValues) && item.enumValues.length === 1;
    }

    public isDefaultValue(item: IFieldControl<any>): boolean {
        return item.default !== undefined && !!item.control
            && item.control.value === item.default && !item.control.touched;
    }

    public setChoice(item: IFieldControl<any> | IFieldIndexControl<any>, value: any): void {
        const control = item.control;
        if (!control || control.disabled) {
            return;
        }
        control.setValue(value);
        control.markAsDirty();
        control.markAsTouched();
    }

    public showOptionalChip(item: IFieldControl<any>): boolean {
        return !item.required && !item.readonly && !this.isHelpText(item) && !this.isBoolean(item);
    }

    public isChosen(item: IFieldControl<any>): boolean {
        const value = item.control?.value;
        return value !== undefined && value !== null && value !== '';
    }

    public get errorsRevealed(): boolean {
        return !!this.formModel?.rootForm?.errorsRevealed;
    }

    public showLockRow(item: IFieldControl<any>): boolean {
        if (!item.readonly || !item.control) {
            return false;
        }
        const customType = item.customType || '';
        const value = item.control.value;
        return customType !== 'table' && customType !== 'richText' && !this.isBoolean(item)
            && !this.isGeoLocation(item) && this.isChosen(item) && typeof value !== 'object';
    }

    public copyValue(item: IFieldControl<any>): void {
        const value = item.control?.value;
        if (value !== undefined && value !== null && typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(String(value)).catch(() => { });
        }
    }

    public get showMetadata(): boolean {
        return !!this.formModel?.rootForm?.showMetadata;
    }

    public metaType(item: IFieldControl<any>): string {
        let base: string;
        if (item.isRef) {
            base = 'sub-schema';
        } else if (item.customType) {
            base = item.customType;
        } else {
            base = item.format ? `${item.type} · ${item.format}` : String(item.type || '');
        }
        if (item.isArray) {
            return `array · ${base}`;
        }
        return item.isRef ? `object · ${base}` : base;
    }

    public metaTags(item: IFieldControl<any>): { text: string; title?: string }[] {
        const tags: { text: string; title?: string }[] = [];
        const values: any[] = Array.isArray(item.enumValues) ? item.enumValues : [];
        if (values.length) {
            tags.push({
                text: `${values.length} allowed value${values.length === 1 ? '' : 's'}`,
                title: values.map((value) => String(value)).join(', ')
            });
        }
        if (item.unit) {
            tags.push({ text: `unit ${item.unit}` });
        }
        if (item.default !== undefined && item.default !== null && item.default !== '' && typeof item.default !== 'object') {
            tags.push({ text: `default ${item.default}` });
        }
        if (this.formModel?.isConditional(item)) {
            tags.push({ text: 'conditional' });
        }
        const formulas = this.getFieldFormulas(item).length;
        if (formulas) {
            tags.push({ text: `${formulas} formula${formulas === 1 ? '' : 's'}` });
        }
        if (this.rules?.[item.fullPath]) {
            tags.push({ text: 'schema rule' });
        }
        if (item.readonly) {
            tags.push({ text: 'read-only preset' });
        }
        return tags;
    }

    public metaPath(item: IFieldControl<any>): string {
        return this.formModel.metadataPath(item);
    }

    public copyPath(item: IFieldControl<any>): void {
        const path = this.metaPath(item);
        if (path && typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(path).catch(() => { });
        }
    }

    public requiredLeft(item: IFieldControl<any>): { left: number; total: number } {
        const { answered, total } = countRequired(item.model?.controls);
        return { left: total - answered, total };
    }

    public recordText(item: IFieldControl<any>, listItem: IFieldIndexControl<any>): { title: string; sub: string } {
        if (this.isManagedArray(item)) {
            return { title: this.entryTitle(item, listItem), sub: '' };
        }
        const values: string[] = [];
        for (const field of listItem.model?.controls || []) {
            const value = field.control?.value;
            if (field.isRef || field.isArray || value === null || value === undefined || value === '' || typeof value === 'object') {
                continue;
            }
            values.push(String(value));
            if (values.length === 4) {
                break;
            }
        }
        if (!values.length) {
            const geo = ['geo', 'sentinel'].includes(item.customType || '');
            return { title: geo ? `${item.description} #${listItem.index2}` : `New ${item.description}`, sub: geo ? '' : 'Not filled in yet' };
        }
        return { title: values[0], sub: values.slice(1).join(' · ') };
    }

    public toggleOpen(item: IFieldControl<any> | IFieldIndexControl<any>, open: boolean): void {
        item.open = open;
        this.preparePreviewSection(item);
    }

    public isRulesStatus(item: IFieldControl<any>) {
        return this.rules?.[item.fullPath]?.status;
    }

    public isGeoLocation(item: IFieldControl<any>): boolean {
        return isGeoCustomType(item.customType || '');
    }

    public getGeoOptions(item: IFieldControl<any>): GeoOption[] {
        return this.geoOptions.get(item.id) || [];
    }

    private setupGeoDependencies(): void {
        this.geoSubscriptions.unsubscribe();
        this.geoSubscriptions = new Subscription();
        this.geoOptions.clear();
        this.setupGeoGroups(this.formModel?.controls || []);
    }

    private setupGeoGroups(fields: IFieldControl<any>[]): void {
        const geoFields = fields.filter((field) =>
            !field.isArray && this.isGeoLocation(field)
        );
        const fieldsByName = new Map(
            geoFields.map((field) => [field.name, field])
        );
        const related = new Map(
            geoFields.map((field) => [field, new Set<IFieldControl<any>>()])
        );

        for (const field of geoFields) {
            if (field.dependency?.kind !== 'geo') {
                continue;
            }
            const parent = fieldsByName.get(field.dependency.on);
            if (parent) {
                related.get(field)?.add(parent);
                related.get(parent)?.add(field);
            }
        }

        const visited = new Set<IFieldControl<any>>();
        for (const field of geoFields) {
            if (visited.has(field)) {
                continue;
            }
            const group: IFieldControl<any>[] = [];
            const pending = [field];
            visited.add(field);
            while (pending.length) {
                const current = pending.pop();
                if (!current) {
                    continue;
                }
                group.push(current);
                for (const candidate of related.get(current) || []) {
                    if (!visited.has(candidate)) {
                        visited.add(candidate);
                        pending.push(candidate);
                    }
                }
            }
            this.setupGeoGroup(group);
        }
    }

    private setupGeoGroup(fields: IFieldControl<any>[]): void {
        const recompute = (changed: IFieldControl<any> | null) => {
            const input: GeoResolverField[] = fields.map((field) => ({
                name: field.name,
                type: field.customType as GeoType,
                value: field.control.value,
                dependency: field.dependency
            }));
            const result = resolveGeoDependencies(input, changed?.name || null);
            for (const field of fields) {
                const value = result.values[field.name];
                if (field.control.value !== value) {
                    field.control.setValue(value, { emitEvent: false });
                }
                this.geoOptions.set(field.id, result.options[field.name]);
                const errors = { ...(field.control.errors || {}) };
                delete errors[field.id];
                const error = result.errors[field.name];
                if (error) {
                    errors[field.id] = error;
                }
                field.control.setErrors(Object.keys(errors).length ? errors : null);
            }
            this.formModel.form.updateValueAndValidity({ emitEvent: false });
            this.changeDetectorRef.markForCheck();
        };

        recompute(null);
        for (const field of fields) {
            this.geoSubscriptions.add(
                field.control.valueChanges.subscribe(() => recompute(field))
            );
        }
    }

    public isInput(item: IFieldControl<any>): boolean {
        return (
            (
                item.type === 'string' ||
                item.type === 'number' ||
                item.type === 'integer' ||
                item.customType === 'geo' ||
                item.customType === 'sentinel'
            ) && (
                item.format !== 'date' &&
                item.format !== 'time' &&
                item.format !== 'date-time'
            ) && !item.remoteLink && !item.enum
            && item.customType !== 'table'
            && item.customType !== 'richText'
            && !this.isGeoLocation(item)
        );
    }

    public isRichText(item: IFieldControl<any>): boolean {
        return item.customType === 'richText';
    }

    public isHelpText(item: IFieldControl<any>): boolean {
        return item.type === 'null';
    }

    public isEnum(item: IFieldControl<any>) {
        return item.remoteLink || item.enum;
    }

    public isPrefix(item: IFieldControl<any>): boolean {
        return item.unitSystem === UnitSystem.Prefix;
    }

    public isPostfix(item: IFieldControl<any>): boolean {
        return item.unitSystem === UnitSystem.Postfix;
    }

    public isTime(item: IFieldControl<any>): boolean {
        return item.type === 'string' && item.format === 'time';
    }

    public isDate(item: IFieldControl<any>): boolean {
        return item.type === 'string' && item.format === 'date';
    }

    public isDateTime(item: IFieldControl<any>): boolean {
        return item.type === 'string' && item.format === 'date-time';
    }

    public isBoolean(item: IFieldControl<any>): boolean {
        return item.type === 'boolean';
    }

    public isIPFS(item: IFieldControl<any>): boolean {
        return item.pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+'
            || item.pattern === '^ipfs:\/\/.+';
    }

    public isFile(item: IFieldControl<any>): boolean {
        return item.customType === 'file';
    }

    public suggestIsObject(item: any): boolean {
        return typeof item === 'object';
    }

    public parseSuggest(item: any): string {
        return this.findString(item);
    }

    public suggestPopoverValue = '';

    private suggestHideTimer: any = null;

    public onSuggestEnter(event: Event, item: IFieldControl<any>, popover: any): void {
        if (!this.isRichText(item)) {
            return;
        }
        this.clearSuggestHideTimer();
        this.suggestPopoverValue = withNewTabLinks(
            markdownToHtml(typeof item.suggest === 'string' ? item.suggest : '')
        );
        if (this.suggestPopoverValue) {
            popover.show(event);
        }
    }

    public onSuggestLeave(popover: any): void {
        if (!this.suggestPopoverValue) {
            return;
        }
        this.clearSuggestHideTimer();
        this.suggestHideTimer = setTimeout(() => {
            this.suggestHideTimer = null;
            popover.hide();
        }, 250);
    }

    public onSuggestPopoverEnter(): void {
        this.clearSuggestHideTimer();
    }

    private clearSuggestHideTimer(): void {
        if (this.suggestHideTimer) {
            clearTimeout(this.suggestHideTimer);
            this.suggestHideTimer = null;
        }
    }

    @ViewChildren(SchemaFormComponent) public childForms?: QueryList<SchemaFormComponent>;

    private findString(item: any): string {
        if (typeof item === 'object') {
            return this.findString(Object.values(item)[0]);
        } else {
            return item as string;
        }
    }

    public isEmpty(value: any): boolean {
        if (Array.isArray(value)) {
            return !value.some(item => !this.isEmpty(item));
        }
        return [undefined, null, ''].includes(value);
    }

    public isEmptyRef(value: any, field: SchemaField): boolean {
        if (value === undefined || value === null) {
            return true;
        }
        if (Array.isArray(value)) {
            return !value.some(item => !this.isEmptyRef(item, field));
        }
        if (field.customType === 'geo') {
            return Object.keys(value).length === 0;
        }
        if (field.customType === 'sentinel') {
            return JSON.stringify(value) === '{"layers":"NATURAL-COLOR","format":"image/jpeg","maxcc":null,"width":null,"height":null,"bbox":"","time":null}';
        }
        if (field.fields) {
            for (const _field of field.fields) {
                if (_field.isRef && !this.isEmptyRef(value[_field.name], _field)) {
                    return false;
                }
                if (!_field.isRef && !this.isEmpty(value[_field.name])) {
                    return false;
                }
            }
        }
        return true;
    }

    public uploadFile(
        item: IFieldControl<any>,
        listItem: IFieldControl<any> | IFieldIndexControl<any>,
        isFile: boolean
    ): void {
        const input = document.createElement('input');
        const control = listItem.control;

        input.type = 'file';
        input.accept = isFile ? FILE_EXTENSIONS : 'image/*';
        input.onchange = (event) => {
            const file = input.files ? input.files[0] : undefined;
            if (!file) {
                return;
            }
            listItem.fileUploading = true;

            let addFileObs;
            if (this.dryRun && this.policyId) {
                addFileObs = this.ipfs.addFileDryRun(file, this.policyId)
            } else {
                addFileObs = this.ipfs.addFile(file)
            }
            addFileObs
                .subscribe((res) => {
                    if (item.pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+') {
                        control.patchValue(API_IPFS_GATEWAY_URL + res);
                    } else {
                        control.patchValue(IPFS_SCHEMA + res);
                    }
                    control.markAsTouched();
                    listItem.fileUploading = false;
                }, (error) => {
                    listItem.fileUploading = false;
                });

            input.remove();
        }
        input.click();
    }

    public uploadRichTextImage = async (file: File): Promise<string> => {
        const request = this.dryRun && this.policyId
            ? this.ipfs.addFileDryRun(file, this.policyId)
            : this.ipfs.addFile(file);
        const cid = await firstValueFrom(request);
        return `ipfs://${cid}`;
    };

    public resolveRichTextImage = (reference: string): Promise<string> =>
        this.ipfs.getImageWithDryRunFallback(reference, !!(this.dryRun && this.policyId));


    public showError(item: IFieldControl<any>, listItem?: IFieldIndexControl<any>): boolean {
        return showError(item, !!this.formModel?.rootForm?.errorsRevealed, listItem);
    }

    public getErrorMessage(item: IFieldControl<any>, listItem?: IFieldIndexControl<any>): string {
        return getErrorMessage(item, listItem);
    }

    public getPlaceholderByFieldType(item: IFieldControl<any>): string {
        const type = item.format || item.type;
        const pattern = item.pattern;
        const customType = item.customType;
        if (customType) {
            switch (customType) {
                case 'hederaAccount':
                    return PlaceholderByFieldType.HederaAccount;
                case 'richText':
                    return PlaceholderByFieldType.String;
                default:
                    return "";
            }
        }
        switch (type) {
            case 'email':
                return PlaceholderByFieldType.Email;
            case 'number':
                return PlaceholderByFieldType.Number;
            case 'duration':
                return PlaceholderByFieldType.Duration;
            case 'integer':
                return PlaceholderByFieldType.Number;
            case 'url':
                if (pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+') {
                    return PlaceholderByFieldType.IPFS;
                }
                return PlaceholderByFieldType.URL;
            case 'uri':
                return PlaceholderByFieldType.URI;
            case 'string':
                return PlaceholderByFieldType.String;
            default:
                return "";
        }
    }

    public onFocusField(formatType: string, item: IFieldControl<any> | IFieldIndexControl<any>) {
        if (this.isFormForRequestBlock
            && formatType === 'url'
            && !item.control.value
        ) {
            item.control.setValue(PresetPrefixByFieldType.URL);
        }
    }

    public onUnfocusField(formatType: string, item: IFieldControl<any> | IFieldIndexControl<any>) {
        if (this.isFormForRequestBlock
            && formatType === 'url'
            && item.control.value === PresetPrefixByFieldType.URL
        ) {
            item.control.setValue('');
        }
    }

    public closeWindow() {
        window.close();
    }

    public onCancelBtnClick() {
        this.cancelBtnEvent.emit(false);
    }

    public onSubmitBtnClick(fields: IFieldControl<any>[] | undefined | null) {
        this.submitBtnEvent.emit(fields);
    }

    public onSaveBtnClick(fields: IFieldControl<any>[] | undefined | null) {
        this.saveBtnEvent.emit(fields);
    }

    public onUpdatableBtnEvent() {
        this.updatableBtnEvent.emit()
    }

    private updateRemoteFiles(item: IFieldControl<any>) {
        if (item.remoteLink && item.fileUploading === true) {
            this.ipfs
                .loadJsonFileByLink(item.remoteLink)
                .pipe(takeUntil(this.destroy$))
                .subscribe((res: any) => {
                    item.enumValues = res?.enum;
                    item.fileUploading = false;
                }, (error) => {
                    item.fileUploading = false;
                    console.error(error);
                })
        }
    }

}
