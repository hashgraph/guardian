import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { IStandardRegistryResponse } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ProfileService } from 'src/app/services/profile.service';

@Component({
    selector: 'add-standard-registry-dialog',
    templateUrl: './add-standard-registry-dialog.component.html',
    styleUrls: ['./add-standard-registry-dialog.component.scss']
})
export class AddStandardRegistryDialogComponent implements OnInit {
    public standardRegistries: IStandardRegistryResponse[]
    public title: string = ''
    public loading: boolean = false
    selectedStandardRegistryDids: string[] = []
    forgotPasswordFormGroup: UntypedFormGroup = new UntypedFormGroup({
        username: new UntypedFormControl(''),
    });

    constructor(private dialogRef: DynamicDialogRef, private dialogConfig: DynamicDialogConfig, private profileService: ProfileService) {
    }

    get selectedStandardRegistryObj() {
        return this.standardRegistries.filter(sr => this.selectedStandardRegistryDids.includes(sr.did));
    }

    getFormattedSrs() {
        return this.standardRegistries.map((sr) => {
            return {
                label: sr.username,
                value: sr.did
            }
        })
    }

    ngOnInit(): void {
        const {
            title,
            standardRegistries
        } = this.dialogConfig.data;

        this.title = title;
        this.standardRegistries = standardRegistries;
    }

    onClose() {
        this.dialogRef.close({ update: false});
    }

    onAddStandardRegistries() {
        this.loading = true;
        this.profileService.addStandartRegistriesAsParent(this.selectedStandardRegistryDids).subscribe(() => {
            this.dialogRef.close({ update: true});
        });
    }
}
