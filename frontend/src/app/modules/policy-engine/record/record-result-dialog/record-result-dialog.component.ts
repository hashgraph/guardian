import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { RecordService } from 'src/app/services/record.service';

/**
 * Dialog for creating theme.
 */
@Component({
    selector: 'record-result-dialog',
    templateUrl: './record-result-dialog.component.html',
    styleUrls: ['./record-result-dialog.component.scss']
})
export class RecordResultDialog {
    public loading: boolean = false;
    public started = false;
    public title: string;
    public text: string;
    public results: any[];
    public policyId: any;
    public recordId: any;
    public total: any;
    public info: any;

    constructor(
        public dialog: MatDialog,
        public dialogRef: MatDialogRef<RecordResultDialog>,
        private recordService: RecordService,
        @Inject(MAT_DIALOG_DATA) public data: any) {

        this.title = 'Playback completed';
        this.text = 'Playback completed';
        if (data) {
            this.recordId = data.recordId;
            this.policyId = data.policyId;
        } else {
            this.recordId = null;
            this.policyId = null;
        }
    }

    ngOnInit() {
        this.started = true;
        this.loading = true;
        this.recordService.getRecordResults(this.policyId).subscribe((results) => {
            this.total = results?.total;
            this.info = results?.info;
            this.results = results?.documents;
            if (Array.isArray(this.results)) {
                for (const item of this.results) {
                    if (!item.rate || item.rate === '-') {
                        item.rate = '0%';
                    }
                }
            }
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    openDocument(item: any): void {
        const document = item.document;
        const title = `${item.type.toUpperCase()} Document`;
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                id: document.id,
                dryRun: true,
                document: document,
                title: title,
                type: 'JSON',
            }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
        });
    }

    onDetails(): void {
        this.dialogRef.close('Details');
    }

    onFinish(): void {
        this.dialogRef.close('Finish');
    }
}
