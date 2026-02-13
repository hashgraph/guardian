import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { UntypedFormArray } from '@angular/forms';
import { Schema, SchemaField, SchemaRuleValidateResult, UnitSystem } from '@guardian/interfaces';
import { Subject, takeUntil } from 'rxjs';
import { IPFSService } from 'src/app/services/ipfs.service';
import { API_IPFS_GATEWAY_URL, IPFS_SCHEMA } from '../../../services/api';
import { FieldForm, IFieldControl, IFieldIndexControl } from '../schema-form-model/field-form';
import { getMinutesAgoStream } from 'src/app/utils/autosave-utils';

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

enum ErrorFieldMessageByFieldType {
    Email = "Please make sure the field contain a valid email address",
    Number = "Please make sure the field contain a valid number value",
    Duration = "Please make sure the field contain a valid duration value",
    Integer = "Please make sure the field contain a valid integer value",
    URL = "Please make sure the field contain a valid URL value",
    URI = "Please make sure the field contain a valid URI value",
    DateTime = "Please make sure the field contain a valid datetime value",
    Date = "Please make sure the field contain a valid date value",
    Other = "Please make sure the field contain a valid value"
};

enum ErrorArrayMessageByFieldType {
    Email = "Please make sure all fields contain a valid email address",
    Number = "Please make sure all fields contain a valid number value",
    Duration = "Please make sure all fields contain a valid duration value",
    Integer = "Please make sure all fields contain a valid integer value",
    URL = "Please make sure all fields contain a valid URL value",
    URI = "Please make sure all fields contain a valid URI value",
    DateTime = "Please make sure all fields contain a valid datetime value",
    Date = "Please make sure all fields contain a valid date value",
    Other = "Please make sure all fields contain a valid value"
};

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
})
export class SchemaFormComponent implements OnInit {
    @Input('form-model') formModel!: FieldForm;
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
    @Input() paginationHidden: boolean = true;
    @Input() isFormForFinishSetup: boolean = false;
    @Input() isFormForRequestBlock: boolean = false;
    @Input() lastSavedAt?: Date;
    @Input() isEditMode: boolean = false;

    @Output() change = new EventEmitter<Schema | null>();
    @Output() destroy = new EventEmitter<void>();
    @Output() cancelBtnEvent = new EventEmitter<boolean>();
    @Output() submitBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();
    @Output() saveBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean | null>();
    @Output() updatableBtnEvent = new EventEmitter();
    @Output() buttons = new EventEmitter<any>();
    @Output() onAccordionSelect = new EventEmitter<string>();

    public minutesAgo$ = getMinutesAgoStream(() => this.lastSavedAt);

    public destroy$: Subject<boolean> = new Subject<boolean>();
    public isShown: boolean[] = [true];
    public currentIndex: number = 0;
    public buttonsConfig: IButton[] = [];
    public editButtonConfig: IButton;
    private controlsIndex: Map<string, { ancestors: IFieldControl<any>[], field: IFieldControl<any>, listItem?: any }> = new Map();

    constructor(
        private ipfs: IPFSService,
        protected changeDetectorRef: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.formModel && this.formModel.controls) {
            for (const item of this.formModel.controls) {
                this.updateRemoteFiles(item);
            }
        }
        this.updatePages();
        try { 
            this.buildControlsIndex(); 
        } catch (e) {
             console.error('[schema-form] buildControlsIndex failed', e); 
        }
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
        if (!this.isEditMode) {
            this.createButtons();
        } else {
            this.createEditModeButton()
        }
    }

    private buildControlsIndex() {
        this.controlsIndex.clear();
        const walk = (controls: IFieldControl<any>[] | undefined | null, ancestors: IFieldControl<any>[]) => {
            if (!controls || !Array.isArray(controls)) return;
            for (const field of controls) {
                const entryAnc = ancestors.slice();
                if (field.id) {
                    this.controlsIndex.set(field.id, { ancestors: entryAnc, field });
                }

                if (field.isArray) {
                    const list = Array.isArray((field as any).list) ? (field as any).list : [];
                    for (const listItem of list) {
                        const idx = (listItem as any).index2 ?? (listItem as any).index;
                        const composite = `${field.id}-${idx}`;
                        this.controlsIndex.set(composite, { ancestors: entryAnc.concat([field]), field, listItem });
                    }
                }

                const childControls = Array.isArray((field as any).model?.controls) ? (field as any).model.controls : undefined;
                if (Array.isArray(childControls) && childControls.length > 0) {
                    walk(childControls, entryAnc.concat([field]));
                }
            }
        };

        walk(this.formModel?.controls, []);
    }

    ngOnDestroy() {
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
                return this.currentIndex === 0 && !this.cancelHidden;
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
            id: 'prev',
            visible: () => {
                if (!this.formModel?.controls || this.isChildSchema) {
                    return false;
                }
                return this.currentIndex !== 0;
            },
            disabled: () => {
                return false;
            },
            text: 'Previous',
            class: 'p-button-outlined',
            type: 'secondary',
            fn: () => {
                this.getPrevShownFields(this.formModel?.controls);
            },
        }, {
            id: 'next',
            visible: () => {
                if (!this.formModel?.controls || this.isChildSchema) {
                    return false;
                }
                return !this.isShown[this.formModel.controls.length - 1];
            },
            disabled: () => {
                return false;
            },
            text: 'Next',
            class: 'p-button',
            type: 'primary',
            fn: () => {
                this.getNextShownFields(this.formModel?.controls);
            },
        }, {
            id: 'submit',
            visible: () => {
                if (!this.formModel?.controls || this.isChildSchema) {
                    return false;
                }
                return !!this.isShown[this.formModel.controls.length - 1] && !this.submitHidden;
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
        this.formModel?.removeItem(item, listItem);
        this.formModel?.updateValueAndValidity();
        this.changeDetectorRef.detectChanges();
        this.change.emit();
    }

    public patchSuggestValue(item: IFieldControl<any>) {
        this.formModel?.patchSuggestValue(item);
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

    public ifInvalidField(item: IFieldControl<any> | IFieldIndexControl<any>): boolean {
        return (item.control && !item.control.valid && !item.control.disabled);
    }

    public ifRequiredField(item: IFieldControl<any>): boolean {
        return item.required && !item.control.disabled;
    }

    public isRules(item: IFieldControl<any>) {
        return this.rules ? this.rules[item.fullPath] : undefined;
    }

    public isRulesStatus(item: IFieldControl<any>) {
        return this.rules?.[item.fullPath]?.status;
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
        );
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
                    listItem.fileUploading = false;
                }, (error) => {
                    listItem.fileUploading = false;
                });

            input.remove();
        }
        input.click();
    }


    public getInvalidMessageByFieldType(item: IFieldControl<any>, itemFromList?: IFieldIndexControl<any>): string {
        const type = item.format || item.type;
        const messages = item.isArray
            ? ErrorArrayMessageByFieldType
            : ErrorFieldMessageByFieldType;

        if (item.control?.errors?.[item.id]) {
            return item.control.errors[item.id];
        } else if (itemFromList?.control?.errors?.[item.id]) {
            return itemFromList.control.errors[item.id];
        }

        switch (type) {
            case 'email':
                return messages.Email;
            case 'number':
                return messages.Number;
            case 'duration':
                return messages.Duration;
            case 'integer':
                return messages.Integer;
            case 'url':
                return messages.URL;
            case 'uri':
                return messages.URI;
            case 'date-time':
                return messages.DateTime;
            case 'date':
                return messages.Date;
            default:
                return messages.Other;
        }
    }

    public getPlaceholderByFieldType(item: IFieldControl<any>): string {
        const type = item.format || item.type;
        const pattern = item.pattern;
        const customType = item.customType;
        if (customType) {
            switch (customType) {
                case 'hederaAccount':
                    return PlaceholderByFieldType.HederaAccount;
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

    private getNextShownFields(fields: SchemaField[] | undefined | null): boolean[] {
        if (!fields) {
            return this.isShown;
        }
        this.isShown = new Array(fields.length).fill(false);
        let nextRefIndex = -1;
        let initialDivision = 0;
        for (let i = this.currentIndex + 1; i < fields.length; i++) {
            nextRefIndex = i;
            if (fields[i].isRef) {
                if (this.currentIndex == 0 && initialDivision == 0) {
                    initialDivision = 1;
                    this.currentIndex = i;
                    this.isShown = new Array(fields.length).fill(false);
                    if (fields[this.currentIndex].isRef && fields[this.currentIndex - 1].isRef) {
                        this.isShown[this.currentIndex] = true;
                        break;
                    }
                    continue;
                }
                break;
            }
            this.isShown[i] = true;
        }
        if (nextRefIndex !== -1) {
            if (this.currentIndex === 0) {
                this.currentIndex = -1;
            }
            for (let i = this.currentIndex + 1; i <= nextRefIndex; i++) {
                this.isShown[i] = true;
            }
            this.currentIndex = nextRefIndex;
        }
        this.buttons.emit(this.buttonsConfig);

        this.updateScroll();

        return this.isShown;
    }

    private getPrevShownFields(fields: SchemaField[] | undefined | null): boolean[] {
        if (!fields) {
            return this.isShown;
        }
        this.isShown = new Array(fields.length).fill(false);
        let prevRefIndex = -1;
        if (this.currentIndex === 0) {
            // If the current index is already at the beginning of the array,
            // show all fields with isRef set to false
            for (let i = 0; i < fields.length; i++) {
                if (!fields[i].isRef) {
                    this.isShown[i] = true;
                }
            }
        } else {
            for (let i = this.currentIndex - 1; i >= 0; i--) {
                if (fields[i].isRef) {
                    prevRefIndex = i;
                    for (let j = prevRefIndex - 1; j >= 0; j--) {
                        if (fields[j].isRef) {
                            break
                        } else if (j == 0) {
                            prevRefIndex = 0;
                        }
                    }
                    break;
                }
                //this.isShown[i] = true;
                this.currentIndex = i;
            }
            if (prevRefIndex !== -1) {
                for (let i = this.currentIndex - 1; i >= prevRefIndex; i--) {
                    this.isShown[i] = true;
                }
                this.currentIndex = prevRefIndex;
            }
        }
        this.buttons.emit(this.buttonsConfig);

        this.updateScroll();

        return this.isShown;
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

    public showPage(item: IFieldControl<any>, index: number): boolean {
        return this.isShown[index] || this.isChildSchema;
    }

    private updateScroll() {
        const contentElement = document.querySelector('#main-content');
        const formElement = document.querySelector('.schema-form');
        setTimeout(() => {
            if (window.innerWidth <= 810) {
                contentElement!.scrollTo({
                    top: -1,
                    behavior: 'smooth'
                });
            } else {
                if (formElement) {
                    formElement.scrollTo({
                        top: -1,
                        behavior: 'smooth'
                    });
                }
            }
        }, 100)
    }

    public openField(link?: string): void {
        if (!link || !this.formModel?.controls) return;

        let found = false;
        let parts:any = [];
        if (link.includes(';')) {
            parts = link.split(';').map(p => p.trim()).filter(p => p.length > 0);
            if (parts.length > 0) {
                const leaf = parts[parts.length - 1];
                const idxEntry = this.controlsIndex.get(leaf);
                if (idxEntry) {
                    for (const anc of idxEntry.ancestors || []) anc.open = true;
                    idxEntry.field.open = true;
                    if (idxEntry.listItem) idxEntry.listItem.open = true;
                    found = true;
                } else {
                    found = this.findAndOpenByParts(parts, this.formModel.controls);
                }
            }
        } else {
            const idxEntry = this.controlsIndex.get(link);
            if (idxEntry) {
                for (const anc of idxEntry.ancestors || []) anc.open = true;
                idxEntry.field.open = true;
                if (idxEntry.listItem) idxEntry.listItem.open = true;
                found = true;
            } else {
                found = this.findAndOpen(this.formModel.controls, link);
            }
        }

        if (found) {
            try {
                this.changeDetectorRef.detectChanges();
            } catch (e) {
                console.error(e);
            }
            this.scrollToAccordionAttr(parts[parts.length - 1]);
        }
    }

    private findAndOpen(controls: IFieldControl<any>[] | undefined | null, target: string): boolean {
        if (!controls || !Array.isArray(controls)) return false;

        for (const field of controls) {
            (field as any).link = undefined;
            if (field.id === target) {
                field.open = true;
                return true;
            }

            if (field.isArray) {
                const list = Array.isArray((field as any).list) ? (field as any).list : [];
                for (const listItem of list) {
                    const idx = (listItem as any).index2 ?? (listItem as any).index;
                    const composite = `${field.id}-${idx}`;
                    if (composite === target) {
                        field.open = true;
                        (listItem as any).open = true;
                        return true;
                    }
                    
                    const itemChildControls = Array.isArray((field as any).model?.controls) ? (field as any).model.controls : undefined;
                    if (Array.isArray(itemChildControls) && itemChildControls.length > 0) {
                        const foundInItem = this.findAndOpen(itemChildControls, target);
                        if (foundInItem) {
                            field.open = true;
                            return true;
                        }
                    }
                }
            }

            const childControls = Array.isArray((field as any).model?.controls) ? (field as any).model.controls : undefined;
            if (Array.isArray(childControls) && childControls.length > 0) {
                const foundInChild = this.findAndOpen(childControls, target);
                if (foundInChild) {
                    field.open = true;
                    return true;
                }
            }
        }

        return false;
    }

    private findAndOpenByParts(parts: string[], controls: IFieldControl<any>[] | undefined | null, idx: number = 0): boolean {
        if (!controls || !Array.isArray(controls) || idx >= parts.length) return false;

        const part = parts[idx];

        for (const field of controls) {
            if (field.id === part) {
                field.open = true;
                if (idx === parts.length - 1) {
                    return true;
                }
                const childControls = Array.isArray((field as any).model?.controls) ? (field as any).model.controls : undefined;
                if (Array.isArray(childControls) && childControls.length > 0) {
                    const found = this.findAndOpenByParts(parts, childControls, idx + 1);
                    if (found) {
                        field.open = true;
                        return true;
                    }
                }
                continue;
            }

            if (field.isArray) {
                const list = Array.isArray((field as any).list) ? (field as any).list : [];
                for (const listItem of list) {
                    const itemIdx = (listItem as any).index2 ?? (listItem as any).index;
                    const composite = `${field.id}-${itemIdx}`;
                    if (composite === part) {
                        field.open = true;
                        (listItem as any).open = true;
                        if (idx === parts.length - 1) {
                            return true;
                        }
                        const itemChildControls = Array.isArray((field as any).model?.controls) ? (field as any).model.controls : undefined;
                        if (Array.isArray(itemChildControls) && itemChildControls.length > 0) {
                            const foundInItem = this.findAndOpenByParts(parts, itemChildControls, idx + 1);
                            if (foundInItem) {
                                field.open = true;
                                (listItem as any).open = true;
                                return true;
                            }
                        }
                    }
                }
            }

            const childControls = Array.isArray((field as any).model?.controls) ? (field as any).model.controls : undefined;
            if (Array.isArray(childControls) && childControls.length > 0) {
                const foundInChild = this.findAndOpenByParts(parts, childControls, idx);
                if (foundInChild) {
                    field.open = true;
                    return true;
                }
            }
        }

        return false;
    }

    private scrollToAccordionAttr(value: string) {
        setTimeout(() => {
            try {
                this.changeDetectorRef.detectChanges();
            } catch (e) { }

            const attrSelector = `[accordionTabId="${value}"]`;

            try {
                const node = document.querySelector(attrSelector) as Element | null;
                if (node) {
                    (node as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            } catch (e) { }
        }, 500);
    }

    public onAccordionSelectEvent(isOpen: any, item: IFieldControl<any>, index: string = '', childrenAccordionId?: string) {
        let accordionId = item.id;
        if (index) {
            accordionId = `${accordionId} #${index}`;
        }

        if (childrenAccordionId) {
            accordionId = `${accordionId};${childrenAccordionId}`;
        }
        this.onAccordionSelect.emit(accordionId);
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

    private updatePages() {
        if (this.formModel && this.formModel.controls) {
            for (let i = 0; i < this.formModel.controls.length; i++) {
                const item = this.formModel.controls[i];
                if (item.isRef) {
                    this.isShown[i] = true;
                    break;
                } else {
                    this.isShown[i] = true;
                }
            }
        }
    }
}

