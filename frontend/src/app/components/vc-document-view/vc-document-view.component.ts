import { Component, Input, OnInit, } from '@angular/core';
import { Schema} from 'interfaces';
import { SchemaService } from 'src/app/services/schema.service';


/**
 * View vc document
 */
@Component({
    selector: 'app-vc-document-view',
    templateUrl: './vc-document-view.component.html',
    styleUrls: ['./vc-document-view.component.css']
})
export class VcDocumentViewComponent implements OnInit{
    @Input('vc-document') vcDocument: any;
    @Input('hide-credential-subject-fields') hideFields!: { [x: string]: boolean };
    @Input('schemas') schemas!: Schema[]

    credentialSubjects: any[] = []
    proofJson!: string;

    constructor(
      private schemaService: SchemaService,
    ) {
      this.schemaService.getSchemes()
        .subscribe((schemas) => {
          this.schemas = Schema.mapRef(schemas);
        });
    }

    ngOnInit(): void {
      this.proofJson = this.vcDocument.proof
        ? JSON.stringify(this.vcDocument.proof)
        : "";

      for(let i=0;i<this.vcDocument.credentialSubject.length;i++)
      {
        this.credentialSubjects.push(this.vcDocument.credentialSubject[i])
      }
    }

    GetSchema(id: any) {
        return this.schemas.filter((schema)=> schema.context.type === id)[0];
    }
}
