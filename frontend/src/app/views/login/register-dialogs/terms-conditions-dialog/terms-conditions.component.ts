import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { fa } from 'cronstrue/dist/i18n/locales/fa';

@Component({
    selector: 'app-terms-conditions',
    templateUrl: './terms-conditions.component.html',
    styleUrls: ['./terms-conditions.component.scss']
})
export class TermsConditionsComponent implements OnInit {

    constructor(private dialogRef: DynamicDialogRef, private dialogConfig: DynamicDialogConfig,) {
    }

    ngOnInit(): void {
    }

    onNoClick() {
        this.dialogRef.close(false);
    }

    onSubmit() {
        this.dialogRef.close(true);
    }

    downloadDocument() {
        const link = document.createElement('a');
        link.setAttribute('download', 'Terms and Conditions.docx');
        link.href = 'assets/docs/Terms and Conditions.docx';
        link.click();
        link.remove();
    }
}
