import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, SchemaField, SchemaRuleValidateResult, UnitSystem } from '@guardian/interfaces';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FormulasViewDialog } from '../../formulas/dialogs/formulas-view-dialog/formulas-view-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';

type SchemaFieldPredicate = { field: any; fieldValue: any } | { field: any; const: any };
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
    link?: string | undefined;
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
    @Input('discussion') discussionData?: any;
    @Input('discussion-action') discussionAction: boolean = false;
    @Input('discussion-view') discussionView: boolean = false;
    @Input() link?: string | undefined;

    @Output('discussion-action') discussionActionEvent = new EventEmitter<any>();

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
        if (changes.link) {
            this.openField(this.link);
        }
    }

    private init() {
        if (!this.fields) {
            return;
        }

        for (const item of this.fields) {
            if (!item.conditions || !Array.isArray(item.conditions)) continue;

            const subValues = this.values ? this.values[item.name] : {};

            for (const condition of item.conditions) {
                const ic = condition?.ifCondition;
                if (!ic) continue;

                const condTrue = this.evaluateIfCondition(ic, subValues);

                for (const field of (condition.thenFields ?? [])) {
                    const thenField = item.fields?.find((f: any) => f.name === field.name);
                    if (thenField) {
                        (thenField as any).notCorrespondCondition = !condTrue;
                    }
                }
                for (const field of (condition.elseFields ?? [])) {
                    const elseField = item.fields?.find((f: any) => f.name === field.name);
                    if (elseField) {
                        (elseField as any).notCorrespondCondition = condTrue;
                    }
                }
            }
        }
    }

    private isSingleIF(ic: any): ic is { field: any; fieldValue: any } {
        return ic && 'field' in ic && 'fieldValue' in ic;
    }

    private isAND(ic: any): ic is { AND: SchemaFieldPredicate[] } {
        return ic && 'AND' in ic && Array.isArray(ic.AND);
    }

    private isOR(ic: any): ic is { OR: SchemaFieldPredicate[] } {
        return ic && 'OR' in ic && Array.isArray(ic.OR);
    }

    private getPredicates(ic: any): { field: any; fieldValue: any }[] {
        if (this.isSingleIF(ic)) {
            return [{ field: ic.field, fieldValue: ic.fieldValue }];
        }
        if (this.isAND(ic)) {
            return ic.AND.map(p => ({ field: (p as any).field, fieldValue: (p as any).fieldValue ?? (p as any).const }));
        }
        if (this.isOR(ic)) {
            return ic.OR.map(p => ({ field: (p as any).field, fieldValue: (p as any).fieldValue ?? (p as any).const }));
        }
        return [];
    }

    private evaluateIfCondition(
        ic: any,
        subValues: any
    ): boolean {
        const preds = this.getPredicates(ic);
        if (preds.length === 0) {
            return false;
        }

        const check = (pred: { field: any; fieldValue: any }) => {
            const fieldName = pred.field?.name;
            if (!fieldName) {
                return false;
            }
            const current = subValues ? subValues[fieldName] : undefined;
            return current === pred.fieldValue;
        };

        if (this.isSingleIF(ic)) {
            return check(preds[0]);
        }
        if (this.isAND(ic)) {
            return preds.every(check);
        }
        if (this.isOR(ic)) {
            return preds.some(check);
        }
        return false;
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
                item.format !== 'date-time' &&
                item.customType !== 'table'
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

    public isDiscussion(item: IFieldControl) {
        return (this.discussionView && (
            this.isInput(item) ||
            this.isDateTime(item) ||
            this.isDate(item) ||
            this.isBoolean(item) ||
            this.isInput(item)
        ));
    }

    public isDiscussionCount(item: IFieldControl) {
        // return 10;
        return this.discussionData ? this.discussionData[item.fullPath] : 0;
    }

    public openDiscussion(item: IFieldControl) {
        this.discussionActionEvent.emit({
            type: 'open',
            field: item.fullPath,
            fieldName: item.title
        });
    }

    public linkMessage(item: IFieldControl) {
        this.discussionActionEvent.emit({
            type: 'link',
            field: item.fullPath,
            fieldName: item.title
        });
    }

    public onDiscussionAction($event: any) {
        this.discussionActionEvent.emit($event);
    }

    public openField(link?: string): void {
        let _rootLink: string | undefined = undefined;
        let _subLink: string | undefined = undefined;
        if (link) {
            const index = link.indexOf('.');
            if (index > -1) {
                _rootLink = link.substring(0, index);
                _subLink = link.substring(index + 1) || undefined;
            } else {
                _rootLink = link;
                _subLink = undefined;
            }
        } else {
            _rootLink = undefined;
            _subLink = undefined;
        }

        if (_rootLink && this.fields) {
            for (const field of this.fields) {
                if (field.name === _rootLink) {
                    field.open = true;
                    field.link = _subLink;
                } else {
                    field.link = undefined;
                }
            }
        }
    }
}
