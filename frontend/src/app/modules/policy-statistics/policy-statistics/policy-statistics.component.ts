import { Component, OnInit } from '@angular/core';
import { UserPermissions } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';

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
    selector: 'app-policy-statistics',
    templateUrl: './policy-statistics.component.html',
    styleUrls: ['./policy-statistics.component.scss'],
})
export class PolicyStatisticsComponent implements OnInit {
    public readonly title: string = 'Statistics';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public columns: IColumn[];

    constructor(
        private profileService: ProfileService,
        private policyStatisticsService: PolicyStatisticsService
    ) {
        this.columns = [{
            id: 'name',
            title: 'Name',
            type: 'text',
            size: 'auto',
            tooltip: true
        }, {
            id: 'topic',
            title: 'Topic',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'status',
            title: 'Status',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'trigger',
            title: 'Trigger',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'docs',
            title: 'Documents',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'options',
            title: '',
            type: 'text',
            size: 'auto',
            tooltip: false
        }]
    }

    ngOnInit() {
        this.page = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.pageCount = 0;
        this.loadProfile();
    }

    ngOnDestroy(): void {

    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
        ]).subscribe(([profile]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
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
        this.loading = true;
        this.policyStatisticsService
            .page(this.pageIndex, this.pageSize)
            .subscribe((response) => {
                const { page, count } = this.policyStatisticsService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    public onBack() {

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

    public onCreate() {

    }
}
