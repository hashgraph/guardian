import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { Schema, SchemaField, SchemaRuleValidateResult, UnitSystem } from '@guardian/interfaces';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FormulasViewDialog } from '../../formulas/dialogs/formulas-view-dialog/formulas-view-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';

interface IFieldControl extends SchemaField {
    fullPath: string;
    hide: boolean;
    isInvalidType: boolean;
    value: any;
    loading: boolean;
    imgSrc: string;
    list: IFieldIndexControl[];
    count: number;
    pageIndex: number;
    pageSize: number;
    notCorrespondCondition?: boolean;
    open: boolean;
}

interface IFieldIndexControl {
    value: any;
    loading: boolean;
    imgSrc: string;
}

/**
 * Form view by schema
 */
@Component({
    selector: 'app-schema-form-view',
    templateUrl: './schema-form-view.component.html',
    styleUrls: ['./schema-form-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchemaFormViewComponent implements OnInit {
    @Input('private-fields') hide!: { [x: string]: boolean };
    @Input('schema') schema: Schema | null | undefined;
    @Input('fields') schemaFields!: SchemaField[] | undefined;
    @Input('delimiter-hide') delimiterHide: boolean = false;
    @Input('values') values: any;
    @Input() dryRun?: boolean = false;
    @Input() rules?: SchemaRuleValidateResult;
    @Input() formulas?: any;

    public fields: IFieldControl[] | undefined = [];
    private pageSize: number = 25;

    constructor(
        private ipfs: IPFSService,
        private dialogService: DialogService,
        private changeDetector: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.init();
    }

    isBooleanView(item: boolean | any): string {
        return (typeof item === 'boolean') ? String(item) : 'Unset';
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.rules && this.rules) {
            for (const value of Object.values(this.rules)) {
                if (value.status === 'Failure' || value.status === 'Error') {
                    value.tooltip = 'Failure: ' + value.rules
                        .filter((r) => r.status === 'Failure' || r.status === 'Error')
                        .map((r) => r.name)
                        .join(', ');
                } else {
                    value.tooltip = 'Success: ' + value.rules
                        .filter((r) => r.status === 'Success')
                        .map((r) => r.name)
                        .join(', ');
                }
            }
        }
        if (
            changes.schema ||
            changes.schemaFields ||
            changes.hide
        ) {
            this.hide = this.hide || {};
            if (this.schemaFields) {
                this.update(this.schemaFields);
            } else if (this.schema) {
                this.update(this.schema.fields);
            } else {
                this.update();
            }
        }
    }

    private init() {
        if (!this.fields) {
            return;
        }

        for (const item of this.fields) {
            if (item.conditions) {
                for (const condition of item.conditions) {
                    const values = this.values ? this.values[item.name] : {};
                    const ifField = item.fields?.find((f: any) => f.name === condition.ifCondition.field.name);
                    const currentConditionValue = (ifField && values) ? values[ifField.name] : undefined;
                    if (!currentConditionValue) {
                        continue;
                    }
                    if (currentConditionValue !== condition.ifCondition.fieldValue) {
                        for (const field of condition.thenFields) {
                            const thenField = item.fields?.find((f: any) => f.name === field.name);
                            if (thenField) {
                                (thenField as any).notCorrespondCondition = true;
                            }
                        }
                    } else {
                        for (const field of condition.thenFields) {
                            const thenField = item.fields?.find((f: any) => f.name === field.name);
                            if (thenField) {
                                (thenField as any).notCorrespondCondition = false;
                            }
                        }
                    }
                }
            }
        }
    }

    private update(schemaFields?: SchemaField[]) {
        if (!schemaFields) {
            return;
        }

        const fields: any[] = [];
        for (let i = 0; i < schemaFields.length; i++) {
            const field = schemaFields[i];
            if (this.hide[field.name]) {
                continue
            }
            const item: IFieldControl = {
                ...field,
                fullPath: field.fullPath || '',
                hide: false,
                isInvalidType: false,
                value: undefined,
                loading: false,
                list: [],
                pageIndex: 0,
                pageSize: 0,
                count: 0,
                imgSrc: '',
                open: false
            }
            if (!field.isArray && !field.isRef) {
                item.value = !this.values
                    || this.values[item.name] === null
                    || this.values[item.name] === undefined
                    ? ""
                    : this.values[item.name];
                if (this.isIPFS(field) && field.customType !== 'file') {
                    this.loadImg(item)
                }
            }
            if (!field.isArray && field.isRef) {
                item.fields = field.fields;
            }

            if (field.isArray && !field.isRef) {
                let value: IFieldIndexControl[] = [];
                if (this.values
                    && this.values[item.name] !== null
                    && this.values[item.name] !== undefined
                ) {
                    const fieldValue = this.values[item.name];
                    if (Array.isArray(fieldValue)) {
                        value = fieldValue.map((fieldItem) => {
                            return {
                                value: fieldItem,
                                imgSrc: '',
                                loading: false
                            };
                        });
                    }
                    else {
                        value = [{
                            value: fieldValue,
                            imgSrc: '',
                            loading: false
                        }]
                        item.isInvalidType = true;
                    }
                    if (this.isIPFS(field) && field.customType !== 'file') {
                        this.loadImgs(value);
                    }
                }

                item.list = value;
                item.count = item.list?.length;
                item.pageIndex = 0;
                item.pageSize = this.pageSize;
            }

            if (field.isArray && field.isRef) {
                item.fields = field.fields;
                let value: IFieldIndexControl[];
                if (this.values && this.values[item.name]) {
                    value = this.values[item.name];
                } else {
                    value = [];
                }

                item.list = value;
                item.count = item.list?.length;
                item.pageIndex = 0;
                item.pageSize = this.pageSize;
            }
            fields.push(item);
        }
        this.fields = fields;
    }

    private async loadImg(item: IFieldControl | IFieldIndexControl) {
        item.loading = true;
        if (this.dryRun) {
            return this.ipfs
                .getImageFromDryRunStorage(item.value)
                .then((res) => {
                    item.imgSrc = res;
                })
                .finally(() => {
                    item.loading = false;
                    this.changeDetector.detectChanges();
                });
        } else {
            return this.ipfs
                .getImageByLink(item.value)
                .then((res) => {
                    item.imgSrc = res;
                })
                .finally(() => {
                    item.loading = false;
                    this.changeDetector.detectChanges();
                });
        }
    }
    private loadImgs(items: IFieldIndexControl[]) {
        Promise.all(
            items.map(async (fieldItem: IFieldIndexControl) => {
                return this.loadImg(fieldItem);
            })
        ).finally(() => this.changeDetector.detectChanges());
    }

    public getCID(link: string): string {
        let matches = link?.match(
            /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/
        );
        return matches ? matches[0] : '';
    }

    public getItemsPage(item: IFieldControl) {
        const pageIndex = item.pageIndex || 0;
        const pageSize = item.pageSize || this.pageSize;
        const result = [];
        const startIndex = pageIndex * pageSize;
        const endIndex = startIndex + pageSize;
        for (let i = startIndex; i < endIndex && i < item.list.length; i++) {
            result.push(item.list[i]);
        }
        return result;
    }

    public isTime(item: IFieldControl): boolean {
        return item.type === 'string' && item.format === 'time';
    }

    public isDate(item: IFieldControl): boolean {
        return item.type === 'string' && item.format === 'date';
    }

    public isDateTime(item: IFieldControl): boolean {
        return item.type === 'string' && item.format === 'date-time';
    }

    public isBoolean(item: IFieldControl): boolean {
        return item.type === 'boolean';
    }

    public isIPFS(item: SchemaField): boolean {
        if (item.pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+'
            || item.pattern === '^ipfs:\/\/.+') {
        }
        return item.pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+'
            || item.pattern === '^ipfs:\/\/.+';
    }

    public isInput(item: IFieldControl): boolean {
        return (
            (
                item.type === 'string' ||
                item.type === 'number' ||
                item.type === 'integer'
            ) && (
                item.format !== 'date' &&
                item.format !== 'time' &&
                item.format !== 'date-time'
            )
        );
    }

    public isPrefix(item: IFieldControl): boolean {
        return item.unitSystem === UnitSystem.Prefix;
    }

    public isPostfix(item: IFieldControl): boolean {
        return item.unitSystem === UnitSystem.Postfix;
    }

    public onPage(item: IFieldControl, event: any): void {
        item.pageIndex = event.pageIndex;
        item.pageSize = event.pageSize;
    }

    public ifFieldVisible(item: IFieldControl): boolean {
        return !item.hide && !item.notCorrespondCondition;
    }

    public ifSimpleField(item: IFieldControl): boolean {
        return !item.isArray && !item.isRef;
    }

    public ifSubSchema(item: IFieldControl): boolean {
        return !item.isArray && item.isRef;
    }

    public ifSimpleArray(item: IFieldControl): boolean {
        return item.isArray && !item.isRef;
    }

    public ifSubSchemaArray(item: IFieldControl): boolean {
        return item.isArray && item.isRef;
    }

    public isRules(item: IFieldControl) {
        return this.rules ? this.rules[item.fullPath] : undefined;
    }

    public isRulesStatus(item: IFieldControl) {
        return this.rules?.[item.fullPath]?.status;
    }

    public isFormulas(item: IFieldControl) {
        return this.formulas ? this.formulas[item.fullPath] : undefined;
    }

    public showFormulas(formulas: any) {
        const dialogRef = this.dialogService.open(FormulasViewDialog, {
            showHeader: false,
            width: '950px',
            styleClass: 'guardian-dialog',
            data: formulas,
        });
        dialogRef.onClose.subscribe((result: any) => { });
    }
}
