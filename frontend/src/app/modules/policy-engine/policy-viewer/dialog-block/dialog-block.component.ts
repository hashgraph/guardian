import {Component, OnInit, Inject} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

/**
 * Component for display a block inside a dialog.
 */
@Component({
    selector: 'dialog-block',
    templateUrl: './dialog-block.component.html',
    styleUrls: ['./dialog-block.component.scss']
})
export class DialogBlock {
    title: string = '';
    block: any = null;
    static: any = null;
    policyId: any = null;
    policyStatus: any = null;
    dryRun: any = null;

    public data: any

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.data = this.config.data;
    }

    ngOnInit() {
        this.block = this.data.block;
        this.static = this.data.static;
        this.title = this.data.title;
        this.policyId = this.data.policyId;
        this.policyStatus = this.data.policyStatus;
        this.dryRun = this.data.dryRun;
    }

    onClose(): void {
        this.dialogRef.close(null);
    }
}
