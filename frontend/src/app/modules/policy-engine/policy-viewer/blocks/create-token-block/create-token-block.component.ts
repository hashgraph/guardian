import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContractType, IUser } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { ContractService } from 'src/app/services/contract.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

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
    dataForm: FormGroup;
    templatePreset: any;
    title: any;
    description: any;
    isExist: boolean = false;
    contracts: { contractId: string }[] = [];

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private profile: ProfileService,
        private contractService: ContractService,
        fb: FormBuilder
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
                .getBlockData(this.id, this.policyId)
                .subscribe(
                    (data: any) => {
                        this.setData(data);
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
        }
    }

    setData(data: any) {
        if (data) {
            this.templatePreset = data.data;
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
