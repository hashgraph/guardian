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
/**
 * Export schema dialog.
 */
@Component({
    selector: 'link-dialog',
    templateUrl: './link-dialog.component.html',
    styleUrls: ['./link-dialog.component.css']
})
export class LinkDialogComponent implements OnInit, AfterContentInit {

    initDialog = false;
    link: string;
    invitation: string;
    header: string;

    constructor(
        public dialogRef: MatDialogRef<LinkDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.header = data.header;
        this.invitation = data.invitation;
        this.link = data.link;
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
