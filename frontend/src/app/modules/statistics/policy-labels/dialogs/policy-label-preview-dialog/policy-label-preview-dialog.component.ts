import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IPolicyLabelConfig } from '@guardian/interfaces';
import { LabelValidators } from 'src/app/modules/common/models/label-validator';


@Component({
    selector: 'policy-label-preview-dialog',
    templateUrl: './policy-label-preview-dialog.component.html',
    styleUrls: ['./policy-label-preview-dialog.component.scss'],
})
export class PolicyLabelPreviewDialog {
    public loading = true;
    public item: any;
    public validator: LabelValidators;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.item = this.config.data?.item || {};
        const configuration: IPolicyLabelConfig = this.item.config || {};
        this.validator = new LabelValidators(configuration);
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
        const result = this.validator.validate(document);
    }
}
