import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-meeco-vc-submit-dialog',
    templateUrl: './meeco-vc-submit-dialog.component.html',
    styleUrls: ['./meeco-vc-submit-dialog.component.scss'],
})
export class MeecoVCSubmitDialogComponent {
    vcSubject: any;

    constructor(@Inject(MAT_DIALOG_DATA) private data: { document: any; }) {
      this.vcSubject = JSON.stringify(this.data.document, null, 4);
    }

    onReject(): void {}

    onApprove(): void {}
}
