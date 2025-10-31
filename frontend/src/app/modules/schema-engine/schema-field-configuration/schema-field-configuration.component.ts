import {
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges
} from '@angular/core';
import {
    AbstractControl,
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
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
    @Input() buildField: (fieldConfig: FieldControl, data: any) => SchemaField | null;

    @Output('remove') remove = new EventEmitter<any>();

    public destroy$: Subject<boolean> = new Subject<boolean>();
    public autocalculated = false;
    public unit: boolean = true;
    public enum: boolean = false;
    public availableActions: boolean = false;
    public helpText: boolean = false;
    public loading: boolean = false;
    public keywords: string[] = [];
    public isString: boolean = false;
    public fieldType: UntypedFormControl;
    public property: UntypedFormControl;
    public groupedFieldTypes: any[] = this.createFieldTypes();
    public fieldTypes: any = [
        { label: 'None', value: 'none' },
        { label: 'Hidden', value: 'hidden' },
        { label: 'Required', value: 'required' },
        { label: 'Auto Calculate', value: 'autocalculate' },

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

    public geoJson = false;
    public geoJsonControl = new UntypedFormControl([]);
    public geoJsonOptions = [
        { label: 'Point', value: 'Point' },
        { label: 'Polygon', value: 'Polygon' },
        { label: 'LineString', value: 'LineString' },
        { label: 'MultiPoint', value: 'MultiPoint' },
        { label: 'MultiPolygon', value: 'MultiPolygon' },
        { label: 'MultiLineString', value: 'MultiLineString' }
    ];
    public geoKeywords: string[] = [];
    private geoJsonSub?: Subscription;

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

    private createFieldTypes() {
        return [
            {
                label: 'Simple Types',
                value: 'st',
                items: [],
            },
            {
                label: 'Units of measure',
                value: 'uom',
                items: [
                    { label: 'Prefix', value: UnitSystem.Prefix },
                    { label: 'Postfix', value: UnitSystem.Postfix },
                ],
            },
            {
                label: 'Hedera',
                value: 'h',
                items: [{ label: 'Account', value: 'hederaAccount' }],
            },
            {
                label: 'Schema defined',
                value: 'sd',
                items: [],
            }
        ];
    }

    public initDefaultForm($event: any) {
        this.defaultValuesSubscription?.unsubscribe();
        this.defaultValues = $event;
        this.defaultValuesSubscription = $event.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value: any) => {
                const control = this.fieldsForm?.get(this.field.name);
                control?.patchValue({
                    default: null,
                    suggest: null,
                    example: null,
                    ...value,
                });
            });
    }

    ngOnInit(): void {
        if (this.fieldsForm && this.buildField) {
            const onFieldChange = (value: any) => {
                this.fieldsFormValue = value;
                try {
                    this.parsedField = this.buildField(this.field, this.fieldsFormValue);
                    if (this.parsedField) {
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
                    }
                } catch (error) {
                    console.warn(error)
                }
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
                this.field.expression.setValidators([Validators.required]);
                this.field.expression.updateValueAndValidity();
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

            this.field.expression.clearValidators();
            switch (value) {
                case 'autocalculate':
                    this.autocalculated = true;
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(false);
                    this.field.autocalculated.setValue(true);
                    this.field.expression.setValidators([Validators.required]);
                    break;
                case 'required':
                    this.autocalculated = false;
                    this.field.controlRequired.setValue(true);
                    this.field.hidden.setValue(false);
                    this.field.autocalculated.setValue(false);
                    break;
                case 'hidden':
                    this.autocalculated = false;
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(true);
                    this.field.autocalculated.setValue(false);
                    break;
                case 'none':
                    this.autocalculated = false;
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(false);
                    this.field.autocalculated.setValue(false);
                    break;
                default:
                    this.autocalculated = false;
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(false);
                    this.field.autocalculated.setValue(false);
                    break;
            }
            this.field.expression.updateValueAndValidity();
        });
        this.fieldPropertySub = this.property.valueChanges.subscribe(val => {
            this.field.property.setValue(val);
        });

        const initialGeo = this.field?.controlAvailableOptions?.value;

        if (Array.isArray(initialGeo)) {
            this.geoJsonControl.setValue(initialGeo);
            this.updateGeoKeywords(initialGeo);
        }
        this.geoJsonSub = this.geoJsonControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((vals: string[] | null) => {
                const value = vals || [];
                const fc = this.field.controlAvailableOptions;

                if (fc instanceof UntypedFormArray) {
                    fc.clear();
                    value.forEach(v => fc.push(new UntypedFormControl(v)));
                }

                this.updateGeoKeywords(value);
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.groupedFieldTypes = this.createFieldTypes();
        if (this.types) {
            this.groupedFieldTypes[0].items = this.types.map((type: any) => {
                return { label: type.name, value: type.value };
            });
        }
        if (this.schemaTypes) {
            this.groupedFieldTypes[3].items = this.schemaTypes.map((schemaType: any) => {
                return {
                    ...schemaType,
                    label: schemaType.name,
                    value: schemaType.value
                };
            });
        }
        // this.cdr.detectChanges();
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
        this.geoJsonSub?.unsubscribe();
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
        const typeName = event.value;
        const item = this.types.find((e) => e.value == typeName);
        this.field.setType(((item && item.name) || typeName));
        this.unit = typeName == UnitSystem.Prefix || typeName == UnitSystem.Postfix;
        this.isString = (item && item.name === 'String') || false;
        this.helpText = (item && item.name === 'Help Text') || false;
        this.enum = ((item && item.name) || typeName) === 'Enum';
        this.geoJson = ((item && item.name) || typeName) === 'GeoJSON';
    }

    onEditEnum() {
        const dialogRef = this.dialogService.open(EnumEditorDialog, {
            header: 'Enum data',
            width: '700px',
            showHeader: false,
            styleClass: 'guardian-dialog',
            data: {
                enumValue: this.field.controlEnum.value,
                errorHandler: this.errorHandler.bind(this),
            },
        });
        dialogRef.onClose.subscribe((res: { enumValue: string; loadToIpfs: boolean }) => {
            if (!res) {
                return;
            }

            this.field.controlRemoteLink.patchValue('');

            const uniqueTrimmedEnumValues: string[] = [
                ...new Set(res.enumValue.split('\n').map((item) => item.trim())),
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
                    .subscribe((cid) => {
                        this.loading = false;
                        const link = IPFS_SCHEMA + cid;
                        this.field.controlRemoteLink.patchValue(link);
                        this.loadRemoteEnumData(link);
                    }, (err) => {
                        this.loading = false;
                        this.errorHandler(
                            err.message,
                            'Enum data can not be loaded to IPFS'
                        );
                        this.updateControlEnum(uniqueTrimmedEnumValues);
                    });
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
            showHeader: false,
            width: '80%',
            styleClass: 'guardian-dialog',
            data: {
                mode: 'json',
                expression: this.field.expression.value,
                readonly: this.readonly
            }
        })
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.field.expression.setValidators([Validators.required]);
                this.field.expression.patchValue(result.expression);
                this.field.expression.updateValueAndValidity();
            }
        })
    }

    private updateGeoKeywords(values: string[]) {
        if (!values?.length || values?.length === this.geoJsonOptions.length) {
            this.geoKeywords = ['All'];
        } else {
            this.geoKeywords = values || [];
        }
    }
}
