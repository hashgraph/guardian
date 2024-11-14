import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, UntypedFormControl, UntypedFormGroup, Validators, } from '@angular/forms';
// import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { SchemaField, UnitSystem } from '@guardian/interfaces';
import { ToastrService } from 'ngx-toastr';
import { IPFS_SCHEMA } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';
import { EnumEditorDialog } from '../enum-editor-dialog/enum-editor-dialog.component';
import { FieldControl } from '../field-control';
import { DialogService } from 'primeng/dynamicdialog';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CodeEditorDialogComponent } from '../../policy-engine/dialogs/code-editor-dialog/code-editor-dialog.component';

/**
 * Schemas constructor
 */
@Component({
    selector: 'schema-field-configuration',
    templateUrl: './schema-field-configuration.component.html',
    styleUrls: ['./schema-field-configuration.component.scss'],
})
export class SchemaFieldConfigurationComponent implements OnInit, OnDestroy {
    @Input('readonly') readonly!: boolean;
    @Input('form') form!: UntypedFormGroup;
    @Input('field') field!: FieldControl;
    @Input() fieldsForm?: AbstractControl | null;
    @Input('types') types!: any[];
    @Input('measureTypes') measureTypes!: any[];
    @Input('schemaTypes') schemaTypes!: any[];
    @Input() schemaTypeMap!: any;
    @Input('extended') extended!: boolean;
    @Input('value') value!: any;
    @Input('private') canBePrivate!: boolean;
    @Input('properties') properties: { title: string; _id: string; value: string }[];
    @Input('errors') errors!: any[];
    @Input() buildField: (fieldConfig: FieldControl, data: any) => SchemaField;

    @Output('remove') remove = new EventEmitter<any>();

    public destroy$: Subject<boolean> = new Subject<boolean>();
    public autocalculated = false;
    public unit: boolean = true;
    public enum: boolean = false;
    public helpText: boolean = false;
    public loading: boolean = false;
    public keywords: string[] = [];
    public isString: boolean = false;
    public fieldType: UntypedFormControl;
    public property: UntypedFormControl;
    public groupedFieldTypes: any = [
        {
            label: 'Units of measure',
            value: 'uom',
            items: [
                { label: 'Prefix', value: 'prefix' },
                { label: 'Postfix', value: 'postfix' },
            ],
        },
        {
            label: 'Hedera',
            value: 'h',
            items: [{ label: 'Account', value: 'hederaAccount' }],
        },
    ];
    public fieldTypes: any = [
        { label: 'None', value: 'none' },
        { label: 'Hidden', value: 'hidden' },
        { label: 'Required', value: 'required' },
        {label: 'Auto Calculate', value: 'autocalculate'},

    ];
    public error: any;
    public parsedField!: any;
    public presetFormFields?: any[];
    public fieldsFormValue!: any;
    public defaultValues?: UntypedFormGroup;
    public defaultValuesSubscription?: Subscription;
    public presetValues: any;
    public isShowMore = false;
    private fieldTypeSub: Subscription;
    private fieldPropertySub: Subscription;
    private _sd?: any;

    constructor(
        public dialog: DialogService,
        private dialogService: DialogService,
        private ipfs: IPFSService,
        private toastr: ToastrService,
        private cdr: ChangeDetectorRef,
    ) {
        this.fieldType = new UntypedFormControl();
        this.property = new UntypedFormControl();
    }

    ngOnInit(): void {
        if (this.fieldsForm && this.buildField) {
            const onFieldChange = (value: any) => {
                this.defaultValuesSubscription?.unsubscribe();
                this.defaultValues = new UntypedFormGroup({});
                this.defaultValuesSubscription =
                    this.defaultValues.valueChanges
                        .pipe(takeUntil(this.destroy$))
                        // tslint:disable-next-line:no-shadowed-variable
                        .subscribe((value) => {
                            const control = this.fieldsForm?.get(
                                this.field.name
                            );
                            control?.patchValue({
                                default: null,
                                suggest: null,
                                example: null,
                                ...value,
                            });
                        });
                this.fieldsFormValue = value;
                try {
                    this.parsedField = this.buildField(
                        this.field,
                        this.fieldsFormValue
                    );
                    this.presetFormFields = [
                        Object.assign({}, this.parsedField, {
                            name: 'default',
                            description: 'Default Value',
                            required: false,
                            hidden: false,
                            default: null,
                            suggest: null,
                            examples: null,
                        }),
                        Object.assign({}, this.parsedField, {
                            name: 'suggest',
                            description: 'Suggested Value',
                            required: false,
                            hidden: false,
                            default: null,
                            suggest: null,
                            examples: null,
                        }),
                        Object.assign({}, this.parsedField, {
                            name: 'example',
                            description: 'Test Value',
                            required: false,
                            hidden: false,
                            default: null,
                            suggest: null,
                            examples: null,
                        }),
                    ];
                } catch (error) { console.warn(error) }
            };
            onFieldChange(this.fieldsForm?.value);

            this.fieldsForm?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
                const oldField = this.fieldsFormValue?.[this.field.name];
                const newField = value?.[this.field.name];
                if (
                    oldField?.fieldType !== newField?.fieldType ||
                    oldField?.fieldArray !== newField?.fieldArray ||
                    JSON.stringify(oldField?.controlEnum) !==
                        JSON.stringify(newField?.controlEnum)
                ) {
                    this.presetValues =
                        JSON.stringify(newField?.controlEnum) !==
                        JSON.stringify(oldField?.controlEnum)
                            ? (this.defaultValues?.value || {})
                            : {};

                    onFieldChange(value);
                }
            });
        }

        if (this.field) {
            const enumValues = this.field.controlEnum.value;
            if (enumValues && enumValues.length) {
                for (let i = 0; i < enumValues.length && i < 5; i++) {
                    this.keywords.push(enumValues[i]);
                }
            }
            const remoteLinkValue = this.field.controlRemoteLink.value;
            if (remoteLinkValue) {
                this.loadRemoteEnumData(remoteLinkValue);
            }
            if (this.field.autocalculated.value === true) {
                this.fieldType.setValue('autocalculate')
            } else if (this.field.controlRequired.value === true) {
                this.fieldType.setValue('required')
            } else if (this.field.hidden.value === true) {
                this.fieldType.setValue('hidden')
            } else {
                this.fieldType.setValue('none')
            }
            this.property.setValue(this.field.property.value);
            this.error = this.errors?.find((e) =>
                e.target &&
                e.target.type === 'field' &&
                e.target.field === this.field.controlKey?.value
            );
        }
        this.fieldTypeSub = this.fieldType.valueChanges.subscribe(value => {
            switch (value) {
                case 'autocalculate':
                    this.autocalculated = true;
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(false);
                    this.field.autocalculated.setValue(true)
                    break;
                case 'required':
                    this.autocalculated = false;
                    this.field.controlRequired.setValue(true);
                    this.field.hidden.setValue(false);
                    this.field.autocalculated.setValue(false)
                    break;
                case 'hidden':
                    this.autocalculated = false;
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(true);
                    this.field.autocalculated.setValue(false)
                    break;
                case 'none':
                    this.autocalculated = false;
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(false);
                    this.field.autocalculated.setValue(false)
                    break;
                default:
                    this.autocalculated = false;
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(false);
                    this.field.autocalculated.setValue(false)
                    break;
            }
        });
        this.fieldPropertySub = this.property.valueChanges.subscribe(val => {
            this.field.property.setValue(val);
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.types?.firstChange && this.types) {
            const newSimpleTypes = this.types.map((type: any) => {
                return { label: type.name, value: type.value };
            });
            this.groupedFieldTypes.unshift({
                label: 'Simple Types',
                value: 'st',
                items: newSimpleTypes,
            });
        }
        if (this.schemaTypes) {
            if (changes?.schemaTypes?.firstChange) {
                const newSchemasTypes = this.schemaTypes.map((schemaType: any) => {
                    return {
                        ...schemaType,
                        label: schemaType.name,
                        value: schemaType.value
                    };
                });
                this._sd = {
                    label: 'Schema defined',
                    value: 'sd',
                    items: newSchemasTypes,
                };
                this.groupedFieldTypes.push(this._sd);
            } else if (changes?.schemaTypes?.firstChange === false) {
                const newSchemasTypes = this.schemaTypes.map((schemaType: any) => {
                    return {
                        ...schemaType,
                        label: schemaType.name,
                        value: schemaType.value
                    };
                });
                this._sd.items = newSchemasTypes;
                this.cdr.detectChanges();
            }
        }
        if (changes.extended && Object.keys(changes).length === 1) {
            return;
        }
        if (changes.field) {
            this.presetValues = {
                default: this.field.default,
                suggest: this.field.suggest,
                example: this.field.example,
            };
            const type = this.field.controlType;
            this.onTypeChange(type);
        }
    }

    ngOnDestroy() {
        this.fieldPropertySub.unsubscribe();
        this.fieldTypeSub.unsubscribe();
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    updateControlEnum(values: string[]) {
        if (!values) {
            return;
        }

        this.field.controlEnum.clear();
        values.forEach((item: any) => {
            this.field.controlEnum.push(new UntypedFormControl(item));
        });

        this.keywords = [];
        if (values && values.length) {
            for (let i = 0; i < values.length && i < 5; i++) {
                this.keywords.push(values[i]);
            }
        }
    }

    loadRemoteEnumData(link: string) {
        this.loading = true;
        this.ipfs
            .getJsonFileByLink(link)
            .then((res: any) => {
                if (!res) {
                    return;
                }
                this.updateControlEnum(res.enum);
            })
            .finally(() => (this.loading = false));
    }

    onRemove(field: any) {
        this.remove.emit(field);
    }

    onTypeChange(event: any) {
        const item = this.types.find((e) => e.value == event.value);
        if (item && item.name == 'Boolean') {
            this.field.controlArray.setValue(false);
            this.field.controlArray.disable();
        } else {
            this.field.controlArray.enable();
        }

        this.unit =
            event.value == UnitSystem.Prefix ||
            event.value == UnitSystem.Postfix;

        this.isString = (item && item.name === 'String') || false;
        if (!this.isString) {
            this.field.controlPattern.disable();
        } else {
            this.field.controlPattern.enable();
        }

        this.helpText = (item && item.name === 'Help Text') || false;
        if (!this.helpText) {
            this.field.controlColor.disable();
            this.field.controlSize.disable();
            this.field.controlBold.disable();
        } else {
            this.field.controlColor.enable();
            this.field.controlSize.enable();
            this.field.controlBold.enable();
        }

        this.enum = ((item && item.name) || event.value) === 'Enum';
        if (this.enum) {
            this.field.controlEnum.setValidators([Validators.required]);
        } else {
            this.field.controlEnum.clearValidators();
        }
        this.field.controlEnum.updateValueAndValidity();
    }

    onEditEnum() {
        const dialogRef = this.dialogService.open(EnumEditorDialog, {
            header: 'Enum data',
            width: '700px',
            styleClass: 'custom-dialog',
            data: {
                enumValue: this.field.controlEnum.value,
                errorHandler: this.errorHandler.bind(this),
            },
        });
        dialogRef
            .onClose
            .subscribe((res: { enumValue: string; loadToIpfs: boolean }) => {
                if (!res) {
                    return;
                }
                this.field.controlRemoteLink.patchValue('');

                const uniqueTrimmedEnumValues: string[] = [
                    ...new Set(
                        res.enumValue.split('\n').map((item) => item.trim())
                    ),
                ] as string[];

                if (res.loadToIpfs && uniqueTrimmedEnumValues.length > 5) {
                    this.field.controlEnum.clear();
                    this.loading = true;
                    this.ipfs
                        .addFile(
                            new Blob([
                                JSON.stringify({
                                    enum: uniqueTrimmedEnumValues,
                                }),
                            ])
                        )
                        .subscribe(
                            (cid) => {
                                this.loading = false;
                                const link = IPFS_SCHEMA + cid;
                                this.field.controlRemoteLink.patchValue(link);
                                this.loadRemoteEnumData(link);
                            },
                            (err) => {
                                this.loading = false;
                                this.errorHandler(
                                    err.message,
                                    'Enum data can not be loaded to IPFS'
                                );
                                this.updateControlEnum(uniqueTrimmedEnumValues);
                            }
                        );
                } else {
                    this.updateControlEnum(uniqueTrimmedEnumValues);
                }
            });
    }

    onHepTextReset() {
        this.field.controlColor.patchValue('#000000');
        this.field.controlSize.patchValue(18);
        this.field.controlBold.patchValue(false);
    }

    private errorHandler(errorMessage: string, errorHeader: string): void {
        this.toastr.error(errorMessage, errorHeader, {
            timeOut: 30000,
            closeButton: true,
            positionClass: 'toast-bottom-right',
            enableHtml: true,
        });
    }

    onEditExpression() {
        const dialogRef = this.dialog.open(CodeEditorDialogComponent, {
            width: '80%',
            // panelClass: 'g-dialog',
            data: {
                mode: 'json',
                expression: this.field.expression.value,
                readonly: this.readonly
            },
            // autoFocus: true,
            // disableClose: true
            styleClass: 'g-dialog',
            modal: true,
            closable: false,
        })
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.field.expression.patchValue(result.expression);
            }
        })
    }
}
