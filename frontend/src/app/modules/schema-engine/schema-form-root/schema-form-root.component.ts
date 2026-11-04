import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Optional, Output, SimpleChanges, ViewChild } from '@angular/core';
import { SchemaFormComponent } from '../schema-form/schema-form.component';
import { AbstractControl, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaField, SchemaRuleValidateResult } from '@guardian/interfaces';
import { equalsLoosely, FieldForm, IFieldControl } from '../schema-form-model/field-form';
import { Subscription, audit, timer } from 'rxjs';
import { FormulasTree } from 'src/app/modules/formulas/models/formula-tree';
import { FormFormulas, IFormulaLinkScope } from 'src/app/modules/formulas/models/form-formulas';
import { getErrorMessage } from '../schema-form/schema-form-errors';
import { IFormTarget, isRefLeaf, walkFields } from '../schema-form/schema-form-walk';
import { IFormCompletion, ISectionCompletion, computeCompletion, isAnswered } from '../schema-form/schema-form-completion';
import { BooleanProperty } from '../../policy-engine/structures/storage/boolean-prop';
import { SchemaFormPreferencesService } from '../../../services/schema-form-preferences.service';
import { IFormSection, buildSections, promotedRootName } from './schema-form-sections';

/**
 * Form built by schema
 */
export interface IFormIssue {
    path: string;
    label: string;
    message: string;
    /** Title of the section that holds the field; absent on a single page. */
    section?: string;
}

export type SchemaFormLayout = 'sections' | 'single';

const RAIL_HIDDEN_KEY = 'SCHEMA_FORM_RAIL_HIDDEN';

function sameSections(a: IFormSection[], b: IFormSection[]): boolean {
    return a.length === b.length && a.every((item, index) => {
        const other = b[index];
        return item.id === other.id
            && item.title === other.title
            && item.owner === other.owner
            && item.controls.length === other.controls.length
            && item.controls.every((control, i) => control === other.controls[i]);
    });
}

function sameCompletion(a: IFormCompletion | null, b: IFormCompletion): boolean {
    return !!a && a.answered === b.answered && a.total === b.total
        && a.sections.length === b.sections.length
        && a.sections.every((item, index) => {
            const other = b.sections[index];
            return item.id === other.id && item.title === other.title && item.answered === other.answered
                && item.total === other.total && item.hasErrors === other.hasErrors;
        });
}

@Component({
    selector: 'app-schema-form-root',
    templateUrl: './schema-form-root.component.html',
    styleUrls: ['./schema-form-root.component.scss'],
    standalone: false
})
export class SchemaFormRootComponent implements OnInit, AfterViewInit {
    public group: UntypedFormGroup;
    public model: FieldForm | null;
    public loading: boolean = true;
    public sections: IFormSection[] = [];
    public completion: IFormCompletion | null = null;
    public screen: 'overview' | 'section' = 'overview';
    public activeIndex = 0;
    public drawerOpen = false;
    public promotedName: string | null = null;
    public readonly bigRingRadius = 42;
    public readonly bigRingLength = 2 * Math.PI * this.bigRingRadius;
    public readonly cardRingRadius = 10;
    public readonly cardRingLength = 2 * Math.PI * this.cardRingRadius;
    private readonly railHiddenProp = new BooleanProperty(RAIL_HIDDEN_KEY, false);
    public formulaModel: FormFormulas | null = null;
    private formulaSub?: Subscription;
    private controlsSub?: Subscription;
    private completionSub?: Subscription;

    private railElement: HTMLElement | null = null;
    private railScrollParent: HTMLElement | null = null;
    private railResizeObserver: ResizeObserver | null = null;

    @ViewChild('childForm') private childForm?: SchemaFormComponent;
    @ViewChild('railContainer') set railContainer(ref: ElementRef<HTMLElement> | undefined) {
        const element = ref?.nativeElement ?? null;
        if (element === this.railElement) return;
        this.railElement = element;
        this.setupRailHeightSync();
    }
    @ViewChild('contentContainer') contentContainerRef?: ElementRef;

    @Input('schema') schema: Schema;
    @Input('fields') fields: SchemaField[];
    @Input('conditions') conditions: any = null;

    @Input('private-fields') hide: { [x: string]: boolean };
    @Input('readonly-fields') readonly: any;
    @Input('delimiter-hide') delimiterHide: boolean = false;
    @Input('preset') presetDocument: any = null;
    @Input('example') example: boolean = false;
    @Input() cancelText: string = 'Cancel';
    @Input() saveText: string = 'Save';
    @Input() submitText: string = 'Submit';
    @Input() cancelHidden: boolean = false;
    @Input() submitHidden: boolean = false;
    @Input() saveShown: boolean = false;
    @Input() showButtons: boolean = true;
    @Input() isChildSchema: boolean = false;
    @Input() comesFromDialog: boolean = false;
    @Input() dryRun: boolean = false;
    @Input() likeDryRun: boolean = false;
    @Input() policyId: string = '';
    @Input() blockId: string = '';
    @Input() rules: SchemaRuleValidateResult;
    @Input() layout: SchemaFormLayout = 'sections';
    @Input() overviewHint: string | null = null;
    @Input() isFormForFinishSetup: boolean = false;
    @Input() isFormForRequestBlock: boolean = false;
    @Input() lastSavedAt?: Date;
    @Input() isEditMode: boolean = false;
    @Input() formulas: FormulasTree | null = null;
    @Input() requiredFields: string[] | null = null;
    @Input() previewMissingFields: string[] = [];
    @Input() previewActionsDisabled: boolean = false;
    @Input() formulaLinkScope: IFormulaLinkScope | null = null;
    private previewFocusTimer: ReturnType<typeof setTimeout> | null = null;
    private previewBuildFrame: number | null = null;
    private previewHeightLocked: boolean = false;
    public previewLoadingCount: number = 0;
    @Output() previewBusyChange = new EventEmitter<boolean>(true);

    public get isPreviewBusy(): boolean {
        return this.requiredFields !== null && (this.loading || this.previewLoadingCount > 0);
    }

    public get isPreviewLocked(): boolean {
        return this.previewActionsDisabled || this.isPreviewBusy;
    }

    public onPreviewLoadingChange(loading: boolean): void {
        if (this.requiredFields === null) return;
        this.previewLoadingCount = Math.max(0, this.previewLoadingCount + (loading ? 1 : -1));
        this.previewBusyChange.emit(this.isPreviewBusy);
        this.changeDetectorRef.markForCheck();
    }

    @Output('form') form = new EventEmitter<UntypedFormGroup>();
    @Output('presetApplied') presetApplied = new EventEmitter<UntypedFormGroup>();
    @Output() completionChange = new EventEmitter<IFormCompletion>(true);
    @Output('change') change = new EventEmitter<Schema | null>();
    @Output('destroy') destroy = new EventEmitter<void>();
    @Output('buttons') buttons = new EventEmitter<any>();
    @Output() cancelBtnEvent = new EventEmitter<boolean>();
    @Output() submitBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();
    @Output() saveBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();
    @Output() updatableBtnEvent = new EventEmitter();

    constructor(
        private fb: UntypedFormBuilder,
        protected changeDetectorRef: ChangeDetectorRef,
        @Optional() private preferences?: SchemaFormPreferencesService
    ) {
        this.group = this.fb.group({});
        this.model = null;
        this.railHiddenProp.load();
        this.preferences?.reload();
        this.showMetadata = !!this.preferences?.showFieldMetadata;
        this.metadataSub = this.preferences?.showFieldMetadata$.subscribe((value) => {
            this.showMetadata = value;
            if (this.model) {
                this.model.showMetadata = value;
                this.changeDetectorRef.markForCheck();
            }
        });
    }

    public get railHidden(): boolean {
        return this.railHiddenProp.value;
    }

    public get hasSections(): boolean {
        return this.layout === 'sections' && this.sections.length > 0;
    }

    public get activeSection(): IFormSection | null {
        return this.hasSections ? this.sections[this.activeIndex] ?? null : null;
    }

    public get formOwner(): FieldForm | null {
        return this.activeSection?.owner ?? this.model;
    }

    public get formControls(): IFieldControl<any>[] | null {
        return this.activeSection?.controls ?? null;
    }

    public get showChildForm(): boolean {
        return !this.hasSections || this.screen === 'section';
    }

    public get schemaName(): string {
        return this.schema?.name || this.schema?.description || '';
    }

    ngOnInit(): void {
    }

    ngAfterViewChecked(): void {
        const container: HTMLElement | undefined = this.contentContainerRef?.nativeElement;
        if (!container) return;
        if (this.isPreviewLocked) {
            if (!this.previewHeightLocked) {
                container.style.minHeight = `${container.offsetHeight}px`;
                this.previewHeightLocked = true;
            }
        } else if (this.previewHeightLocked) {
            container.style.minHeight = '';
            this.previewHeightLocked = false;
        }
    }

    ngAfterViewInit(): void {
    }

    // The rail is sticky inside the host's scroll container, whose height depends on the dialog
    // size and the banners shown above the form. Sync the rail height to that container.
    private setupRailHeightSync(): void {
        this.railResizeObserver?.disconnect();
        this.railResizeObserver = null;
        this.railScrollParent = null;
        if (!this.railElement) {
            return;
        }
        this.railScrollParent = this.getScrollParent(this.railElement);
        if (!this.railScrollParent) {
            return;
        }
        this.railResizeObserver = new ResizeObserver(() => this.updateRailHeight());
        this.railResizeObserver.observe(this.railScrollParent);
        this.updateRailHeight();
    }

    private updateRailHeight(): void {
        if (!this.railElement || !this.railScrollParent) {
            return;
        }
        // The rail fills the visible height of the scroll area, however short the section is
        const style = getComputedStyle(this.railScrollParent);
        const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
        const height = `${Math.max(0, this.railScrollParent.clientHeight - padding)}px`;
        this.railElement.style.maxHeight = height;
        this.railElement.style.minHeight = height;
    }

    private getScrollParent(element: HTMLElement): HTMLElement | null {
        let node: HTMLElement | null = element.parentElement;
        while (node) {
            const overflowY = getComputedStyle(node).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.formulas && this.model) {
            this.buildFormulaModel();
        }
        if (changes.requiredFields && this.requiredFields === null) {
            this.previewLoadingCount = 0;
            if (!changes.requiredFields.firstChange && changes.requiredFields.previousValue !== null) this.previewBusyChange.emit(false);
        }
        if (changes.schema && !changes.schema.firstChange) {
            this.screen = 'overview';
            this.activeIndex = 0;
            this.drawerOpen = false;
        }
        if (this.model && !changes.schema && !changes.fields && !changes.hide && !changes.readonly
            && !changes.conditions && !changes.presetDocument && !changes.requiredFields) {
            if (changes.layout) {
                this.recompute();
            }
            if (changes.cancelText || changes.saveText || changes.submitText || changes.saveShown
                || changes.cancelHidden || changes.submitHidden || changes.isEditMode) {
                this.emitButtons();
            }
        }
        this.loading = true;
        const requiredChanged = !!changes.requiredFields
            && !(!changes.requiredFields.firstChange && this.model?.hasSameRequiredFields(this.requiredFields));
        if (changes.previewMissingFields && !requiredChanged) {
            this.updatePreviewMissingFieldIds();
            this.schedulePreviewFocus();
        }
        if (changes.presetDocument) {
            this.userPreset = !!this.presetDocument;
        }
        if (requiredChanged && !changes.requiredFields.firstChange && this.requiredFields !== null
            && this.model && !changes.schema && !changes.fields && !changes.hide
            && !changes.readonly && !changes.conditions && !changes.presetDocument
            && this.model.updatePreviewRequiredFields(this.requiredFields)) {
            this.updatePreviewMissingFieldIds();
            this.loading = this.previewBuildFrame !== null;
            this.schedulePreviewFocus();
            return;
        }
        let keepDirty = false;
        const dirtyPaths: string[][] = [];
        const touchedPaths: string[][] = [];
        if (requiredChanged && !changes.requiredFields.firstChange && this.model && !changes.presetDocument
            && this.previewBuildFrame === null) {
            keepDirty = this.group.dirty;
            const collectDirty = (control: AbstractControl, path: string[]): void => {
                if (control.dirty && path.length) {
                    dirtyPaths.push(path);
                }
                if (control.touched && path.length) {
                    touchedPaths.push(path);
                }
                if (control instanceof UntypedFormGroup || control instanceof UntypedFormArray) {
                    for (const [key, child] of Object.entries(control.controls)) {
                        collectDirty(child, [...path, key]);
                    }
                }
            };
            collectDirty(this.group, []);
            this.presetDocument = this.withoutEmptyCollections(this.group.getRawValue());
        }
        const presetApplied = !!changes.presetDocument && !changes.presetDocument.firstChange;
        if (
            changes.schema ||
            changes.fields ||
            changes.hide ||
            changes.readonly ||
            changes.conditions ||
            changes.presetDocument ||
            requiredChanged
        ) {
            const rebuild = () => {
                this.buildFields();
                for (const path of dirtyPaths) {
                    this.group.get(path)?.markAsDirty();
                }
                for (const path of touchedPaths) {
                    this.group.get(path)?.markAsTouched();
                }
                if (keepDirty) {
                    this.group.markAsDirty();
                }
                if (presetApplied) {
                    this.presetApplied.emit(this.group);
                }
                const finish = () => {
                    this.loading = false;
                    this.emitButtons();
                    if (this.requiredFields !== null) this.previewBusyChange.emit(this.isPreviewBusy);
                    this.schedulePreviewFocus();
                };
                if (this.requiredFields !== null) {
                    this.changeDetectorRef.detectChanges();
                    this.previewBuildFrame = requestAnimationFrame(() => {
                        this.previewBuildFrame = null;
                        finish();
                        this.changeDetectorRef.markForCheck();
                    });
                } else setTimeout(finish, 0);
            };
            if (this.previewBuildFrame !== null) {
                cancelAnimationFrame(this.previewBuildFrame);
                this.previewBuildFrame = null;
            }
            if (this.requiredFields !== null) {
                this.previewBusyChange.emit(true);
                this.previewBuildFrame = requestAnimationFrame(() => {
                    this.previewBuildFrame = requestAnimationFrame(rebuild);
                });
            } else setTimeout(rebuild, 0);
        } else {
            this.loading = this.previewBuildFrame !== null;
        }
    }

    ngOnDestroy() {
        if (this.isPreviewBusy) this.previewBusyChange.emit(false);
        if (this.previewBuildFrame !== null) cancelAnimationFrame(this.previewBuildFrame);
        if (this.previewFocusTimer !== null) clearTimeout(this.previewFocusTimer);
        this.formulaSub?.unsubscribe();
        this.controlsSub?.unsubscribe();
        this.completionSub?.unsubscribe();
        this.metadataSub?.unsubscribe();
        if (this.model) {
            this.model.destroy();
        }
        this.railResizeObserver?.disconnect();
        this.railResizeObserver = null;
    }

    private buildFields() {
        this.controlsSub?.unsubscribe();
        if (this.model) {
            this.model.destroy();
            this.model = null;
        }
        this.group = this.fb.group({});
        this.model = new FieldForm(this.group, 0, this.likeDryRun || this.dryRun);
        this.model.setData({
            preset: this.presetDocument,
            privateFields: this.hide,
            readonlyFields: this.readonly,
            schema: this.schema,
            fields: this.fields,
            conditions: this.conditions,
            requiredFields: this.requiredFields,
            keepDefaultLabels: !this.userPreset,
        });
        this.model.errorsRevealed = this.errorsRevealed;
        this.model.showMetadata = this.showMetadata;
        this.model.build();
        this.updatePreviewMissingFieldIds();
        this.controlsSub = this.model.controlsChanged$.subscribe(() => {
            this.recompute();
            this.changeDetectorRef.detectChanges();
        });
        this.completionSub?.unsubscribe();
        this.completionSub = this.group.statusChanges
            .pipe(audit(() => timer(300)))
            .subscribe(() => {
                this.recompute();
                this.changeDetectorRef.markForCheck();
            });
        this.group.updateValueAndValidity();
        this.buildFormulaModel();
        this.recompute();
        this.form.emit(this.group);
    }

    private buildFormulaModel() {
        this.formulaSub?.unsubscribe();
        this.formulaSub = undefined;
        if (!this.formulas || !this.schema?.iri || !this.group) {
            this.formulaModel = null;
            return;
        }
        const formulaModel = new FormFormulas(this.formulas, this.schema.iri, equalsLoosely, this.formulaLinkScope);
        formulaModel.setData(this.group.getRawValue());
        if (formulaModel.hasConditions) {
            this.formulaSub = this.group.valueChanges.subscribe(() => {
                formulaModel.setData(this.group.getRawValue());
            });
        }
        this.formulaModel = formulaModel;
    }

    public onChange($event: Schema | null) {
        this.recompute();
        this.change.emit($event);
    }

    public onSaveBtnEvent($event: boolean | IFieldControl<any>[] | undefined | null) {
        this.saveBtnEvent.emit($event);
    }
    public onSubmitBtnEvent($event: boolean | IFieldControl<any>[] | undefined | null) {
        this.submitBtnEvent.emit($event);
    }
    public onCancelBtnEvent($event: boolean) {
        this.cancelBtnEvent.emit($event);
    }
    public onButtons($event: any) {
        // The form builds its list for its own inner footer. The footer list is built here, so it
        // survives the form being replaced when the screen changes; only the edit button passes.
        if (!Array.isArray($event)) {
            this.editButtonConfig = $event;
            this.buttons.emit($event);
        }
    }
    public onDestroy($event: void) {
        this.destroy.emit($event);
    }

    public onUpdatableBtnEvent() {
        this.updatableBtnEvent.emit()
    }

    public preset(data: any) {
        this.presetDocument = data;
        this.userPreset = !!data;
        this.buildFields();
        this.changeDetectorRef.detectChanges();
    }

    private isPlainObject(value: unknown): value is Record<string, unknown> {
        return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
    }

    private hasNoValue(value: unknown): boolean {
        if (value === null || value === undefined || value === '') {
            return true;
        }
        if (Array.isArray(value)) {
            return value.every((entry) => this.hasNoValue(entry));
        }
        if (this.isPlainObject(value)) {
            return Object.values(value).every((entry) => this.hasNoValue(entry));
        }
        return false;
    }

    private withoutEmptyCollections(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map((entry) => this.withoutEmptyCollections(entry));
        }
        if (!this.isPlainObject(value)) {
            return value;
        }
        const result: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value)) {
            if ((Array.isArray(entry) || this.isPlainObject(entry)) && this.hasNoValue(entry)) {
                continue;
            }
            result[key] = this.withoutEmptyCollections(entry);
        }
        return result;
    }

    private userPreset = false;

    public errorsRevealed = false;
    public showMetadata = false;
    private metadataSub?: Subscription;

    public previewMissingFieldIds: string[] = [];

    private updatePreviewMissingFieldIds(): void {
        this.previewMissingFieldIds = this.previewMissingFields.flatMap(path => {
            const parts = path.split('.');
            let controls = this.model?.controls || [];
            for (let index = 0; index < parts.length; index++) {
                const field = controls.find(item => item.name === parts[index]);
                if (!field) return [];
                if (index === parts.length - 1) {
                    return [field.id];
                }
                if (field.isArray && /^\d+$/.test(parts[index + 1] || '')) {
                    const row = field.list?.[Number(parts[++index])];
                    controls = row?.model?.controls || [];
                } else {
                    controls = field.model?.controls || [];
                }
            }
            return [];
        });
    }

    private schedulePreviewFocus(): void {
        if (this.previewFocusTimer !== null) clearTimeout(this.previewFocusTimer);
        if (!this.previewMissingFields.length) return;
        this.previewFocusTimer = setTimeout(() => {
            this.previewFocusTimer = null;
            this.focusField(this.previewMissingFields[0]);
        }, 0);
    }

    public focusField(path: string): void {
        const parts = path.split('.');
        let controls = this.model?.controls || [];
        let targetId: string | undefined;
        for (let index = 0; index < parts.length; index++) {
            const field = controls.find(item => item.name === parts[index]);
            if (!field) break;
            field.open = true;
            targetId = field.id;
            if (field.isArray && /^\d+$/.test(parts[index + 1] || '')) {
                const row = field.list?.[Number(parts[++index])];
                if (!row) break;
                row.open = true;
                targetId = row.id;
                controls = row.model?.controls || [];
            } else controls = field.model?.controls || [];
        }
        const sectionIndex = this.sectionIndexOf(path);
        if (this.hasSections && sectionIndex >= 0 && (this.screen !== 'section' || this.activeIndex !== sectionIndex)) {
            this.switchScreen(() => {
                this.screen = 'section';
                this.activeIndex = sectionIndex;
            });
        }
        this.changeDetectorRef.detectChanges();
        this.childForm?.prepareOpenPreviewSections?.();
        this.changeDetectorRef.detectChanges();
        this.scrollToPreviewField(targetId, 20);
    }

    private findFieldElement(targetId: string | undefined): HTMLElement | null {
        if (!targetId) return null;
        const container: HTMLElement | undefined = this.contentContainerRef?.nativeElement;
        return container?.querySelector<HTMLElement>(`[data-field-id="${CSS.escape(targetId)}"]`) ?? null;
    }

    private scrollToPreviewField(targetId: string | undefined, attempts: number): void {
        const target = this.findFieldElement(targetId);
        if (!target || this.isPreviewLocked) {
            if (targetId && attempts > 0) {
                this.previewFocusTimer = setTimeout(() => {
                    this.previewFocusTimer = null;
                    this.scrollToPreviewField(targetId, this.isPreviewLocked ? attempts : attempts - 1);
                }, 50);
            }
            return;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = 'input,select,textarea,button,[tabindex]';
        // A simple field keeps its id on the label row, so its input is in the sibling value block.
        // Rows and cells hold their own inputs: search only inside them, never the whole array.
        const scope = target.classList.contains('sf-label') ? target.closest('.form-field') : target;
        scope?.querySelector<HTMLElement>(focusable)?.focus({ preventScroll: true });
        this.keepPreviewFieldInView(targetId, 5);
    }

    private keepPreviewFieldInView(targetId: string | undefined, attempts: number): void {
        this.previewFocusTimer = setTimeout(() => {
            this.previewFocusTimer = null;
            const target = this.findFieldElement(targetId);
            if (!target) return;
            const rect = target.getBoundingClientRect();
            if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
            target.scrollIntoView({ block: 'center' });
            if (attempts > 1) this.keepPreviewFieldInView(targetId, attempts - 1);
        }, 300);
    }

    public getIssues(targets: IFormTarget[] = walkFields(this.model?.controls)): IFormIssue[] {
        const issues: IFormIssue[] = [];
        const withInvalidRows = new Set<object>();
        for (const target of targets) {
            if (target.row && target.control?.invalid && !target.control.disabled) {
                withInvalidRows.add(target.field);
            }
        }
        for (const { path, labels, field, row, control, hidden } of targets) {
            if (hidden || !control || !control.invalid) {
                continue;
            }
            if (!row && field.isRef && !field.isArray && !isRefLeaf(control)) {
                continue;
            }
            if (!row && field.isArray && withInvalidRows.has(field)) {
                continue;
            }
            if (row && field.isRef && !isRefLeaf(control)) {
                continue;
            }
            const section = this.sectionTitleOf(path);
            issues.push({ path, label: labels.join(' / '), message: getErrorMessage(field, row), ...(section ? { section } : {}) });
        }
        return issues;
    }

    public revealErrors(focus = true): void {
        this.errorsRevealed = true;
        if (this.model) {
            this.model.errorsRevealed = true;
        }
        this.recompute();
        this.changeDetectorRef.detectChanges();
        if (focus) {
            const first = this.getIssues()[0];
            if (first) {
                this.focusField(first.path);
            }
        }
    }

    /** Title of the section that holds the field at a dot path; undefined on a single page. */
    public sectionTitleOf(path: string): string | undefined {
        return this.sections[this.sectionIndexOf(path)]?.title;
    }

    /**
     * Index of the section that holds the field at a dot path, -1 on a single page. With a
     * promoted root sub-schema every path starts with the root's name, which is skipped.
     */
    private sectionIndexOf(path: string): number {
        if (!this.sections.length) {
            return -1;
        }
        const parts = path.split('.');
        if (this.sections[0].owner !== this.model) {
            parts.shift();
        }
        return this.sections.findIndex(section => section.controls.some(item => item.name === parts[0]));
    }

    /**
     * Moves to the first required answer that is still missing, starting at the current section
     * and wrapping, so it matches the progress counter. False when nothing is missing.
     */
    public focusNextMissing(): boolean {
        const missing = walkFields(this.model?.controls)
            .filter(target => target.requiredUnit && !target.row && !isAnswered(target));
        if (!missing.length) {
            return false;
        }
        const start = this.hasSections && this.screen === 'section' ? this.activeIndex : 0;
        const indexOf = (path: string) => Math.max(0, this.sectionIndexOf(path));
        const next = missing.find(target => indexOf(target.path) >= start) ?? missing[0];
        this.focusField(next.path);
        return true;
    }

    /** Sub-schemas and array rows inside the sub-schema of the active section, for Expand/Collapse all. */
    public nestedCards: { open: boolean }[] = [];
    /** The direct sub-schema cards inside the active section, listed under it in the rail. */
    public activeCards: IFieldControl<any>[] = [];

    private updateNestedCards(): void {
        const found: { open: boolean }[] = [];
        const collect = (item: IFieldControl<any>): void => {
            for (const row of item.list || []) {
                found.push(row);
                (row.model?.controls || []).forEach(visit);
            }
            (item.model?.controls || []).forEach(visit);
        };
        const visit = (item: IFieldControl<any>): void => {
            if (item.visibility === false || !item.isRef) return;
            found.push(item);
            collect(item);
        };
        for (const item of this.activeSection?.controls ?? []) {
            if (item.visibility !== false && item.isRef) collect(item);
        }
        this.nestedCards = found;
        const cards: IFieldControl<any>[] = [];
        for (const item of this.activeSection?.controls ?? []) {
            if (item.visibility !== false && item.isRef) {
                cards.push(...(item.model?.controls || []).filter((child: IFieldControl<any>) => child.isRef && child.visibility !== false));
            }
        }
        const same = cards.length === this.activeCards.length && cards.every((card, index) => card === this.activeCards[index]);
        if (!same) this.activeCards = cards;
    }

    public setAllOpen(open: boolean): void {
        for (const card of this.nestedCards) {
            card.open = open;
        }
        this.changeDetectorRef.detectChanges();
        this.childForm?.prepareOpenPreviewSections?.();
        this.changeDetectorRef.detectChanges();
    }

    private recompute(): void {
        const model = this.model;
        if (!model) {
            this.sections = [];
            this.completion = null;
            this.nestedCards = [];
            this.activeCards = [];
            this.promotedName = null;
            return;
        }
        const sections = this.layout === 'sections' ? buildSections(model) : [];
        if (!sameSections(sections, this.sections)) {
            const title = this.sections[this.activeIndex]?.title;
            this.sections = sections;
            const kept = title ? sections.findIndex(item => item.title === title) : -1;
            this.activeIndex = kept >= 0 ? kept : Math.min(this.activeIndex, Math.max(0, sections.length - 1));
            if (!sections.length) {
                this.screen = 'overview';
                this.drawerOpen = false;
            }
        }
        this.updateNestedCards();
        this.promotedName = sections.length ? promotedRootName(model) : null;
        const completion = computeCompletion(model.controls, sections);
        if (!sameCompletion(this.completion, completion)) {
            this.completion = completion;
            this.completionChange.emit(completion);
        }
    }

    /** The footer list: cancel, previous/next section, submit and save, owned by this root. */
    private buildButtons(): any[] {
        const shown = () => !!this.model?.controls && !this.isChildSchema;
        return [{
            id: 'cancel',
            visible: () => shown() && !this.cancelHidden,
            disabled: () => false,
            text: this.cancelText,
            class: 'p-button-outlined',
            type: 'ghost',
            fn: () => this.cancelBtnEvent.emit(false)
        }, {
            id: 'prev',
            visible: () => shown() && this.hasSections && this.screen === 'section' && this.activeIndex > 0,
            disabled: () => false,
            text: 'Previous',
            class: 'p-button-outlined',
            type: 'secondary',
            fn: () => this.openSection(this.activeIndex - 1)
        }, {
            id: 'next',
            visible: () => shown() && this.hasSections && this.screen === 'section'
                && this.activeIndex < this.sections.length - 1,
            disabled: () => false,
            text: 'Next',
            class: 'p-button-outlined',
            type: 'secondary',
            fn: () => this.openSection(this.activeIndex + 1)
        }, {
            id: 'save',
            visible: () => this.saveShown,
            disabled: () => false,
            text: this.saveText,
            class: 'p-button-outlined',
            type: 'secondary',
            fn: () => this.saveBtnEvent.emit(this.model?.controls)
        }, {
            id: 'submit',
            visible: () => shown() && !this.submitHidden,
            disabled: () => false,
            text: this.submitText,
            class: 'p-button',
            type: 'primary',
            fn: () => this.submitBtnEvent.emit(this.model?.controls)
        }];
    }

    private emitButtons(): void {
        if (this.model && !this.isEditMode) {
            this.buttons.emit(this.buildButtons());
        }
    }

    private editButtonConfig?: { text: string; disabled: () => boolean };

    public openOverview(): void {
        this.switchScreen(() => {
            this.screen = 'overview';
        });
        this.scrollToTop();
    }

    public openSection(index: number): void {
        if (index < 0 || index >= this.sections.length) {
            return;
        }
        this.switchScreen(() => {
            this.screen = 'section';
            this.activeIndex = index;
        });
        this.childForm?.prepareOpenPreviewSections?.();
        this.scrollToTop();
    }

    /**
     * Changes what the form draws and renders it at once. In Preview the form draws a section with
     * loading counts that change while it is created, so the loading overlay is raised first and
     * released a frame later; the counts then change under an overlay that is already up.
     */
    private switchScreen(change: () => void): void {
        const preview = this.requiredFields !== null && this.previewBuildFrame === null;
        if (preview) {
            this.loading = true;
            this.previewBusyChange.emit(true);
        }
        this.drawerOpen = false;
        change();
        this.updateNestedCards();
        this.changeDetectorRef.detectChanges();
        if (preview) {
            requestAnimationFrame(() => {
                this.loading = this.previewBuildFrame !== null;
                this.previewBusyChange.emit(this.isPreviewBusy);
                this.changeDetectorRef.markForCheck();
            });
        }
    }

    public onRailSelect(target: number | 'overview'): void {
        if (target === 'overview') {
            this.openOverview();
        } else {
            this.openSection(target);
        }
    }

    public onRailCard(card: IFieldControl<any>): void {
        // The card is drawn by the nested form of its section's sub-schema, which draws nothing while
        // that sub-schema is closed and registers its own cards in Preview
        for (const item of this.activeSection?.controls ?? []) {
            if (item.isRef && (item.model?.controls || []).includes(card)) {
                item.open = true;
            }
        }
        card.open = true;
        this.drawerOpen = false;
        this.changeDetectorRef.detectChanges();
        this.childForm?.prepareOpenPreviewSections?.();
        this.changeDetectorRef.detectChanges();
        this.scrollToField(card.id);
    }

    public toggleRail(): void {
        this.railHiddenProp.value = !this.railHiddenProp.value;
        this.railHiddenProp.save();
        this.drawerOpen = false;
        this.changeDetectorRef.detectChanges();
    }

    public setDrawer(open: boolean): void {
        this.drawerOpen = open;
    }

    /** First section with required answers left; the primary Overview action opens it. */
    public get firstIncomplete(): number {
        const index = (this.completion?.sections ?? []).findIndex(item => item.answered < item.total);
        return Math.max(0, index);
    }

    public get overviewTitle(): string {
        const { answered = 0, total = 0 } = this.completion ?? {};
        if (answered >= total) {
            return 'Ready to validate';
        }
        return answered === 0 ? 'Get started' : 'Continue your document';
    }

    public get overviewComplete(): boolean {
        return !!this.completion && this.completion.answered >= this.completion.total;
    }

    public get overviewPrimaryText(): string {
        return (this.completion?.answered ?? 0) === 0 ? 'Start' : 'Continue';
    }

    /** The submit action on the Overview, only when the host listens for it (N6). */
    public get overviewSubmit(): { text: string; disabled: boolean; run: () => void } | null {
        if (this.isEditMode) {
            if (!this.updatableBtnEvent.observed || !this.showButtons || this.comesFromDialog) {
                return null;
            }
            return {
                text: this.editButtonConfig?.text ?? 'Save Changes',
                // Until the form has sent its button (it exists only once a section is open), fall back to
                // the root form's own dirty state, as the host does for that button
                disabled: this.isPreviewLocked || (this.editButtonConfig ? !!this.editButtonConfig.disabled?.() : !this.group.dirty),
                run: () => this.updatableBtnEvent.emit()
            };
        }
        if (!this.submitBtnEvent.observed || this.submitHidden) {
            return null;
        }
        return {
            text: this.submitText,
            disabled: this.isPreviewLocked,
            run: () => this.submitBtnEvent.emit(this.model?.controls)
        };
    }

    public sectionState(stats: ISectionCompletion): 'Complete' | 'In progress' | 'Not started' {
        if (stats.total > 0 && stats.answered >= stats.total) return 'Complete';
        return stats.answered > 0 ? 'In progress' : 'Not started';
    }

    public sectionAction(stats: ISectionCompletion): string {
        if (stats.total > 0 && stats.answered >= stats.total) return 'Review';
        return stats.answered > 0 ? 'Continue' : 'Start';
    }

    public ringOffset(stats: ISectionCompletion, length: number): number {
        return length * (1 - (stats.total ? Math.min(1, stats.answered / stats.total) : 0));
    }

    public get percent(): number {
        const { answered = 0, total = 0 } = this.completion ?? {};
        return total ? Math.round((answered / total) * 100) : 0;
    }

    private scrollToTop(): void {
        setTimeout(() => {
            const container: HTMLElement | undefined = this.contentContainerRef?.nativeElement;
            if (container) {
                this.getScrollParent(container)?.scrollTo({ top: 0 });
            }
        });
    }

    private scrollToField(targetId: string): void {
        setTimeout(() => this.findFieldElement(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
}
