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
 * Export schema dialog.
 */
@Component({
    selector: 'link-dialog',
    templateUrl: './link-dialog.component.html',
    styleUrls: ['./link-dialog.component.css']
})
export class LinkDialogComponent implements OnInit, AfterContentInit {
    loading = false;
    initDialog = false;
    link: string;
    invitation: string;
    header: string;
    blockId: string;
    policyId: string;
    roles: string[];
    group: string;
    role: string;

    constructor(
        public dialogRef: MatDialogRef<LinkDialogComponent>,
        private policyEngineService: PolicyEngineService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.blockId = data.blockId;
        this.policyId = data.policyId;
        this.group = data.group;
        this.header = data.header;
        this.roles = data.roles;
        this.invitation = '';
        this.link = '';
        this.role = this.roles[0];
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

    onInvite() {
        this.loading = true;
        this.policyEngineService.setBlockData(this.blockId, this.policyId, {
            action: 'invite',
            group: this.group,
            role: this.role,
        }).subscribe((result) => {
            this.invitation = result.invitation;
            this.link = location.origin + location.pathname + `?policyParams=${btoa(JSON.stringify(result))}`;
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}
