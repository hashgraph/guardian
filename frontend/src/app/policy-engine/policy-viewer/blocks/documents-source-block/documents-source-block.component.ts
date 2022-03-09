import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { DialogBlock } from '../../dialog-block/dialog-block.component';
import { DocumentDialogBlock } from '../document-dialog-block/document-dialog-block.component';
import { forkJoin } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
import { Schema, SchemaHelper } from 'interfaces';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';

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
    params: any;

    fields: any[];
    columns: any[];
    documents: any[] | null;
    children: any[] | null;
    insert: any;
    addons: any;
    schemas!: Schema[];
    fieldMap!: { [x: string]: any[] };

    constructor(
        private policyEngineService: PolicyEngineService,
        private policyHelper: PolicyHelper,
        private schemaService: SchemaService,
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
            forkJoin([
                this.policyEngineService.getBlockData(this.id, this.policyId),
                this.schemaService.getSchemes()
            ]).subscribe((value) => {
                const data: any = value[0];
                const schemes = value[1];
                this.schemas = SchemaHelper.map(schemes);
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
            this.fieldMap = {};
            this.fields = [];
            for (let i = 0; i < fields.length; i++) {
                const element = fields[i];
                element.names = element.name.split('.');
                element.index = String(i);
                if (element.bindBlock) {
                    element._block = await this.getBindBlock(element);
                }
                if (this.fieldMap[element.title]) {
                    this.fieldMap[element.title].push(element);
                } else {
                    this.fieldMap[element.title] = [element];
                    this.fields.push(element);
                }
            }
            this.children = data.children;
            this.columns = this.fields.map(f => f.index);
            this.documents = data.data || [];
            this.isActive = true;
            this.insert = data.insert;
            this.addons = data.blocks || [];
        } else {
            this.fieldMap = {};
            this.fields = [];
            this.columns = [];
            this.documents = null;
            this.children = null;
            this.isActive = false;
            this.addons = [];
        }
    }

    async getBindBlock(element: any) {
        return new Promise<any>(async (resolve, reject) => {
            this.policyEngineService.getGetIdByName(element.bindBlock, this.policyId).subscribe(({ id }: any) => {
                this.policyEngineService.getBlockData(id, this.policyId).subscribe((data: any) => {
                    data.id = id;
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
            const dialogRef = this.dialog.open(VCViewerDialog, {
                width: '850px',
                data: {
                    document: document,
                    title: field.dialogContent,
                    type: 'VC',
                    schemas: this.schemas,
                    viewDocument: true
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

    getGroup(row: any, field: any): any | null {
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

    getObjectValue(data: any, value: any) {
        let result: any = null;
        if (data && value) {
            const keys = value.split('.');
            result = data;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                result = result[key];
            }
        }
        return result;
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
        if (field.action == 'link') {
            this.onRedirect(row, field);
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
}
