import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GenerateUUIDv4, IValidatorStep, LabelValidators, Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { IFormula, IOption, IScore, IVariable } from '../../../common/models/assessment';
import { TreeSource } from '../../../common/tree-graph/tree-source';
import { TreeGraphComponent } from '../../../common/tree-graph/tree-graph.component';
import { DocumentNode, SchemaData } from '../../../common/models/schema-node';
import { TreeNode } from '../../../common/tree-graph/tree-node';
import { VCViewerDialog } from '../../../schema-engine/vc-dialog/vc-dialog.component';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';

@Component({
    selector: 'app-policy-label-document-view',
    templateUrl: './policy-label-document-view.component.html',
    styleUrls: ['./policy-label-document-view.component.scss'],
})
export class PolicyLabelDocumentViewComponent implements OnInit {
    public readonly title: string = 'Document';

    public loading: boolean = true;
    public navLoading: boolean = false;
    public nodeLoading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public definitionId: string;
    public documentId: string;
    public definition: any;
    public policy: any;
    public policySchemas: any[];
    public documentsSchemas: any[];
    public document: any;
    public target: any;
    public relationships: any;
    public schemasMap: Map<string, Schema>;
    public stepper = [true, false, false];

    public token: any;

    public preview: IVariable[];
    public scores: IScore[];
    public formulas: IFormula[];

    public tree: TreeGraphComponent;
    public nodes: DocumentNode[];
    public source: TreeSource<DocumentNode>;
    public selectedNode: DocumentNode;

    public steps: IValidatorStep[];

    private subscription = new Subscription();

    public get zoom(): number {
        if (this.tree) {
            return Math.round(this.tree.zoom * 100);
        } else {
            return 100;
        }
    }

    private validator: LabelValidators;

    constructor(
        private profileService: ProfileService,
        private policyLabelsService: PolicyLabelsService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {

    }

    ngOnInit() {
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
        this.documentId = this.route.snapshot.params['documentId'];
        this.loading = true;
        forkJoin([
            this.policyLabelsService.getLabel(this.definitionId),
            this.policyLabelsService.getRelationships(this.definitionId),
            this.policyLabelsService.getLabelDocument(this.definitionId, this.documentId),
            this.policyLabelsService.getLabelDocumentRelationships(this.definitionId, this.documentId)
        ]).subscribe(([
            definition,
            definitionRelationships,
            document,
            documentRelationships
        ]) => {
            this.definition = definition;
            this.policy = definitionRelationships?.policy || {};
            this.policySchemas = definitionRelationships?.policySchemas || [];
            this.documentsSchemas = definitionRelationships?.documentsSchemas || [];
            this.document = document || {};
            this.target = documentRelationships?.target || {};
            this.relationships = documentRelationships?.relationships || [];
            this.updateMetadata();
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    public onBack() {
        this.router.navigate([
            '/policy-labels',
            this.definitionId,
            'documents'
        ]);
    }

    private updateMetadata() {
        this.token = this.getMintVc();

        this.validator = new LabelValidators(this.definition);
        this.steps = this.validator.getDocument();
        this.validator.setData(this.relationships);
        this.validator.setVp(this.document);

        //
        this.schemasMap = new Map<string, Schema>();
        for (const schema of this.policySchemas) {
            try {
                const item = new Schema(schema);
                this.schemasMap.set(item.iri || item.id, item)
            } catch (error) {
                console.log(error);
            }
        }
        for (const schema of this.documentsSchemas) {
            try {
                const item = new Schema(schema);
                this.schemasMap.set(item.iri || item.id, item)
            } catch (error) {
                console.log(error);
            }
        }

        //
        let root: DocumentNode | null = null;
        let target: DocumentNode | null = null;
        this.nodes = [];

        if (this.document) {
            this.document.schemaName = 'Label';
            this.document.document.issuer = this.document.document?.proof?.verificationMethod?.split('#')?.[0];
            root = DocumentNode.from(this.document, 'root');
            root.entity = 'vp';
            this.nodes.push(root);
        }
        if (root && this.target) {
            this.target.schemaName = 'Token'
            this.target.document.issuer = this.target.document?.proof?.verificationMethod?.split('#')?.[0];
            target = DocumentNode.from(this.target, 'sub');
            target.entity = 'vp';
            this.nodes.push(target);
            root.addId(target.id);
        }
        if (target && this.relationships) {
            for (const item of this.relationships) {
                item.schemaName = this.schemasMap.get(item.schema)?.name || item.schema;
                const node = DocumentNode.from(item, 'sub');
                if (node.id !== target.id) {
                    this.nodes.push(node);
                    target.addId(node.id);
                }
            }
        }
        this.source = new TreeSource(this.nodes);
        if (this.tree) {
            this.tree.setData(this.source);
            this.tree.move(18, 46);
        }
    }

    public getVariableValue(value: any): any {
        if (value === undefined) {
            return 'N/A';
        } else {
            return value;
        }
    }

    private getMintVc() {
        let data: any = this.target?.document?.verifiableCredential;
        if (Array.isArray(data)) {
            data = data[data.length - 1];
        }
        data = data?.credentialSubject;
        if (Array.isArray(data)) {
            data = data[0];
        }
        return data
    }

    public onStep(index: number) {
        this.navLoading = true;
        for (let i = 0; i < this.stepper.length; i++) {
            this.stepper[i] = false;
        }
        this.stepper[index] = true;
        setTimeout(() => {
            this.tree?.move(18, 46);
            setTimeout(() => {
                this.navLoading = false;
            }, 200);
        }, 200);
    }

    public initTree($event: TreeGraphComponent) {
        this.tree = $event;
        if (this.nodes) {
            this.tree.setData(this.source);
            this.tree.move(18, 46);
        }
    }

    public createNodes($event: any) {
        this.tree.move(18, 46);
    }

    public onSelectNode(node: TreeNode<SchemaData> | null) {
        this.nodeLoading = true;
        this.selectedNode = node as DocumentNode;
        setTimeout(() => {
            this.nodeLoading = false;
        }, 350);
    }

    public onZoom(d: number) {
        if (this.tree) {
            this.tree.onZoom(d);
            if (d === 0) {
                this.tree.move(18, 46);
            }
        }
    }

    public onClearNode() {
        this.tree?.onSelectNode(null);
    }

    public openVCDocument(document: any) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: document.id,
                row: document,
                dryRun: false,
                document: document.document,
                title: document.schemaName || 'VC Document',
                type: 'VC',
                viewDocument: true,
                // schema: this.schema
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public openVPDocument(document: any) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: document.id,
                row: document,
                dryRun: false,
                document: document.document,
                title: 'VP Document',
                type: 'VP',
                viewDocument: true,
                // schema: this.schema
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }
}
