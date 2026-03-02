import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { SchemaFormComponent } from '../schema-form/schema-form.component';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaField, SchemaRuleValidateResult } from '@guardian/interfaces';
import { FieldForm, IFieldControl } from '../schema-form-model/field-form';
import { SchemaFormNavigationComponent } from '../schema-form-navigation/schema-form-navigation.component';

/**
 * Form built by schema
 */
@Component({
    selector: 'app-schema-form-root',
    templateUrl: './schema-form-root.component.html',
    styleUrls: ['./schema-form-root.component.scss'],
})
export class SchemaFormRootComponent implements OnInit {
    public group: UntypedFormGroup;
    public model: FieldForm | null;
    public loading: boolean = true;
    public hasNavigation = true;
    
    private startX: number = 0;
    private startWidthPercent: number = 25;
    private containerWidth: number = 0;
    private readonly MIN_WIDTH_PERCENT = 0;
    private readonly MAX_WIDTH_PERCENT = 75;
    private rafId: number | null = null;

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

    @Output('form') form = new EventEmitter<UntypedFormGroup>();
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

    ngOnChanges(changes: SimpleChanges) {
        this.loading = true;
        if (
            changes.schema ||
            changes.fields ||
            changes.hide ||
            changes.readonly ||
            changes.conditions ||
            changes.presetDocument
        ) {
            setTimeout(() => {
                this.buildFields();
                setTimeout(() => {
                    this.loading = false;
                }, 0);
            }, 0);
        } else {
            this.loading = false;
        }
    }

    ngOnDestroy() {
        if (this.model) {
            this.model.destroy();
        }
        document.removeEventListener('mousemove', this.onResizeMove);
        document.removeEventListener('mouseup', this.onResizeEnd);
        
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
        });
        this.model.build();
        this.group.updateValueAndValidity();
        this.form.emit(this.group);
    }

    public onChange($event: Schema | null) {
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
