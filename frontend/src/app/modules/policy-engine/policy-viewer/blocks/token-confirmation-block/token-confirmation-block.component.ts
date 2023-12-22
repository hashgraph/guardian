import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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

    dataForm: FormGroup;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private elRef: ElementRef,
        private fb: FormBuilder
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
                .getBlockData(this.id, this.policyId)
                .subscribe(
                    (data: any) => {
                        this.setData(data);
                        this.loading = false;
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
                    () => {},
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
}
