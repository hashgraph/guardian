import { ChangeDetectionStrategy, Component, Input, OnInit, } from '@angular/core';
import { Schema } from 'interfaces';

enum DocumentTypes {
  VP = "VerifiablePresentation",
  VC = "VerifiableCredential"
}

/**
 * View document
 */
@Component({
    selector: 'app-document-view',
    templateUrl: './document-view.component.html',
    styleUrls: ['./document-view.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentViewComponent implements OnInit{
    @Input('document') document: any;
    @Input('hide-fields') hideFields!: { [x: string]: boolean };
    @Input('schemas') schemas!: Schema[]

    subjects: any[] = []
    proofJson!: string;
    documentType!: string;

    constructor() { }

    ngOnInit(): void {
      this.proofJson = this.document.proof
        ? JSON.stringify(this.document.proof)
        : "";

      this.documentType = this.document.type ? this.document.type[0] : "";

      switch (this.documentType){
        case DocumentTypes.VC:
          if (Object.getPrototypeOf(this.document.credentialSubject) === Object.prototype) {
            this.subjects.push(this.document.credentialSubject);
          }
          else {
            for(let i=0;i<this.document.credentialSubject.length;i++)
            {
              this.subjects.push(this.document.credentialSubject[i]);
            }
          }
          break;
        case DocumentTypes.VP:
          if (Object.getPrototypeOf(this.document.verifiableCredential) === Object.prototype) {
            this.subjects.push(this.document.verifiableCredential);
          }
          else {
            for(let i=0;i<this.document.verifiableCredential.length;i++)
            {
              this.subjects.push(this.document.verifiableCredential[i]);
            }
          }
          break;
      }
    }

    GetSchema(id: any) {
        return this.schemas.filter((schema)=> schema.uuid === id)[0];
    }

    GetSubjectsTitle(documentType: string): string {
      switch (documentType) {
        case DocumentTypes.VC:
          return "Credential Subject";
        case DocumentTypes.VP:
          return "Verifiable Credential";
        default:
          return "";
      }
    }
}
