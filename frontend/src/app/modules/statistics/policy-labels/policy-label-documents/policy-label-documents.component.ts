import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';

interface IColumn {
    id: string;
    title: string;
    type: string;
    size: string;
    tooltip: boolean;
    permissions?: (user: UserPermissions) => boolean;
    canDisplay?: () => boolean;
}

@Component({
    selector: 'app-policy-label-documents',
    templateUrl: './policy-label-documents.component.html',
    styleUrls: ['./policy-label-documents.component.scss'],
})
export class PolicyLabelDocumentsComponent implements OnInit {
    public readonly title: string = 'Documents';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public definitionId: string;
    public definition: any;
    public columns: IColumn[];
    public policy: any;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private policyLabelsService: PolicyLabelsService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [{
            id: 'definition',
            title: 'Definition',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'policy',
            title: 'Policy',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'topicId',
            title: 'Topic',
            type: 'text',
            size: '150',
            tooltip: false
        }, {
            id: 'target',
            title: 'Target',
            type: 'text',
            size: '220',
            tooltip: false
        }, {
            id: 'messageId',
            title: 'Message ID',
            type: 'text',
            size: '220',
            tooltip: false
        }, {
            id: 'options',
            title: '',
            type: 'text',
            size: '135',
            tooltip: false
        }]
    }

    ngOnInit() {
        this.page = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.pageCount = 0;
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        this.definitionId = this.route.snapshot.params['definitionId'];
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyLabelsService.getLabel(this.definitionId),
            this.policyLabelsService.getRelationships(this.definitionId)
        ]).subscribe(([profile, definition, relationships]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
            this.definition = definition;
            this.policy = relationships?.policy || {};
            if (this.isConfirmed) {
                this.loadData();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadData() {
        const filters: any = {};
        this.loading = true;
        this.policyLabelsService
            .getLabelDocuments(
                this.definitionId,
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.policyLabelsService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                for (const item of this.page) {
                    item.definition = this.definition?.name;
                    item.policy = this.policy?.name;
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    public onBack() {
        this.router.navigate(['/policy-labels']);
    }

    public onOpen(row: any) {
        this.router.navigate([
            '/policy-labels',
            this.definitionId,
            'documents',
            row.id
        ]);
    }
}
