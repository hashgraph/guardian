import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { DialogBlock } from '../../dialog-block/dialog-block.component';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { ViewerDialog } from '../../../dialogs/viewer-dialog/viewer-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { HttpErrorResponse } from '@angular/common/http';
import { VCFullscreenDialog } from 'src/app/modules/schema-engine/vc-fullscreen-dialog/vc-fullscreen-dialog.component';
import { Subject } from 'rxjs';

/**
 * Component for display block of 'interfaceDocumentsSource' types.
 */
@Component({
    selector: 'documents-source-block',
    templateUrl: './documents-source-block.component.html',
    styleUrls: ['./documents-source-block.component.scss'],
    animations: [
        trigger('statusExpand', [
            state('collapsed', style({ height: '0px', minHeight: '0' })),
            state('expanded', style({ height: '*' })),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ]
})
export class DocumentsSourceBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('policyStatus') policyStatus!: string;
    @Input('static') static!: any;
    @Input('dryRun') dryRun!: any;
    @Input('savepointIds') savepointIds?: string[] | null = null;

    isActive = false;
    loading: boolean = true;
    socket: any;
    params: any;

    fields: any[];
    columns: any[];
    documents: any[] | null;
    children: any[] | null;
    insert: any;
    addons: any;
    fieldMap!: { [x: string]: any[] };
    commonAddons: any[];
    paginationAddon: any;
    statusDetailed: any;
    sortOptions: any = {
        active: '',
        direction: ''
    };
    enableSorting: boolean = false;
    hasHistory: boolean = false;
    readonly: boolean = false;

    private _destroy$ = new Subject<void>();

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private dialog: DialogService,
        private dialogService: DialogService,
    ) {
        this.fields = [];
        this.columns = [];
        this.documents = null;
        this.children = null;
        this.commonAddons = [];
        this.paginationAddon = null;
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
        this._destroy$.next();
        this._destroy$.unsubscribe();
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
                .getBlockData(this.id, this.policyId, this.savepointIds)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
    }

    private _onSuccess(data: any) {
        this.setData(data).then(() => {
            setTimeout(() => {
                this.loading = false;
            }, 500);
        });
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loading = false;
        }
    }

    async setData(data: any) {
        if (data) {
            this.readonly = !!data.readonly;
            const fields: any[] = data.fields || [];
            const _fieldMap: any = {};
            const _fields: any[] = [];
            for (let i = 0; i < fields.length; i++) {
                const element = fields[i];
                element.names = element.name.split('.');
                element.index = String(i);
                if (element.bindBlock) {
                    element._block = await this.getBindBlock(element.bindBlock);
                }

                element._blocks = element.bindBlocks ? await Promise.all(
                    element.bindBlocks.map(
                        async (item: any) => await this.getBindBlock(item)
                    )
                ) : [];

                if (_fieldMap[element.title]) {
                    _fieldMap[element.title].push(element);
                } else {
                    _fieldMap[element.title] = [element];
                    _fields.push(element);
                }
            }
            this.children = data.children;
            this.columns = _fields.map(f => f.index);
            if (data.viewHistory) {
                this.columns.unshift('history');
            }
            this.documents = data.data || [];
            this.sortHistory(this.documents);
            this.isActive = true;
            const sortingField = _fields.find(item => item.name === data.orderField);
            this.sortOptions.active = sortingField && sortingField.index || '';
            this.sortOptions.direction = data.orderDirection && data.orderDirection.toLowerCase() || '';
            this.enableSorting = data.enableSorting;
            this.insert = data.insert;
            this.addons = data.blocks || [];
            this.commonAddons = data.commonAddons;
            this.paginationAddon = this.commonAddons.find((addon) => {
                return addon.blockType === "paginationAddon"
            });
            this.fieldMap = _fieldMap;
            this.fields = _fields;
            this.hasHistory = !!this.documents?.some(doc => doc.history && doc.history.length > 0);
        } else {
            this.fieldMap = {};
            this.fields = [];
            this.columns = [];
            this.documents = null;
            this.children = null;
            this.isActive = false;
            this.addons = [];
            this.paginationAddon = null;
            this.hasHistory = false;
        }
        this.updateColumns();
    }

    private updateColumns() {
        if (this.hasHistory) {
            this.fields.unshift({
                type: 'history',
                title: 'History',
                width: '80px'
            });
        }
        let autoCol = 0;
        let minCol = 0;
        for (const field of this.fields) {
            if (field.width) {
                if (field.type === 'block' || field.type === 'button') {
                    minCol++;
                } else {
                    autoCol++;
                }
            }
        }
        const autoSize = Math.round((100 - minCol) / autoCol);
        for (const field of this.fields) {
            field.__sortable = field.type === 'text' && field.name;
            if (field.width) {
                field.__width = field.width;
                field.__minWidth = field.width;
                field.__maxWidth = field.width;
            } else {
                if (field.type === 'block' || field.type === 'button') {
                    field.__width = `1%`;
                    field.__minWidth = '100px';
                    field.__maxWidth = 'auto';
                } else {
                    field.__width = `${autoSize}%`;
                    field.__minWidth = '150px';
                    field.__maxWidth = 'auto';
                }
            }
        }
    }

    public getRowClass(row: any) {
        return {
            'has-history-row': row.history,
            'revoked': row.option?.status === 'Revoked'
        }
    }


    sortHistory(documents: any) {
        if (!documents) {
            return;
        }
        for (const doc of documents) {
            if (Array.isArray(doc.history)) {
                doc.history = doc.history
                    .map((item: any) =>
                        Object.assign(item, {
                            created: new Date(item.created as string),
                        })
                    )
                    .sort(function (a: any, b: any) {
                        return b.created.getTime() - a.created.getTime();
                    })
                    .map((item: any) =>
                        Object.assign(item, {
                            created: (item.created as Date).toLocaleString(),
                        })
                    );
            }
            if (Array.isArray(doc.serials)) {
                doc.serials.sort((a: any, b: any) => a < b ? -1 : 1);
            }
        }
    }

    async getBindBlock(blockTag: any) {
        return new Promise<any>(async (resolve, reject) => {
            this.policyEngineService.getBlockDataByName(blockTag, this.policyId, this.savepointIds).subscribe((data: any) => {
                resolve(data);
            }, (e) => {
                resolve(null);
            });
        });
    }

    onDialog(row: any, field: any, comments?: boolean) {
        const data = row;
        const document = row[field.name];
        if (field._block) {
            const dialogRef = this.dialog.open(DialogBlock, {
                width: '850px',
                data: {
                    data: data,
                    document: document,
                    dialogType: field.dialogType,
                    dialogClass: field.dialogClass,
                    title: field.dialogContent,
                    block: field._block,
                    static: this.getConfig(row, field, field._block),
                    policyId: this.policyId,
                    dryRun: this.dryRun
                }
            });
            dialogRef.onClose.subscribe(async (result) => {
            });
        } else {
            const dialogRef = this.dialogService.open(VCFullscreenDialog, {
                showHeader: false,
                width: '1000px',
                styleClass: 'guardian-dialog',
                maskStyleClass: 'guardian-fullscreen-dialog',
                data: {
                    type: 'VC',
                    backLabel: 'Back to Policy',
                    title: field.dialogContent,
                    viewDocument: true,
                    dryRun: !!row.dryRunId,
                    id: row.id,
                    row: row,
                    document: document,
                    openComments: comments,
                    destroy: this._destroy$
                }
            });
            dialogRef.onClose.subscribe(async (result) => {
            });
        }
    }

    getText(row: any, field: any) {
        try {
            if (field.type == 'serials') {
                const serials = this.getArray(row, field);
                return serials?.map((s: any) => s.serial)?.join(', ');
            }
            if (field.content) {
                return field.content;
            }
            if (field.names) {
                let d = row[field.names[0]];
                for (let i = 1; i < field.names.length; i++) {
                    const name = field.names[i];
                    if (name === 'L' && Array.isArray(d)) {
                        d = d[d.length - 1];
                    } else {
                        d = d[name];
                    }
                }
                return this.parseArrayValue(d);
            } else {
                return this.parseArrayValue(row[field.name]);
            }
        } catch (error) {
            return "";
        }
    }

    getIssuer(row: any, field: any) {
        try {
            if (field.content) {
                return field.content;
            }
            if (field.names) {
                let d = row[field.names[0]];
                for (let i = 1; i < field.names.length; i++) {
                    const name = field.names[i];
                    if (name === 'L' && Array.isArray(d)) {
                        d = d[d.length - 1];
                    } else {
                        d = d[name];
                    }
                }
                if (typeof d === 'object') {
                    return d.id;
                }
                return d;
            } else {
                if (typeof row[field.name] === 'object') {
                    return row[field.name].id;
                }
                return row[field.name];
            }
        } catch (error) {
            return "";
        }
    }

    getGroup(row: any, field: any): any | null {
        if (field.type === 'history') {
            return null;
        }
        const items = this.fieldMap[field.title];
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item.bindGroup) {
                    return item;
                }
                if (row.__sourceTag__ == item.bindGroup) {
                    return item;
                }
            }
        }
        return null;
    }

    getArray(row: any, field: any) {
        try {
            if (field.content) {
                return field.content;
            }
            if (field.names) {
                let d = row[field.names[0]];
                for (let i = 1; i < field.names.length; i++) {
                    const name = field.names[i];
                    if (name === 'L' && Array.isArray(d)) {
                        d = d[d.length - 1];
                    } else {
                        d = d[name];
                    }
                }
                return d;
            } else {
                return row[field.name];
            }
        } catch (error) {
            return [];
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

    getConfig(row: any, field: any, block: any) {
        if (row.blocks && row.blocks[block.id]) {
            const config = row.blocks[block.id];
            config.data = row;
            return config;
        } else {
            const config = { ...block };
            config.data = row;
            return config;
        }
    }

    onArray(event: MouseEvent, row: any, field: any) {
        event.preventDefault();
        event.stopPropagation();
        const text = this.getText(row, field);


        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: row.id,
                row: row,
                dryRun: !!row.dryRunId,
                document: text,
                title: field.title,
                type: 'TEXT',
                viewDocument: false
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    onSerials(event: MouseEvent, row: any, field: any) {
        event.preventDefault();
        event.stopPropagation();
        const links = [];
        let serials = this.getArray(row, field);
        if (Array.isArray(serials)) {
            serials = serials.sort((a: any, b: any) => a.serial > b.serial ? 1 : -1);
            for (const serial of serials) {
                links.push({
                    type: "tokens",
                    params: serial.tokenId,
                    subType: "serials",
                    subParams: serial.serial,
                    value: `${serial.tokenId} / ${serial.serial}`
                })
            }
        }
        const dialogRef = this.dialog.open(ViewerDialog, {
            showHeader: false,
            width: '850px',
            styleClass: 'guardian-dialog',
            data: {
                title: field.title,
                type: 'LINK',
                value: links,
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    onButton(event: MouseEvent, row: any, field: any, comments?: boolean) {
        event.preventDefault();
        event.stopPropagation();
        if (field.action == 'dialog') {
            this.onDialog(row, field, comments);
        }
        if (field.action == 'link') {
            this.onRedirect(row, field);
        }
        if (field.action === 'download') {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(row.document));
            const href = document.createElement('a');
            href.setAttribute('href', dataStr);
            href.setAttribute('download', `${row.document.id}.json`);
            href.click();
        }
    }

    onRedirect(row: any, field: any) {
        const data = row;
        const value = this.getObjectValue(row, field.name);
        this.loading = true;
        this.policyEngineService.getGetIdByName(field.bindBlock, this.policyId).subscribe(({ id }: any) => {
            this.policyEngineService.getParents(id, this.policyId).subscribe((parents: any[]) => {
                this.policyEngineService.setBlockData(id, this.policyId, { filterValue: value }).subscribe(() => {
                    this.loading = false;
                    const filters: any = {};
                    for (let index = parents.length - 1; index > 0; index--) {
                        filters[parents[index]] = parents[index - 1];
                    }
                    filters[parents[0]] = value;
                    this.policyHelper.setParams(filters);
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    onSortChange(event: any) {
        const field = this.fields.find(item => item.index === event.active);
        if (!field || !field.name) {
            return;
        }
        this.policyEngineService.setBlockData(this.id, this.policyId, {
            orderField: field.name,
            orderDirection: event.direction
        }).subscribe();
    }

    parseArrayValue(value: string | string[]): string {
        return Array.isArray(value) ? value.join(', ') : value;
    }

    onRowClick(element: any) {
        if (element.history && element.history.length) {
            this.statusDetailed = this.statusDetailed === element ? null : element;
        }
    }

    getClass(type: string): string {
        if (type === 'text') {
            return 'text-container';
        }
        if (type === 'button') {
            return 'button-container';
        }
        if (type === 'serials') {
            return 'serials-container';
        }
        return ''
    }
}
