import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IValidateStatus, IValidatorNode, IValidatorStep, LabelValidators, Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { DialogService } from 'primeng/dynamicdialog';
import { IDocument } from '../../../common/models/assessment';
import { IColumn } from '../../../common/models/grid';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';

@Component({
    selector: 'app-policy-label-document-configuration',
    templateUrl: './policy-label-document-configuration.component.html',
    styleUrls: ['./policy-label-document-configuration.component.scss'],
})
export class PolicyLabelDocumentConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public policy: any;
    public definitionId: string;
    public item: any;

    public documents: any[];
    public documentsCount: number;
    public document: any | null;
    public relationships: any;
    public pageIndex: number;
    public pageSize: number;

    public validator: LabelValidators;
    public tree: any;
    public steps: any[];
    public current: IValidatorStep | null;
    public menu: IValidatorNode[];
    public result: IValidateStatus | undefined;

    public status: boolean | undefined = undefined;

    public defaultColumns: IColumn[] = [{
        id: 'checkbox',
        title: '',
        type: 'text',
        size: '56',
        minSize: '56',
        tooltip: false
    }, {
        id: 'id',
        title: 'ID',
        type: 'text',
        size: 'auto',
        minSize: '150',
        tooltip: false
    }];
    public columns: IColumn[] = [{
        id: 'tokenId',
        title: 'Token ID',
        type: 'text',
        size: 'auto',
        minSize: '150',
        tooltip: false
    }, {
        id: 'date',
        title: 'Date',
        type: 'text',
        size: 'auto',
        minSize: '150',
        tooltip: false
    }, {
        id: 'amount',
        title: 'Amount',
        type: 'text',
        size: 'auto',
        minSize: '150',
        tooltip: false
    }];
    public userColumns: any[] = [];
    public schemas = new Map<string, Schema>();

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private policyLabelsService: PolicyLabelsService,
        private router: Router,
        private route: ActivatedRoute
    ) {
    }

    ngOnInit() {
        this.documents = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.documentsCount = 0;
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        this.profileService
            .getProfile()
            .subscribe((profile) => {
                this.isConfirmed = !!(profile && profile.confirmed);
                this.user = new UserPermissions(profile);
                this.owner = this.user.did;

                if (this.isConfirmed) {
                    this.loadData();
                } else {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }
            }, (e) => {
                this.loading = false;
            });
    }

    private loadData() {
        this.definitionId = this.route.snapshot.params['definitionId'];
        this.loading = true;
        forkJoin([
            this.policyLabelsService.getLabel(this.definitionId),
            this.policyLabelsService.getRelationships(this.definitionId),
        ]).subscribe(([item, relationships]) => {
            this.item = item;
            this.policy = relationships?.policy || {};
            this.loadDocuments();
        }, (e) => {
            this.loading = false;
        });
    }

    private loadDocuments() {
        this.loading = true;
        this.policyLabelsService
            .getTokens(this.definitionId)
            .subscribe((documents) => {
                const { page, count } = this.policyLabelsService.parsePage(documents);
                this.documents = page;
                this.documentsCount = count;
                this.document = null;
                this.updateDocuments();
                this.updateMetadata();
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    public updateDocuments() {
        for (const doc of this.documents) {
            doc.__id = doc.messageId;
            doc.__cols = new Map<IColumn, any>();
        }
    }

    private updateMetadata() {
        this.validator = new LabelValidators(this.item);
        this.tree = this.validator.getTree();
        this.steps = this.validator.getSteps();

        this.addDefaultSteps();

        this.menu = []
        for (const child of this.tree.children) {
            this.createMenu(child, this.menu);
        }
        this.current = this.validator.start();
    }

    private addDefaultSteps() {
        this.tree.children.unshift({
            name: 'Target',
            item: this,
            selectable: true,
            type: 'target',
            children: []
        })
        this.steps.unshift({
            name: 'Target',
            title: 'Target',
            item: this,
            type: 'target',
            config: null,
            auto: false,
            disabled: true,
            update: this.onTarget.bind(this),
            validate: this.onTarget.bind(this),
        })

        this.tree.children.push({
            name: 'Result',
            item: this.validator,
            selectable: true,
            type: 'result',
            children: []
        })
        this.steps.push({
            name: 'Result',
            title: 'Result',
            item: this.validator,
            type: 'result',
            config: this.validator,
            auto: false,
            update: this.onResult.bind(this),
            validate: this.onResult.bind(this),
        })
    }

    private createMenu(node: IValidatorNode, result: any[]) {
        if (node.type === 'group') {
            node.icon = 'folder';
        } else if (node.type === 'rules') {
            node.icon = 'file';
        } else if (node.type === 'label') {
            node.icon = 'folder';
        } else if (node.type === 'statistic') {
            node.icon = 'file';
        } else if (node.type === 'target') {
            node.icon = 'list';
        } else if (node.type === 'result') {
            node.icon = 'publish';
        }
        result.push(node);
        for (const child of node.children) {
            this.createMenu(child, result);
        }
        return result;
    }

    private onTarget() {
        return;
    }

    private onResult() {
        this.result = this.validator.getStatus();
    }

    public isSelected(menuItem: any): boolean {
        return menuItem.item === this.current?.item;
    }

    public onPrev(): void {
        this.current = this.validator.prev();
        this.updateStep();
    }

    public onNext(): void {
        if (this.current?.type === 'target') {
            this.loading = true;
            this.policyLabelsService
                .getTokenDocuments(this.document.id, this.definitionId)
                .subscribe((documents) => {
                    this.relationships = documents?.relatedDocuments || [];
                    this.validator.setData(documents?.relatedDocuments || []);
                    this.current = this.validator.next();
                    setTimeout(() => {
                        this.loading = false;
                    }, 1000);
                }, (e) => {
                    this.loading = false;
                });
        } else {
            this.current = this.validator.next();
        }
        this.updateStep();
    }

    public onSubmit() {
        const result = this.validator.getResult();
        const item = {
            target: this.document.id,
            documents: result
        }
        this.loading = true;
        this.policyLabelsService
            .createLabelDocument(this.definitionId, item)
            .subscribe((row) => {
                this.router.navigate([
                    '/policy-labels',
                    this.definitionId,
                    'documents',
                    row.id
                ]);
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    public onSelectDocument(item: IDocument) {
        this.document = item;
        this.steps[0].disabled = !this.document;
        this.status = this.document ? true : undefined;
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadDocuments();
    }

    public getCellValue(row: IDocument, column: IColumn): any {
        if (row.__cols.has(column)) {
            return row.__cols.get(column);
        } else {
            let value: any;
            if (typeof column.id === 'string') {
                value = this.getFieldValue(row, [column.id]);
            } else {
                value = this.getFieldValue(row, column.id);
            }
            if (Array.isArray(value)) {
                value = `[${value.join(',')}]`;
            }
            row.__cols.set(column, value);
            return value;
        }
    }

    private getFieldValue(document: any, fullPath: string[]): any {
        if (!document) {
            return null;
        }

        let vc = document?.document?.verifiableCredential;
        if (Array.isArray(vc)) {
            vc = vc[vc.length - 1];
        }
        let cs: any = vc?.credentialSubject;
        if (Array.isArray(cs)) {
            cs = cs[0];
        }
        let value: any = cs;
        for (let i = 0; i < fullPath.length; i++) {
            if (value) {
                value = value[fullPath[i]]
            } else {
                return undefined;
            }
        }
        return value;
    }

    public onScore() {
        this.updateStep();
    }

    public updateStep() {
        if (this.current?.type === 'scores') {
            let valid = true;
            if (Array.isArray(this.current.config)) {
                for (const score of this.current.config) {
                    let validScore = score.value !== undefined;
                    valid = valid && validScore;
                }
            }
            this.current.disabled = !valid;
        }
    }

    public getVariableValue(value: any): any {
        if (value === undefined) {
            return 'N/A';
        } else {
            return value;
        }
    }

    public onBack() {
        this.router.navigate(['/policy-labels']);
    }
}