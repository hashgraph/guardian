import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaField, SchemaRuleValidateResult } from '@guardian/interfaces';
import { FieldForm, IFieldControl } from '../schema-form-model/field-form';

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

    @Output('form') form = new EventEmitter<UntypedFormGroup>();
    @Output('change') change = new EventEmitter<Schema | null>();
    @Output('destroy') destroy = new EventEmitter<void>();
    @Output('buttons') buttons = new EventEmitter<any>();
    @Output() cancelBtnEvent = new EventEmitter<boolean>();
    @Output() submitBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();
    @Output() saveBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();

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

    public preset(data: any) {
        this.presetDocument = data;
        this.buildFields();
        this.changeDetectorRef.detectChanges();
    }
}
