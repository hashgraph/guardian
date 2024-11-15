import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GenerateUUIDv4, Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { IFormula, IOption, IScore, IVariable } from '../../../common/models/assessment';
import { TreeSource } from '../../../common/tree-graph/tree-source';
import { TreeGraphComponent } from '../../../common/tree-graph/tree-graph.component';
import { DocumentNode, SchemaData } from '../../../common/models/schema-node';
import { TreeNode } from '../../../common/tree-graph/tree-node';
import { VCViewerDialog } from '../../../schema-engine/vc-dialog/vc-dialog.component';

@Component({
    selector: 'app-statistic-assessment-view',
    templateUrl: './statistic-assessment-view.component.html',
    styleUrls: ['./statistic-assessment-view.component.scss'],
})
export class StatisticAssessmentViewComponent implements OnInit {
    public readonly title: string = 'Assessment';

    public loading: boolean = true;
    public navLoading: boolean = false;
    public nodeLoading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public definitionId: string;
    public assessmentId: string;
    public definition: any;
    public policy: any;
    public schemas: any[];
    public schema: any;
    public assessment: any;
    public target: any;
    public relationships: any;
    public schemasMap: Map<string, Schema>;
    public stepper = [true, false, false];

    public preview: IVariable[];
    public scores: IScore[];
    public formulas: IFormula[];

    public tree: TreeGraphComponent;
    public nodes: DocumentNode[];
    public source: TreeSource<DocumentNode>;
    public selectedNode: DocumentNode;

    private subscription = new Subscription();

    public get zoom(): number {
        if (this.tree) {
            return Math.round(this.tree.zoom * 100);
        } else {
            return 100;
        }
    }

    constructor(
        private profileService: ProfileService,
        private policyStatisticsService: PolicyStatisticsService,
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
        this.assessmentId = this.route.snapshot.params['assessmentId'];
        this.loading = true;
        forkJoin([
            this.policyStatisticsService.getDefinition(this.definitionId),
            this.policyStatisticsService.getRelationships(this.definitionId),
            this.policyStatisticsService.getAssessment(this.definitionId, this.assessmentId),
            this.policyStatisticsService.getAssessmentRelationships(this.definitionId, this.assessmentId),
        ]).subscribe(([
            definition,
            definitionRelationships,
            assessment,
            assessmentRelationships
        ]) => {
            this.definition = definition;
            this.policy = definitionRelationships?.policy || {};
            this.schemas = definitionRelationships?.schemas || [];
            this.schema = definitionRelationships?.schema;
            this.assessment = assessment || {};
            this.target = assessmentRelationships?.target || {};
            this.relationships = assessmentRelationships?.relationships || [];
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
            '/policy-statistics',
            this.definitionId,
            'assessments'
        ]);
    }

    private updateMetadata() {
        const config = this.definition.config || {};
        const variables = config.variables || [];
        const formulas = config.formulas || [];
        const scores = config.scores || [];
        const preview = new Map<string, IVariable>();

        this.preview = [];
        this.scores = [];
        this.formulas = [];

        let document: any = this.assessment?.document?.credentialSubject;
        if (Array(document)) {
            document = document[0];
        }
        if (!document) {
            document = {};
        }

        for (const variable of variables) {
            const path = [...(variable.path || '').split('.')];
            const fullPath = [variable.schemaId, ...path];
            const field: IVariable = {
                id: variable.id,
                description: variable.fieldDescription || '',
                schemaId: variable.schemaId,
                path: path,
                fullPath: fullPath,
                value: document[variable.id],
                isArray: false
            }
            this.preview.push(field);
            preview.set(variable.id, field);
        }

        for (const score of scores) {
            const relationships: IVariable[] = [];
            if (score.relationships) {
                for (const ref of score.relationships) {
                    const field = preview.get(ref);
                    if (field) {
                        relationships.push(field);
                    }
                }
            }
            const options: IOption[] = [];
            if (score.options) {
                for (const option of score.options) {
                    options.push({
                        id: GenerateUUIDv4(),
                        description: option.description,
                        value: option.description //this is not a typo.
                    });
                }
            }
            this.scores.push({
                id: score.id,
                description: score.description,
                value: document[score.id],
                relationships,
                options
            });
        }

        for (const formula of formulas) {
            this.formulas.push({
                id: formula.id,
                description: formula.description,
                value: document[formula.id],
                formula: formula.formula,
                type: formula.type
            });
        }

        //
        this.schemasMap = new Map<string, Schema>();
        for (const schema of this.schemas) {
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

        if (this.assessment) {
            this.assessment.schemaName = 'Assessment';
            root = DocumentNode.from(this.assessment, 'root');
            this.nodes.push(root);
        }
        if (root && this.target) {
            this.target.schemaName = this.schemasMap.get(this.target.schema)?.name || this.target.schema;
            target = DocumentNode.from(this.target, 'sub');
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
                schema: this.schema
            }
        });
        dialogRef.onClose.subscribe(async (result) => {});
    }
}
