import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export enum AlertType {
    ERROR = 'Error',
    WARN = 'Warning',
    INFO = 'Info',
}

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss'],
})
export class AlertComponent implements OnInit {
    type?: AlertType;
    text?: string;
    icon?: string;

    constructor(
        public dialogRef: MatDialogRef<AlertComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.type = data?.type;
        this.text = data?.text;
        this.icon = this.getIconByType(this.type);
    }

    ngOnInit(): void {}

    private getIconByType(type?: AlertType) {
        switch (type) {
            case AlertType.ERROR:
                return 'error';
            case AlertType.WARN:
                return 'warning';
            case AlertType.INFO:
                return 'info';
            default:
                return;
        }
    }
}
