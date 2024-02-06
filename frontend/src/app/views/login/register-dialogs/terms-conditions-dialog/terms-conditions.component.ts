import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { BrandingService } from '../../../../services/branding.service';

@Component({
    selector: 'app-terms-conditions',
    templateUrl: './terms-conditions.component.html',
    styleUrls: ['./terms-conditions.component.scss']
})
export class TermsConditionsComponent implements OnInit {

    constructor(
        private dialogRef: DynamicDialogRef,
        private dialogConfig: DynamicDialogConfig,
        private brandingService: BrandingService
    ) {
    }

    get termsAndConditions(): string {
        return this.brandingService.termsAndConditions;
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
        link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.termsAndConditions));
        link.setAttribute('download', 'Terms and Conditions.txt');
        link.click();
        link.remove();
    }
}
