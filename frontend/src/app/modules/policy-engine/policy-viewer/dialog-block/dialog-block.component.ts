import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Component for display a block inside a dialog.
 */
@Component({
    selector: 'dialog-block',
    templateUrl: './dialog-block.component.html',
    styleUrls: ['./dialog-block.component.scss']
})
export class DialogBlock {
    title: string = "";
    block: any = null;
    static: any = null;
    policyId: any = null;
    dryRun: any = null;

    constructor(
        public dialogRef: MatDialogRef<DialogBlock>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }

    ngOnInit() {
        this.block = this.data.block;
        this.static = this.data.static;
        this.title = this.data.title;
        this.policyId = this.data.policyId;
        this.dryRun = this.data.dryRun;
    }

    onClose(): void {
        this.dialogRef.close(null);
    }
}