import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ContractType } from '@guardian/interfaces';
import { ContractService } from 'src/app/services/contract.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Component for display block of 'createTokenBlock' types.
 */
@Component({
    selector: 'create-token-block',
    templateUrl: './create-token-block.component.html',
    styleUrls: ['./create-token-block.component.scss'],
})
export class CreateTokenBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;
    dataForm: UntypedFormGroup;
    title: any;
    description: any;
    isExist: boolean = false;
    contracts: { contractId: string }[] = [];
    readonly: boolean = false;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private profile: ProfileService,
        private contractService: ContractService,
        private fb: UntypedFormBuilder
    ) {
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
        }
        this.contractService.getContracts({
            type: ContractType.WIPE,
        }).subscribe((value) => {
            this.contracts = value.body || [];
            this.loadData();
        });
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
            this.policyEngineService
                .getBlockData(this.id, this.policyId, this.savepointId)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
    }

    private _onSuccess(data: any) {
        this.setData(data);
        setTimeout(() => {
            this.loading = false;
        }, 500);
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loading = false;
        }
    }

    setData(data: any) {
        if (data) {
            this.readonly = !!data.readonly;
            this.dataForm = this.fb.group({
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
            })
            this.dataForm.patchValue(data.data);
            for (const presetEntry of Object.entries(data.data)) {
                this.dataForm.get(presetEntry[0])?.disable();
            }
            this.title = data.title;
            this.description = data.description;
            this.loading = data.active === false;
            this.isExist = true;
        } else {
            this.isExist = false;
        }
    }

    onSubmit(submitData?: any) {
        if (submitData || this.dataForm.valid) {
            const data = submitData || this.dataForm.value;
            this.loading = true;
            this.policyEngineService
                .setBlockData(this.id, this.policyId, data)
                .subscribe(
                    // tslint:disable-next-line:no-empty
                    () => {},
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
        }
    }
}
