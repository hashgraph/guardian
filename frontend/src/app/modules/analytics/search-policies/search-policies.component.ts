import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, SchemaHelper, TagType } from '@guardian/interfaces';
import { ProfileService } from 'src/app/services/profile.service';
import { TagsService } from 'src/app/services/tag.service';
import { forkJoin } from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';
import { AnalyticsService } from 'src/app/services/analytics.service';

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-search-policies',
    templateUrl: './search-policies.component.html',
    styleUrls: ['./search-policies.component.scss']
})
export class SearchPoliciesComponent implements OnInit {
    public loading: boolean = true;
    public type: any;
    public policyId: any;
    public policy: any;
    public policies: any[] | null;
    public filteredPolicies: any[] = [];
    public policyCount: number;
    public selectedCount: number;
    public size: number;
    public columns: string[] = [];
    public owner: any;
    public tagEntity = TagType.Policy;
    public tagSchemas: any[] = [];
    public tagOptions: string[] = [];
    public filtersForm = new FormGroup({
        policyName: new FormControl('', {
            updateOn: 'change'
        }),
        tag: new FormControl('', {
            updateOn: 'change'
        }),
    });
    public lastFilters: any;
    public selectedAll: boolean = false;

    constructor(
        public tagsService: TagsService,
        public profileService: ProfileService,
        public analyticsService: AnalyticsService,
        public route: ActivatedRoute,
        public router: Router,
    ) {
        this.policies = null;
        this.policyCount = 0;
        this.columns = [
            'selector',
            'name',
            'description',
            'version',
            'topic',
            'tags',
            'status',
            'rate',
        ]
    }

    ngOnInit() {
        this.loading = true;
        this.loadData();
        this.route.queryParams.subscribe(queryParams => {
            this.loadData();
        });
        this.filtersForm.valueChanges.subscribe((value) => {
            setTimeout(() => {
                this.applyFilters(value.policyName, value.tag);
            });
        })
    }

    private loadData() {
        this.loading = true;
        this.policyId = this.route.snapshot.queryParams.policyId;
        this.type = this.route.snapshot.queryParams['type'] || '';
        this.policy = null;
        this.policies = null;
        this.filteredPolicies = [];
        forkJoin([
            this.profileService.getProfile(),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            const profile: IUser | null = value[0];
            const tagSchemas: any[] = value[1] || [];
            this.owner = profile?.did;
            this.tagSchemas = SchemaHelper.map(tagSchemas);
            this.loadPolicy();
        }, (e) => {
            this.loading = false;
            console.error(e);
        });
    }

    private loadPolicy() {
        if (!this.owner || !this.policyId) {
            this.loading = false;
            return;
        }
        this.loading = true;
        this.analyticsService.searchPolicies({
            policyId: this.policyId,
            threshold: 0
        }).subscribe((data) => {
            const target = data?.target;
            const result = data?.result;
            if (target && result) {
                this.policy = target;
                this.policies = result.sort((a: any, b: any) => a.rate > b.rate ? -1 : 1);
            }
            this.prepareData();
            this.loadTags();
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
            console.error(e);
        });
    }

    private loadTags() {
        if (!this.policies) {
            this.loading = false;
            return;
        }
        const ids = this.policies.map(e => e.id);
        if(this.policy) {
            ids.unshift(this.policy.id);
        }
        this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
            if (this.policies) {
                for (const policy of this.policies) {
                    policy._tags = data[policy.id];
                }
            }
            if(this.policy) {
                this.policy._tags = data[this.policy.id];
            }
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    private prepareData() {
        const tagMap = new Set<string>();
        if (!Array.isArray(this.policies)) {
            this.policies = [];
        }
        for (const item of this.policies) {
            if (item.rate > 80) {
                item._color = 'item-color-green';
            } else if (item.rate > 50) {
                item._color = 'item-color-yellow';
            } else {
                item._color = 'item-color-red';
            }
            item._searchName = (item.name || '').toLowerCase();
            item._searchTags = item.tags;
            for (const tag of item.tags) {
                tagMap.add(tag);
            }
            item._select = false;
            item._readonly = false;
            item._rate = `${item.rate}%`;
        }
        if (this.policy) {
            this.policy._rate = '';
            this.policy._color = null;
            this.policy._select = true;
            this.policy._search = null;
            this.policy._readonly = true;
        }
        this.selectedCount = 1;
        this.policyCount = this.policies.length;
        this.size = this.policyCount + 1;
        this.tagOptions = Array.from(tagMap);
        this.selectedAll = this.selectedCount === this.size;
        this.filteredPolicies = [
            this.policy,
            ...this.policies
        ];
    }

    public get hasTagOptions(): boolean {
        return this.tagOptions.length > 0;
    }

    private applyFilters(name: string, tag: string): void {
        const lastFilters = (name || tag) ? `${name}|${tag}` : '';
        if (this.lastFilters === lastFilters) {
            return;
        }
        this.lastFilters = lastFilters;
        if (lastFilters) {
            if (this.policies) {
                if (name && tag) {
                    this.filteredPolicies = this.policies
                        .filter(p => (
                            p._searchName.includes(name) &&
                            p._searchTags.includes(tag)
                        ));
                } else if (name) {
                    this.filteredPolicies = this.policies
                        .filter(p => (p._searchName.includes(name)));
                } else {
                    this.filteredPolicies = this.policies
                        .filter(p => (p._searchTags.includes(tag)));
                }
            } else {
                this.filteredPolicies = [];
            }
            if (this.policy) {
                this.filteredPolicies.unshift(this.policy)
            }
        } else {
            if (this.policies) {
                this.filteredPolicies = this.policies.slice();
            } else {
                this.filteredPolicies = [];
            }
            if (this.policy) {
                this.filteredPolicies.unshift(this.policy)
            }
        }
    }

    public clearFilters(): void {
        this.lastFilters = null;
        this.applyFilters('', '');
        this.filtersForm.reset({ policyName: '', tag: '' });
    }

    private onSelect() {
        this.selectedCount = 1;
        if (this.policies) {
            for (const item of this.policies) {
                if (item._select) {
                    this.selectedCount++;
                }
            }
        }
        this.selectedAll = this.selectedCount === this.size;
    }

    public selectAllPolicy() {
        this.selectedAll = !this.selectedAll;
        if (this.policies) {
            for (const item of this.policies) {
                item._select = this.selectedAll;
            }
        }
        this.onSelect();
    }

    public selectPolicy(element: any) {
        element._select = !element._select;
        this.onSelect();
    }

    public comparePolicy() {
        if (this.selectedCount < 2 || !this.policies) {
            return;
        }
        const policyIds = this.policies
            .filter(item => item._select)
            .map(p => p.id);
        policyIds.unshift(this.policyId);
        if (policyIds.length > 1) {
            if (policyIds.length === 2) {
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'policy',
                        policyId1: policyIds[0],
                        policyId2: policyIds[1]
                    }
                });
            } else {
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'multi-policy',
                        policyIds: policyIds,
                    }
                });
            }
        }
    }
}
