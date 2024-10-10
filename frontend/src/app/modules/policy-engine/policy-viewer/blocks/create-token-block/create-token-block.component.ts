import { ChangeDetectorRef, Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ContractType, IUser } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { ContractService } from 'src/app/services/contract.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

/**
 * Component for display block of 'createTokenBlock' types.
 */
@Component({
    selector: 'create-token-block',
    templateUrl: './create-token-block.component.html',
    styleUrls: ['./create-token-block.component.scss']
})
export class CreateTokenBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;
    dialogLoading: boolean = false;
    dataForm: FormGroup;
    type!: string;
    content: any;
    dialogContent: any;
    templatePreset: any;
    title: any;
    description: any;
    buttonClass: any;
    user!: IUser;
    isExist: boolean = false;
    disabled = false;
    contracts: { contractId: string }[] = [];

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private profile: ProfileService,
        private contractService: ContractService,
        private policyHelper: PolicyHelper,
        private fb: FormBuilder,
        private dialog: MatDialog,
        private changeDetectorRef: ChangeDetectorRef
    ) {
        this.dataForm = fb.group({
            tokenName: ['Token Name', Validators.required],
            tokenSymbol: ['F', Validators.required],
            tokenType: ['fungible', Validators.required],
            decimals: ['2'],
            initialSupply: ['0'],
            enableAdmin: [true, Validators.required],
            changeSupply: [true, Validators.required],
            enableFreeze: [false, Validators.required],
            enableKYC: [false, Validators.required],
            enableWipe: [true, Validators.required],
            wipeContractId: [],
        });
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        forkJoin([
            this.contractService.getContracts({
                type: ContractType.WIPE
            }),
            this.profile.getProfile()
        ]).subscribe((value) => {
            this.contracts = value[0] && value[0].body || [];
            this.user = value[1];
            this.loadData();
        })
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else {
            this.policyEngineService.getBlockData(this.id, this.policyId).subscribe((data: any) => {
                this.setData(data);
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    setData(data: any) {
        if (data) {
            const uiMetaData = data.uiMetaData;
            this.templatePreset = data.data;
            this.type = uiMetaData.type;
            if (this.type == 'dialog') {
                this.content = uiMetaData.content;
                this.buttonClass = uiMetaData.buttonClass;
                this.description = uiMetaData.description;
                this.title = uiMetaData.title;
            }
            if (this.type == 'page') {
                this.title = uiMetaData.title;
                this.description = uiMetaData.description;
            }
            this.disabled = data.active === false;
            this.isExist = true;
        } else {
            this.disabled = false;
            this.isExist = false;
        }
    }

    onSubmit(submitData?: any) {
        if (submitData || this.dataForm.valid) {
            const data = submitData || this.dataForm.value;
            this.loading = true;
            this.dialogLoading = true;
            this.policyEngineService.setBlockData(this.id, this.policyId, data).subscribe(() => {
                this.dialogLoading = false;
            }, (e) => {
                console.error(e.error);
                this.dialogLoading = false;
                this.loading = false;
            });
        }
    }
}
