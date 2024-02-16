import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { IResultContext } from '../interfaces/result-context.interface';
import { ITreeContext } from '../interfaces/tree-context.interface';
import { ITableColumns } from '../interfaces/table-columns.interface';
import { ITreeItemContext } from '../interfaces/tree-item-context.interface';

interface IInfoContext {
    id: string;
    type: string;
    owner: string;
    policy: string;
}

interface IDocumentContext {
    docIndex: string;
    docIcon: string;
    docName: string;
}

interface IDocumentDetailsContext {
    index: number;
    id: string;
    messageId: string;
    type: string;
    schema: string;
    optionsRate: string;
    documentRate: string;
    owner: string;
    totalRate: string;
    fields: IFieldContext[];
    attributes: IFieldContext[];
}

interface IFieldContext {
    fantom: boolean;
    type: string;
    lvl: number;
    offset: number;
    name: string;
    propType: string;
    value: string;
    label: string;
    system: boolean;
    parent?: IFieldContext;
}

@Component({
    selector: 'app-compare-document',
    templateUrl: './compare-document.component.html',
    styleUrls: ['./compare-document.component.scss']
})
export class CompareDocumentComponent implements OnInit {
    @Input('value') value!: any;
    @Input() type: string = 'tree';
    @Input() eventsLvl: string = '1';
    @Input() propLvl: string = '2';
    @Input() childrenLvl: string = '2';
    @Input() idLvl: string = '1';

    @Output() change = new EventEmitter<any>();

    public minWidth: number;
    public headers: any[];

    public size: number;
    public totals: number[];
    public resultContext: IResultContext<IInfoContext>[] | null;
    public treeContext: ITreeContext<IDocumentContext, IDocumentDetailsContext>[] | null;

    public columns: ITableColumns[] = [];
    public displayedColumns: string[] = [];

    public _panelOpenState = true;
    public _type1 = true;
    public _type2 = true;
    public _type3 = true;
    public _type4 = true;
    public _gridStyle = '';
    public _systemProp = true;
    private _pOffset = 30;

    constructor() {
        this.minWidth = 1600;
        this.headers = [];
        this.size = 0;
        this.totals = [];
        this.resultContext = null;
        this.treeContext = null;
    }

    ngOnInit() {

    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.value) {
            this.onInit();
        }
    }

    onInit() {
        this.size = this.value.size || 2;
        this.totals = this.value.totals;
        this.minWidth = 770 * this.size;

        const k = Math.round(100 / this.size);
        this._gridStyle = `max(calc(${k}vw - 80px), 680px)`;
        for (let i = 1; i < this.size; i++) {
            this._gridStyle += ` 35px max(calc(${k}vw - 45px), 720px)`;
        }

        this.createHeaders(this.value);
        this.resultContext = this.createResultContext(this.value);
        this.treeContext = this.createTreeContext(this.value.documents?.report);

        this.columns = this.value.documents?.columns || [];
        this.displayedColumns = this.columns
            .filter(c => c.label)
            .map(c => c.name);
    }

    private createHeaders(data: any): void {
        if (this.size > 2) {
            this.headers = [];
            this.headers.push({
                column: 0,
                name: data.left.name,
                color: 'none',
                rate: ''
            });
            for (let i = 0; i < data.rights.length; i++) {
                const rate = data.totals[i];
                const right = data.rights[i];
                let color = 'none';
                if (rate > 80) {
                    color = 'green';
                } else if (rate > 50) {
                    color = 'yellow';
                } else {
                    color = 'red';
                }
                this.headers.push({
                    column: 2 * this.headers.length + 1,
                    name: right.name,
                    color: color,
                    rate: `${rate}%`
                });
            }
        } else {
            this.headers = [];
        }
    }

    private createResultContext(data: any): IResultContext<IInfoContext>[] | null {
        const results: IResultContext<IInfoContext>[] = new Array(this.size);
        if (this.size > 2) {
            for (let i = 0; i < this.size; i++) {
                if (i === 0) {
                    results[i] = {
                        left: true,
                        right: false,
                        index: i,
                        data: data.left
                    }
                } else {
                    results[i] = {
                        left: false,
                        right: true,
                        index: i,
                        data: data.rights[i - 1]
                    }
                }
            }
        } else {
            results[0] = {
                left: true,
                right: false,
                index: 0,
                data: data.left
            }
            results[1] = {
                left: false,
                right: true,
                index: 1,
                data: data.right
            }
        }
        return results;
    }

    private createTreeContext(documents?: any[]): ITreeContext<IDocumentContext, IDocumentDetailsContext>[] | null {
        if (!documents) {
            return null;
        }

        let max = 0;
        const results: ITreeContext<IDocumentContext, IDocumentDetailsContext>[] = [];

        for (let i = 0; i < documents.length; i++) {
            const currentDoc = documents[i];
            const nextDoc = documents[i + 1];
            const contexts = this.createTreeItemContext(currentDoc);
            const detailContexts = this.createTreeDetailsContext(currentDoc);
            const item: ITreeContext<IDocumentContext, IDocumentDetailsContext> = {
                index: i,
                number: i + 1,
                lvl: currentDoc.lvl,
                hidden: false,
                collapse: (currentDoc && nextDoc && nextDoc.lvl > currentDoc.lvl) ? 1 : 0,
                open: false,
                offset: 0,
                contexts,
                detailContexts,
                data: currentDoc
            }
            results.push(item);
            max = Math.max(max, currentDoc.lvl);
        }

        if (max > 10) {
            this._pOffset = 20;
        }
        if (max > 15) {
            this._pOffset = 15;
        }
        for (const item of results) {
            item.offset = this._pOffset * item.lvl;
        }
        return results;
    }

    private createTreeItemContext(row: any): ITreeItemContext<IDocumentContext>[] {
        const contexts: ITreeItemContext<IDocumentContext>[] = new Array(this.size);
        for (let j = 0; j < this.size; j++) {
            const data: IDocumentContext = this.createDocumentContext(row, j);
            const context: ITreeItemContext<IDocumentContext> = {
                type: '',
                key: '',
                rate: -1,
                left: j === 0,
                right: j !== 0,
                index: j,
                fantom: true,
                data
            }
            this.setDocumentContextKey(row, j, context);
            contexts[j] = context;
        }
        const first = contexts.find(c => !c.fantom);
        if (first) {
            for (const context of contexts) {
                if (context.fantom) {
                    context.data = first.data;
                }
            }
        }
        return contexts;
    }

    private createTreeDetailsContext(row: any): ITreeItemContext<IDocumentDetailsContext>[] {
        const contexts: ITreeItemContext<IDocumentDetailsContext>[] = new Array(this.size);
        for (let j = 0; j < this.size; j++) {
            const data: IDocumentDetailsContext = this.createDetailsContext(row, j);
            const context: ITreeItemContext<IDocumentDetailsContext> = {
                type: '',
                key: '',
                rate: -1,
                left: j === 0,
                right: j !== 0,
                index: j,
                fantom: true,
                data
            }
            this.setDocumentContextKey(row, j, context);
            contexts[j] = context;
        }
        return contexts;
    }

    private setDocumentContextKey(row: any, index: number, context: ITreeItemContext<any>): void {
        if (index === 0) {
            context.type = row[`type`];
            context.rate = row[`total_rate`];
            context.key = row['left_type'];
        } else {
            if (this.size === 2) {
                context.type = row[`type`];
                context.rate = row[`total_rate`];
                context.key = row[`right_type`];
            } else {
                context.type = row[`type_${index}`];
                context.rate = row[`total_rate_${index}`];
                context.key = row[`right_type_${index}`];
            }
        }
        context.fantom = !context.key;
    }

    private createDocumentContext(row: any, index: number): IDocumentContext {
        if (index === 0) {
            return {
                docIndex: '',
                docIcon: 'description',
                docName: row['left_schema'],
            }
        } else {
            if (this.size === 2) {
                return {
                    docIndex: '',
                    docIcon: 'description',
                    docName: row[`right_schema`],
                }
            } else {
                return {
                    docIndex: '',
                    docIcon: 'description',
                    docName: row[`right_schema_${index}`],
                }
            }
        }
    }

    private createFieldContext(data: any, index: number): IFieldContext {
        const fieldContext: IFieldContext = {
            fantom: true,
            type: index === 0 ? 'RIGHT' : 'LEFT',
            lvl: 0,
            offset: 0,
            name: '',
            propType: '',
            value: '',
            label: '',
            system: false
        }
        let item: any;
        let field: any;
        let items: any[];
        if (this.size === 2) {
            field = data;
            item = data.items[index];
            items = data.items;
        } else {
            field = data[index];
            item = field?.item;
            items = data.map((f: any) => f?.item);
        }
        if (field && item) {
            fieldContext.fantom = false;
            fieldContext.type = field.type;
            fieldContext.lvl = item.lvl;
            fieldContext.offset = 10 * item.lvl;
            fieldContext.name = item.name;
            fieldContext.propType = item.type;
            fieldContext.value = item.value;
            fieldContext.label = item.title || item.name;
            if (fieldContext.propType === 'array') {
                fieldContext.value = '[...]';
            }
            if (fieldContext.propType === 'object') {
                fieldContext.value = '{...}';
            }
        }
        if (fieldContext.fantom) {
            const fantom = items.find((i: any) => i);
            if (fantom) {
                fieldContext.lvl = fantom.lvl;
                fieldContext.offset = 10 * fantom.lvl;
                fieldContext.name = fantom.name;
                fieldContext.propType = fantom.type;
            }
        }
        return fieldContext;
    }

    private createDetailsContext(row: any, index: number): IDocumentDetailsContext {
        const fieldContexts: IFieldContext[] = [];
        for (const documentField of row.documents) {
            const fieldContext = this.createFieldContext(documentField, index);
            fieldContexts.push(fieldContext);
        }
        let parents = new Map<number, IFieldContext | undefined>();
        parents.set(1, undefined);
        for (const item of fieldContexts) {
            item.parent = parents.get(item.lvl);
            parents.set(item.lvl + 1, item);

            item.system =
                item.name === '@context' ||
                item.name === 'type' ||
                (!!item.parent && item.parent.system);
        }
        const attributeContexts: IFieldContext[] = [];
        for (const option of row.options) {
            const attributeContext = this.createFieldContext(option, index);
            attributeContexts.push(attributeContext);
        }
        if (index === 0) {
            return {
                index,
                id: row['left_id'],
                messageId: row['left_message_id'],
                type: row['left_type'],
                schema: row['left_schema'],
                owner: row['left_owner'],
                optionsRate: row['options_rate'],
                documentRate: row['document_rate'],
                totalRate: row['total_rate'],
                fields: fieldContexts,
                attributes: attributeContexts
            }
        } else {
            if (this.size === 2) {
                return {
                    index,
                    id: row['right_id'],
                    messageId: row['right_message_id'],
                    type: row['right_type'],
                    schema: row['right_schema'],
                    owner: row['right_owner'],
                    optionsRate: row['options_rate'],
                    documentRate: row['document_rate'],
                    totalRate: row['total_rate'],
                    fields: fieldContexts,
                    attributes: attributeContexts
                }
            } else {
                return {
                    index,
                    id: row[`right_id_${index}`],
                    messageId: row[`right_message_id_${index}`],
                    type: row[`right_type_${index}`],
                    schema: row[`right_schema_${index}`],
                    owner: row[`right_owner_${index}`],
                    optionsRate: row[`options_rate_${index}`],
                    documentRate: row[`document_rate_${index}`],
                    totalRate: row[`total_rate_${index}`],
                    fields: fieldContexts,
                    attributes: attributeContexts
                }
            }
        }
    }

    public _toInfoContext(data: any): IInfoContext {
        return data;
    }

    public _toDetailsContext(data: any): IDocumentDetailsContext {
        return data;
    }

    public compareSchema(prop: any) {
        const schema1 = prop?.items[0];
        const schema2 = prop?.items[1];
        this.change.emit({
            type: 'schema',
            schemaId1: schema1?.schemaId,
            schemaId2: schema2?.schemaId
        })
    }

    public onCollapse(item: ITreeContext<IDocumentContext, IDocumentDetailsContext>): void {
        if (!this.treeContext) {
            return;
        }
        const hidden = item.collapse == 1;
        if (hidden) {
            item.collapse = 2;
        } else {
            item.collapse = 1;
        }
        for (let i = item.index + 1; i < this.treeContext.length; i++) {
            const item2 = this.treeContext[i];
            if (item2.lvl > item.lvl) {
                item2.hidden = hidden;
            } else {
                break;
            }
        }
    }

    public onScroll(event: any) {
        document.querySelectorAll('.left-tree').forEach(el => {
            el.scrollLeft = event.target.scrollLeft;
        })
    }
}
