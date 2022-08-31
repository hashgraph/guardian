import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, } from '@angular/core';
import { Schema } from '@guardian/interfaces';
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

    subjects: any[] = [];
    proofJson!: string;
    schemaMap: any = {};
    loading: number = 0;
    isIssuerObject: boolean = false;
    issuerOptions: any[] = [];

    constructor(
        private schemaService: SchemaService,
        private ref: ChangeDetectorRef
    ) {

    }

    ngOnInit(): void {
        this.issuerOptions = [];
        this.proofJson = this.document.proof
            ? JSON.stringify(this.document.proof, null, 4)
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
        if (type) {
            this.schemaService.getSchemasByType(type).subscribe((result) => {
                if (result) {
                    this.schemaMap[type] = new Schema(result);
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
}
