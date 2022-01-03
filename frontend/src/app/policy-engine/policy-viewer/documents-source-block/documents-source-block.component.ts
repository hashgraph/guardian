import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { DialogBlock } from '../dialog-block/dialog-block.component';
import { DocumentDialogBlock } from '../document-dialog-block/document-dialog-block.component';

/**
 * Component for display block of 'interfaceDocumentsSource' types.
 */
@Component({
    selector: 'documents-source-block',
    templateUrl: './documents-source-block.component.html',
    styleUrls: ['./documents-source-block.component.css']
})
export class DocumentsSourceBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    isActive = false;
    loading: boolean = true;
    socket: any;

    fields: any[];
    columns: any[];
    documents: any[] | null;
    children: any[] | null;
    insert: any;


    constructor(
        private policyEngineService: PolicyEngineService,
        private dialog: MatDialog
    ) {
        this.fields = [];
        this.columns = [];
        this.documents = null;
        this.children = null;
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.policyEngineService.subscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(id: string): void {
        if (this.id == id) {
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
            this.policyEngineService.getData(this.id, this.policyId).subscribe((data: any) => {
                this.setData(data).then(() => {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                });
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    async setData(data: any) {
        if (data) {
            const fields: any[] = data.fields || [];
            for (let i = 0; i < fields.length; i++) {
                const element = fields[i];
                element.names = element.name.split('.');
                element.index = String(i);
                if (element.bindBlock) {
                    element._block = await this.getBindBlock(element);
                }
            }
            this.columns = fields.map(f => f.index);
            this.children = data.children;
            this.fields = fields;
            this.documents = data.data || [];
            this.isActive = data.isActive;
            this.insert = data.insert;

        } else {
            this.fields = [];
            this.columns = [];
            this.documents = null;
            this.children = null;
            this.isActive = false;
        }
    }

    async getBindBlock(element: any) {
        return new Promise<any>(async (resolve, reject) => {
            this.policyEngineService.getGetIdByName(element.bindBlock, this.policyId).subscribe(({ id }: any) => {
                this.policyEngineService.getData(id, this.policyId).subscribe((data: any) => {
                    data.id = id;
                    console.log(data);
                    resolve(data);
                }, (e) => {
                    reject();
                });
            });

        });
    }

    onDialog(row: any, field: any) {
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
                    policyId: this.policyId
                }
            });
            dialogRef.afterClosed().subscribe(async (result) => { });
        } else {
            const dialogRef = this.dialog.open(DocumentDialogBlock, {
                width: '850px',
                data: {
                    data: data,
                    document: document,
                    dialogType: field.dialogType,
                    dialogClass: field.dialogClass,
                    title: field.dialogContent
                }
            });
            dialogRef.afterClosed().subscribe(async (result) => { });
        }
    }

    getText(row: any, field: any) {
        try {
            if (field.content) {
                return field.content;
            }
            if (field.names) {
                let d = row[field.names[0]];
                for (let i = 1; i < field.names.length; i++) {
                    const name = field.names[i];
                    d = d[name];
                }
                return d;
            } else {
                return row[field.name];
            }
        } catch (error) {
            return "";
        }
    }

    getConfig(row: any, field: any, block: any) {
        const config = { ...block };
        config.data = row;
        return config;
    }

    onButton(event: MouseEvent, row: any, field: any) {
        event.preventDefault();
        event.stopPropagation();
        if (field.action == 'dialog') {
            this.onDialog(row, field);
        }
    }
}