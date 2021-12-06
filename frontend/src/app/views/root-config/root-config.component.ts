import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { RootConfigService } from '../../services/root-config.service';
import { JsonDialog } from '../../components/dialogs/vc-dialog/vc-dialog.component';
import { forkJoin } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { SchemaFormComponent } from 'src/app/components/schema-form/schema-form.component';
import { IFullConfig, Schema, SchemaEntity } from 'interfaces';

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
    root: IFullConfig | null;
    balance: string | null;
    progressInterval: any;

    vcForm: FormGroup;
    schema: any;
    hideVC: any;
    formValid: boolean = false;

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private rootConfigService: RootConfigService,
        private schemaService: SchemaService,
        private fb: FormBuilder,
        public dialog: MatDialog) {
        this.root = null;
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
        this.root = null;
        this.balance = null;

        forkJoin([
            this.rootConfigService.getRootBalance(),
            this.rootConfigService.getRootConfig(),
            this.schemaService.getSchemes()
        ]).subscribe((value) => {
            const balance: string | null = value[0];
            const root: IFullConfig | null = value[1];
            const schemes = Schema.mapRef(value[2]);

            this.isConfirmed = !!root;
            if (this.isConfirmed) {
                this.balance = balance;
                this.root = root;
            }

            this.schema = schemes
                .filter(e => e.entity == SchemaEntity.ROOT_AUTHORITY)[0];

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
            const data = {
                vc: value.vc,
                hederaAccountId: value.hederaAccountId,
                hederaAccountKey: value.hederaAccountKey,
                appnetName: value.appnetName,
                didServerUrl: value.didServerUrl,
                didTopicMemo: value.didTopicMemo,
                vcTopicMemo: value.vcTopicMemo,
            }
            this.loading = true;
            this.setProgress(true);
            this.rootConfigService.createRoot(data).subscribe(() => {
                this.setProgress(false);
                this.loadProfile();
            }, (error) => {
                this.setProgress(false);
                this.loading = false;
                console.error(error);
            });
        }
    }

    openDocument(document: any) {
        const dialogRef = this.dialog.open(JsonDialog, {
            width: '850px',
            data: {
                document: document,
                title: "DID"
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
        this.profileService.getRandomKey().subscribe((account) => {
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
}
