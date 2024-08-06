import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

/**
 * Component for display block of 'Dropdown' type.
 */
@Component({
    selector: 'dropdown-block-addon',
    templateUrl: './dropdown-block-addon.component.html',
    styleUrls: ['./dropdown-block-addon.component.scss'],
})
export class DropdownBlockAddonComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    disabled: boolean = false;
    socket: any;
    data: any;
    currentValue: any;
    documents!: { name: any; value: any; optionValue: any }[];

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService
    ) {}

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
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
            this.policyEngineService
                .getBlockData(this.id, this.policyId)
                .subscribe(
                    (data: any) => {
                        this.setData(data);
                        setTimeout(() => {
                            this.loading = false;
                        }, 1000);
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
        }
    }

    getObjectValue(data: any, value: any) {
        let result: any = null;
        if (data && value) {
            const keys = value.split('.');
            result = data;
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key === 'L' && Array.isArray(result)) {
                    result = result[result.length - 1];
                } else {
                    result = result[key];
                }
            }
        }
        return result;
    }

    setData(data: any) {
        if (data) {
            this.data = data.data;
            this.documents = data.documents;
            const currentValue = this.getObjectValue(this.data, data.field);
            const document = this.documents?.find(
                (doc) => doc.optionValue === currentValue
            );
            this.currentValue = document?.value;
        } else {
            this.data = null;
        }
    }

    onDropdown(result: any) {
        this.disabled = true;
        this.loading = true;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                documentId: this.data?.id,
                dropdownDocumentId: result,
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
