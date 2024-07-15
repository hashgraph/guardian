import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'policy-test-dialog',
    templateUrl: './policy-test-dialog.component.html',
    styleUrls: ['./policy-test-dialog.component.scss'],
})
export class PolicyTestDialog {
    public loading = true;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        const policy = this.config.data.policy;
    }

    ngOnInit() {
        this.loading = true;
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onCompare() {

    }
}
