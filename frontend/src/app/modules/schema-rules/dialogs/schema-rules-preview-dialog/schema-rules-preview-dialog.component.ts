import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IFormula, IVariable } from '../../../common/models/assessment';
import { Formula } from 'src/app/utils';

@Component({
    selector: 'schema-rules-preview-dialog',
    templateUrl: './schema-rules-preview-dialog.component.html',
    styleUrls: ['./schema-rules-preview-dialog.component.scss'],
})
export class SchemaRulesPreviewDialog {
    public loading = true;
    public item: any;
    public preview: any[];
    
    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.item = this.config.data?.item || {};

        const configuration = this.item.config || {};
        const variables = configuration.variables || [];
        this.preview = [];
        
        for (const variable of variables) {
            this.preview.push({
                id: variable.id,
                description: variable.fieldDescription || '',
                value: null
            });
        }
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
    }

    private calcFormula(item: IFormula, scope: any): any {
        try {
            return Formula.evaluate(item.formula, scope);
        } catch (error) {
            return NaN;
        }
    }
}
