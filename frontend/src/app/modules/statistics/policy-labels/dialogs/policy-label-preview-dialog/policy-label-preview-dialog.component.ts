import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IValidatorNode, IValidatorStep, LabelValidators } from 'src/app/modules/common/models/label-validator';


@Component({
    selector: 'policy-label-preview-dialog',
    templateUrl: './policy-label-preview-dialog.component.html',
    styleUrls: ['./policy-label-preview-dialog.component.scss'],
})
export class PolicyLabelPreviewDialog {
    public loading = true;
    public item: any;
    public validator: LabelValidators;
    public tree: any;
    public current: IValidatorStep | null;
    public menu: IValidatorNode[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.item = this.config.data?.item || {};
        this.validator = new LabelValidators(this.item);
        this.validator.setData([]);

        this.tree = this.validator.getTree();
        this.current = this.validator.start();
        this.menu = []
        for (const child of this.tree.children) {
            this.createMenu(child, this.menu);
        }
    }

    private createMenu(node: any, result: any[]) {
        result.push(node);
        for (const child of node.children) {
            this.createMenu(child, result);
        }
        return result;
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onPrev(): void {
        this.current = this.validator.prev();
    }

    public onNext(): void {
        this.current = this.validator.next();
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit() {
        const result = this.validator.validate();
    }
}
