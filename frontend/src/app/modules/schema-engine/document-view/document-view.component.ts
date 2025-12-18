import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges, } from '@angular/core';
import { DocumentValidators, Schema, SchemaRuleValidateResult } from '@guardian/interfaces';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormulasService } from 'src/app/services/formulas.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { SchemaService } from 'src/app/services/schema.service';
import { FormulasTree } from '../../formulas/models/formula-tree';

/**
 * View document
 */
@Component({
    selector: 'app-document-view',
    templateUrl: './document-view.component.html',
    styleUrls: ['./document-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentViewComponent implements OnInit {
    @Input('getByUser') getByUser: boolean = false;
    @Input('document') document: any;
    @Input('formulas') formulas: FormulasTree | null;
    @Input('hide-fields') hideFields!: { [x: string]: boolean };
    @Input('type') type!: 'VC' | 'VP';
    @Input('schema') schema!: any;
    @Input('discussion') discussionData!: any;
    @Input('discussion-action') discussionAction: boolean = false;
    @Input('discussion-view') discussionView: boolean = false;
    @Input('tags') tags: any[] = [];

    @Input() dryRun?: boolean = false;
    @Input() policyId?: string;
    @Input() documentId?: string;
    @Input() schemaId?: string;
    @Input('relayer-account') relayerAccount?: string;

    @Output('discussion-action') discussionActionEvent = new EventEmitter<any>();

    public loading: boolean = false;
    public isIssuerObject: boolean = false;
    public issuerOptions: any[] = [];
    public subjects: any[] = [];
    public proofJson!: string;
    public evidenceJson!: string;
    public pageIndex: number = 0;
    public pageSize: number = 5;
    public schemaMap: { [x: string]: Schema | null } = {};
    public rules: DocumentValidators;
    public rulesResults: SchemaRuleValidateResult;
    public formulasResults: any | null;
    public link: string | undefined;

    private destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private schemaService: SchemaService,
        private schemaRulesService: SchemaRulesService,
        private formulasService: FormulasService,
        private ref: ChangeDetectorRef
    ) {

    }

    ngOnInit(): void {
        if (!this.document) {
            return;
        }

        this.issuerOptions = [];
        this.proofJson = this.document.proof ? JSON.stringify(this.document.proof, null, 4) : '';
        this.evidenceJson = this.document.evidence ? JSON.stringify(this.document.evidence, null, 4) : '';
        this.isIssuerObject = typeof this.document.issuer === 'object';
        if (this.isIssuerObject) {
            for (const key in this.document.issuer) {
                if (key !== 'id') {
                    this.issuerOptions.push([key, this.document.issuer[key]]);
                }
            }
        }
        if (this.type === 'VC') {
            if (Array.isArray(this.document.credentialSubject)) {
                for (const s of this.document.credentialSubject) {
                    this.subjects.push(s);
                }
            } else {
                this.subjects.push(this.document.credentialSubject);
            }
        } else if (this.type === 'VP') {
            if (Array.isArray(this.document.verifiableCredential)) {
                for (const s of this.document.verifiableCredential) {
                    this.subjects.push(s);
                }
            } else {
                this.subjects.push(this.document.verifiableCredential);
            }
        }
        this.loadData();
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.formulasResults = this.formulas?.getFields(this.schemaId);
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    private loadData() {
        const requests: any = {};

        //Load Schemas
        if (this.type === 'VC') {
            const schemas: any[] = [];
            for (const credentialSubject of this.subjects) {
                const type: string = credentialSubject.type;
                if (!this.schemaMap[type]) {
                    this.schemaMap[type] = null;
                }
                if (!this.schemaId) {
                    this.schemaId = `#${type}`;
                }
            }
            for (const [type, schema] of Object.entries(this.schemaMap)) {
                if (!schema) {
                    if (this.getByUser) {
                        schemas.push(
                            this.schemaService
                                .getSchemasByTypeAndUser(type)
                                .pipe(takeUntil(this.destroy$))
                        )
                    } else {
                        schemas.push(
                            this.schemaService
                                .getSchemasByType(type)
                                .pipe(takeUntil(this.destroy$))
                        )
                    }
                }
            }
            for (let i = 0; i < schemas.length; i++) {
                requests[i] = schemas[i];
            }
        }

        //Load Rules
        if (this.type === 'VC') {
            requests.rules = this.schemaRulesService
                .getSchemaRuleData({
                    policyId: this.policyId,
                    schemaId: this.schemaId,
                    documentId: this.documentId
                })
                .pipe(takeUntil(this.destroy$));
        }

        //Load Formulas
        if (this.documentId) {
            requests.formulas = this.formulasService
                .getFormulasData({
                    policyId: this.policyId,
                    schemaId: this.schemaId,
                    documentId: this.documentId
                })
                .pipe(takeUntil(this.destroy$));
        }


        this.loading = true;
        forkJoin(requests).subscribe((results: any) => {
            //Load Rules
            if (results.rules) {
                const rules = results.rules;
                this.rules = new DocumentValidators(rules);
                this.rulesResults = this.rules.validateVC(this.schemaId, this.document);
                delete results.rules;
            }

            //Load Formulas
            if (results.formulas) {
                const formulas = results.formulas;
                this.formulas = FormulasTree.from(formulas);
                this.formulas?.setDocuments(this.document);
                this.formulasResults = this.formulas?.getFields(this.schemaId);
                delete results.formulas;
            }

            //Load Schemas
            for (const schema of Object.values<any>(results)) {
                if (schema) {
                    try {
                        let type = (schema.iri || '');
                        if (type.startsWith('#')) {
                            type = type.substr(1);
                        }
                        this.schemaMap[type] = new Schema(schema);
                    } catch (error) {
                        console.error(error);
                    }
                }
            }

            setTimeout(() => {
                this.loading = false;
                this.ref.detectChanges();
            }, 500);
        }, (e) => {
            this.loading = false;
            this.ref.detectChanges();
        });

    }

    getItemsPage(items: any[]) {
        const result = [];
        const startIndex = this.pageIndex * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        for (let i = startIndex; i < endIndex && i < items.length; i++) {
            result.push(items[i]);
        }
        return result;
    }

    public getCredentialSubject(item: any): string {
        if (this.subjects.length > 1) {
            return `Credential Subject #${this.subjects.indexOf(item) + 1}`;
        } else {
            return 'Credential Subject';
        }
    }

    public getVerifiableCredential(item: any): string {
        if (this.subjects.length > 1) {
            return `Verifiable Credential #${this.subjects.indexOf(item) + 1}`;
        } else {
            return 'Verifiable Credential';
        }
    }

    public onPage(event: any): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
    }

    public onDiscussionAction($event: any) {
        this.discussionActionEvent.emit($event);
    }

    public openField(id?: string): void {
        const path = id?.split('/');
        this.link = path && path.length > 1 ? path[path.length - 1] : undefined;
        this.ref.detectChanges();
    }

    public getTagJson(tag: any): string {
        return tag ? JSON.stringify(tag, null, 4) : '';
    }
}
