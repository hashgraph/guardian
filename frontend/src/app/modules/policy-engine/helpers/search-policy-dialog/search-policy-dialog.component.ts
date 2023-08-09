import {
    AfterContentChecked, AfterContentInit,
    AfterViewChecked,
    AfterViewInit,
    Component,
    Inject,
    OnInit,
    ViewChild
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
/**
 * Search policy dialog.
 */
@Component({
    selector: 'search-policy-dialog',
    templateUrl: './search-policy-dialog.component.html',
    styleUrls: ['./search-policy-dialog.component.css']
})
export class SearchPolicyDialog implements OnInit, AfterContentInit {
    loading = false;
    initDialog = false;
    header: string;
    list: any;

    constructor(
        public dialogRef: MatDialogRef<SearchPolicyDialog>,
        private policyEngineService: PolicyEngineService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.header = data.header;
        this.list = data.list;
    }

    ngOnInit() {

    }

    ngAfterContentInit() {
        setTimeout(() => {
            this.initDialog = true;
        }, 100);
    }

    onOk(): void {
        this.dialogRef.close();
    }
}
