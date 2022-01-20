import { ChangeDetectionStrategy, Component, Input, OnInit, } from '@angular/core';
import { Schema} from 'interfaces';


/**
 * View vc document
 */
@Component({
    selector: 'app-vc-document-view',
    templateUrl: './vc-document-view.component.html',
    styleUrls: ['./vc-document-view.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VcDocumentViewComponent implements OnInit{
    @Input('vc-document') vcDocument: any;
    @Input('hide-credential-subject-fields') hideFields!: { [x: string]: boolean };
    @Input('schemas') schemas!: Schema[]

    credentialSubjects: any[] = []
    proofJson!: string;

    constructor() { }

    ngOnInit(): void {
      this.proofJson = this.vcDocument.proof
        ? JSON.stringify(this.vcDocument.proof)
        : "";

      if (Object.getPrototypeOf(this.vcDocument.credentialSubject) === Object.prototype) {
        this.credentialSubjects.push(this.vcDocument.credentialSubject);
      }
      else {
        for(let i=0;i<this.vcDocument.credentialSubject.length;i++)
        {
          this.credentialSubjects.push(this.vcDocument.credentialSubject[i])
        }
      }
    }

    GetSchema(id: any) {
        return this.schemas.filter((schema)=> schema.uuid === id)[0];
    }
}
