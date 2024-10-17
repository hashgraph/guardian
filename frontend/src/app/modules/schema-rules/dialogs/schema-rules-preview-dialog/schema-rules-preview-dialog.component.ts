import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ISchemaRuleData } from '@guardian/interfaces';
import { FieldRuleValidators } from 'src/app/modules/common/models/field-rule-validator';


@Component({
    selector: 'schema-rules-preview-dialog',
    templateUrl: './schema-rules-preview-dialog.component.html',
    styleUrls: ['./schema-rules-preview-dialog.component.scss'],
})
export class SchemaRulesPreviewDialog {
    public loading = true;
    public item: any;
    public preview: any[];
    public rules: FieldRuleValidators;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.item = this.config.data?.item || {};

        const configuration = this.item.config || {};

        const variables: ISchemaRuleData[] = configuration.fields || [];

        this.preview = [];
        for (const variable of variables) {
            this.preview.push({
                id: variable.id,
                description: variable.fieldDescription || '',
                value: null
            });
        }

        this.rules = new FieldRuleValidators(variables);
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit() {
        const document: any = {};
        for (const field of this.preview) {
            document[field.id] = field.value;
        }

        const result = this.rules.checkValue(document);

        for (const field of this.preview) {
            field.status = result[field.id];
        }
    }
}
