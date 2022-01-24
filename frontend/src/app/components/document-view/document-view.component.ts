import { ChangeDetectionStrategy, Component, Input, OnInit, } from '@angular/core';
import { Schema } from 'interfaces';

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
    @Input('schemas') schemas!: Schema[];
    @Input('type') type!: 'VC' | 'VP';

    subjects: any[] = []
    proofJson!: string;

    constructor() { }

    ngOnInit(): void {
      this.proofJson = this.document.proof
        ? JSON.stringify(this.document.proof)
        : "";

      switch (this.type){
        case 'VC':
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
        case 'VP':
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
}
