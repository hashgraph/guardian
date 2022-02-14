import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { IUser, Schema, SchemaEntity, SchemaHelper } from 'interfaces';
import { DemoService } from 'src/app/services/demo.service';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';

/**
 * RootAuthority profile settings page.
 */
@Component({
    selector: 'app-root-config',
    templateUrl: './root-config.component.html',
    styleUrls: ['./root-config.component.css']
})
export class RootConfigComponent implements OnInit {
    isConfirmed: boolean = false;
    isFailed: boolean = false;
    isNewAccount: boolean = true;
    errorLoadSchema: boolean = false;
    loading: boolean = true;
    progress: number = 0;

    hederaForm = this.fb.group({
        appnetName: ['', Validators.required],
        didServerUrl: ['', Validators.required],
        didTopicMemo: ['', Validators.required],
        vcTopicMemo: ['', Validators.required],
        hederaAccountId: ['', Validators.required],
        hederaAccountKey: ['', Validators.required],
    });
    profile: IUser | null;
    balance: string | null;
    progressInterval: any;

    vcForm: FormGroup;
    schema: any;
    hideVC: any;
    formValid: boolean = false;
    schemas!: Schema[];

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private otherService: DemoService,
        private fb: FormBuilder,
        public dialog: MatDialog) {

        this.profile = null;
        this.balance = null;
        this.vcForm = new FormGroup({});
        this.hederaForm.addControl('vc', this.vcForm);
        this.hideVC = {
            id: true
        }
        this.hederaForm.statusChanges.subscribe(
            (result) => {
                setTimeout(() => {
                    this.formValid = result == 'VALID';
                });
            }
        );
    }

    ngOnInit() {
        this.loading = true;
        this.hederaForm.setValue({
            appnetName: "Test Identity SDK appnet",
            didServerUrl: "http://localhost:3000/api/v1",
            didTopicMemo: "Test Identity SDK appnet DID topic",
            vcTopicMemo: "Test Identity SDK appnet VC topic",
            hederaAccountId: '',
            hederaAccountKey: '',
            vc: {}
        });
        this.loadProfile();
    }

    loadProfile() {
        this.loading = true;
        this.profile = null;
        this.balance = null;

        forkJoin([
            this.profileService.getProfile(),
            this.profileService.getBalance(),
            this.schemaService.getSchemes()
        ]).subscribe((value) => {
            if(!value[2]) {
                this.errorLoadSchema = true;
                this.loading = false;
                return;
            }

            const profile = value[0];
            const balance = value[1];
            this.schemas = SchemaHelper.map(value[2]);
            this.schema = this.schemas
                .filter(e => e.entity == SchemaEntity.ROOT_AUTHORITY)[0];

            this.isConfirmed = !!(profile.confirmed);
            this.isFailed = !!(profile.failed);
            this.isNewAccount = !!(!profile.didDocument);

            if (this.isConfirmed) {
                this.balance = balance;
                this.profile = profile;
            }

            setTimeout(() => {
                this.loading = false;
            }, 500)
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    onHederaSubmit() {
        if (this.hederaForm.valid) {
            const value = this.hederaForm.value;
            const data: any = {
                hederaAccountId: value.hederaAccountId,
                hederaAccountKey: value.hederaAccountKey,
                vcDocument: value.vc,
                addressBook: {
                    appnetName: value.appnetName,
                    didServerUrl: value.didServerUrl,
                    didTopicMemo: value.didTopicMemo,
                    vcTopicMemo: value.vcTopicMemo,
                }
            }
            this.loading = true;
            this.setProgress(true);
            this.profileService.setProfile(data).subscribe(() => {
                this.setProgress(false);
                this.loadProfile();
            }, (error) => {
                this.setProgress(false);
                this.loading = false;
                console.error(error);
            });
        }
    }

    openVCDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: document.document,
                title: title,
                type: 'VC',
                schemas: this.schemas,
                viewDocument: true
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
        });
    }

    openDIDDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: document.document,
                title: title,
                type: 'JSON',
            }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
        });
    }

    setProgress(value: boolean) {
        this.progress = 0;
        clearInterval(this.progressInterval);
        if (value) {
            this.progress++;
            this.progressInterval = setInterval(() => {
                this.progress = Math.min(++this.progress, 100);
            }, 600);
        }
    }

    ngOnDestroy(): void {
        clearInterval(this.progressInterval)
    }

    randomKey() {
        this.loading = true;
        const value = this.hederaForm.value;
        this.otherService.getRandomKey().subscribe((account) => {
            this.loading = false;
            this.hederaForm.setValue({
                appnetName: value.appnetName,
                didServerUrl: value.didServerUrl,
                didTopicMemo: value.didTopicMemo,
                vcTopicMemo: value.vcTopicMemo,
                hederaAccountId: account.id,
                hederaAccountKey: account.key,
                vc: value.vc
            });
        }, (error) => {
            this.loading = false;
        });
    }

    onChangeForm() {
        this.vcForm.updateValueAndValidity();
    }

    retry() {
        this.isConfirmed = false;
        this.isFailed = false;
        this.isNewAccount = true;
        clearInterval(this.progressInterval);
    }
}
