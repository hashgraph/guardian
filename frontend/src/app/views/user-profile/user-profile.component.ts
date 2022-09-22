import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from "../../services/profile.service";
import { TokenService } from '../../services/token.service';
import { IUser, Token, IToken, SchemaEntity, Schema } from '@guardian/interfaces';
import { DemoService } from 'src/app/services/demo.service';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';
import { SchemaService } from 'src/app/services/schema.service';
import { HeaderPropsService } from 'src/app/services/header-props.service';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

enum OperationMode {
    None, Generate, SetProfile, Associate
}

interface IHederaForm {
    id: string,
    key: string,
    standardRegistry: string,
    vc?: any
}

/**
 * The page with the profile settings of a regular user.
 */
@Component({
    selector: 'app-user-profile',
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
    loading: boolean = true;
    isConfirmed: boolean = false;
    isFailed: boolean = false;
    isNewAccount: boolean = false;
    profile?: IUser | null;
    balance?: string | null;
    tokens?: Token[] | null;
    didDocument?: any;
    vcDocument?: any;
    standardRegistries?: IUser[];

    hederaForm = this.fb.group({
        standardRegistry: ['', Validators.required],
        id: ['', Validators.required],
        key: ['', Validators.required],
    });


    displayedColumns: string[] = [
        'name',
        'associated',
        'tokenBalance',
        'frozen',
        'kyc',
        'policies'
    ];

    private interval: any;

    hideVC: any;
    schema!: Schema | null;
    vcForm!: FormGroup;

    value: any;
    operationMode: OperationMode = OperationMode.None;
    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private tokenService: TokenService,
        private otherService: DemoService,
        private schemaService: SchemaService,
        private informService: InformService,
        private taskService: TasksService,
        private webSocketService: WebSocketService,
        private fb: FormBuilder,
        public dialog: MatDialog,
        private headerProps: HeaderPropsService) {
        this.standardRegistries = [];
        this.hideVC = {
            id: true
        }
        this.vcForm = new FormGroup({});
    }

    ngOnInit() {
        this.loading = true;
        this.loadDate();
        this.update();
    }

    ngOnDestroy(): void {
        clearInterval(this.interval)
    }

    update() {
        this.interval = setInterval(() => {
            if (!this.isConfirmed && !this.isNewAccount) {
                this.loadDate();
            }
        }, 15000);
    }

    loadDate() {
        this.balance = null;
        this.tokens = null;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.profileService.getBalance(),
            this.tokenService.getTokens(),
            this.auth.getStandardRegistries(),
            this.schemaService.getSystemSchemasByEntity(SchemaEntity.USER)
        ]).subscribe((value) => {
            this.profile = value[0] as IUser;
            this.balance = value[1] as string;
            this.tokens = value[2].map((e: any) => {
                return {
                    ...new Token(e),
                    policies: e.policies
                }
            });
            this.standardRegistries = value[3] || [];
            this.standardRegistries = this.standardRegistries.filter(sr => !!sr.did);

            this.isConfirmed = !!this.profile.confirmed;
            this.isFailed = !!this.profile.failed;
            this.isNewAccount = !this.profile.didDocument;

            this.didDocument = null;
            this.vcDocument = null;
            if (this.isConfirmed) {
                this.didDocument = this.profile?.didDocument;
                this.vcDocument = this.profile?.vcDocument;
            }

            const schema = value[4];
            if (schema) {
                this.schema = new Schema(schema);
                this.hederaForm.addControl('vc', this.vcForm);
            } else {
                this.schema = null;
            }

            setTimeout(() => {
                this.loading = false;
                this.headerProps.setLoading(false);
            }, 200)
        }, (error) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(error);
        });
    }

    onHederaSubmit() {
        if (this.hederaForm.valid) {
            this.createDID(this.hederaForm.value);
        }
    }

    createDID(data: IHederaForm) {
        this.loading = true;
        this.headerProps.setLoading(true);
        const vcDocument = data.vc;
        const profile: any = {
            hederaAccountId: data.id,
            hederaAccountKey: data.key,
            parent: data.standardRegistry,
        }
        if (vcDocument) {
            profile.vcDocument = vcDocument;
        }

        this.profileService.pushSetProfile(profile).subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.SetProfile;
        }, (error) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(error);
        });
    }

    randomKey() {
        this.loading = true;
        const value: any = {
            standardRegistry: this.hederaForm.value.standardRegistry,
        }
        if (this.hederaForm.value.vc) {
            value.vc = this.hederaForm.value.vc;
        }

        this.otherService.pushGetRandomKey().subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.Generate;
            this.value = value;
        }, (e) => {
            this.loading = false;
            value.id = '';
            value.key = '';
            this.hederaForm.setValue(value);
        });
    }

    getColor(status: string, reverseLogic: boolean) {
        if (status === "n/a") return "grey";
        else if (status === "Yes") return reverseLogic ? "red" : "green";
        else return reverseLogic ? "green" : "red";
    }

    associate(token: Token) {
        this.loading = true;
        this.tokenService.pushAssociate(token.tokenId, token.associated != "Yes").subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.Associate;
        }, (error) => {
            this.loading = false;
        });
    }

    openVCDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: document.document,
                title: title,
                type: 'VC',
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

    retry() {
        this.isConfirmed = false;
        this.isFailed = false;
        this.isNewAccount = true;
        clearInterval(this.interval)
    }

    getPoliciesInfo(policies: string[]): string {
        if (!policies || !policies.length) {
            return "";
        }
        return policies.length === 1
            ? policies[0]
            : `Used in ${policies.length} policies`;
    }

    onChangeForm() {
        this.vcForm.updateValueAndValidity();
    }

    onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        this.loading = false;
        this.taskId = undefined;
        this.value = null;
    }

    onAsyncCompleted() {
        if (this.taskId) {
            const taskId = this.taskId;
            const value = this.value;
            const operationMode = this.operationMode;
            this.taskId = undefined;
            this.operationMode = OperationMode.None;
            switch (operationMode) {
                case OperationMode.Generate:
                    this.taskService.get(taskId).subscribe((task) => {
                        const { id, key } = task.result;
                        value.id = id;
                        value.key = key;
                        this.hederaForm.setValue(value);
                        this.loading = false;
                    });
                    break;
                case OperationMode.SetProfile:
                    this.webSocketService.updateProfile();
                    this.loadDate();
                    break;
                case OperationMode.Associate:
                    this.loadDate();
                    break;
                default:
                    console.log('Not supported mode');
                    break;
            }
        }
    }
}
