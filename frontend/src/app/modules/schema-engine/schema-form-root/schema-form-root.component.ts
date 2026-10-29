import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { SchemaFormComponent } from '../schema-form/schema-form.component';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaField, SchemaRuleValidateResult } from '@guardian/interfaces';
import { equalsLoosely, FieldForm, IFieldControl } from '../schema-form-model/field-form';
import { Subscription } from 'rxjs';
import { FormulasTree } from 'src/app/modules/formulas/models/formula-tree';
import { FormFormulas, IFormulaLinkScope } from 'src/app/modules/formulas/models/form-formulas';
import { SchemaFormNavigationComponent } from '../schema-form-navigation/schema-form-navigation.component';

/**
 * Form built by schema
 */
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
    public hasNavigation = true;
    public navCollapsed = false;
    public navFields: IFieldControl<any>[] = [];
    public formulaModel: FormFormulas | null = null;
    private formulaSub?: Subscription;

    private startX: number = 0;
    private startWidthPercent: number = 25;
    private containerWidth: number = 0;
    private readonly MIN_WIDTH_PERCENT = 0;
    private readonly MAX_WIDTH_PERCENT = 75;
    private rafId: number | null = null;
    private navScrollParent: HTMLElement | null = null;
    private navResizeObserver: ResizeObserver | null = null;

    @ViewChild('childForm') private childForm?: SchemaFormComponent;
    @ViewChild('schemaNav') private schemaNav?: SchemaFormNavigationComponent;
    @ViewChild('navContainer') navContainerRef?: ElementRef;
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
    @Input() paginationHidden: boolean = true;
    @Input() isFormForFinishSetup: boolean = false;
    @Input() isFormForRequestBlock: boolean = false;
    @Input() lastSavedAt?: Date;
    @Input() isEditMode: boolean = false;
    @Input() formulas: FormulasTree | null = null;
    @Input() requiredFields: string[] | null = null;
    @Input() previewMissingFields: string[] = [];
    @Input() formulaLinkScope: IFormulaLinkScope | null = null;
    private previewFocusTimer: ReturnType<typeof setTimeout> | null = null;

    @Output('form') form = new EventEmitter<UntypedFormGroup>();
    @Output('presetApplied') presetApplied = new EventEmitter<UntypedFormGroup>();
    @Output('change') change = new EventEmitter<Schema | null>();
    @Output('destroy') destroy = new EventEmitter<void>();
    @Output('buttons') buttons = new EventEmitter<any>();
    @Output() cancelBtnEvent = new EventEmitter<boolean>();
    @Output() submitBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();
    @Output() saveBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();
    @Output() updatableBtnEvent = new EventEmitter();

    constructor(
        private fb: UntypedFormBuilder,
        protected changeDetectorRef: ChangeDetectorRef
    ) {
        this.group = this.fb.group({});
        this.model = null;
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        // Inside a dialog the navigation panel is sticky within a scrollable
        // body whose height depends on the dialog size and the banners shown
        // above the form. Sync its height to that container so it fills the
        // available space instead of relying on a fixed viewport calculation.
        if (this.comesFromDialog) {
            setTimeout(() => this.setupNavHeightSync(), 0);
        }
    }

    private setupNavHeightSync(): void {
        if (!this.navContainerRef) {
            return;
        }
        this.navScrollParent = this.getScrollParent(this.navContainerRef.nativeElement);
        if (!this.navScrollParent) {
            return;
        }
        this.navResizeObserver = new ResizeObserver(() => this.updateNavHeight());
        this.navResizeObserver.observe(this.navScrollParent);
        this.updateNavHeight();
    }

    private updateNavHeight(): void {
        if (!this.navContainerRef || !this.navScrollParent) {
            return;
        }
        this.navContainerRef.nativeElement.style.maxHeight = `${this.navScrollParent.clientHeight}px`;
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
        this.loading = true;
        const requiredChanged = !!changes.requiredFields
            && !(!changes.requiredFields.firstChange && this.model?.hasSameRequiredFields(this.requiredFields));
        if (changes.previewMissingFields && !requiredChanged) {
            this.updatePreviewMissingFieldIds();
            this.schedulePreviewFocus();
        }
        let keepDirty = false;
        if (requiredChanged && !changes.requiredFields.firstChange && this.model) {
            keepDirty = this.group.dirty;
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
            setTimeout(() => {
                this.buildFields();
                if (keepDirty) {
                    this.group.markAsDirty();
                }
                if (presetApplied) {
                    this.presetApplied.emit(this.group);
                }
                setTimeout(() => {
                    this.loading = false;
                    this.schedulePreviewFocus();
                }, 0);
            }, 0);
        } else {
            this.loading = false;
        }
    }

    ngOnDestroy() {
        if (this.previewFocusTimer !== null) clearTimeout(this.previewFocusTimer);
        this.formulaSub?.unsubscribe();
        if (this.model) {
            this.model.destroy();
        }
        document.removeEventListener('mousemove', this.onResizeMove);
        document.removeEventListener('mouseup', this.onResizeEnd);

        if (this.navResizeObserver) {
            this.navResizeObserver.disconnect();
            this.navResizeObserver = null;
        }

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }

        document.body.classList.remove('resizing');
    }

    private buildFields() {
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
        });
        this.model.build();
        this.updatePreviewMissingFieldIds();
        this.navFields = [...(this.model.controls || [])];
        this.group.updateValueAndValidity();
        this.buildFormulaModel();
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
        if (this.model?.controls) {
            this.navFields = [...this.model.controls];
        }
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
        this.buttons.emit($event);
    }
    public onDestroy($event: void) {
        this.destroy.emit($event);
    }

    public onUpdatableBtnEvent() {
        this.updatableBtnEvent.emit()
    }

    public preset(data: any) {
        this.presetDocument = data;
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

    public toggleNav(): void {
        this.navCollapsed = !this.navCollapsed;
        this.changeDetectorRef.detectChanges();
    }

    public previewFieldLocation(path: string): string {
        let fields = this.fields || this.schema?.fields || [];
        const title = this.schema?.document?.title || this.schema?.name;
        const titles: string[] = title ? [title] : [];
        for (const part of path.split('.')) {
            if (/^\d+$/.test(part)) { titles.push(`row ${Number(part) + 1}`); continue; }
            const field = fields.find(item => item.name === part);
            titles.push(field?.title || field?.description || part);
            fields = field?.fields || [];
        }
        return titles.join(' › ');
    }

    public previewMissingFieldIds: string[] = [];

    private updatePreviewMissingFieldIds(): void {
        this.previewMissingFieldIds = this.previewMissingFields.flatMap(path => {
            const parts = path.split('.');
            let controls = this.model?.controls || [];
            for (let index = 0; index < parts.length; index++) {
                const field = controls.find(item => item.name === parts[index]);
                if (!field) return [];
                if (index === parts.length - 1) return [field.id];
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
            this.focusPreviewField(this.previewMissingFields[0]);
        }, 0);
    }

    public focusPreviewField(path: string): void {
        const parts = path.split('.');
        let controls = this.model?.controls || [];
        let targetId: string | undefined;
        const first = controls.findIndex(item => item.name === parts[0]);
        if (first >= 0 && this.childForm) this.childForm.isShown[first] = true;
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
        this.changeDetectorRef.detectChanges();
        const container: HTMLElement | undefined = this.contentContainerRef?.nativeElement;
        const target = Array.from(container?.querySelectorAll<HTMLElement>('[preview-field-id]') || [])
            .find(element => element.getAttribute('preview-field-id') === targetId);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.querySelector<HTMLElement>('input,select,textarea,button,[tabindex]')?.focus({ preventScroll: true });
    }

    public onNavSelectEvent(link: string) {
        if (this.childForm && typeof this.childForm.openField === 'function') {
            this.childForm.openField(link);
        }
    }

    public onNavHasItemsEvent(hasItems: boolean): void {
        this.hasNavigation = hasItems;
        this.changeDetectorRef.detectChanges();
    }

    public onAccordionSelect(accordionInfo: {path: string, isOpen: boolean}) {
        if (this.schemaNav && typeof this.schemaNav.expandedByAccordionId === 'function') {
            this.schemaNav.expandedByAccordionId(accordionInfo);
        }
    }

        public onResizeStart(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        this.startX = event.clientX;

        if (this.contentContainerRef) {
            this.containerWidth = this.contentContainerRef.nativeElement.offsetWidth;
        }

        if (this.navContainerRef) {
            const currentWidth = this.navContainerRef.nativeElement.offsetWidth;
            this.startWidthPercent = (currentWidth / this.containerWidth) * 100;
        }

        document.body.classList.add('resizing');
        document.addEventListener('mousemove', this.onResizeMove);
        document.addEventListener('mouseup', this.onResizeEnd);
    }

    private onResizeMove = (event: MouseEvent): void => {
        event.preventDefault();

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }

        this.rafId = requestAnimationFrame(() => {
            if (!this.navContainerRef || !this.contentContainerRef)
                return;

            const navElement = this.navContainerRef.nativeElement;
            const contentElement = this.contentContainerRef.nativeElement;

            this.containerWidth = contentElement.offsetWidth;
            const deltaX = event.clientX - this.startX;
            const deltaPercent = (deltaX / this.containerWidth) * 100;
            let newWidthPercent = this.startWidthPercent + deltaPercent;

            newWidthPercent = Math.max(
                this.MIN_WIDTH_PERCENT,
                Math.min(this.MAX_WIDTH_PERCENT, newWidthPercent)
            );

            navElement.style.width = `${newWidthPercent}%`;

            this.startWidthPercent = newWidthPercent;
            this.startX = event.clientX;

            this.changeDetectorRef.detectChanges();
            this.rafId = null;
        });
    }

    private onResizeEnd = (event: MouseEvent): void => {
        document.body.classList.remove('resizing');

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        document.removeEventListener('mousemove', this.onResizeMove);
        document.removeEventListener('mouseup', this.onResizeEnd);

        this.changeDetectorRef.detectChanges();
    }
}
