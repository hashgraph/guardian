import { Component, Inject, OnInit } from '@angular/core';

import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

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
    isVisible: boolean = true;

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        const data = config.data;

        this.type = data?.type;
        this.text = data?.text;
        this.icon = this.getIconByType(this.type);
    }

    ngOnInit(): void {}

    private getIconByType(type?: AlertType) {
        switch (type) {
            case AlertType.ERROR:
                return 'times';
            case AlertType.WARN:
                return 'exclamation-triangle';
            case AlertType.INFO:
                return 'info-circle';
            default:
                return;
        }
    }

    closeDialog(): void {
        this.dialogRef.close();
    }
}
