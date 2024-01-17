import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators, } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { UnitSystem } from '@guardian/interfaces';
import { ToastrService } from 'ngx-toastr';
import { IPFS_SCHEMA } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';
import { EnumEditorDialog } from '../enum-editor-dialog/enum-editor-dialog.component';
import { FieldControl } from '../field-control';
import { DialogService } from 'primeng/dynamicdialog';
import { Subscription } from 'rxjs';

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
    @Input('form') form!: FormGroup;
    @Input('field') field!: FieldControl;
    @Input('types') types!: any[];
    @Input('measureTypes') measureTypes!: any[];
    @Input('schemaTypes') schemaTypes!: any[];
    @Input('extended') extended!: boolean;
    @Input('value') value!: any;
    @Input('private') canBePrivate!: boolean;
    @Input('properties') properties: { title: string; _id: string; value: string }[];

    @Output('remove') remove = new EventEmitter<any>();

    unit: boolean = true;
    enum: boolean = false;
    helpText: boolean = false;
    loading: boolean = false;
    keywords: string[] = [];
    isString: boolean = false;

    fieldType: FormControl;
    fieldTypeSub: Subscription;

    groupedFieldTypes: any = [
        {
            label: 'Units of measure',
            value: 'uom',
            items: [
                {label: 'Prefix', value: 'prefix'},
                {label: 'Postfix', value: 'postfix'},
            ],
        },
        {
            label: 'Hedera',
            value: 'h',
            items: [{label: 'Account', value: 'hederaAccount'}],
        },
    ];

    fieldTypes: any = [
        {label: 'None', value: 'none'},
        {label: 'Hidden', value: 'hidden'},
        {label: 'Required', value: 'required'},

    ];

    property: FormControl;
    private fieldPropertySub: Subscription;

    constructor(
        public dialog: MatDialog,
        private dialogService: DialogService,
        private ipfs: IPFSService,
        private toastr: ToastrService
    ) {
        this.fieldType = new FormControl();
        this.property = new FormControl();
    }

    ngOnInit(): void {
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

            if (this.field.controlRequired.value === true) {
                this.fieldType.setValue('required')
            } else if (this.field.hidden.value === true) {
                this.fieldType.setValue('hidden')
            } else {
                this.fieldType.setValue('none')
            }
            this.property.setValue(this.field.property.value);
        }
        if (this.types) {
            const newSimpleTypes = this.types.map((type: any) => {
                return {label: type.name, value: type.value};
            });
            this.groupedFieldTypes.unshift({
                label: 'Simple Types',
                value: 'st',
                items: newSimpleTypes,
            });
        }
        if (this.schemaTypes) {
            const newSchemasTypes = this.schemaTypes.map((schemaType: any) => {
                return {label: schemaType.name, value: schemaType.value};
            });
            this.groupedFieldTypes.push({
                label: 'Schema defined',
                value: 'sd',
                items: newSchemasTypes,
            });
        }

        this.fieldTypeSub = this.fieldType.valueChanges.subscribe(value => {
            switch (value) {
                case 'required':
                    this.field.controlRequired.setValue(true);
                    this.field.hidden.setValue(false);
                    break;
                case 'hidden':
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(true);
                    break;
                case 'none':
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(false);
                    break;
                default:
                    this.field.controlRequired.setValue(false);
                    this.field.hidden.setValue(false);
                    break;
            }
        });

        this.fieldPropertySub = this.property.valueChanges.subscribe(val => {
            if (val) {
                this.field.property.setValue(val);
            }
        });
    }

    ngOnDestroy() {
        this.fieldPropertySub.unsubscribe();
        this.fieldTypeSub.unsubscribe();
    }

    updateControlEnum(values: string[]) {
        if (!values) {
            return;
        }

        this.field.controlEnum.clear();
        values.forEach((item: any) => {
            this.field.controlEnum.push(new FormControl(item));
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

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.extended && Object.keys(changes).length === 1) {
            return;
        }
        if (this.field) {
            const type = this.field.controlType;
            this.onTypeChange(type);
        }
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
}
