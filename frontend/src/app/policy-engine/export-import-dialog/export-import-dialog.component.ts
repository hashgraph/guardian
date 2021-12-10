import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

/**
 * Dialog for export/import policy.
 */
@Component({
    selector: 'export-import-dialog',
    templateUrl: './export-import-dialog.component.html',
    styleUrls: ['./export-import-dialog.component.css']
})
export class ExportPolicyDialog {
    loading = true;
    policyId!: any;
    policy!: any;

    constructor(
        public dialogRef: MatDialogRef<ExportPolicyDialog>,
        private policyEngineService: PolicyEngineService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.policyId = data.policyId;
        this.policy = data.policy;
    }

    ngOnInit() {
        this.loading = false;
        // this.loading = true;
        // this.policyEngineService.exportPolicy(this.policyId).subscribe((data: any) => {
        //     this.setData(data);
        //     setTimeout(() => {
        //         this.loading = false;
        //     }, 500);
        // }, (e) => {
        //     this.loading = false;
        // });
    }

    setData(data: any) {
        // this.policy = data.policy;
        // this.schemas = data.schemas;
        // this.tokens = data.tokens;
        // console.log(data);
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    onImport() {
        this.dialogRef.close(true);
    }
}