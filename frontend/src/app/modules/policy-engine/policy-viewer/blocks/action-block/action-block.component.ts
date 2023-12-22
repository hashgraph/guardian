import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

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

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper
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

    setData(data: any) {
        if (data) {
            this.data = data.data;
            this.type = data.type;
            this.uiMetaData = data.uiMetaData;
            if (this.type == 'selector') {
                this.field = data.field;
                this.options = this.uiMetaData.options || [];
                this.value = this.getObjectValue(this.data, this.field);
                this.visible =
                    this.options.findIndex((o: any) => o.value == this.value) ==
                    -1;
            }
            if (this.type == 'download') {
                this.content = this.uiMetaData.content;
            }
            if (this.type == 'dropdown') {
                this.field = data.field;
                this.options = data.options || [];
                this.currentValue = this.getObjectValue(this.data, this.field);
            }
        } else {
            this.data = null;
        }
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
        this.visible =
            this.options.findIndex((o: any) => o.value == this.value) == -1;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, this.data)
            .subscribe(
                () => {},
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                }
            );
    }

    setStatus(row: any, status: string) {
        this.loading = true;
        const data = { ...row };
        data.status = status;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, data)
            .subscribe(
                () => {
                    this.loadData();
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                }
            );
    }

    onDownload() {
        this.policyEngineService
            .setBlockData(this.id, this.policyId, this.data)
            .subscribe(
                (data) => {
                    if (data) {
                        this.downloadObjectAsJson(data.body, data.fileName);
                    }
                    this.loading = false;
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                }
            );
    }

    downloadObjectAsJson(exportObj: any, exportName: string) {
        const dataStr =
            'data:text/json;charset=utf-8,' +
            encodeURIComponent(JSON.stringify(exportObj));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', exportName + '.config');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    onDropdown() {
        if (this.getObjectValue(this.data, this.field) == this.currentValue) {
            return;
        }
        this.setObjectValue(this.data, this.field, this.currentValue);
        this.policyEngineService
            .setBlockData(this.id, this.policyId, this.data)
            .subscribe(
                () => {},
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                }
            );
    }
}
