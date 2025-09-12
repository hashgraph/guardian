import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { UserPermissions } from '@guardian/interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from 'src/app/services/profile.service';

/**
 * Dialog for display json
 */
@Component({
    selector: 'vc-fullscreen-dialog',
    templateUrl: './vc-fullscreen-dialog.component.html',
    styleUrls: ['./vc-fullscreen-dialog.component.scss']
})
export class VCFullscreenDialog {
    public loading: boolean = true;

    public user: UserPermissions = new UserPermissions();

    public backLabel: string = '';
    public title: string = '';
    public type: 'VP' | 'VC' | 'JSON' | 'TEXT' = 'JSON';
    public toggle: boolean = false;
    public currentTab: number = 1;

    public row?: any;
    public messageId?: string;
    public dryRun: boolean = false;
    public id: string = '';
    public getByUser: boolean = false;
    public policyId?: string;
    public documentId?: string;
    public schemaId?: string;
    public schema?: any;
    public document: any;
    public json: string = '';
    public fileSize: number = 0;
    public collapse: boolean = true;

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig,
        private profileService: ProfileService,
        private route: ActivatedRoute,
        private router: Router
    ) {
    }

    ngOnInit() {
        const {
            type,
            title,
            backLabel,
            dryRun,
            id,
            row,
            schema,
            document
        } = this.dialogConfig.data;

        this.backLabel = backLabel || 'Back'

        if (type === 'VC') {
            this.type = 'VC';
            this.toggle = true;
            this.title = title || 'VC Document';
            this.currentTab = 0;
        } else if (type === 'VP') {
            this.type = 'VP';
            this.toggle = true;
            this.title = title || 'VP Document';
            this.currentTab = 0;
        } else {
            this.type = 'JSON';
            this.toggle = false;
            this.title = title || 'Document';
            this.currentTab = 1;
        }

        if (row) {
            this.documentId = row.id;
            this.policyId = row.policyId;
            this.messageId = row.messageId;
            this.schemaId = row.schema;
        }

        this.id = id;
        this.dryRun = !!dryRun;
        this.getByUser = false;
        this.schema = schema;

        this.document = document;
        if (document) {
            if (typeof document === 'string') {
                this.json = document;
            } else {
                this.json = JSON.stringify((document), null, 4);
            }
        } else {
            this.type = 'JSON';
            this.toggle = false;
            this.json = '';
            this.currentTab = 1;
        }

        const fileSizeBytes = new Blob([this.json]).size;
        this.fileSize = Math.round((fileSizeBytes / (1024 * 1024)));

        this.loadProfile();
    }


    private loadProfile() {
        this.loading = true;
        this.profileService.getProfile()
            .subscribe((profile) => {
                this.user = new UserPermissions(profile);
                this.loading = false;
            }, (error) => {
                this.loading = false;
                console.error(error);
            });
    }

    public onToggle(index: number) {
        this.currentTab = index;
    }

    public get isCompare(): boolean {
        return (
            (!this.dryRun) &&
            (!!this.id) &&
            (!!this.user?.ANALYTIC_DOCUMENT_READ) &&
            (this.type === 'VC' || this.type === 'VP')
        );
    }

    public get isExport(): boolean {
        return (
            (!this.dryRun) &&
            (!!this.messageId) &&
            (this.type === 'VC' || this.type === 'VP')
        );
    }

    public onClose(): void {
        this.dialogRef.close(null);
    }

    public onFindInExport(): void {
        this.dialogRef.close(null);
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                tab: 1,
                schemas: null,
                owners: null,
                tokens: null,
                related: this.messageId
            },
            queryParamsHandling: 'merge',
        });
    }

    public onDownloadJsonFile() {
        const data = this.json;
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = (this.documentId || this.id) + '.json';
        a.click();

        URL.revokeObjectURL(url);
    }

    public onMessageSelect($event: any) {

    }

    public onCollapse($event: boolean) {
        this.collapse = $event;
    }
}
