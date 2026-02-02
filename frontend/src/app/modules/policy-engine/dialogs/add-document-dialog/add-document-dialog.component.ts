import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Schema } from '@guardian/interfaces';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'add-document-dialog',
    templateUrl: './add-document-dialog.component.html',
    styleUrls: ['./add-document-dialog.component.scss'],
})
export class AddDocumentDialog {
    public loading = true;
    public schemas: any[] | null;
    public schema: Schema | null;
    public policyId: string;
    public title: string;
    public search: string;
    public selectedSchema: Schema | null;
    public value: any;

    public dataType: string = 'schema';
    public error: any;
    public schemaValue: UntypedFormGroup;
    public jsonValue: string;
    public fileValue: any;
    public _value: any;
    public fileExtension = 'json';
    public fileLabel = 'Add json .json file';
    public fileBuffer: any;
    public edit: boolean = false;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: UntypedFormBuilder,
        private dialogService: DialogService,
    ) {
        this.title = 'Select Schema';
        this.schemas = this.config.data?.schemas || null;
        this.schema = this.config.data?.schema || null;
        this.policyId = this.config.data?.policyId || '';
        this.value = this.config.data?.value;
        this.selectedSchema = null;
        if (this.schemas) {
            for (const s of this.schemas) {
                s.name = s.name || '';
                s.search = true;
            }
        }
        this.schemaValue = this.fb.group({});
        this.jsonValue = '';
        if (this.schema) {
            this.title = 'Set Document';
        }
    }

    ngOnInit() {
        if (this.value) {
            this.title = 'Edit Document';
            this.edit = true;
        }
        setTimeout(() => {
            if (this.value) {
                this.title = 'Edit Document';
                this.edit = true;
                this.setValue(this.value);
            }
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, 500);
    }

    ngOnDestroy(): void {
    }

    public initForm($event: any) {
        this.schemaValue = $event;
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit(): void {
        this.error = null;
        try {
            this._value = this.getJsonValue();
        } catch (error) {
            this.error = error?.toString();
            return;
        }
        this.ref.close({
            schema: this.schema?.iri,
            name: this.schema?.name,
            document: this._value
        });
    }

    public onFilter() {
        if (this.schemas) {
            const search = (this.search || '').toLowerCase();
            for (const s of this.schemas) {
                s.search = s.name.toLowerCase().includes(search);
            }
        }
    }

    public onSelect(schema: any) {
        this.selectedSchema = schema;
    }

    public onNext() {
        if (this.selectedSchema) {
            this.schema = this.selectedSchema;
            this.title = 'Set Document';
            this.loading = true;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }
    }

    public onPrev() {
        this.schema = null;
        this.title = 'Select Schema';
    }

    public importFromFile(event: any) {
        const reader = new FileReader()
        reader.readAsText(event);
        reader.addEventListener('load', (e: any) => {
            this.fileBuffer = e.target.result;
            this.fileValue = JSON.parse(this.fileBuffer);
        });
    }

    private getJsonValue() {
        switch (this.dataType) {
            case 'schema':
                return this.schemaValue.value;
            case 'json':
                const json = JSON.parse(this.jsonValue);
                return json;
            case 'file':
                return this.fileValue;
            default:
                return this._value;
        }
    }

    private setValue(value: any) {
        try {
            if (value) {
                this._value = value;
                this.schemaValue.setValue(value);
                this.jsonValue = JSON.stringify(value, null, 4);
                this.fileValue = JSON.stringify(value, null, 4);
            }
        } catch (error) {
            this.error = error?.toString();
        }
    }
}
