import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, } from '@angular/core';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Schema } from '@guardian/interfaces';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SchemaService } from 'src/app/services/schema.service';

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
    @Input() rules?: any;

    public loading: boolean = false;
    public isIssuerObject: boolean = false;
    public issuerOptions: any[] = [];
    public subjects: any[] = [];
    public proofJson!: string;
    public evidenceJson!: string;
    public pageEvent?: PageEvent;
    public pageSize: number = 5;
    public schemaMap: { [x: string]: Schema | null } = {};

    private destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private schemaService: SchemaService,
        private ref: ChangeDetectorRef
    ) {

    }

    ngOnInit(): void {
        if (!this.document) {
            return;
        }

        debugger

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
        this.loading = true;
        forkJoin(requests).subscribe((results: any[]) => {
            for (const result of results) {
                if (result) {
                    try {
                        this.schemaMap[result.iri] = new Schema(result);
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

    getItemsPage(items: any[], pageEvent?: PageEvent) {
        const result = [];
        if (!pageEvent) {
            for (let i = 0; i < this.pageSize && i < items.length; i++) {
                result.push(items[i]);
            }
            return result;
        }

        const startIndex = pageEvent.pageIndex * pageEvent.pageSize;
        const endIndex = startIndex + pageEvent.pageSize;
        for (let i = startIndex; i < endIndex && i < items.length; i++) {
            result.push(items[i]);
        }
        return result;
    }
}
