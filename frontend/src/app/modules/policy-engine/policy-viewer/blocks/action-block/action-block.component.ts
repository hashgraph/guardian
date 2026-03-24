import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { RegisteredService } from '../../../services/registered.service';
import { DynamicMsalAuthService } from '../../../services/dynamic-msal-auth.service';

/**
 * Component for display block of 'requestVcDocument' type.
 */
@Component({
    selector: 'action-block',
    templateUrl: './action-block.component.html',
    styleUrls: ['./action-block.component.scss'],
})
export class ActionBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;
    data: any;
    uiMetaData: any;
    type: any;
    options: any;
    field: any;
    value: any;
    visible: any;
    content: any;
    target: any;
    currentValue: any;
    readonly: boolean = false;
    title: any;
    children: any[];
    buttonLoading: boolean = false;

    constructor(
        private policyEngineService: PolicyEngineService,
        private registeredService: RegisteredService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private toastr: ToastrService,
        private dynamicMsalAuthService: DynamicMsalAuthService
    ) {
    }

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
            this.data = data.data;
            this.type = data.type;
            this.uiMetaData = data.uiMetaData;

            if (this.type == 'selector') {
                this.field = data.field;
                this.options = this.uiMetaData.options || [];
                this.value = this.getObjectValue(this.data, this.field);
                this.visible = this.options.findIndex((o: any) => o.value == this.value) == -1;
            }
            if (this.type == 'download') {
                this.content = this.uiMetaData.content;
            }
            if (this.type == 'dropdown') {
                this.field = data.field;
                this.options = data.options || [];
                const currentValue = this.getObjectValue(this.data, this.field);
                this.currentValue = this.options.find((option: { name: string, value: string }) =>
                    option.value === currentValue);
            }
            if (this.type == 'transformation') {
                this.title = this.uiMetaData.title;
                this.children = [];
                if (Array.isArray(data.children)) {
                    for (const child of data.children) {
                        const instance = this.createInstance(child);
                        if (instance) {
                            this.children.push(instance);
                        }
                    }
                }

            }
        } else {
            this.data = null;
        }
    }

    private createInstance(config: any) {
        const code: any = this.registeredService.getCode(config.blockType);
        if (code) {
            return new code(config, this.policyEngineService, this.dynamicMsalAuthService, this.toastr);
        }
        return null;
    }

    getObjectValue(data: any, value: any) {
        let result: any = null;
        if (data && value) {
            const keys = value.split('.');
            result = data;
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

    setObjectValue(data: any, field: any, value: any) {
        let result: any = null;
        if (data && field) {
            const keys = field.split('.');
            result = data;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (key === 'L' && Array.isArray(result)) {
                    result = result[result.length - 1];
                } else {
                    result = result[key];
                }
            }
            result[keys[keys.length - 1]] = value;
        }
        return result;
    }

    onSelect(value: any) {
        this.setObjectValue(this.data, this.field, value);
        this.value = this.getObjectValue(this.data, this.field);
        this.visible = this.options.findIndex((o: any) => o.value == this.value) == -1;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, this.data)
            .subscribe(() => {

            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    setStatus(row: any, status: string) {
        this.loading = true;
        const data = { ...row };
        data.status = status;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, data)
            .subscribe(() => {
                this.loadData();
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    onDownload() {
        this.policyEngineService
            .setBlockData(this.id, this.policyId, this.data)
            .subscribe((data) => {
                if (data) {
                    this.downloadObjectAsJson(data.body, data.fileName);
                }
                this.loading = false;
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    downloadObjectAsJson(exportObj: any, exportName: string) {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', exportName + '.config');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    onDropdown() {
        if (this.getObjectValue(this.data, this.field) == this.currentValue.value) {
            return;
        }

        this.setObjectValue(this.data, this.field, this.currentValue.value);

        this.policyEngineService
            .setBlockData(this.id, this.policyId, this.data)
            .subscribe(() => {
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    async onTransformation() {
        this.buttonLoading = true;
        try {
            let data = {
                document: this.data,
                history: [],
                params: {}
            }
            const children = this.children || [];
            for (const child of children) {
                data = await child.run(data);
                if (!data) {
                    throw new Error(`An error occurred while sending the data`);
                }
            }
            if (data?.document) {
                this.policyEngineService
                    .setBlockData(this.id, this.policyId, data?.document)
                    .subscribe(() => {
                        this.buttonLoading = false;
                    }, (e) => {
                        console.error(e.error);
                        this.buttonLoading = false;
                    });
            } else {
                this.buttonLoading = false;
            }
        } catch (error) {
            this.buttonLoading = false;
            console.log(error);
            this.toastr.error(error?.toString(), '', {
                timeOut: 3000,
                closeButton: true,
                positionClass: 'toast-bottom-right',
                enableHtml: true,
            });
        }
    }
}
