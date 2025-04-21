import { Component, OnInit, SimpleChanges } from '@angular/core';
import { IStandardRegistryResponse } from '@guardian/interfaces';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ProfileService } from 'src/app/services/profile.service';
import { ActiveStandardRegistryDialogComponent } from '../active-standard-registry-dialog/active-standard-registry-dialog.component';

@Component({
    selector: 'info-standard-registry-dialog',
    templateUrl: './info-standard-registry-dialog.component.html',
    styleUrls: ['./info-standard-registry-dialog.component.scss']
})
export class InfoStandardRegistryDialogComponent implements OnInit {
    public standardRegistry: IStandardRegistryResponse
    public activeSr: IStandardRegistryResponse
    public title: string = ''
    public isActive: boolean = false
    public disabledSwitcher: boolean = false

    private ignoreFields: string[] = ['@context', 'id', 'type'];
    public groupedFields: { name: string; value: any }[][];

    constructor(private dialogRef: DynamicDialogRef,
        private dialogConfig: DynamicDialogConfig,
        private profileService: ProfileService,
        public dialogService: DialogService) {
    }

    ngOnInit(): void {
        const {
            title,
            standardRegistry,
            activeSr
        } = this.dialogConfig.data;

        this.title = title;
        this.activeSr = activeSr;
        this.standardRegistry = standardRegistry;

        this.isActive = standardRegistry.did === activeSr.did;
        this.disabledSwitcher = this.isActive;

        const fields = [];
        if (this.standardRegistry?.vcDocument?.document) {
            let cs: any = this.standardRegistry.vcDocument.document.credentialSubject;
            if (Array.isArray(cs)) {
                cs = cs[0];
            }

            if (cs) {
                for (const [name, value] of Object.entries(cs)) {
                    if (
                        !this.ignoreFields.includes(name) &&
                        value &&
                        typeof value !== 'function' &&
                        typeof value !== 'object'
                    ) {
                        fields.push({name, value});
                    }
                }

                this.groupedFields = this.chunk(fields, 2);
            }
        }
    }

    onClose() {
        this.dialogRef.close({ update: false });
    }

    onToggleChange() {
        this.dialogService.open(ActiveStandardRegistryDialogComponent, {
            styleClass: 'guardian-dialog',
            width: '640px',
            modal: true,
            showHeader: false,
            data: {
                title: 'Make active',
                currentActive: this.activeSr.hederaAccountId,
                potentialActive: this.standardRegistry.hederaAccountId
            }
        }).onClose.subscribe((data) => {
            if(data?.update) {
                this.onChangeActiveSr();
            } else {
                this.isActive = !this.isActive;
            }
        });
    }

    onChangeActiveSr() {
        this.profileService.selectActiveStandartRegistry(this.standardRegistry.did).subscribe(() => {
            this.dialogRef.close({ update: true, parent: this.standardRegistry.did });
        });
    }

    chunk<T>(arr: T[], size: number): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          result.push(arr.slice(i, i + size));
        }
        return result;
      }

}
