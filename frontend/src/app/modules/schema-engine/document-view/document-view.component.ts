import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, } from '@angular/core';
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
    @Input('hide-fields') hideFields!: { [x: string]: boolean };
    @Input('type') type!: 'VC' | 'VP';
    @Input('schema') schema!: any;

    @Input() dryRun?: boolean = false;
    @Input() policyId?: string;
    @Input() documentId?: string;
    @Input() schemaId?: string;

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
    public formulas: FormulasTree | null;
    public formulasResults: any | null;

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
        if (this.type === 'VC') {
            this.loadSchema();
        }
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    private loadSchema() {
        for (const credentialSubject of this.subjects) {
            const type: string = credentialSubject.type;
            if (!this.schemaMap[type]) {
                this.schemaMap[type] = null;
            }
            if (!this.schemaId) {
                this.schemaId = `#${type}`;
            }
        }
        const requests: any[] = [];
        for (const [type, schema] of Object.entries(this.schemaMap)) {
            if (!schema) {
                if (this.getByUser) {
                    requests.push(
                        this.schemaService
                            .getSchemasByTypeAndUser(type)
                            .pipe(takeUntil(this.destroy$))
                    )
                } else {
                    requests.push(
                        this.schemaService
                            .getSchemasByType(type)
                            .pipe(takeUntil(this.destroy$))
                    )
                }
            }
        }

        requests.push(
            this.schemaRulesService
                .getSchemaRuleData({
                    policyId: this.policyId,
                    schemaId: this.schemaId,
                    documentId: this.documentId
                })
                .pipe(takeUntil(this.destroy$))
        )

        requests.push(
            this.formulasService
                .getFormulasData({
                    policyId: this.policyId,
                    schemaId: this.schemaId,
                    documentId: this.documentId
                })
                .pipe(takeUntil(this.destroy$))
        )

        this.loading = true;
        forkJoin(requests).subscribe((results: any[]) => {
            const formulas = results.pop();
            const rules = results.pop();

            if (!formulas.document) {
                formulas.document = { document: this.document };
            }

            for (const result of results) {
                if (result) {
                    try {
                        let type = (result.iri || '');
                        if (type.startsWith('#')) {
                            type = type.substr(1);
                        }
                        this.schemaMap[type] = new Schema(result);
                    } catch (error) {
                        console.error(error);
                    }
                }
            }

            this.rules = new DocumentValidators(rules);
            this.rulesResults = this.rules.validateVC(this.schemaId, this.document);
            this.formulas = FormulasTree.from(formulas);
            this.formulas?.setDocuments(this.document);
            this.formulasResults = this.formulas?.getFields(this.schemaId);

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
}
