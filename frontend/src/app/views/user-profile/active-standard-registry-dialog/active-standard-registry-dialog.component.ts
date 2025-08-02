import { Component, OnInit } from '@angular/core';
import { IStandardRegistryResponse } from '@guardian/interfaces';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ProfileService } from 'src/app/services/profile.service';

@Component({
    selector: 'active-standard-registry-dialog',
    templateUrl: './active-standard-registry-dialog.component.html',
    styleUrls: ['./active-standard-registry-dialog.component.scss']
})
export class ActiveStandardRegistryDialogComponent implements OnInit {
    public currentActive: string
    public potentialActive: string
    public title: string = ''

    constructor(private dialogRef: DynamicDialogRef,
        private dialogConfig: DynamicDialogConfig,
        private profileService: ProfileService,
        public dialogService: DialogService) {
    }

    ngOnInit(): void {
        const {
            title,
            currentActive,
            potentialActive
        } = this.dialogConfig.data;

        this.title = title;
        this.currentActive = currentActive;
        this.potentialActive = potentialActive;
    }

    onClose() {
        this.dialogRef.close({ update: false });
    }

    onSubmit() {
        this.dialogRef.close({ update: true });
    }
}
