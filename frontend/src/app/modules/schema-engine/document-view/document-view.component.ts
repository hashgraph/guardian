import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Schema } from '@guardian/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SchemaService } from 'src/app/services/schema.service';

/**
 * View document
 */
@Component({
    selector: 'app-document-view',
    templateUrl: './document-view.component.html',
    styleUrls: ['./document-view.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentViewComponent implements OnInit {
    @Input('document') document: any;
    @Input('hide-fields') hideFields!: { [x: string]: boolean };
    @Input('type') type!: 'VC' | 'VP';
    @Input('schema') schema!: any;

    subjects: any[] = [];
    proofJson!: string;
    evidenceJson!: string;
    schemaMap: any = {};
    loading: number = 0;
    isIssuerObject: boolean = false;
    issuerOptions: any[] = [];
    pageEvent?: PageEvent;
    pageSize: number = 5;
    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private schemaService: SchemaService,
        private ref: ChangeDetectorRef
    ) {

    }

    ngOnInit(): void {
        if (!this.document) {
            return;
        }

        this.issuerOptions = [];
        this.proofJson = this.document.proof
            ? JSON.stringify(this.document.proof, null, 4)
            : "";
        this.evidenceJson = this.document.evidence
            ? JSON.stringify(this.document.evidence, null, 4)
            : "";
        this.isIssuerObject = typeof this.document.issuer === 'object';
        if (this.isIssuerObject) {
            for (const key in this.document.issuer) {
                if (key !== 'id') {
                    this.issuerOptions.push([key, this.document.issuer[key]]);
                }
            }
        }
        switch (this.type) {
            case 'VC':
                if (Object.getPrototypeOf(this.document.credentialSubject) === Object.prototype) {
                    this.subjects.push(this.document.credentialSubject);
                } else {
                    for (let i = 0; i < this.document.credentialSubject.length; i++) {
                        this.subjects.push(this.document.credentialSubject[i]);
                    }
                }
                for (const credentialSubject of this.subjects) {
                    this.loading++;
                    this.loadSchema(credentialSubject.type);
                }
                break;
            case 'VP':
                if (Object.getPrototypeOf(this.document.verifiableCredential) === Object.prototype) {
                    this.subjects.push(this.document.verifiableCredential);
                } else {
                    for (let i = 0; i < this.document.verifiableCredential.length; i++) {
                        this.subjects.push(this.document.verifiableCredential[i]);
                    }
                }
                break;
        }
    }

    loadSchema(type: string) {
        if (this.schema) {
            this.schemaMap[type] =  new Schema(this.schema);
            this.loading--;
            this.ref.detectChanges();
        }
        if (type) {
            this.schemaService.getSchemasByType(type)
                .pipe(takeUntil(this.destroy$))
                .subscribe((result) => {
                    if (result) {
                        try {
                            this.schemaMap[type] = new Schema(result);
                        } catch (error) {
                            this.schemaMap[type] = null;
                        }
                    } else {
                        this.schemaMap[type] = null;
                    }
                    this.loading--;
                    this.ref.detectChanges();
                }, (error) => {
                    this.schemaMap[type] = null;
                    this.loading--;
                    this.ref.detectChanges();
                });
        } else {
            this.schemaMap[type] = null;
            this.loading--;
            this.ref.detectChanges();
        }
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

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
