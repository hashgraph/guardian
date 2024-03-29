import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-token-dialog',
    templateUrl: './token-dialog.component.html',
    styleUrls: ['./token-dialog.component.scss'],
})
export class TokenDialogComponent implements OnInit {
    preset?: any;
    dataForm!: FormGroup;
    readonly!: boolean;
    hideType!: boolean;
    contracts: any[];
    currentTokenId?: string;

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig
    ) {}

    ngOnInit(): void {
        this.preset = this.dialogConfig.data?.preset;
        this.dataForm = this.dialogConfig.data?.dataForm;
        this.readonly = !!this.dialogConfig.data?.readonly;
        this.hideType = !!this.dialogConfig.data?.hideType;
        this.contracts = this.dialogConfig.data?.contracts;
        this.currentTokenId = this.dialogConfig.data?.currentTokenId;
    }
}
