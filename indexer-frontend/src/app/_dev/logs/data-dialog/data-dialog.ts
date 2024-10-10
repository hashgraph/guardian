import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

export interface DialogData {
    data: string;
}

@Component({
    selector: 'app-data-dialog',
    templateUrl: './data-dialog.html',
    styleUrl: './data-dialog.scss',
    standalone: true,
    imports: []
})
export class DataDialog {
    public text?: string;

    constructor(
        public dialogRef: DialogRef<string>,
        @Inject(DIALOG_DATA) public data: DialogData,
    ) {
        this.text = data?.data;
    }
}
