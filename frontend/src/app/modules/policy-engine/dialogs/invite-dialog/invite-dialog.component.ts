import {
    AfterContentChecked, AfterContentInit,
    AfterViewChecked,
    AfterViewInit,
    Component,
    Inject,
    OnInit,
    ViewChild
} from '@angular/core';
import {PolicyEngineService} from 'src/app/services/policy-engine.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

/**
 * Export schema dialog.
 */
@Component({
    selector: 'invite-dialog',
    templateUrl: './invite-dialog.component.html',
    styleUrls: ['./invite-dialog.component.scss']
})
export class InviteDialogComponent implements OnInit, AfterContentInit {
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
        private policyEngineService: PolicyEngineService,
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        const data = this.config.data

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

    copyToClipboard(text: string): void {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                console.log('Copied to clipboard:', text);
            })
            .catch((err) => {
                console.error('Failed to copy text:', err);
            });
    }
}
