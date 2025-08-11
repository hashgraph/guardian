import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {PolicyEngineService} from 'src/app/services/policy-engine.service';
import {PolicyHelper} from 'src/app/services/policy-helper.service';
import {WebSocketService} from 'src/app/services/web-socket.service';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Component for display block of 'tokenConfirmationBlock' types.
 */
@Component({
    selector: 'app-token-confirmation-block',
    templateUrl: './token-confirmation-block.component.html',
    styleUrls: ['./token-confirmation-block.component.scss'],
})
export class TokenConfirmationBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    isActive = false;
    loading: boolean = true;
    disabled: boolean = false;
    socket: any;
    content: string | null = null;
    action: string | null = null;
    accountId: string | null = null;
    tokenName: string | null = null;
    tokenId: string | null = null;
    readonly: boolean = false;

    dataForm: UntypedFormGroup;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private elRef: ElementRef,
        private fb: UntypedFormBuilder
    ) {
        this.dataForm = this.fb.group({
            privateKey: ['', Validators.required],
        });
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
        }
        try {
            const top = this.elRef.nativeElement.getBoundingClientRect().top;
            this.elRef.nativeElement.children[0].style.top = `${top}px`;
        } catch (error) {
            console.error(error);
        }
        this.loadData();
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
            this.loading = true;
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
            const uiMetaData = data.uiMetaData || {};
            this.disabled = data.active === false;
            this.action = data.action;
            this.accountId = data.accountId;
            this.tokenName = data.tokenName;
            this.tokenId = data.tokenId;
            this.isActive = true;
        } else {
            this.content = null;
            this.isActive = false;
            this.disabled = false;
        }
    }

    onConfirm() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.loading = true;
            this.policyEngineService
                .setBlockData(this.id, this.policyId, {
                    hederaAccountKey: data.privateKey,
                    action: 'confirm',
                })
                .subscribe(
                    () => {
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
        }
    }

    onSkip() {
        this.loading = true;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                action: 'skip',
            })
            .subscribe(
                () => {
                    this.loading = false;
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                }
            );
    }

    togglePasswordVisibility(inputElement: HTMLInputElement): void {
        inputElement.type = inputElement.type === 'password' ? 'text' : 'password';
    }
}
