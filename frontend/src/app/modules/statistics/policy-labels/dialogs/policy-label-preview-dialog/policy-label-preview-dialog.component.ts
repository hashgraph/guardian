import { Component } from '@angular/core';
import { IValidateStatus, IValidatorNode, IValidatorStep, LabelValidators } from '@guardian/interfaces';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';


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
    public steps: any[];
    public current: IValidatorStep | null;
    public menu: IValidatorNode[];
    public result: IValidateStatus | undefined;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.item = this.config.data?.item || {};
        this.validator = new LabelValidators(this.item);
        this.validator.setData([]);

        this.tree = this.validator.getTree();
        this.steps = this.validator.getSteps();
        this.current = this.validator.start();

        this.tree.children.push({
            name: 'Result',
            item: this.validator,
            selectable: true,
            children: []
        })

        this.steps.push({
            name: 'Result',
            title: 'Result',
            item: this.validator,
            type: 'result',
            config: this.validator,
            auto: false,
            update: this.update.bind(this)
        })

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

    private update() {
        this.result = this.validator.getStatus();
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public isSelected(menuItem: any): boolean {
        return menuItem.item === this.current?.item;
    }

    public getVariableValue(value: any): any {
        if (value === undefined) {
            return 'N/A';
        } else {
            return value;
        }
    }

    public onPrev(): void {
        this.current = this.validator.prev();
        this.updateStep();
    }

    public onNext(): void {
        this.current = this.validator.next();
        this.updateStep();
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit() {
        const result = this.validator.getStatus();
        this.ref.close(null);
    }

    public updateStep() {
        if (this.current?.type === 'scores') {
            let valid = true;
            if (Array.isArray(this.current.config)) {
                for (const score of this.current.config) {
                    let validScore = score.value !== undefined;
                    valid = valid && validScore;
                }
            }
            this.current.disabled = !valid;
        }
    }
}
